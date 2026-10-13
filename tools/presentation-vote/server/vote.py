#!/usr/bin/env python3
"""Голосование за презентации: сервер без внешних зависимостей.

Переменные окружения:
  VOTE_PORT       порт (по умолчанию 80)
  VOTE_ADMIN_KEY  ключ для /admin (обязателен)
  VOTE_DB         путь к базе SQLite (по умолчанию /var/lib/presentation-vote/vote.db)
"""
import base64
import csv
import hashlib
import hmac
import io
import math
import re
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
UPLOADS = os.path.join(os.path.dirname(os.path.abspath(DB_PATH)), "uploads")
MAX_BODY = 64 * 1024
MAX_UPLOAD = 3 * 1024 * 1024
IMAGE_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp", "gif": "image/gif",
               "svg": "image/svg+xml"}

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
    "scale": 10,
    "open": True,
    "current": "",
    "comments": True,
    "show_results": True,
    "org": "",
    "accent": "#1D6B57",
    "logo": "",
    "logos": {},
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
db.execute("CREATE TABLE IF NOT EXISTS events(ts INTEGER NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '')")
db.commit()
os.makedirs(UPLOADS, exist_ok=True)


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


def setting(key, default=None):
    rows = query("SELECT value FROM settings WHERE key=?", (key,))
    return json.loads(rows[0][0]) if rows else default


def set_setting(key, value):
    with lock:
        db.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (key, json.dumps(value, ensure_ascii=False)))
        db.commit()


def plural(n, one, few, many):
    if n % 10 == 1 and n % 100 != 11:
        return one
    return few if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14 else many


def log_event(action, detail=""):
    with lock:
        db.execute("INSERT INTO events(ts, action, detail) VALUES(?,?,?)", (int(time.time()), action, detail))
        db.commit()


# Секрет для квитанций: создаётся один раз и хранится в базе
SECRET = setting("secret")
if not SECRET:
    SECRET = token_hex(32)
    set_setting("secret", SECRET)

RECEIPT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def receipt(voter, pres, ts):
    """Код проверки голоса: по нему участник находит свою строку в открытых данных."""
    d = hmac.new(SECRET.encode(), ("%s|%s|%d" % (voter, pres, ts)).encode("utf-8"), hashlib.sha256).digest()
    code = "".join(RECEIPT_ALPHABET[b % len(RECEIPT_ALPHABET)] for b in d[:8])
    return code[:4] + "-" + code[4:]


def open_rows(cfg):
    """Обезличенные голоса: код проверки, презентация, оценки, минута. Без комментариев и номеров устройств."""
    names = [c["name"] for c in cfg["criteria"]]
    out = []
    for voter, pres, scores, ts in query("SELECT voter, presentation, scores, ts FROM votes ORDER BY ts"):
        sc = json.loads(scores)
        out.append({"receipt": receipt(voter, pres, ts), "presentation": pres,
                    "scores": [sc.get(n) for n in names], "ts": ts - ts % 60})
    return names, out


def fingerprint(cfg):
    """Отпечаток всех голосов (SHA-256). Его можно пересчитать по открытым данным — формула на странице итогов."""
    _, rows = open_rows(cfg)
    lines = sorted("%s;%s;%s" % (r["receipt"], r["presentation"], ";".join("" if v is None else str(v) for v in r["scores"]))
                   for r in rows)
    return hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest(), len(lines)


def public_audit(cfg):
    events = [{"ts": ts, "action": a, "detail": d} for ts, a, d in query("SELECT ts, action, detail FROM events ORDER BY ts")]
    seal = setting("seal")
    cur, n = fingerprint(cfg)
    return {"events": events, "seal": seal, "current": cur, "count": n,
            "intact": bool(seal) and seal.get("hash") == cur}


