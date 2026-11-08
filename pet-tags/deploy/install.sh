#!/usr/bin/env bash
# Установка сайта адресников на сервер (Debian/Ubuntu) БЕЗ вмешательства в работающий VPN.
#
#   bash install.sh check              — только проверка: что работает на сервере и что будет сделано
#   bash install.sh install            — установка (порт выбирается сам: 80, если свободен, иначе 8080+)
#   PORT=8080 bash install.sh install  — установка на конкретный порт
#   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... bash install.sh install — плюс заявки в Telegram
#   CONTACT_WHATSAPP=79991234567 CONTACT_TELEGRAM=nick bash install.sh install — контакты мастера на сайте
#   ESPO_URL=http://127.0.0.1:8090 ESPO_API_KEY=... bash install.sh install — плюс заявки лидами в EspoCRM
#   bash install.sh crm                — поднять EspoCRM в Docker (только если Docker уже стоит)
#   Все эти настройки сохраняются в /etc/pettags.env и переживают автообновление.
#   bash install.sh uninstall          — удалить сайт (VPN не затрагивается)
#
# Что скрипт НИКОГДА не делает: не занимает порт 443 и порты, которые уже слушаются; не трогает iptables/nftables,
# конфиги VPN и чужие сайты nginx; не делает apt upgrade; не перезапускает nginx (только reload после nginx -t);
# не перезагружает firewalld/ufw целиком.
set -euo pipefail

MODE="${1:-check}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_SRC="$HERE/site"
WEB=/var/www/pettags
OPT=/opt/pettags
NGX_CONF=/etc/nginx/conf.d/pettags.conf
STATE=/etc/pettags.state
API_PORT=8787
VPN_RE='xray|x-ui|3x-ui|v2ray|sing-box|hysteria|wireguard|wg-quick|openvpn|outline|shadowsocks|ss-server|marzban|amnezia|awg|trojan|naive|ocserv|ipsec|strongswan|tuic'

