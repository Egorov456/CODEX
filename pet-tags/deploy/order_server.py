#!/usr/bin/env python3
"""Приём заявок и заказов с сайта и пересылка мастеру в Telegram (только стандартная библиотека Python 3).

Слушает 127.0.0.1:8787, наружу открывается через nginx (location /api/order).
Переменные окружения:
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — уведомления мастеру в Telegram;
  ESPO_URL, ESPO_API_KEY — заявка заводится лидом в EspoCRM (необязательно);
  ESPO_PUBLIC_URL — адрес CRM для ссылки в Telegram (по умолчанию ESPO_URL);
  для тестов — TELEGRAM_API, PORT.
Если CRM недоступна, заявка всё равно уходит в Telegram — ничего не теряется.
"""
import base64
import json
import os
import re
import time
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

    def do_GET(self):
        self.reply(405, {"error": "method"})

    def do_POST(self):
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
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
