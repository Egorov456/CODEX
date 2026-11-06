import { CONFIG } from './config.js';

const byId = (list, id) => list.find((x) => x.id === id) || list[0];
export const countChars = (s) => (s || '').replace(/\s/g, '').length;

export function defaultState() {
  return {
    shape: 'bone',
    size: 'M',
    material: 'enamel',
    tagColor: CONFIG.tagColors[0],
    rim: 'gold',
    front: { line1: 'Бублик', line2: '', font: 'Comfortaa', textColor: 'auto', icon: 'paw' },
    back: { line1: '+7 999 000-00-00', line2: '' },
    cord: 'wax',
    cordColor: CONFIG.cordColors[0],
    chainColor: 'silver',
    beads: [],
    strass: 0,
    strassColor: 'clear',
    extras: [],
    comment: '',
  };
}

// Состояние из готовой идеи (частичные поля + значения по умолчанию)
export function presetState(p) {
  const d = defaultState();
  const s = p.state || {};
  return {
    ...d, ...s,
    front: { ...d.front, ...(s.front || {}) },
    back: { ...d.back, ...(s.back || {}) },
    beads: (s.beads || []).map((b, i) => ({ id: `${p.id}-${i}`, ...b })),
    extras: [...(s.extras || [])],
  };
}

export function calcPrice(st) {
  const items = [];
  const shape = byId(CONFIG.shapes, st.shape);
  const size = byId(CONFIG.sizes, st.size);
  const mat = byId(CONFIG.materials, st.material);
  items.push({ label: `Основа «${shape.name}»`, price: shape.price });
  if (size.price) items.push({ label: `Размер ${size.id}`, price: size.price });
  if (mat.price) items.push({ label: `Материал: ${mat.name}`, price: mat.price });

  const fc = countChars(st.front.line1) + countChars(st.front.line2);
  if (fc) items.push({ label: `Надпись спереди: ${fc} симв. × ${CONFIG.pricePerFrontChar}`, price: fc * CONFIG.pricePerFrontChar });
  const icon = byId(CONFIG.icons, st.front.icon);
  if (icon.price) items.push({ label: `Значок «${icon.name}»`, price: icon.price });
  const bc = countChars(st.back.line1) + countChars(st.back.line2);
  if (bc) items.push({ label: `Надпись сзади: ${bc} симв. × ${CONFIG.pricePerBackChar}`, price: bc * CONFIG.pricePerBackChar });

  const cord = byId(CONFIG.cords, st.cord);
  if (cord.price) items.push({ label: cord.name, price: cord.price });

  const groups = {};
  for (const b of st.beads) {
    const t = byId(CONFIG.beads, b.type);
    groups[t.id] = groups[t.id] || { t, n: 0 };
    groups[t.id].n++;
  }
  for (const { t, n } of Object.values(groups)) items.push({ label: `Бусина «${t.name}» × ${n}`, price: t.price * n });

  if (st.strass) items.push({ label: `Стразы × ${st.strass}`, price: st.strass * CONFIG.pricePerStrass });
  for (const id of st.extras) {
    const e = CONFIG.extras.find((x) => x.id === id);
    if (e) items.push({ label: e.name, price: e.price });
  }
  return { items, total: items.reduce((s, i) => s + i.price, 0) };
}

const colorName = (hex) => hex; // в заказе цвет передаётся HEX-кодом + видно на фото макета

export function describe(st) {
  const shape = byId(CONFIG.shapes, st.shape);
  const size = byId(CONFIG.sizes, st.size);
  const mat = byId(CONFIG.materials, st.material);
  const font = byId(CONFIG.fonts, st.front.font);
  const tc = byId(CONFIG.textColors, st.front.textColor);
  const icon = byId(CONFIG.icons, st.front.icon);
  const cord = byId(CONFIG.cords, st.cord);
  const lines = [];
  lines.push(`Форма: ${shape.name}, размер ${size.name}`);
  let m = `Материал: ${mat.name}`;
  if (mat.kind !== 'metal') m += `, цвет ${colorName(st.tagColor)}`;
  if (mat.kind === 'enamel') m += `, бортик ${byId(CONFIG.rimColors, st.rim).name}`;
  lines.push(m);
  lines.push(`Спереди: «${st.front.line1}»${st.front.line2 ? ` / «${st.front.line2}»` : ''} — шрифт ${font.name}, цвет ${tc.name}${icon.id !== 'none' ? `, значок ${icon.name}` : ''}`);
  if (st.back.line1 || st.back.line2) lines.push(`Сзади: «${st.back.line1}»${st.back.line2 ? ` / «${st.back.line2}»` : ''}`);
  let c = `Шнурок: ${cord.name}`;
  if (cord.id === 'wax' || cord.id === 'paracord') c += `, цвет ${colorName(st.cordColor)}`;
  if (cord.id === 'chain') c += `, ${byId(CONFIG.chainColors, st.chainColor).name}`;
  lines.push(c);
  if (st.beads.length) {
    lines.push(
      'Бусины (по порядку от колечка): ' +
        st.beads.map((b, i) => `${i + 1}) ${byId(CONFIG.beads, b.type).name}${b.type === 'letter' ? ` «${b.letter}»` : ''} ${colorName(b.color)}`).join('; ')
    );
  }
  if (st.strass) lines.push(`Стразы: ${st.strass} шт., ${byId(CONFIG.strassColors, st.strassColor).name}`);
  const ex = st.extras.map((id) => CONFIG.extras.find((x) => x.id === id)?.name).filter(Boolean);
  if (ex.length) lines.push(`Дополнительно: ${ex.join(', ')}`);
  return lines;
}

export function orderText(st, customer, orderId) {
  const { items, total } = calcPrice(st);
  const out = [`🐾 Заказ ${orderId}`, ''];
  if (customer) {
    out.push(`Клиент: ${customer.name}`, `Телефон: ${customer.phone}`);
    if (customer.contact) out.push(`Связь: ${customer.contact}`);
    if (customer.delivery) out.push(`Доставка: ${customer.delivery}`);
    out.push('');
  }
  out.push(...describe(st), '');
  out.push('Расчёт:', ...items.map((i) => `• ${i.label} — ${i.price} ${CONFIG.currency}`));
  out.push(`ИТОГО: ${total} ${CONFIG.currency}`);
  if (st.comment) out.push('', `Пожелания: ${st.comment}`);
  return out.join('\n');
}

export function newOrderId() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `#${p(d.getDate())}${p(d.getMonth() + 1)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
