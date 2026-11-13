#!/usr/bin/env python3
"""Тесты проверки content.json: python3 -m unittest deploy/test_content.py"""
import copy
import json
import os
import unittest

import validate_content as v  # noqa: E402  (запуск из pet-tags: python3 -m unittest discover -s deploy)

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class ContentTest(unittest.TestCase):
    def setUp(self):
        self.c = json.load(open(os.path.join(SITE, "content.json"), encoding="utf-8"))
        self.ids = v.config_ids(open(os.path.join(SITE, "js", "config.js"), encoding="utf-8").read())

    def errs(self, mutate):
        c = copy.deepcopy(self.c)
        mutate(c)
        return v.validate(c, self.ids)

    def test_current_content_valid(self):
        self.assertEqual(v.validate(self.c, self.ids), [])
        self.assertEqual(v.main(SITE), 0)

    def test_ids_parsed_from_config(self):
        self.assertEqual(len(self.ids["beads"]), 16)
        self.assertIn("circle", self.ids["shapes"])

    def test_lost_id_rejected(self):
        self.assertTrue(any("потерян id" in e for e in self.errs(lambda c: c["catalog"]["shapes"][0].pop("id"))))

    def test_removed_item_rejected(self):
        self.assertTrue(any("не совпадают" in e for e in self.errs(lambda c: c["catalog"]["beads"].pop())))

    def test_bad_prices_rejected(self):
        for bad in (None, -5, "450", True, 10**7):
            def m(c, bad=bad):
                c["catalog"]["shapes"][0]["price"] = bad
            self.assertTrue(self.errs(m), bad)
        self.assertTrue(self.errs(lambda c: c.pop("pricePerStrass")))

    def test_empty_texts_rejected(self):
        self.assertTrue(self.errs(lambda c: c.update(brand="  ")))
        self.assertTrue(self.errs(lambda c: c["catalog"]["extras"][0].update(name="")))
        self.assertTrue(self.errs(lambda c: c.update(faq=[])))
        self.assertTrue(self.errs(lambda c: c.update(reviews=[{"name": "Анна"}])))

    def test_duplicates_rejected(self):
        self.assertTrue(self.errs(lambda c: c["catalog"]["sizes"].__setitem__(1, dict(c["catalog"]["sizes"][0]))))

    def test_price_change_and_review_ok(self):
        def m(c):
            c["catalog"]["shapes"][0]["price"] = 490
            c["reviews"] = [{"name": "Анна и шпиц Бублик", "text": "Спасибо!"}]
        self.assertEqual(self.errs(m), [])

    def test_broken_json_file(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, "js"))
            open(os.path.join(d, "content.json"), "w").write("{oops")
            open(os.path.join(d, "js", "config.js"), "w").write("")
            self.assertEqual(v.main(d), 1)


if __name__ == "__main__":
    unittest.main()
