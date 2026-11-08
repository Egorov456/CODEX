#!/usr/bin/env python3
"""Тесты входа в админку по логину и паролю: python3 -m unittest discover -s deploy -p 'test_*.py'"""
import os
import socket
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request

import order_server as srv

HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN = "github_pat_TEST123"


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start(env_extra):
    port = free_port()
    env = {"PATH": os.environ.get("PATH", ""), "PORT": str(port), **env_extra}
    p = subprocess.Popen([sys.executable, "-I", os.path.join(HERE, "order_server.py")], env=env,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", port), 0.1).close()
            return p, f"http://127.0.0.1:{port}/api/cms/auth?provider=github&site_id=monavita.ru"
        except OSError:
            time.sleep(0.05)
    raise RuntimeError("не запустился")


def req(url, form=None, ip="1.1.1.1"):
    data = urllib.parse.urlencode(form).encode() if form is not None else None
    r = urllib.request.Request(url, data=data, headers={"X-Real-IP": ip, "Host": "monavita.ru"})
    try:
        with urllib.request.urlopen(r, timeout=10) as resp:
            return resp.status, resp.read().decode(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(), dict(e.headers)


class HashTest(unittest.TestCase):
    def test_hash_roundtrip(self):
        h = srv.hash_password("thnx-secret")
        self.assertTrue(h.startswith("pbkdf2_sha256$310000$"))
        self.assertNotIn("thnx-secret", h)
        self.assertTrue(srv.check_password("thnx-secret", h))
        self.assertFalse(srv.check_password("thnx-secreT", h))
        self.assertFalse(srv.check_password("x", "мусор"))


class CmsAuthTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proc, cls.url = start({"CMS_USER": "Admin", "CMS_PASSWORD_HASH": srv.hash_password("pass-1234"),
                                   "CMS_GITHUB_TOKEN": TOKEN})

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait(5)

    def test_login_form(self):
        code, body, h = req(self.url)
        self.assertEqual(code, 200)
        self.assertIn('name="password"', body)
        self.assertNotIn(TOKEN, body)
        self.assertEqual((h["X-Frame-Options"], h["Cache-Control"]), ("DENY", "no-store"))

    def test_good_login_gives_token_only_to_own_site(self):
        code, body, _ = req(self.url, {"user": "admin", "password": "pass-1234"}, ip="2.2.2.2")
        self.assertEqual(code, 200)
        self.assertIn(TOKEN, body)
        self.assertIn('const host = "monavita.ru"', body)
        self.assertIn("authorization:github:success:", body)

    def test_wrong_password_then_lockout(self):
        for _ in range(5):
            code, body, _ = req(self.url, {"user": "Admin", "password": "wrong"}, ip="3.3.3.3")
            self.assertEqual(code, 401)
            self.assertNotIn(TOKEN, body)
        code, body, _ = req(self.url, {"user": "Admin", "password": "pass-1234"}, ip="3.3.3.3")
        self.assertEqual(code, 429)  # даже верный пароль после 5 ошибок
        self.assertNotIn(TOKEN, body)
        self.assertEqual(req(self.url, {"user": "Admin", "password": "pass-1234"}, ip="4.4.4.4")[0], 200)

    def test_wrong_user(self):
        self.assertEqual(req(self.url, {"user": "root", "password": "pass-1234"}, ip="5.5.5.5")[0], 401)


class CmsDisabledTest(unittest.TestCase):
    def test_disabled_without_token(self):
        p, url = start({"CMS_USER": "Admin", "CMS_PASSWORD_HASH": srv.hash_password("pass-1234")})
        try:
            self.assertEqual(req(url)[0], 405)
            code, body, _ = req(url, {"user": "Admin", "password": "pass-1234"})
            self.assertNotIn("github_pat", body)
        finally:
            p.terminate()
            p.wait(5)


if __name__ == "__main__":
    unittest.main()
