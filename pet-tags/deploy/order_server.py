#!/usr/bin/env python3
"""Приём заявок и заказов с сайта и пересылка мастеру в Telegram (только стандартная библиотека Python 3).

Слушает 127.0.0.1:8787, наружу открывается через nginx (location /api/order).
Переменные окружения:
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — уведомления мастеру в Telegram;
  ESPO_URL, ESPO_API_KEY — заявка заводится лидом в EspoCRM (необязательно);
  ESPO_PUBLIC_URL — адрес CRM для ссылки в Telegram (по умолчанию ESPO_URL);
  CMS_USER, CMS_PASSWORD_HASH, CMS_GITHUB_TOKEN — вход в админку /admin по логину и паролю (необязательно);
  для тестов — TELEGRAM_API, PORT.
Если CRM недоступна, заявка всё равно уходит в Telegram — ничего не теряется.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import time
import urllib.parse
import urllib.request
import uuid
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT = os.environ.get("TELEGRAM_CHAT_ID", "")
API = os.environ.get("TELEGRAM_API", "https://api.telegram.org").rstrip("/")
ESPO = os.environ.get("ESPO_URL", "").rstrip("/")
ESPO_KEY = os.environ.get("ESPO_API_KEY", "")
ESPO_PUBLIC = os.environ.get("ESPO_PUBLIC_URL", "").rstrip("/") or ESPO
PORT = int(os.environ.get("PORT", "8787"))
MAX_BODY = 8 * 1024 * 1024
MAX_TEXT = 3800
RATE = (8, 600)  # не больше 8 запросов с одного IP за 10 минут
PNG = re.compile(r"^data:image/png;base64,([A-Za-z0-9+/=]+)$")
hits = defaultdict(deque)
CMS_USER = os.environ.get("CMS_USER", "")
CMS_HASH = os.environ.get("CMS_PASSWORD_HASH", "")
CMS_TOKEN = os.environ.get("CMS_GITHUB_TOKEN", "")
CMS_FAILS = (5, 900)  # не больше 5 неверных паролей с одного IP за 15 минут
fails = defaultdict(deque)


def hash_password(password, salt=None, iterations=310_000):
    """pbkdf2_sha256$итерации$соль$хеш — в /etc/pettags.env хранится только это, не пароль."""
    salt = salt or uuid.uuid4().hex
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${base64.b64encode(dk).decode()}"


def check_password(password, stored):
    try:
        algo, it, salt, _ = stored.split("$", 3)
        return algo == "pbkdf2_sha256" and hmac.compare_digest(hash_password(password, salt, int(it)), stored)
    except Exception:
        return False


LOGIN_PAGE = """<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Вход в админку</title><style>
body{{font:16px system-ui,sans-serif;background:#1d1f24;color:#eee;display:grid;place-items:center;min-height:100vh;margin:0}}
form{{background:#2a2d34;padding:28px;border-radius:16px;width:min(320px,86vw);display:grid;gap:12px}}
h1{{font-size:20px;margin:0 0 4px}}input,button{{font:inherit;padding:12px;border-radius:10px;border:1px solid #444;background:#1d1f24;color:#eee}}
button{{background:#ff5a1f;border:0;color:#fff;font-weight:600}}.err{{color:#ff8a80;margin:0}}</style></head><body>
<form method="post"><h1>Mona Vita · админка</h1>{error}
<input name="user" placeholder="Логин" autocomplete="username" required autofocus>
<input name="password" type="password" placeholder="Пароль" autocomplete="current-password" required>
<input type="hidden" name="provider" value="{provider}"><button>Войти</button></form></body></html>"""

# Тот же обмен сообщениями, что у OAuth-прокси Sveltia/Decap: токен уходит только окну нашего же сайта.
TOKEN_PAGE = """<!doctype html><html><body><script>
(() => {{
  const host = {host};
  window.addEventListener('message', ({{ data, origin }}) => {{
    if (data !== 'authorizing:github') return;
    try {{ if (new URL(origin).hostname !== host) return; }} catch {{ return; }}
    window.opener?.postMessage('authorization:github:success:' + JSON.stringify({{ provider: 'github', token: {token} }}), origin);
  }});
  window.opener?.postMessage('authorizing:github', '*');
}})();
</script><p>Вход выполнен, окно можно закрыть.</p></body></html>"""


def tg(method, data=None, files=None):
    url = f"{API}/bot{TOKEN}/{method}"
    if files:
        boundary = uuid.uuid4().hex
        parts = []
        for k, v in (data or {}).items():
            parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        for k, (name, blob, ctype) in files.items():
            parts.append(
                f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{name}"\r\n'
                f"Content-Type: {ctype}\r\n\r\n".encode() + blob + b"\r\n"
            )
        parts.append(f"--{boundary}--\r\n".encode())
        body, ctype = b"".join(parts), f"multipart/form-data; boundary={boundary}"
    else:
        body, ctype = json.dumps(data).encode(), "application/json"
    req = urllib.request.Request(url, data=body, headers={"Content-Type": ctype}, method="POST")
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.status == 200


def espo(method, path, data):
    req = urllib.request.Request(
        f"{ESPO}/api/v1/{path}", data=json.dumps(data).encode(), method=method,
        headers={"Content-Type": "application/json", "X-Api-Key": ESPO_KEY},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read() or b"{}")


def clean(v, n):
    return v.strip()[:n] if isinstance(v, str) else ""


def crm_lead(body, text, oid, png):
    """Создаёт лид в EspoCRM. Возвращает id лида или None — сбой CRM не должен терять заявку."""
    if not ESPO or not ESPO_KEY or body.get("kind") == "test":  # проверочное сообщение установщика — не в CRM
        return None
    c = body.get("customer") if isinstance(body.get("customer"), dict) else {}
    kind = "Заказ" if body.get("kind") == "order" else "Заявка"
    lead = {
        "lastName": clean(c.get("name"), 100) or "Без имени",
        "description": text,
        "source": "Web Site",
        "status": "New",
    }
    phone = clean(c.get("phone"), 30)
    total = body.get("total")
    full = dict(lead)
    if phone:
        full["phoneNumber"] = phone
    if isinstance(total, (int, float)) and 0 < total < 10_000_000:
        full["opportunityAmount"] = total
    lead_id = None
    for attempt in (full, lead):  # 2-я попытка — без полей, которые CRM могла отвергнуть (формат телефона, валюта)
        try:
            lead_id = espo("POST", "Lead", attempt).get("id")
            break
        except Exception as e:
            print(f"espocrm lead error: {e}", flush=True)
    if lead_id and png:
        try:  # макет — заметкой с вложением в карточке лида
            att = espo("POST", "Attachment", {"name": f"maket-{oid or 'order'}.png", "type": "image/png",
                                               "role": "Attachment", "parentType": "Note", "field": "attachments",
                                               "file": "data:image/png;base64," + png})
            espo("POST", "Note", {"type": "Post", "parentType": "Lead", "parentId": lead_id,
                                  "post": f"Макет: {kind.lower()} {oid}", "attachmentsIds": [att["id"]]})
        except Exception as e:
            print(f"espocrm attachment error: {e}", flush=True)
    return lead_id


def limited(ip):
    now = time.time()
    q = hits[ip]
    while q and now - q[0] > RATE[1]:
        q.popleft()
    if len(q) >= RATE[0]:
        return True
    q.append(now)
    return False


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def page(self, code, body):
        data = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(data)

    def cms_on(self):
        return self.path.split("?")[0].rstrip("/").endswith("/cms/auth") and CMS_USER and CMS_HASH and CMS_TOKEN

    def do_GET(self):
        if self.cms_on():
            return self.page(200, LOGIN_PAGE.format(error="", provider="github"))
        self.reply(405, {"error": "method"})

    def cms_login(self):
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        q, now = fails[ip], time.time()
        while q and now - q[0] > CMS_FAILS[1]:
            q.popleft()
        if len(q) >= CMS_FAILS[0]:
            return self.page(429, LOGIN_PAGE.format(error='<p class="err">Слишком много попыток. Подождите 15 минут.</p>', provider="github"))
        size = int(self.headers.get("Content-Length") or 0)
        form = urllib.parse.parse_qs(self.rfile.read(min(max(size, 0), 4096)).decode(errors="replace"))
        user = (form.get("user") or [""])[0].strip()
        password = (form.get("password") or [""])[0]
        ok_user = hmac.compare_digest(user.lower().encode(), CMS_USER.lower().encode())
        if not (check_password(password, CMS_HASH) and ok_user):
            q.append(now)
            self.log_message("cms: неверный вход, логин %r", user[:40])
            return self.page(401, LOGIN_PAGE.format(error='<p class="err">Неверный логин или пароль</p>', provider="github"))
        q.clear()
        host = (self.headers.get("X-Forwarded-Host") or self.headers.get("Host") or "").split(":")[0]
        self.log_message("cms: вход %r", user[:40])
        return self.page(200, TOKEN_PAGE.format(host=json.dumps(host), token=json.dumps(CMS_TOKEN)))

    def do_POST(self):
        if self.cms_on():
            return self.cms_login()
        tg_on, crm_on = bool(TOKEN and CHAT), bool(ESPO and ESPO_KEY)
        if not tg_on and not crm_on:
            return self.reply(500, {"error": "not configured"})
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        if limited(ip):
            return self.reply(429, {"error": "too many"})
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 0 or size > MAX_BODY:
            return self.reply(413, {"error": "size"})
        try:
            body = json.loads(self.rfile.read(size))
            assert isinstance(body, dict)
        except Exception:
            return self.reply(400, {"error": "json"})
        if body.get("website"):
            return self.reply(200, {"ok": True})  # ловушка для ботов
        text = body.get("text") if isinstance(body.get("text"), str) else ""
        text = text[:MAX_TEXT]
        oid = str(body.get("id") or "")[:20]
        if not text.strip():
            return self.reply(400, {"error": "empty"})
        m = PNG.match(body.get("image") or "") if isinstance(body.get("image"), str) else None
        lead_id = crm_lead(body, text, oid, m.group(1) if m else None)
        if lead_id and ESPO_PUBLIC:
            text = f"{text}\n\nCRM: {ESPO_PUBLIC}/#Lead/view/{lead_id}"
        ok = bool(lead_id)
        if tg_on:
            try:
                if m:
                    tg("sendPhoto", {"chat_id": CHAT, "caption": f"🐾 Макет заказа {oid}"},
                       {"photo": ("maket.png", base64.b64decode(m.group(1)), "image/png")})
                ok = tg("sendMessage", {"chat_id": CHAT, "text": text}) or ok  # без parse_mode
            except Exception as e:
                self.log_message("telegram error: %s", e)
        if not ok:
            return self.reply(502, {"error": "delivery"})
        return self.reply(200, {"ok": True, "crm": bool(lead_id)})

    def log_message(self, fmt, *args):
        print(f"{self.address_string()} {fmt % args}", flush=True)


if __name__ == "__main__":
    import sys
    if sys.argv[1:2] == ["hash"]:  # python3 order_server.py hash  (пароль читается из CMS_PASSWORD)
        print(hash_password(os.environ["CMS_PASSWORD"]))
        sys.exit(0)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
