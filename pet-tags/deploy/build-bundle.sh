#!/usr/bin/env bash
# Собирает один файл-установщик dist/pettags-install.sh (сайт внутри), который можно загрузить на сервер.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/site" "$ROOT/dist"
cp -a "$ROOT"/index.html "$ROOT"/constructor.html "$ROOT"/privacy.html "$ROOT"/robots.txt "$ROOT"/css "$ROOT"/js "$TMP/site/"
cp "$ROOT/deploy/install.sh" "$ROOT/deploy/order_server.py" "$ROOT/deploy/autoupdate.sh" "$TMP/"
V="$(date +%s)"   # метка версии: браузеры не возьмут старые файлы из кэша
sed -i -E "s#(href=\"css/[a-z]+\.css)\"#\1?v=$V\"#g; s#(src=\"js/[a-z]+\.js)\"#\1?v=$V\"#g" "$TMP"/site/*.html
sed -i -E "s#(from '\./[a-z]+\.js)'#\1?v=$V'#g; s#import\('\./scene\.js'\)#import('./scene.js?v=$V')#g" "$TMP"/site/js/*.js
OUT="$ROOT/dist/pettags-install.sh"
cat > "$OUT" <<'HDR'
#!/usr/bin/env bash
# Установщик сайта адресников. Использование: bash pettags-install.sh check | install | uninstall
set -e
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
sed '1,/^__ARCHIVE__$/d' "$0" | base64 -d | tar -xz -C "$T"
PETTAGS_CMD="$0" bash "$T/install.sh" "$@"
exit $?
__ARCHIVE__
HDR
tar -czf - -C "$TMP" . | base64 >> "$OUT"
chmod +x "$OUT"
echo "$OUT ($(du -h "$OUT" | cut -f1))"
