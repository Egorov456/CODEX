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

test('каталог бусин: у каждой формы есть варианты, у вариантов уникальные id и цвета HEX', async () => {
  const { variantsOf } = await import('../js/pricing.js');
  const forms = BASE.beads.filter((b) => b.group === 'bead' && !b.letter);
  assert.equal(forms.length, 8);
  let total = 0;
  for (const f of forms) {
    const vs = variantsOf(f.id);
    assert.ok(vs && vs.length, f.id);
    assert.equal(new Set(vs.map((v) => v.id)).size, vs.length, f.id);
    for (const v of vs) assert.match(v.color, /^#[0-9a-f]{6}$/, `${f.id}:${v.id}`);
    total += vs.length;
  }
  assert.equal(total, 85);
  assert.equal(BASE.paracordColors.length, 20);
});

test('старые бусины и цвета шнурка переводятся в новый ассортимент', async () => {
  const { normalizeState, presetState } = await import('../js/pricing.js');
  const st = normalizeState({ cord: 'paracord', cordColor: '#8a9a2b', beads: [
    { id: 1, type: 'facet', color: '#48dbfb' }, { id: 2, type: 'metal', color: '#e6b84f' }, { id: 3, type: 'disc', color: '#fff', letter: 'А' },
  ] });
  assert.ok(BASE.paracordColors.some((c) => c.id === st.cordColor));
  assert.deepEqual(st.beads.map((b) => [b.type, b.v]), [['pony-clear', 'aqua'], ['pony-fx', 'gold'], ['disc', undefined]]);
  for (const p of BASE.presets) {
    for (const b of presetState(p).beads) assert.ok(BASE.beads.some((t) => t.id === b.type) && b.color, `${p.id}: ${b.type}`);
  }
});
