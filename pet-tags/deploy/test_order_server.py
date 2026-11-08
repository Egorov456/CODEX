#!/usr/bin/env python3
"""Тесты приёма заявок: python3 -m unittest deploy/test_order_server.py (только стандартная библиотека).

Поднимает фейковые Telegram и EspoCRM и проверяет, что заявка не теряется ни при каком отказе.
"""
import json
import os
import socket
import subprocess
import sys
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class Fake(BaseHTTPRequestHandler):
    calls = []           # (path, headers, body)
    tg_fail = False
    crm_fail = False
    crm_reject_phone = False

    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("Content-Length") or 0))
        try:
            body = json.loads(raw)
        except Exception:
            body = raw
        Fake.calls.append((self.path, dict(self.headers), body))
        if self.path.startswith("/bot"):
            code, obj = (500, {"ok": False}) if Fake.tg_fail else (200, {"ok": True})
        elif self.path.startswith("/api/v1/"):
            if Fake.crm_fail or self.headers.get("X-Api-Key") != "k":
                code, obj = 500, {}
            elif self.path.endswith("/Lead") and Fake.crm_reject_phone and "phoneNumber" in body:
                code, obj = 400, {}
            else:
                code, obj = 200, {"id": "id-" + self.path.rsplit("/", 1)[-1].lower()}
        else:
            code, obj = 404, {}
        out = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


class OrderServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fake = ThreadingHTTPServer(("127.0.0.1", 0), Fake)
        threading.Thread(target=cls.fake.serve_forever, daemon=True).start()
        cls.fake_url = f"http://127.0.0.1:{cls.fake.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.fake.shutdown()

    def setUp(self):
        Fake.calls, Fake.tg_fail, Fake.crm_fail, Fake.crm_reject_phone = [], False, False, False
        self.proc = None

    def tearDown(self):
        if self.proc:
            self.proc.terminate()
            self.proc.wait(5)

    def start(self, tg=True, crm=True, espo_url=None):
        port = free_port()
        env = {"PATH": os.environ.get("PATH", ""), "PORT": str(port), "TELEGRAM_API": self.fake_url}
        if tg:
            env.update(TELEGRAM_BOT_TOKEN="t", TELEGRAM_CHAT_ID="1")
        if crm:
            env.update(ESPO_URL=espo_url or self.fake_url, ESPO_API_KEY="k", ESPO_PUBLIC_URL="https://crm.example")
        self.proc = subprocess.Popen([sys.executable, "-I", os.path.join(HERE, "order_server.py")], env=env,
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.url = f"http://127.0.0.1:{port}/"
        for _ in range(50):
            try:
                socket.create_connection(("127.0.0.1", port), 0.1).close()
                return
            except OSError:
                time.sleep(0.05)
        self.fail("order_server не запустился")

    def post(self, payload):
        req = urllib.request.Request(self.url, data=json.dumps(payload).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def paths(self):
        return [c[0].split("/")[-1] for c in Fake.calls]

    def call(self, name):
        return next(c[2] for c in Fake.calls if c[0].endswith(name))

    order = {"kind": "order", "id": "#0811-AB12", "text": "Заказ: Косточка, Бублик", "image": PNG,
             "customer": {"name": "Анна", "phone": "+7 999 123-45-67"}, "total": 950}

    def test_telegram_only_as_before(self):
        self.start(crm=False)
        self.assertEqual(self.post(self.order), (200, {"ok": True, "crm": False}))
        self.assertEqual(self.paths(), ["sendPhoto", "sendMessage"])
        self.assertNotIn("CRM:", self.call("sendMessage")["text"])

    def test_crm_lead_with_maket_and_link_in_telegram(self):
        self.start()
        self.assertEqual(self.post(self.order), (200, {"ok": True, "crm": True}))
        self.assertEqual(self.paths(), ["Lead", "Attachment", "Note", "sendPhoto", "sendMessage"])
        lead = self.call("Lead")
        self.assertEqual((lead["lastName"], lead["phoneNumber"], lead["opportunityAmount"]), ("Анна", "+7 999 123-45-67", 950))
        self.assertEqual(lead["description"], self.order["text"])
        self.assertEqual(self.call("Note")["attachmentsIds"], ["id-attachment"])
        self.assertIn("CRM: https://crm.example/#Lead/view/id-lead", self.call("sendMessage")["text"])

    def test_crm_rejects_phone_retries_minimal(self):
        Fake.crm_reject_phone = True
        self.start()
        self.assertEqual(self.post(self.order)[1]["crm"], True)
        leads = [c[2] for c in Fake.calls if c[0].endswith("/Lead")]
        self.assertEqual(len(leads), 2)
        self.assertNotIn("phoneNumber", leads[1])

    def test_crm_down_telegram_still_delivers(self):
        self.start(espo_url=f"http://127.0.0.1:{free_port()}")
        self.assertEqual(self.post(self.order), (200, {"ok": True, "crm": False}))
        self.assertIn("sendMessage", self.paths())

    def test_crm_error_telegram_still_delivers(self):
        Fake.crm_fail = True
        self.start()
        self.assertEqual(self.post(self.order), (200, {"ok": True, "crm": False}))

    def test_telegram_down_crm_saves(self):
        Fake.tg_fail = True
        self.start()
        self.assertEqual(self.post(self.order), (200, {"ok": True, "crm": True}))

    def test_crm_only_without_bot(self):
        self.start(tg=False)
        self.assertEqual(self.post(self.order), (200, {"ok": True, "crm": True}))
        self.assertNotIn("sendMessage", self.paths())

    def test_everything_down_is_502(self):
        Fake.tg_fail = Fake.crm_fail = True
        self.start()
        self.assertEqual(self.post(self.order)[0], 502)

    def test_lead_without_customer_or_image(self):
        self.start()
        self.assertEqual(self.post({"kind": "lead", "id": "#З1", "text": "Заявка"})[1]["crm"], True)
        lead = self.call("Lead")
        self.assertEqual(lead["lastName"], "Без имени")
        self.assertNotIn("phoneNumber", lead)
        self.assertNotIn("Attachment", self.paths())

    def test_installer_test_message_not_in_crm(self):
        self.start()
        self.post({"kind": "test", "id": "test", "text": "✅ проверка"})
        self.assertEqual(self.paths(), ["sendMessage"])

    def test_honeypot_and_bad_input(self):
        self.start()
        self.assertEqual(self.post({"text": "spam", "website": "x"}), (200, {"ok": True}))
        self.assertEqual(self.post({"text": "  "})[0], 400)
        self.assertEqual(Fake.calls, [])

    def test_not_configured(self):
        self.start(tg=False, crm=False)
        self.assertEqual(self.post(self.order)[0], 500)


if __name__ == "__main__":
    unittest.main()
