#!/usr/bin/env python3
"""Проверка content.json перед выкладкой: python3 validate_content.py <папка сайта>.

Правки из админки сразу уходят на прод через автообновление, поэтому битый контент
(пустая цена, потерянный id, удалённая позиция) должен остановить установку: сайт остаётся на прошлой версии.
"""
import json
import re
import sys
from pathlib import Path

LISTS = ["shapes", "sizes", "materials", "patterns", "toppers", "icons", "cords", "beads", "extras"]
TEXTS = ["brand", "tagline", "productionDays", "delivery", "payment"]
MAX_PRICE = 100_000


def config_ids(config_js):
    """id позиций каждого списка из js/config.js (там они заданы строками вида { id: 'circle', ... })."""
    out = {}
    for k in LISTS:
        m = re.search(rf"\n  {k}: \[(.*?)\n  \],", config_js, re.S)
        out[k] = re.findall(r"\{ id: '([^']+)'", m.group(1)) if m else []
    return out


def is_price(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and 0 <= v <= MAX_PRICE


def validate(content, ids):
    errors = []
    if not isinstance(content, dict):
        return ["content.json должен быть объектом"]
    for k in TEXTS:
        if not isinstance(content.get(k), str) or not content[k].strip():
            errors.append(f"«{k}»: нужен непустой текст")
    for k in ["seller", "metrikaId"]:
        if k in content and not isinstance(content[k], str):
            errors.append(f"«{k}»: нужен текст")
    c = content.get("contacts")
    if not isinstance(c, dict) or not all(isinstance(c.get(x, ""), str) for x in ("whatsapp", "telegram", "email")):
        errors.append("«contacts»: нужны текстовые поля whatsapp, telegram, email")
    for k in ["pricePerFrontChar", "pricePerBackChar", "pricePerStrass"]:
        if not is_price(content.get(k)):
            errors.append(f"«{k}»: нужна цена от 0 до {MAX_PRICE}")
    if not isinstance(content.get("promises", []), list) or not all(isinstance(x, str) for x in content.get("promises", [])):
        errors.append("«promises»: нужен список строк")
    for i, r in enumerate(content.get("reviews") or []):
        if not isinstance(r, dict) or not str(r.get("name", "")).strip() or not str(r.get("text", "")).strip():
            errors.append(f"отзыв №{i + 1}: нужны имя и текст")
    faq = content.get("faq")
    if not isinstance(faq, list) or not faq:
        errors.append("«faq»: нужен хотя бы один вопрос")
    else:
        for i, f in enumerate(faq):
            if not isinstance(f, dict) or not str(f.get("q", "")).strip() or not str(f.get("a", "")).strip():
                errors.append(f"вопрос FAQ №{i + 1}: нужны вопрос и ответ")
    cat = content.get("catalog")
    if not isinstance(cat, dict):
        return errors + ["«catalog»: нет каталога позиций"]
    for k in LISTS:
        items = cat.get(k)
        if not isinstance(items, list):
            errors.append(f"каталог «{k}»: нет списка")
            continue
        got = []
        for i, it in enumerate(items):
            if not isinstance(it, dict) or not isinstance(it.get("id"), str) or not it["id"]:
                errors.append(f"каталог «{k}» №{i + 1}: потерян id")
                continue
            got.append(it["id"])
            if not isinstance(it.get("name"), str) or not it["name"].strip():
                errors.append(f"каталог «{k}» / {it['id']}: пустое название")
            if not is_price(it.get("price")):
                errors.append(f"каталог «{k}» / {it['id']}: нужна цена от 0 до {MAX_PRICE}")
        if len(set(got)) != len(got):
            errors.append(f"каталог «{k}»: повторяются id")
        if ids.get(k) and set(got) != set(ids[k]):
            miss, extra = sorted(set(ids[k]) - set(got)), sorted(set(got) - set(ids[k]))
            errors.append(f"каталог «{k}»: не совпадают позиции с config.js (нет: {miss}, лишние: {extra})")
    return errors


def main(site):
    site = Path(site)
    try:
        content = json.loads((site / "content.json").read_text(encoding="utf-8"))
    except Exception as e:
        print(f"content.json не читается: {e}")
        return 1
    errors = validate(content, config_ids((site / "js" / "config.js").read_text(encoding="utf-8")))
    for e in errors:
        print("✘", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