say()  { printf '\033[1;35m▸\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✘ %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Запустите от root"
command -v apt-get >/dev/null || die "Нужен Debian/Ubuntu (apt)"
command -v ss >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iproute2 >/dev/null
command -v curl >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl >/dev/null

listening() { ss -H -ltn | awk '{print $4}' | sed -E 's/.*:([0-9]+)$/\1/' | sort -u; }
port_busy() { listening | grep -qx "$1"; }
vpn_snapshot() {
  { pgrep -a -f -i "$VPN_RE" 2>/dev/null | awk '{print $2}' | grep -v -E '(^|/)(ba|da)?sh$|pgrep|install' || true
    ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | grep -E '^(wg|tun|tap|awg|amn)' || true
    command -v docker >/dev/null && docker ps --format '{{.Names}}' 2>/dev/null || true
  } | sort -u
}
has_systemd() { [ -d /run/systemd/system ]; }
nginx_apply() {  # применить конфиг nginx мягко: reload, если уже работает
  if has_systemd; then
    if systemctl is-active --quiet nginx; then systemctl reload nginx; else systemctl enable --now nginx >/dev/null 2>&1; fi
  else
    if pgrep -x nginx >/dev/null; then nginx -s reload; else nginx; fi
  fi
}
ENV_FILE=/etc/pettags.env
ENV_KEYS="TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID CONTACT_WHATSAPP CONTACT_TELEGRAM ESPO_URL ESPO_PUBLIC_URL ESPO_API_KEY CMS_USER CMS_PASSWORD_HASH CMS_GITHUB_TOKEN"
load_env() {  # значения из окружения важнее сохранённых в /etc/pettags.env
  local k; declare -A given=()
  for k in $ENV_KEYS; do [ -n "${!k:-}" ] && given[$k]="${!k}"; done
  if [ -f "$ENV_FILE" ]; then set -a; . "$ENV_FILE"; set +a; fi
  for k in "${!given[@]}"; do printf -v "$k" '%s' "${given[$k]}"; export "$k"; done
}
save_env() {
  local k; umask 077; : > "$ENV_FILE"
  for k in $ENV_KEYS; do  # в одинарных кавычках: bash не раскрывает $ в хеше, systemd кавычки снимает
    [ -n "${!k:-}" ] || continue
    [[ "${!k}" == *"'"* ]] && die "$k: значение не должно содержать апостроф"
    printf "%s='%s'\n" "$k" "${!k}" >> "$ENV_FILE"
  done
  umask 022
}
prepare_cms() {  # вход в админку по логину и паролю: пароль превращаем в хеш, сам пароль не сохраняем
  if [ -n "${CMS_PASSWORD:-}" ]; then
    [ "${#CMS_PASSWORD}" -ge 8 ] || die "CMS_PASSWORD: не короче 8 символов"
    command -v python3 >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 >/dev/null
    CMS_PASSWORD_HASH="$(CMS_PASSWORD="$CMS_PASSWORD" python3 -I "$HERE/order_server.py" hash)"; export CMS_PASSWORD_HASH
    unset CMS_PASSWORD
  fi
  if [ -n "${CMS_GITHUB_TOKEN:-}" ] && [[ ! "$CMS_GITHUB_TOKEN" =~ ^(github_pat_|ghp_)[A-Za-z0-9_]+$ ]]; then
    die "CMS_GITHUB_TOKEN: нужен токен GitHub вида github_pat_…"
  fi
  if [ -n "${CMS_USER:-}${CMS_PASSWORD_HASH:-}${CMS_GITHUB_TOKEN:-}" ] && { [ -z "${CMS_USER:-}" ] || [ -z "${CMS_PASSWORD_HASH:-}" ] || [ -z "${CMS_GITHUB_TOKEN:-}" ]; }; then
    warn "Вход в админку по паролю не включён: нужны все три — CMS_USER, CMS_PASSWORD и CMS_GITHUB_TOKEN"
  fi
}
apply_contacts() {  # подставить реальные контакты мастера в content.json сайта (перекрывают значения из админки)
  local f="$WEB/content.json"
  if [ -n "${CONTACT_WHATSAPP:-}" ]; then
    CONTACT_WHATSAPP="$(printf '%s' "$CONTACT_WHATSAPP" | tr -cd '0-9')"
    [ "${#CONTACT_WHATSAPP}" -ge 10 ] || die "CONTACT_WHATSAPP: нужен номер из 10–15 цифр, например 79991234567"
  fi
  if [ -n "${CONTACT_TELEGRAM:-}" ]; then
    CONTACT_TELEGRAM="${CONTACT_TELEGRAM#@}"
    [[ "$CONTACT_TELEGRAM" =~ ^[A-Za-z0-9_]{4,32}$ ]] || die "CONTACT_TELEGRAM: ник Telegram без @ (латиница, цифры, _)"
  fi
  if [ -n "${CONTACT_WHATSAPP:-}${CONTACT_TELEGRAM:-}" ]; then
    WA="${CONTACT_WHATSAPP:-}" TG="${CONTACT_TELEGRAM:-}" python3 -I - "$f" <<'PY'
import json, os, sys
p = sys.argv[1]
d = json.load(open(p, encoding="utf-8"))
for k, env in (("whatsapp", "WA"), ("telegram", "TG")):
    if os.environ.get(env):
        d.setdefault("contacts", {})[k] = os.environ[env]
open(p, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
PY
  fi
  if grep -qE "79990000000|your_telegram" "$f"; then
    warn "На сайте стоят контакты-заглушки! Клиенты пишут в никуда. Укажите их в админке /admin или задайте CONTACT_WHATSAPP и CONTACT_TELEGRAM"
  fi
}
public_ip() { curl -4 -s --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}'; }

report() {
  say "Сервер: $(. /etc/os-release; echo "$PRETTY_NAME"), IP $(public_ip)"
  say "Занятые порты: $(listening | tr '\n' ' ')"
  local v; v="$(vpn_snapshot | tr '\n' ' ')"
  if [ -n "$v" ]; then ok "VPN/сервисы, которые не будут затронуты: $v"; else warn "VPN-процессы не распознаны автоматически — проверьте вывод портов выше"; fi
  if command -v nginx >/dev/null; then say "nginx уже установлен: $(nginx -v 2>&1 | cut -d/ -f2)"; else say "nginx не установлен — будет поставлен (без автозапуска на занятых портах)"; fi
  if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q 'Status: active'; then say "ufw активен — будет добавлено одно правило allow для порта сайта"; fi
  if systemctl is-active --quiet firewalld 2>/dev/null; then say "firewalld активен — порт сайта будет открыт без перезагрузки firewalld"; fi
}

pick_port() {
  if [ -n "${PORT:-}" ]; then
    [ "$PORT" = 443 ] && die "Порт 443 не используем — его обычно занимает VPN"
    if port_busy "$PORT" && ! grep -qs "listen $PORT" "$NGX_CONF"; then die "Порт $PORT уже занят"; fi
    echo "$PORT"; return
  fi
  if [ -f "$STATE" ]; then . "$STATE"; [ -n "${SITE_PORT:-}" ] && { echo "$SITE_PORT"; return; }; fi
  if ! port_busy 80; then echo 80; return; fi
  for p in $(seq 8080 8099); do port_busy "$p" || { echo "$p"; return; }; done
  die "Не нашёл свободный порт 8080–8099"
}

check_vpn_after() {
  local before="$1" after missing
  after="$(vpn_snapshot)"
  missing="$(comm -23 <(echo "$before") <(echo "$after") | grep -v '^$' || true)"
  if [ -n "$missing" ]; then warn "После установки не видно: $missing — проверьте VPN!"; return 1; fi
  ok "VPN и сервисы на месте: $(echo "$after" | tr '\n' ' ')"
}

check_ports_after() {
  local before="$1" missing
  missing="$(comm -23 <(echo "$before") <(listening) | grep -v '^$' || true)"
  if [ -n "$missing" ]; then warn "Перестали слушаться порты: $missing — проверьте VPN!"; return 1; fi
  ok "Все порты, которые слушались до установки, работают"
}

install_nginx() {
  command -v nginx >/dev/null && return 0
  say "Ставлю nginx (без автозапуска, чтобы не задеть занятые порты)"
  printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d; chmod +x /usr/sbin/policy-rc.d
  trap 'rm -f /usr/sbin/policy-rc.d' EXIT
  DEBIAN_FRONTEND=noninteractive apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends nginx >/dev/null
  rm -f /usr/sbin/policy-rc.d; trap - EXIT
  rm -f /etc/nginx/sites-enabled/default   # стандартная заглушка nginx на :80 нам не нужна
  echo "NGINX_INSTALLED_BY_US=1" >> "$STATE"
}

write_nginx_conf() {
  local port="$1" v6=""
  [ -f /proc/net/if_inet6 ] && v6="    listen [::]:$port;"
  cat > "$NGX_CONF" <<EOF
# Сайт адресников (установлен pettags/install.sh)
server {
    listen $port;
$v6
    server_name _;
    root $WEB;
    index index.html;
    charset utf-8;
    server_tokens off;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    gzip on;
    gzip_types text/css application/javascript text/javascript application/json image/svg+xml;

    location /api/order {
        limit_except POST { deny all; }
        client_max_body_size 8m;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_pass http://127.0.0.1:$API_PORT;
    }
    location /api/cms/ {
        limit_except GET POST { deny all; }
        client_max_body_size 8k;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_pass http://127.0.0.1:$API_PORT;
    }
    location ~ /\. { deny all; }
    location ~* \.(js|css|html|json|yml)$ { add_header Cache-Control "no-cache" always; add_header X-Content-Type-Options nosniff always; }
    location / { try_files \$uri \$uri/ =404; }
}
EOF
}

setup_bot() {
  local tg=0 crm=0
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] && tg=1
  [ -n "${ESPO_URL:-}" ] && [ -n "${ESPO_API_KEY:-}" ] && crm=1
  [ -n "${CMS_USER:-}" ] && [ -n "${CMS_PASSWORD_HASH:-}" ] && [ -n "${CMS_GITHUB_TOKEN:-}" ] && crm="${crm}c"
  [ "$tg$crm" != 00 ] || { warn "Ни Telegram-бот, ни CRM не заданы — заявки клиенты будут отправлять через мессенджеры сами"; return 0; }
  [ "$tg" = 1 ] || warn "Telegram-бот не задан — заявки без уведомлений в Telegram"
  case "$crm" in *c) ok "Вход в админку /admin по логину и паролю включён (логин: $CMS_USER)"; crm="${crm%c}";; esac
  has_systemd || { warn "Нет systemd — приём заявок не установлен"; return 0; }
  command -v python3 >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 >/dev/null
  port_busy "$API_PORT" && ! systemctl is-active --quiet pettags-orders && die "Порт $API_PORT занят — приём заявок не установлен"
  install -d -m 755 "$OPT"; install -m 755 "$HERE/order_server.py" "$OPT/order_server.py"
  cat > /etc/systemd/system/pettags-orders.service <<EOF
[Unit]
Description=Приём заявок с сайта адресников (Telegram, EspoCRM)
After=network-online.target
[Service]
EnvironmentFile=$ENV_FILE
Environment=PORT=$API_PORT
ExecStart=/usr/bin/python3 $OPT/order_server.py
DynamicUser=yes
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
Restart=on-failure
MemoryMax=128M
[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now pettags-orders >/dev/null 2>&1
  systemctl restart pettags-orders
  sed -i "s#orderEndpoint: '[^']*'#orderEndpoint: '/api/order'#" "$WEB/js/config.js"
  [ "$crm" = 1 ] && ok "Заявки будут заводиться лидами в EspoCRM ($ESPO_URL)"
  [ -n "${PETTAGS_QUIET:-}" ] || [ "$tg" = 0 ] && { ok "Приём заявок работает"; return 0; }
  sleep 1
  if curl -s --max-time 25 -X POST -H 'Content-Type: application/json' \
      -d '{"kind":"test","id":"test","text":"✅ Сайт адресников подключён. Сюда будут приходить заявки и заказы."}' \
      "http://127.0.0.1:$API_PORT/" | grep -q '"ok": true'; then
    ok "Тестовое сообщение отправлено в Telegram — проверьте чат"
  else
    warn "Тестовое сообщение не дошло: проверьте токен, chat id и что вы написали боту /start. Сайт при этом работает."
  fi
}

case "$MODE" in
  check)
    report
    say "Сайт будет установлен на порт $(pick_port) → http://$(public_ip):$(pick_port)/"
    say "Для установки: bash ${PETTAGS_CMD:-$0} install"
    ;;
  install)
    [ -d "$SITE_SRC" ] || die "Не найдена папка site рядом со скриптом"
    command -v python3 >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 >/dev/null
    python3 -I "$HERE/validate_content.py" "$SITE_SRC" || die "content.json с ошибками (см. выше) — сайт НЕ обновлён, работает прежняя версия. Исправьте в админке /admin"
    report
    PORTS_BEFORE="$(listening)"; VPN_BEFORE="$(vpn_snapshot)"
    SITE_PORT="$(pick_port)"
    touch "$STATE"; install_nginx
    say "Копирую сайт в $WEB"
    [ -d "$WEB" ] && cp -a "$WEB" "$WEB.bak-$(date +%s)"
    ls -1dt "$WEB".bak-* 2>/dev/null | tail -n +4 | while read -r old; do rm -rf -- "$old"; done
    install -d "$WEB"; cp -a "$SITE_SRC/." "$WEB/"; rm -rf "$WEB/api" "$WEB/deploy"
    load_env; prepare_cms; apply_contacts; save_env
    chown -R root:root "$WEB"; find "$WEB" -type d -exec chmod 755 {} +; find "$WEB" -type f -exec chmod 644 {} +
    [ -f "$NGX_CONF" ] && cp "$NGX_CONF" "$NGX_CONF.bak"
    write_nginx_conf "$SITE_PORT"
    if ! nginx -t >/dev/null 2>&1; then
      nginx -t || true
      if [ -f "$NGX_CONF.bak" ]; then mv "$NGX_CONF.bak" "$NGX_CONF"; else rm -f "$NGX_CONF"; fi
      die "Проверка конфигурации nginx не прошла — изменения откатил, VPN не тронут"
    fi
    nginx_apply
    sed -i '/^SITE_PORT=/d' "$STATE"; echo "SITE_PORT=$SITE_PORT" >> "$STATE"
    if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q 'Status: active'; then ufw allow "$SITE_PORT/tcp" >/dev/null && ok "ufw: открыт порт $SITE_PORT"; fi
    if systemctl is-active --quiet firewalld 2>/dev/null; then
      firewall-cmd -q --add-port="$SITE_PORT/tcp" && firewall-cmd -q --permanent --add-port="$SITE_PORT/tcp" && ok "firewalld: открыт порт $SITE_PORT"
    fi
    setup_bot
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$SITE_PORT/")"
    [ "$code" = 200 ] && ok "Сайт отвечает локально (HTTP 200)" || warn "Сайт ответил кодом $code"
    check_ports_after "$PORTS_BEFORE" || true
    check_vpn_after "$VPN_BEFORE" || true
    echo; ok "Готово: http://$(public_ip):$SITE_PORT/"
    say "Если страница не открывается снаружи — у хостинга может быть свой фаервол: откройте TCP $SITE_PORT в панели."
    ;;
  crm)
    command -v docker >/dev/null && docker compose version >/dev/null 2>&1 || die "Docker с compose не найден. Ставить Docker сюда не буду: он меняет iptables (политика FORWARD → DROP) и может сломать VPN. Поднимите CRM на отдельном VPS по deploy/crm/docker-compose.yml"
    CRM_DIR=/opt/pettags-crm; CRM_ENV="$CRM_DIR/.env"; CRM_PORT="${CRM_PORT:-8090}"
    install -d -m 700 "$CRM_DIR"; install -m 644 "$HERE/crm/docker-compose.yml" "$CRM_DIR/docker-compose.yml"
    if [ ! -f "$CRM_ENV" ]; then
      port_busy "$CRM_PORT" && die "Порт $CRM_PORT занят — задайте другой: CRM_PORT=8091 bash ${PETTAGS_CMD:-$0} crm"
      gen() { head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24; }
      umask 077
      printf 'CRM_PORT=%s\nDB_ROOT_PASSWORD=%s\nDB_PASSWORD=%s\nADMIN_PASSWORD=%s\nSITE_URL=%s\n' \
        "$CRM_PORT" "$(gen)" "$(gen)" "$(gen)" "${ESPO_PUBLIC_URL:-http://127.0.0.1:$CRM_PORT}" > "$CRM_ENV"
      umask 022
    fi
    PORTS_BEFORE="$(listening)"; VPN_BEFORE="$(vpn_snapshot)"
    (cd "$CRM_DIR" && docker compose up -d)
    check_ports_after "$PORTS_BEFORE" || true
    check_vpn_after "$VPN_BEFORE" || true
    . "$CRM_ENV"
    ok "EspoCRM запускается на 127.0.0.1:$CRM_PORT (первый старт 1–2 минуты). Логин admin, пароль: grep ADMIN_PASSWORD $CRM_ENV"
    say "Дальше: создайте API-пользователя в CRM и выполните ESPO_URL=http://127.0.0.1:$CRM_PORT ESPO_API_KEY=… bash ${PETTAGS_CMD:-$0} install (см. README)"
    ;;
  autoupdate)
    has_systemd || die "Нужен systemd"
    command -v git >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git >/dev/null
    BR="${2:-${PETTAGS_BRANCH:-main}}"
    install -d -m 755 "$OPT"; install -m 755 "$HERE/autoupdate.sh" "$OPT/autoupdate.sh"
    printf 'REPO=%s\nBRANCH=%s\n' "${PETTAGS_REPO:-Egorov456/CODEX}" "$BR" > /etc/pettags-autoupdate.conf
    cat > /etc/systemd/system/pettags-update.service <<EOF
