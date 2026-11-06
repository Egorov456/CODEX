#!/usr/bin/env bash
# Автообновление сайта: раз в несколько минут сверяет последний коммит ветки на GitHub
# и, если он новый, ставит его тем же установщиком (VPN-безопасно, с проверкой портов).
# Запускается таймером systemd pettags-update.timer. Лог: journalctl -t pettags
set -euo pipefail

REPO="Egorov456/CODEX"
BRANCH="main"
[ -f /etc/pettags-autoupdate.conf ] && . /etc/pettags-autoupdate.conf
STATE_DIR=/var/lib/pettags
mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/update.lock"
flock -n 9 || exit 0   # предыдущее обновление ещё идёт

sha="$(git ls-remote "https://github.com/$REPO" "refs/heads/$BRANCH" 2>/dev/null | cut -f1 || true)"
if [ -z "$sha" ]; then
  sha="$(curl -fsSL --max-time 20 "https://api.github.com/repos/$REPO/commits/$BRANCH" | grep -m1 '"sha"' | cut -d'"' -f4 || true)"
fi
[ -n "$sha" ] || { logger -t pettags "не удалось узнать версию на GitHub"; exit 0; }
[ "$(cat "$STATE_DIR/deployed-sha" 2>/dev/null || true)" = "$sha" ] && exit 0

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
curl -fsSL --max-time 120 "https://codeload.github.com/$REPO/tar.gz/$sha" | tar xz -C "$T"
SRC="$(find "$T" -mindepth 1 -maxdepth 1 -type d | head -1)/pet-tags"
[ -f "$SRC/deploy/install.sh" ] || { logger -t pettags "в $sha нет pet-tags/deploy/install.sh"; exit 1; }

bash "$SRC/deploy/build-bundle.sh" >/dev/null
if PETTAGS_QUIET=1 bash "$SRC/dist/pettags-install.sh" install > "$STATE_DIR/last-update.log" 2>&1; then
  echo "$sha" > "$STATE_DIR/deployed-sha"
  echo "$sha" > /var/www/pettags/version.txt
  logger -t pettags "сайт обновлён до ${sha:0:7}"
  # установщик мог обновить и сам автообновлятор
  if [ -f "$SRC/deploy/autoupdate.sh" ] && ! cmp -s "$SRC/deploy/autoupdate.sh" /opt/pettags/autoupdate.sh; then
    install -D -m 755 "$SRC/deploy/autoupdate.sh" /opt/pettags/autoupdate.sh
  fi
else
  logger -t pettags "обновление до ${sha:0:7} не удалось, см. $STATE_DIR/last-update.log"
  exit 1
fi