def results(cfg):
    names = [c["name"] for c in cfg["criteria"]]
    rows = query("SELECT presentation, scores, comment, ts FROM votes")
    scale = cfg["scale"]
    empty = lambda: {"n": 0, "sums": [0.0] * len(names), "cnt": [0] * len(names), "comments": [],
                     "dist": [0] * scale, "means": []}
    groups = {}
    for pres, scores, comment, ts in rows:
        g = groups.setdefault(pres, empty())
        g["n"] += 1
        s = json.loads(scores)
        vals = [s.get(n) for n in names if isinstance(s.get(n), (int, float))]
        if vals:
            g["means"].append(sum(vals) / len(vals))
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
        m = g["means"]
        sd = math.sqrt(sum((x - sum(m) / len(m)) ** 2 for x in m) / (len(m) - 1)) if len(m) > 1 else None
        out.append({
            "sd": round(sd, 2) if sd is not None else None,
            "ci": round(1.96 * sd / math.sqrt(len(m)), 2) if sd is not None else None,
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

    def read_json(self, limit=MAX_BODY):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > limit:
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
        if u.path.startswith("/u/"):
            name = u.path[3:]
            m = re.match(r"^[0-9a-f]{16}\.(png|jpg|webp|gif|svg)$", name)
            try:
                with open(os.path.join(UPLOADS, name), "rb") as f:
                    data = f.read()
            except (OSError, TypeError):
                data = None
            if not m or data is None:
                return self.send(404, {"error": "not_found"})
            # Файлы неизменяемые (имя = хэш содержимого); SVG — без скриптов
            return self.send(200, data, IMAGE_TYPES[m.group(1)], {
                "Cache-Control": "public, max-age=31536000, immutable",
                "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox"})
        if u.path == "/api/config":
            cfg = get_config()
            mine = {}
            for pres, scores, comment, ts in query(
                    "SELECT presentation, scores, comment, ts FROM votes WHERE voter=?", (vid,)):
                mine[pres] = {"scores": json.loads(scores), "comment": comment, "receipt": receipt(vid, pres, ts)}
            pub = {k: cfg[k] for k in ("title", "presentations", "criteria", "scale", "open", "current", "comments",
                                       "show_results", "org", "accent", "logo", "logos")}
            pub["mine"] = mine
            if not cfg["open"] and cfg["show_results"]:
                res = results(cfg)
                for row in res["rows"]:
                    row.pop("comments", None)
                res["rows"] = [r for r in res["rows"] if r["votes"] and not r["removed"]]
                pub["results"] = res
                pub["audit"] = public_audit(cfg)
            return self.send(200, pub, extra={"Set-Cookie": self.cookie(vid)} if fresh else None)
        if u.path == "/api/admin":
            if not self.is_admin(q):
                return self.send(403, {"error": "bad_key"})
            cfg = get_config()
            return self.send(200, {"config": cfg, "results": results(cfg), "audit": public_audit(cfg)})
        if u.path in ("/api/open", "/api/open.csv"):
            cfg = get_config()
            if not (self.is_admin(q) or (not cfg["open"] and cfg["show_results"])):
                return self.send(403, {"error": "not_public"})
            names, rows = open_rows(cfg)
            if u.path == "/api/open":
                return self.send(200, {"criteria": names, "rows": rows})
            buf = io.StringIO()
            w = csv.writer(buf, delimiter=";")
            w.writerow(["Код проверки", "Презентация"] + names + ["Время (с точностью до минуты)"])
            for r in rows:
                w.writerow([r["receipt"], r["presentation"]] + ["" if v is None else v for v in r["scores"]]
                           + [time.strftime("%d.%m.%Y %H:%M", time.localtime(r["ts"]))])
            return self.send(200, "\ufeff" + buf.getvalue(), "text/csv; charset=utf-8",
                             {"Content-Disposition": 'attachment; filename="otkrytye-dannye.csv"'})
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
        data = self.read_json(MAX_UPLOAD * 2 if u.path == "/api/admin/upload" else MAX_BODY)
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
            ts = int(time.time())
            with lock:
                db.execute("INSERT OR REPLACE INTO votes(voter, presentation, scores, comment, ts) VALUES(?,?,?,?,?)",
                           (vid, pres, json.dumps(scores, ensure_ascii=False), comment, ts))
                db.commit()
            return self.send(200, {"ok": True, "receipt": receipt(vid, pres, ts)},
                             extra={"Set-Cookie": self.cookie(vid)} if fresh else None)

        if not self.is_admin(q):
            return self.send(403, {"error": "bad_key"})

        if u.path == "/api/admin/upload":
            m = re.match(r"^data:image/[a-z+.-]+;base64,(.+)$", str(data.get("data") or ""), re.S)
            try:
                raw = base64.b64decode(m.group(1)) if m else b""
            except ValueError:
                raw = b""
            ext = ("png" if raw[:8] == b"\x89PNG\r\n\x1a\n" else "jpg" if raw[:3] == b"\xff\xd8\xff"
                   else "gif" if raw[:4] == b"GIF8" else "webp" if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"
                   else "svg" if b"<svg" in raw[:2048].lower() else None)
            if not raw or len(raw) > MAX_UPLOAD or not ext:
                return self.send(400, {"error": "bad_image"})
            name = hashlib.sha256(raw).hexdigest()[:16] + "." + ext
            path = os.path.join(UPLOADS, name)
            if not os.path.exists(path):
                with open(path + ".tmp", "wb") as f:
                    f.write(raw)
                os.replace(path + ".tmp", path)
            return self.send(200, {"ok": True, "file": name})

        if u.path == "/api/admin/config":
            cfg = get_config()
            before = dict(cfg)
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
            if "scale" in data and data["scale"] in (5, 10) and data["scale"] != cfg["scale"]:
                # Нельзя менять шкалу поверх уже собранных оценок: 1–5 и 1–10 смешались бы в средних
                if query("SELECT COUNT(*) FROM votes")[0][0]:
                    return self.send(409, {"error": "scale_locked"})
                cfg["scale"] = data["scale"]
            if "open" in data:
                cfg["open"] = bool(data["open"])
            if "comments" in data:
                cfg["comments"] = bool(data["comments"])
            if "show_results" in data:
                cfg["show_results"] = bool(data["show_results"])
            if "org" in data:
                cfg["org"] = clean_text(data["org"], 120)
            if "accent" in data and re.match(r"^#[0-9a-fA-F]{6}$", str(data["accent"])):
                cfg["accent"] = data["accent"]
            file_ok = lambda f: f == "" or (re.match(r"^[0-9a-f]{16}\.(png|jpg|webp|gif|svg)$", f)
                                            and os.path.exists(os.path.join(UPLOADS, f)))
            if "logo" in data and file_ok(str(data["logo"])):
                cfg["logo"] = str(data["logo"])
            if "logos" in data and isinstance(data["logos"], dict):
                logos = dict(cfg.get("logos") or {})
                for k, v in data["logos"].items():
                    k = clean_text(k, 200)
                    if file_ok(str(v)):
                        if v:
                            logos[k] = str(v)
                        else:
                            logos.pop(k, None)
                cfg["logos"] = logos
            if "current" in data:
                cur = clean_text(data["current"], 200)
                cfg["current"] = cur if cur in cfg["presentations"] else ""
            if cfg["current"] not in cfg["presentations"]:
                cfg["current"] = ""
            cfg["logos"] = {k: v for k, v in (cfg.get("logos") or {}).items() if k in cfg["presentations"]}
            save_config(cfg)
            # Журнал: всё, что влияет на итоги, видно участникам на странице итогов
            if before["open"] and not cfg["open"]:
                h, n = fingerprint(cfg)
                set_setting("seal", {"hash": h, "count": n, "ts": int(time.time())})
                log_event("close", "Приём закрыт, итоги опечатаны: %d %s" % (n, plural(n, "голос", "голоса", "голосов")))
            elif not before["open"] and cfg["open"]:
                set_setting("seal", None)
                log_event("open", "Приём оценок открыт")
            if before["presentations"] != cfg["presentations"]:
                log_event("presentations", "Список презентаций: %d шт." % len(cfg["presentations"]))
            if before["criteria"] != cfg["criteria"] or before["scale"] != cfg["scale"]:
                log_event("criteria", "Критерии: %s; шкала 1–%d" % (", ".join(c["name"] for c in cfg["criteria"]), cfg["scale"]))
            return self.send(200, {"ok": True, "config": cfg})

        if u.path == "/api/admin/reset":
            if data.get("confirm") != "RESET":
                return self.send(400, {"error": "confirm_required"})
            n = query("SELECT COUNT(*) FROM votes")[0][0]
            with lock:
                db.execute("DELETE FROM votes")
                db.commit()
            set_setting("seal", None)
            log_event("reset", "Организатор удалил все оценки: %d шт." % n)
            return self.send(200, {"ok": True})

        return self.send(404, {"error": "not_found"})


if __name__ == "__main__":
    if not ADMIN_KEY:
        raise SystemExit("VOTE_ADMIN_KEY is not set")
    print("Vote server started on port %d" % PORT, flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