[Unit]
Description=Автообновление сайта адресников из GitHub
After=network-online.target
[Service]
Type=oneshot
ExecStart=$OPT/autoupdate.sh
Nice=10
EOF
    cat > /etc/systemd/system/pettags-update.timer <<EOF
[Unit]
Description=Проверка обновлений сайта адресников каждые 5 минут
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
RandomizedDelaySec=30s
[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload
    systemctl enable --now pettags-update.timer >/dev/null 2>&1
    ok "Автообновление включено: ветка $BR, проверка каждые 5 минут"
    say "Журнал обновлений: journalctl -t pettags   ·   выключить: bash ${PETTAGS_CMD:-$0} autoupdate-off"
    ;;
  autoupdate-off)
    systemctl disable --now pettags-update.timer >/dev/null 2>&1 || true
    rm -f /etc/systemd/system/pettags-update.service /etc/systemd/system/pettags-update.timer /etc/pettags-autoupdate.conf
    systemctl daemon-reload
    ok "Автообновление выключено, сайт оставлен как есть"
    ;;
  uninstall)
    VPN_BEFORE="$(vpn_snapshot)"
    systemctl disable --now pettags-update.timer >/dev/null 2>&1 || true
    rm -f /etc/systemd/system/pettags-update.service /etc/systemd/system/pettags-update.timer /etc/pettags-autoupdate.conf
    if has_systemd; then
      systemctl disable --now pettags-orders >/dev/null 2>&1 || true
      rm -f /etc/systemd/system/pettags-orders.service; systemctl daemon-reload
    fi
    rm -f "$ENV_FILE"
    rm -f "$NGX_CONF" "$NGX_CONF.bak"
    if nginx -t >/dev/null 2>&1 && pgrep -x nginx >/dev/null; then nginx -s reload || true; fi
    rm -rf "$WEB" "$OPT" "$STATE"
    ok "Сайт удалён (nginx и VPN оставлены как есть)"
    check_vpn_after "$VPN_BEFORE" || true
    ;;
  *) die "Режим: check | install | crm | autoupdate [ветка] | autoupdate-off | uninstall" ;;
esac
