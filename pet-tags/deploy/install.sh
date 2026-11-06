#!/usr/bin/env bash
# Установка сайта адресников на сервер (Debian/Ubuntu) БЕЗ вмешательства в работающий VPN.
#
#   bash install.sh check              — только проверка: что работает на сервере и что будет сделано
#   bash install.sh install            — установка (порт выбирается сам: 80, если свободен, иначе 8080+)
#   PORT=8080 bash install.sh install  — установка на конкретный порт
#   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... bash install.sh install — плюс заявки в Telegram
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
    location ~ /\. { deny all; }
    location ~* \.(js|css)$ { expires 1h; }
    location / { try_files \$uri \$uri/ =404; }
}
EOF
}

setup_bot() {
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ] || { warn "Токен бота не задан — заявки клиенты будут отправлять через мессенджеры сами"; return 0; }
  has_systemd || { warn "Нет systemd — приём заявок не установлен"; return 0; }
  command -v python3 >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 >/dev/null
  port_busy "$API_PORT" && ! systemctl is-active --quiet pettags-orders && die "Порт $API_PORT занят — приём заявок не установлен"
  install -d -m 755 "$OPT"; install -m 755 "$HERE/order_server.py" "$OPT/order_server.py"
  umask 077; printf 'TELEGRAM_BOT_TOKEN=%s\nTELEGRAM_CHAT_ID=%s\n' "$TELEGRAM_BOT_TOKEN" "$TELEGRAM_CHAT_ID" > /etc/pettags.env; umask 022
  cat > /etc/systemd/system/pettags-orders.service <<EOF
[Unit]
Description=Приём заявок с сайта адресников в Telegram
After=network-online.target
[Service]
EnvironmentFile=/etc/pettags.env
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
  sleep 1
  if curl -s --max-time 25 -X POST -H 'Content-Type: application/json' \
      -d '{"id":"test","text":"✅ Сайт адресников подключён. Сюда будут приходить заявки и заказы."}' \
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
    report
    PORTS_BEFORE="$(listening)"; VPN_BEFORE="$(vpn_snapshot)"
    SITE_PORT="$(pick_port)"
    touch "$STATE"; install_nginx
    say "Копирую сайт в $WEB"
    [ -d "$WEB" ] && cp -a "$WEB" "$WEB.bak-$(date +%s)"
    install -d "$WEB"; cp -a "$SITE_SRC/." "$WEB/"; rm -rf "$WEB/api" "$WEB/deploy"
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
  uninstall)
    VPN_BEFORE="$(vpn_snapshot)"
    if has_systemd; then
      systemctl disable --now pettags-orders >/dev/null 2>&1 || true
      rm -f /etc/systemd/system/pettags-orders.service; systemctl daemon-reload
    fi
    rm -f /etc/pettags.env
    rm -f "$NGX_CONF" "$NGX_CONF.bak"
    if nginx -t >/dev/null 2>&1 && pgrep -x nginx >/dev/null; then nginx -s reload || true; fi
    rm -rf "$WEB" "$OPT" "$STATE"
    ok "Сайт удалён (nginx и VPN оставлены как есть)"
    check_vpn_after "$VPN_BEFORE" || true
    ;;
  *) die "Режим: check | install | uninstall" ;;
esac
