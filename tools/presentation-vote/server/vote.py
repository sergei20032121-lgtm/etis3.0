#!/usr/bin/env python3
"""Голосование за презентации: сервер без внешних зависимостей.

Переменные окружения:
  VOTE_PORT       порт (по умолчанию 80)
  VOTE_ADMIN_KEY  ключ для /admin (обязателен)
  VOTE_DB         путь к базе SQLite (по умолчанию /var/lib/presentation-vote/vote.db)
"""
import csv
import hmac
import io
import json
import os
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.parse import parse_qs, urlparse


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    # Свой вариант вместо http.server.ThreadingHTTPServer: его нет в Python до 3.7
    daemon_threads = True


def token_hex(n):
    return os.urandom(n).hex()

PORT = int(os.environ.get("VOTE_PORT", "80"))
ADMIN_KEY = os.environ.get("VOTE_ADMIN_KEY", "")
DB_PATH = os.environ.get("VOTE_DB", "/var/lib/presentation-vote/vote.db")
STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
MAX_BODY = 64 * 1024

DEFAULT_CONFIG = {
    "title": "Оцените презентации",
    "presentations": [],
    "criteria": [
        {"name": "Содержание", "desc": "польза, полнота и точность материала"},
        {"name": "Структура", "desc": "логика и последовательность изложения"},
        {"name": "Оформление", "desc": "наглядность и читаемость слайдов"},
        {"name": "Выступление", "desc": "уверенность, речь, контакт с залом"},
        {"name": "Ответы на вопросы", "desc": "понятно и по делу"},
    ],
    "scale": 5,
    "open": True,
    "current": "",
    "comments": True,
    "show_results": True,
}

lock = threading.Lock()
if os.path.dirname(DB_PATH):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.execute("PRAGMA journal_mode=WAL")
db.execute("""CREATE TABLE IF NOT EXISTS votes(
    voter TEXT NOT NULL, presentation TEXT NOT NULL, scores TEXT NOT NULL,
    comment TEXT NOT NULL DEFAULT '', ts INTEGER NOT NULL,
    PRIMARY KEY(voter, presentation))""")
