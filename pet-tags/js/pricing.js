import { CONFIG } from './config.js';

const byId = (list, id) => list.find((x) => x.id === id) || list[0];
export const countChars = (s) => (s || '').replace(/\s/g, '').length;

// ---------- Варианты бусин и палитры шнурков ----------
// Вариант: { id, name, color, finish, accent }
export function variantsOf(type) {
  const list = CONFIG.beadVariants?.[type];
  return list ? list.map(([id, name, color, finish, accent]) => ({ id, name, color, finish, accent })) : null;
}
export const variantOf = (b) => { const vs = variantsOf(b.type); return vs ? vs.find((v) => v.id === b.v) || vs[0] : null; };

const rgb = (hex) => { const n = parseInt(String(hex || '').replace('#', ''), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const dist = (a, b) => { const [x, y] = [rgb(a), rgb(b)]; return (x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2; };
export const nearest = (list, hex, colorOf = (x) => x.color) => list.reduce((best, x) => (dist(colorOf(x), hex) < dist(colorOf(best), hex) ? x : best), list[0]);

// Паракорд и ошейник-бусы (тоже паракорд) — только цвета поставщика; вощёный шнур — своя палитра
export const cordPalette = (cord) => (cord === 'paracord' || cord === 'collar' ? CONFIG.paracordColors : CONFIG.cordColors.map((c) => ({ id: c, color: c })));

// Бусины из старого ассортимента → ближайшая новая форма (для сохранённых макетов)
const LEGACY = { round: 'pony', silicone: 'pony', tennis: 'pony', facet: 'pony-clear', metal: 'pony-fx', pearl: 'marble', heart: 'heart-puffy', star: 'flower', daisy: 'flower' };

export function normalizeBead(b) {
  const out = { ...b };
  if (!CONFIG.beads.some((t) => t.id === out.type)) out.type = LEGACY[out.type] || 'pony';
  const vs = variantsOf(out.type);
  if (vs) {
    const v = vs.find((x) => x.id === out.v) || nearest(vs, out.color || vs[0].color);
    out.v = v.id;
    out.color = v.color;
  } else {
    delete out.v;
    out.color = out.color || byId(CONFIG.beads, out.type).color || '#ffffff';
  }
  return out;
}

// Приводит сохранённое/готовое состояние к текущему ассортименту
export function normalizeState(st) {
  const pal = cordPalette(st.cord);
  if (['paracord', 'collar'].includes(st.cord) && !pal.some((c) => c.id === st.cordColor)) st.cordColor = nearest(pal, st.cordColor || pal[0].color).id;
  st.beads = (st.beads || []).map(normalizeBead);
  return st;
}

export function defaultState() {
  return {
    shape: 'bone',
    size: 'M',
    material: 'enamel',
    tagColor: CONFIG.tagColors[0],
    rim: 'gold',
    pattern: 'none',
    topper: 'none',
    topperColor: '#d9b38c',
    neck: '',
    wrist: '',
    pet: 'dog',
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
  return normalizeState({
    ...d, ...s,
    front: { ...d.front, ...(s.front || {}) },
    back: { ...d.back, ...(s.back || {}) },
    beads: (s.beads || []).map((b, i) => ({ id: `${p.id}-${i}`, ...b })),
    extras: [...(s.extras || [])],
  });
}

export function calcPrice(st) {
  const items = [];
  const shape = byId(CONFIG.shapes, st.shape);
  const size = byId(CONFIG.sizes, st.size);
  const mat = byId(CONFIG.materials, st.material);
  items.push({ label: `Основа «${shape.name}»`, price: shape.price });
  if (size.price) items.push({ label: `Размер ${size.id}`, price: size.price });
  if (mat.price) items.push({ label: `Материал: ${mat.name}`, price: mat.price });
  const pat = mat.kind !== 'metal' && CONFIG.patterns.find((x) => x.id === st.pattern);
  if (pat && pat.price) items.push({ label: `Узор «${pat.name}»`, price: pat.price });
  const top = CONFIG.toppers.find((x) => x.id === st.topper);
  if (top && top.price) items.push({ label: `Фигурка «${top.name}»`, price: top.price });

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
  for (const { t, n } of Object.values(groups)) items.push({ label: `${t.group === 'charm' ? 'Подвеска' : 'Бусина'} «${t.name}» × ${n}`, price: t.price * n });

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
  const pat = mat.kind !== 'metal' && CONFIG.patterns.find((x) => x.id === st.pattern && x.id !== 'none');
  if (pat) m += `, узор «${pat.name}»`;
  lines.push(m);
  const top = CONFIG.toppers.find((x) => x.id === st.topper && x.id !== 'none');
  if (top) lines.push(`Фигурка на адреснике: ${top.name}, цвет ${st.topperColor}`);
  lines.push(`Спереди: «${st.front.line1}»${st.front.line2 ? ` / «${st.front.line2}»` : ''} — шрифт ${font.name}, цвет ${tc.name}${icon.id !== 'none' ? `, значок ${icon.name}` : ''}`);
  if (st.back.line1 || st.back.line2) lines.push(`Сзади: «${st.back.line1}»${st.back.line2 ? ` / «${st.back.line2}»` : ''}`);
  let c = `Шнурок: ${cord.name}`;
  if (['wax', 'paracord', 'collar'].includes(cord.id)) {
    const named = cordPalette(cord.id).find((x) => x.id === st.cordColor && x.name);
    c += `, цвет ${named ? `«${named.name}» ` : ''}${colorName(st.cordColor)}`;
  }
  if (cord.id === 'chain') c += `, ${byId(CONFIG.chainColors, st.chainColor).name}`;
  if (cord.id === 'collar') c += `, обхват шеи: ${st.neck ? `${st.neck} см` : 'не указан — уточнить!'}`;
  lines.push(c);
  if (st.beads.length) {
    lines.push(
      'Бусины (по порядку от колечка): ' +
        st.beads.map((b, i) => {
          const v = variantOf(b);
          return `${i + 1}) ${byId(CONFIG.beads, b.type).name}${v ? ` — ${v.name}` : ''}${b.letter ? ` «${b.letter}»` : ''}${v ? '' : ` ${colorName(b.color)}`}`;
        }).join('; ')
    );
  }
  if (st.strass) lines.push(`Стразы: ${st.strass} шт., ${byId(CONFIG.strassColors, st.strassColor).name}`);
  lines.unshift(`Для кого: ${st.pet === 'cat' ? 'кошка' : 'собака'}`);
  if (st.extras.includes('bracelet')) lines.push(`Браслет для хозяина: тот же шнур и бусины, обхват запястья: ${st.wrist ? `${st.wrist} см` : 'не указан — уточнить!'}`);
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
