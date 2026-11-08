// Тесты подстановки контента в CONFIG: node --test deploy/test_config.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CONFIG as BASE, applyContent } from '../js/config.js';

const content = JSON.parse(fs.readFileSync(new URL('../content.json', import.meta.url), 'utf8'));

test('цены и названия подставляются по id, тех. поля сохраняются', () => {
  const c = applyContent(BASE, content);
  const steel = c.materials.find((m) => m.id === 'steel');
  assert.deepEqual([steel.name, steel.price, steel.kind, steel.color], ['Сталь', 0, 'metal', '#c9ccd1']);
  assert.equal(c.cords.find((x) => x.id === 'wax').radius, 0.055);
  assert.equal(c.shapes.length, 7);
  assert.equal(c.faq[0].length, 2);
  assert.equal(c.currency, '₽');
});

test('изменённая в админке цена попадает в CONFIG', () => {
  const edited = structuredClone(content);
  edited.catalog.shapes.find((s) => s.id === 'circle').price = 490;
  edited.pricePerStrass = 25;
  const c = applyContent(BASE, edited);
  assert.equal(c.shapes.find((s) => s.id === 'circle').price, 490);
  assert.equal(c.pricePerStrass, 25);
});

test('мусор не ломает CONFIG: неизвестные id игнорируются, плохая цена → 0', () => {
  const bad = structuredClone(content);
  bad.catalog.shapes.push({ id: 'hack', name: 'x', price: 1 });
  bad.catalog.shapes[0].price = '450';
  bad.faq.push({ q: 'без ответа' });
  const c = applyContent(BASE, bad);
  assert.equal(c.shapes.length, 7);
  assert.equal(c.shapes[0].price, 0);
  assert.equal(c.faq.length, content.faq.length);
  assert.doesNotThrow(() => applyContent(BASE, null));
});