db.execute("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
db.commit()


def query(sql, args=()):
    with lock:
        return db.execute(sql, args).fetchall()


def get_config():
    rows = query("SELECT value FROM settings WHERE key='config'")
    row = rows[0] if rows else None
    cfg = dict(DEFAULT_CONFIG)
    if row:
        cfg.update(json.loads(row[0]))
    return cfg


def save_config(cfg):
    with lock:
        db.execute("INSERT OR REPLACE INTO settings(key, value) VALUES('config', ?)",
                   (json.dumps(cfg, ensure_ascii=False),))
        db.commit()


def clean_text(v, limit):
    return str(v if v is not None else "").strip()[:limit]


def results(cfg):
    names = [c["name"] for c in cfg["criteria"]]
    rows = query("SELECT presentation, scores, comment, ts FROM votes")
    scale = cfg["scale"]
    empty = lambda: {"n": 0, "sums": [0.0] * len(names), "cnt": [0] * len(names), "comments": [],
                     "dist": [0] * scale}
    groups = {}
    for pres, scores, comment, ts in rows:
        g = groups.setdefault(pres, empty())
        g["n"] += 1
        s = json.loads(scores)
        for i, name in enumerate(names):
            v = s.get(name)
            if isinstance(v, (int, float)):
                g["sums"][i] += v
                g["cnt"][i] += 1
                if 1 <= v <= scale:
                    g["dist"][int(v) - 1] += 1
        if comment:
            g["comments"].append({"text": comment, "ts": ts})
    out = []
    order = cfg["presentations"] + [p for p in groups if p not in cfg["presentations"]]
    for p in order:
        g = groups.get(p) or empty()
        avgs = [round(g["sums"][i] / g["cnt"][i], 2) if g["cnt"][i] else None for i in range(len(names))]
        valid = [a for a in avgs if a is not None]
        out.append({
            "name": p, "votes": g["n"], "avgs": avgs,
            "total": round(sum(valid) / len(valid), 2) if valid else None,
            "removed": p not in cfg["presentations"],
            "dist": g["dist"],
            "comments": sorted(g["comments"], key=lambda c: -c["ts"]),
        })
    out.sort(key=lambda r: (r["total"] is None, -(r["total"] or 0), -r["votes"]))
    return {"criteria": names, "rows": out, "voters": query("SELECT COUNT(DISTINCT voter) FROM votes")[0][0],
            "total_votes": len(rows), "times": sorted(r[3] for r in rows), "now": int(time.time())}


class Handler(BaseHTTPRequestHandler):
    server_version = "PresentationVote/1.0"

    def log_message(self, fmt, *args):
        pass

    # ---- helpers ----
    def voter_id(self):
        for part in self.headers.get("Cookie", "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == "vid" and 16 <= len(v) <= 64 and v.isalnum():
                return v, False
        return token_hex(16), True

    def send(self, code, body, ctype="application/json; charset=utf-8", extra=None):
        if isinstance(body, (dict, list)):
            body = json.dumps(body, ensure_ascii=False)
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def send_static(self, name, ctype, cookie=None):
        try:
            with open(os.path.join(STATIC, name), "rb") as f:
                data = f.read()
        except OSError:
            return self.send(404, {"error": "not_found"})
        extra = {"Set-Cookie": cookie} if cookie else None
        self.send(200, data, ctype, extra)

    def is_admin(self, q):
        key = (q.get("key") or [""])[0] or self.headers.get("X-Admin-Key", "")
        return bool(ADMIN_KEY) and hmac.compare_digest(key.encode(), ADMIN_KEY.encode())

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            return None
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    @staticmethod
    def cookie(vid):
        return "vid=%s; Max-Age=31536000; Path=/; SameSite=Lax" % vid

    # ---- routes ----
    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        vid, fresh = self.voter_id()
        if u.path in ("/", "/index.html"):
            return self.send_static("vote.html", "text/html; charset=utf-8", self.cookie(vid) if fresh else None)
        if u.path == "/admin":
            return self.send_static("admin.html", "text/html; charset=utf-8")
        if u.path == "/screen":
            return self.send_static("screen.html", "text/html; charset=utf-8")
        if u.path == "/results":
            return self.send_static("vote.html", "text/html; charset=utf-8", self.cookie(vid) if fresh else None)
        if u.path in ("/qrcode.js", "/charts.js"):
            return self.send_static(u.path[1:], "application/javascript; charset=utf-8")
        if u.path == "/charts.css":
            return self.send_static("charts.css", "text/css; charset=utf-8")
        if u.path == "/api/config":
            cfg = get_config()
            mine = {}
            for pres, scores, comment in query(
                    "SELECT presentation, scores, comment FROM votes WHERE voter=?", (vid,)):
                mine[pres] = {"scores": json.loads(scores), "comment": comment}
            pub = {k: cfg[k] for k in ("title", "presentations", "criteria", "scale", "open", "current", "comments",
                                       "show_results")}
            pub["mine"] = mine
            if not cfg["open"] and cfg["show_results"]:
                res = results(cfg)
                for row in res["rows"]:
                    row.pop("comments", None)
                res["rows"] = [r for r in res["rows"] if r["votes"] and not r["removed"]]
                pub["results"] = res
            return self.send(200, pub, extra={"Set-Cookie": self.cookie(vid)} if fresh else None)
        if u.path == "/api/admin":
            if not self.is_admin(q):
                return self.send(403, {"error": "bad_key"})
            cfg = get_config()
            return self.send(200, {"config": cfg, "results": results(cfg)})
        if u.path == "/api/export.csv":
            if not self.is_admin(q):
                return self.send(403, {"error": "bad_key"})
            cfg = get_config()
            names = [c["name"] for c in cfg["criteria"]]
            buf = io.StringIO()
            w = csv.writer(buf, delimiter=";")
            w.writerow(["Время", "Голосующий", "Презентация"] + names + ["Комментарий"])
            for voter, pres, scores, comment, ts in query(
                    "SELECT voter, presentation, scores, comment, ts FROM votes ORDER BY ts"):
                s = json.loads(scores)
                w.writerow([time.strftime("%d.%m.%Y %H:%M:%S", time.localtime(ts)), voter[:8], pres]
                           + [s.get(n, "") for n in names] + [comment])
            return self.send(200, "﻿" + buf.getvalue(), "text/csv; charset=utf-8",
                             {"Content-Disposition": 'attachment; filename="golosovanie.csv"'})
        if u.path == "/favicon.ico":
            return self.send(204, b"", "image/x-icon")
        if u.path == "/healthz":
            return self.send(200, {"ok": True})
        return self.send(404, {"error": "not_found"})

    def do_POST(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        data = self.read_json()
        if data is None or not isinstance(data, dict):
            return self.send(400, {"error": "bad_request"})

        if u.path == "/api/vote":
            vid, fresh = self.voter_id()
            cfg = get_config()
            if not cfg["open"]:
                return self.send(409, {"error": "closed"})
            pres = clean_text(data.get("presentation"), 200)
            if pres not in cfg["presentations"]:
                return self.send(400, {"error": "unknown_presentation"})
            raw = data.get("scores") or {}
            scores = {}
            for c in cfg["criteria"]:
                v = raw.get(c["name"]) if isinstance(raw, dict) else None
                if not isinstance(v, int) or isinstance(v, bool) or not 1 <= v <= cfg["scale"]:
                    return self.send(400, {"error": "missing_score", "criterion": c["name"]})
                scores[c["name"]] = v
            comment = clean_text(data.get("comment"), 1000) if cfg["comments"] else ""
            with lock:
                db.execute("INSERT OR REPLACE INTO votes(voter, presentation, scores, comment, ts) VALUES(?,?,?,?,?)",
                           (vid, pres, json.dumps(scores, ensure_ascii=False), comment, int(time.time())))
                db.commit()
            return self.send(200, {"ok": True}, extra={"Set-Cookie": self.cookie(vid)} if fresh else None)

        if not self.is_admin(q):
            return self.send(403, {"error": "bad_key"})

        if u.path == "/api/admin/config":
            cfg = get_config()
            if "title" in data:
                cfg["title"] = clean_text(data["title"], 120) or DEFAULT_CONFIG["title"]
            if "presentations" in data and isinstance(data["presentations"], list):
                seen, pres = set(), []
                for p in data["presentations"]:
                    p = clean_text(p, 200)
                    if p and p not in seen:
                        seen.add(p)
                        pres.append(p)
                cfg["presentations"] = pres[:100]
            if "criteria" in data and isinstance(data["criteria"], list):
                crit = []
                for c in data["criteria"]:
                    if isinstance(c, dict) and clean_text(c.get("name"), 80):
                        crit.append({"name": clean_text(c.get("name"), 80), "desc": clean_text(c.get("desc"), 200)})
                if crit:
                    cfg["criteria"] = crit[:10]
            if "scale" in data and data["scale"] in (5, 10):
                cfg["scale"] = data["scale"]
            if "open" in data:
                cfg["open"] = bool(data["open"])
            if "comments" in data:
                cfg["comments"] = bool(data["comments"])
            if "show_results" in data:
                cfg["show_results"] = bool(data["show_results"])
            if "current" in data:
                cur = clean_text(data["current"], 200)
                cfg["current"] = cur if cur in cfg["presentations"] else ""
            if cfg["current"] not in cfg["presentations"]:
                cfg["current"] = ""
            save_config(cfg)
            return self.send(200, {"ok": True, "config": cfg})

        if u.path == "/api/admin/reset":
            if data.get("confirm") != "RESET":
                return self.send(400, {"error": "confirm_required"})
            with lock:
                db.execute("DELETE FROM votes")
                db.commit()
            return self.send(200, {"ok": True})

        return self.send(404, {"error": "not_found"})


if __name__ == "__main__":
    if not ADMIN_KEY:
        raise SystemExit("VOTE_ADMIN_KEY is not set")
    print("Vote server started on port %d" % PORT, flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
