#!/usr/bin/env bash
# Установка сервера голосования за презентации.
# Запуск на сервере (под root):
#   curl -fsSL https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/refs/heads/claude/inspiring-mayer-sgw1ap/tools/presentation-vote/server/install.sh | bash
# Повторный запуск обновляет файлы и сохраняет ключ, порт и все оценки.
set -euo pipefail

BRANCH="${VOTE_BRANCH:-claude/inspiring-mayer-sgw1ap}"
REPO=sergei20032121-lgtm/etis3.0
APP=/opt/presentation-vote
DATA=/var/lib/presentation-vote
ENVF=/etc/presentation-vote.env

[ "$(id -u)" = 0 ] || { echo "Запустите под root (или через sudo)"; exit 1; }

if ! command -v python3 >/dev/null 2>&1; then
  echo "→ Ставлю python3"
  if command -v apt-get >/dev/null; then apt-get update -qq && apt-get install -y -qq python3
  elif command -v dnf >/dev/null; then dnf install -y -q python3
  elif command -v yum >/dev/null; then yum install -y -q python3
  else echo "Установите python3 вручную"; exit 1; fi
fi
command -v curl >/dev/null || { apt-get update -qq && apt-get install -y -qq curl; }

# Качаем по номеру коммита: ссылки на ветку GitHub кэширует до 5 минут
REF="$(curl -fsSL -H "Accept: application/vnd.github.sha" "https://api.github.com/repos/$REPO/commits/$BRANCH" 2>/dev/null || true)"
if ! echo "$REF" | grep -Eq '^[0-9a-f]{40}$'; then REF="refs/heads/$BRANCH"; fi
BASE="https://raw.githubusercontent.com/$REPO/$REF/tools/presentation-vote/server"

echo "→ Скачиваю файлы (${REF:0:12})"
mkdir -p "$APP/static" "$DATA"
for f in vote.py static/vote.html static/admin.html static/qrcode.js static/charts.js static/charts.css static/screen.html; do
  curl -fsSL "$BASE/$f" -o "$APP/$f.new" && mv "$APP/$f.new" "$APP/$f"
done

port_busy() { ss -ltnH 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$1\$"; }

if [ -f "$ENVF" ]; then
  . "$ENVF"
  echo "→ Найдены прежние настройки, порт $VOTE_PORT"
else
  VOTE_ADMIN_KEY="$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)"
  VOTE_PORT="${VOTE_PORT:-80}"
  if port_busy "$VOTE_PORT"; then
    echo "→ Порт $VOTE_PORT занят другой программой, беру 8080"
    VOTE_PORT=8080
  fi
  cat > "$ENVF" <<EOF
VOTE_PORT=$VOTE_PORT
VOTE_ADMIN_KEY=$VOTE_ADMIN_KEY
VOTE_DB=$DATA/vote.db
EOF
  chmod 600 "$ENVF"
fi

cat > /etc/systemd/system/presentation-vote.service <<EOF
[Unit]
Description=Presentation vote
After=network.target

[Service]
EnvironmentFile=$ENVF
Environment=PYTHONIOENCODING=utf-8
ExecStart=/usr/bin/env python3 $APP/vote.py
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable presentation-vote >/dev/null 2>&1
systemctl restart presentation-vote

if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "$VOTE_PORT"/tcp >/dev/null && echo "→ Открыл порт $VOTE_PORT в ufw"
fi
if command -v firewall-cmd >/dev/null && firewall-cmd --state >/dev/null 2>&1; then
  firewall-cmd -q --permanent --add-port="$VOTE_PORT"/tcp && firewall-cmd -q --reload && echo "→ Открыл порт $VOTE_PORT в firewalld"
fi

ok=0
for i in 1 2 3 4 5 6; do
  sleep 1
  if curl -fsS "http://127.0.0.1:$VOTE_PORT/healthz" >/dev/null 2>&1; then ok=1; break; fi
done
if [ "$ok" != 1 ]; then
  echo "Сервер не запустился. Лог:"; journalctl -u presentation-vote -n 30 --no-pager; exit 1
fi

IP="$(curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
HOST="$IP"; [ "$VOTE_PORT" = 80 ] || HOST="$IP:$VOTE_PORT"

cat <<EOF

==============================================
 Готово! Голосование работает.

 Для зала (это и есть QR):  http://$HOST/
 Управление:                http://$HOST/admin?key=$VOTE_ADMIN_KEY

 Ключ админки хранится в $ENVF
 Сохраните ссылку на управление, никому её не давайте.
==============================================
EOF
