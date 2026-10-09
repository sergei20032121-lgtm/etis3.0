#!/usr/bin/env bash
# Тестовый запуск голосования с выдуманными голосами — чтобы посмотреть, как выглядят итоги.
# Работает рядом с основным голосованием: свой порт (8081) и своя база, настоящие голоса не трогает.
#   Запустить:  curl -fsSL https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/refs/heads/claude/inspiring-mayer-sgw1ap/tools/presentation-vote/server/demo.sh | bash
#   Выключить:  curl -fsSL https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/refs/heads/claude/inspiring-mayer-sgw1ap/tools/presentation-vote/server/demo.sh | bash -s stop
set -euo pipefail

APP="${VOTE_APP:-/opt/presentation-vote}"
PORT="${DEMO_PORT:-8081}"
DIR="${DEMO_DIR:-/var/lib/presentation-vote}"
DB="$DIR/demo.db"
PIDF="$DIR/demo.pid"
LOG="$DIR/demo.log"

stop_demo() {
  if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then kill "$(cat "$PIDF")"; fi
  rm -f "$PIDF" "$DB" "$DB-wal" "$DB-shm"
}

if [ "${1:-start}" = "stop" ]; then
  stop_demo
  echo "Демо выключено, тестовые голоса удалены. Основное голосование не тронуто."
  exit 0
fi

[ -f "$APP/vote.py" ] || { echo "Сначала установите голосование (install.sh)"; exit 1; }
mkdir -p "$DIR"
stop_demo

echo "→ Запускаю демо на порту $PORT"
nohup env VOTE_PORT="$PORT" VOTE_ADMIN_KEY=demo VOTE_DB="$DB" PYTHONIOENCODING=utf-8 \
  python3 "$APP/vote.py" > "$LOG" 2>&1 &
echo $! > "$PIDF"

ok=0
for i in 1 2 3 4 5 6; do
  sleep 1
  if curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1; then ok=1; break; fi
done
[ "$ok" = 1 ] || { echo "Демо не запустилось:"; cat "$LOG"; exit 1; }

echo "→ Заполняю выдуманными голосами"
PORT="$PORT" DB="$DB" python3 - <<'PY'
import json, os, random, sqlite3, time, urllib.request
B = "http://127.0.0.1:%s" % os.environ["PORT"]

def post(path, data, voter=None):
    h = {"Content-Type": "application/json"}
    if voter:
        h["Cookie"] = "vid=" + voter
    req = urllib.request.Request(B + path, json.dumps(data).encode("utf-8"), h)
    urllib.request.urlopen(req).read()

P = ["Анализ рынка — Иванова А.", "Редизайн сайта — Петров С.", "Новая система отчётности — Ким Д.",
     "Автоматизация закупок — Смирнова Е.", "Онбординг новичков — Орлов В.", "Чат-бот поддержки — Белова М."]
post("/api/admin/config?key=demo", {"title": "Демо: защита проектов", "presentations": P, "open": True})
C = ["Содержание", "Структура", "Оформление", "Выступление", "Ответы на вопросы"]
base = [[4.6, 4.2, 3.8, 4.4, 4.0], [3.4, 3.8, 4.8, 3.2, 3.0], [4.0, 4.4, 3.6, 3.8, 4.6],
        [3.0, 3.2, 3.4, 4.2, 3.6], [3.8, 3.6, 4.2, 4.6, 3.4], [3.2, 2.8, 3.0, 3.4, 3.8]]
notes = ["", "", "", "Понятно и по делу", "Слайды перегружены текстом", "Хорошие ответы на вопросы", "Не хватило цифр"]
random.seed(7)
for v in range(32):
    voter = "%032x" % random.getrandbits(128)
    for i, p in enumerate(P):
        if random.random() < 0.85:
            sc = {}
            for k, c in enumerate(C):
                sc[c] = max(1, min(5, int(round(base[i][k] + random.gauss(0, 0.8)))))
            post("/api/vote", {"presentation": p, "scores": sc, "comment": random.choice(notes)}, voter)
# Раскладываем время голосов по последнему часу, как будто выступления шли по очереди
db = sqlite3.connect(os.environ["DB"])
now = int(time.time())
for rowid, p in db.execute("SELECT rowid, presentation FROM votes").fetchall():
    db.execute("UPDATE votes SET ts=? WHERE rowid=?", (now - (len(P) - P.index(p)) * 9 * 60 + random.randint(0, 200), rowid))
db.commit()
db.close()
post("/api/admin/config?key=demo", {"open": False, "show_results": True})
PY

if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "$PORT"/tcp >/dev/null && echo "→ Открыл порт $PORT в ufw"
fi

IP="$(curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
cat <<EOF

==============================================
 Демо готово: 6 презентаций, 32 голосующих, приём уже закрыт.

 Итоги, как их увидят все:  http://$IP:$PORT/
 Админка с графиками:       http://$IP:$PORT/admin?key=demo
$( [ -f "$APP/static/screen.html" ] && echo " Экран для монитора:        http://$IP:$PORT/screen" )

 Чтобы посмотреть само голосование, откройте приём в админке демо.
 Выключить демо и удалить тестовые голоса:
   curl -fsSL https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/refs/heads/claude/inspiring-mayer-sgw1ap/tools/presentation-vote/server/demo.sh | bash -s stop
==============================================
EOF
