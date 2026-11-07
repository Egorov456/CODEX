import { CONFIG } from './config.js';
import { buildShape } from './shapes.js';
import { calcPrice, countChars, defaultState, describe, newOrderId, orderText, presetState } from './pricing.js';
import { copy, goal, initAnalytics, postToMaster, tgLink, waLink } from './send.js';

const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c);
  return el;
};
const money = (n) => `${n.toLocaleString('ru-RU')} ${CONFIG.currency}`;
const byId = (list, id) => list.find((x) => x.id === id) || list[0];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

// ---------- Состояние ----------
const STORE = 'pettag-v1';
let st = defaultState();
try {
  const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
  if (saved) st = { ...st, ...saved, front: { ...st.front, ...saved.front }, back: { ...st.back, ...saved.back } };
} catch { /* приватный режим — работаем без сохранения */ }

// Готовая идея с главной: #preset-<id> в адресе или отметка в localStorage
let presetId = (location.hash.match(/^#preset-([\w-]+)/) || [])[1];
try {
  presetId = presetId || localStorage.getItem('pettag-preset');
  localStorage.removeItem('pettag-preset');
} catch { /* ignore */ }
const preset = CONFIG.presets.find((p) => p.id === presetId);
if (preset) {
  st = presetState(preset);
  try { history.replaceState(null, '', location.pathname); } catch { /* ignore */ }
}

let scene = null;
const refreshers = [];
let lastTotal = calcPrice(st).total;
let updTimer;

function set(mut, label) {
  mut(st);
  try { localStorage.setItem(STORE, JSON.stringify(st)); } catch { /* ignore */ }
  refresh(label);
}

function refresh(label) {
  refreshers.forEach((f) => f());
  const { items, total } = calcPrice(st);
  $('#total').textContent = money(total);
  $('#breakdown').replaceChildren(
    ...items.map((i) => h('div', {}, h('span', {}, i.label), h('span', {}, money(i.price)))),
    h('div', {}, h('span', {}, 'Итого'), h('span', {}, money(total)))
  );
  const diff = total - lastTotal;
  if (diff) {
    const btn = $('#totalBtn');
    btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    if (label) toast(`${label} · ${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}`);
  } else if (label) toast(label);
  lastTotal = total;
  clearTimeout(updTimer);
  updTimer = setTimeout(() => scene?.update(st), 60);
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- Элементы управления ----------
function chips(list, get, put, render, { disabled } = {}) {
  const wrap = h('div', { class: 'chips' });
  const btns = list.map((item) => {
    const b = h('button', { type: 'button', class: 'chip', onclick: () => put(item) }, ...render(item));
    wrap.append(b);
    return [item, b];
  });
  refreshers.push(() => btns.forEach(([item, b]) => {
    b.setAttribute('aria-pressed', String(get() === item.id));
    b.disabled = disabled ? disabled(item) : false;
  }));
  return wrap;
}

function swatches(colors, get, put, { custom = true } = {}) {
  const wrap = h('div', { class: 'swatches' });
  const btns = colors.map((c) => {
    const hex = typeof c === 'string' ? c : c.color;
    const id = typeof c === 'string' ? c : c.id;
    const b = h('button', { type: 'button', class: 'sw', style: `background:${hex}`, title: c.name || hex, 'aria-label': c.name || hex, onclick: () => put(id) });
    wrap.append(b);
    return [id, b];
  });
  let picker;
  if (custom) {
    picker = h('input', { type: 'color', class: 'sw', title: 'Свой цвет', 'aria-label': 'Свой цвет', oninput: (e) => put(e.target.value) });
    wrap.append(picker);
  }
  refreshers.push(() => {
    let any = false;
    btns.forEach(([id, b]) => { const on = get() === id; any ||= on; b.setAttribute('aria-pressed', String(on)); });
    if (picker) { picker.setAttribute('aria-pressed', String(!any)); if (!any && /^#/.test(get())) picker.value = get(); }
  });
  return wrap;
}

function field(label, control, extra) {
  const lab = h('div', { class: 'field-label' }, h('span', {}, label), extra || null);
  return h('div', {}, lab, control);
}

function textInput(get, put, max, placeholder, priceEach) {
  const counter = h('em');
  const inp = h('input', { class: 'input', maxlength: max, placeholder, value: get(), oninput: (e) => put(e.target.value) });
  refreshers.push(() => {
    if (document.activeElement !== inp) inp.value = get();
    const n = countChars(get());
    counter.textContent = `${n} симв.${priceEach ? ` · ${money(n * priceEach)}` : ''}`;
  });
  return [inp, counter];
}

function shapeIcon(id) {
  const pts = buildShape(id).shape.getPoints(40);
  const d = 'M' + pts.map((p) => `${p.x.toFixed(2)},${(-p.y).toFixed(2)}`).join('L') + 'Z';
  const svg = `<svg viewBox="-1.9 -1.9 3.8 3.8" aria-hidden="true"><path d="${d}" fill="currentColor" opacity=".85"/></svg>`;
  return h('span', { html: svg, style: 'color:var(--accent);display:contents' });
}

function step(n, title, summary, ...body) {
  const sum = h('span', { class: 'sum' });
  refreshers.push(() => (sum.textContent = summary()));
  return h('details', { class: 'step', open: n <= 2 ? '' : false },
    h('summary', {}, h('span', { class: 'num' }, String(n)), h('span', {}, title), sum),
    h('div', { class: 'step-body' }, ...body));
}

// ---------- Сборка панели ----------
function buildPanel() {
  const P = $('#panel');
  const mat = () => byId(CONFIG.materials, st.material);

  // 1. Форма
  P.append(step(1, 'Форма и размер', () => `${byId(CONFIG.shapes, st.shape).name}, ${st.size}`,
    field('Форма', chips(CONFIG.shapes, () => st.shape, (s) => set((x) => (x.shape = s.id), s.name),
      (s) => [shapeIcon(s.id), s.name, h('small', {}, money(s.price))])),
    field('Размер', chips(CONFIG.sizes, () => st.size, (s) => set((x) => (x.size = s.id), `Размер ${s.id}`),
      (s) => [s.name, h('small', {}, s.price ? `+${money(s.price)}` : 'включено')]))
  ));

  // 2. Материал
  const colorBox = field('Цвет', swatches(CONFIG.tagColors, () => st.tagColor, (c) => set((x) => (x.tagColor = c))));
  const rimBox = field('Бортик', chips(CONFIG.rimColors, () => st.rim, (r) => set((x) => (x.rim = r.id)), (r) => [r.name]));
  const patBox = field('Узор', chips(CONFIG.patterns, () => st.pattern || 'none', (pt) => set((x) => (x.pattern = pt.id), pt.name),
    (pt) => [pt.name, h('small', {}, pt.price ? `+${money(pt.price)}` : '')]));
  const topColor = field('Цвет фигурки', swatches(CONFIG.topperColors, () => st.topperColor, (c) => set((x) => (x.topperColor = c))));
  refreshers.push(() => {
    colorBox.hidden = mat().kind === 'metal';
    rimBox.hidden = mat().kind !== 'enamel';
    patBox.hidden = mat().kind === 'metal';
    topColor.hidden = !st.topper || st.topper === 'none';
  });
  P.append(step(2, 'Материал, узор и фигурка', () => mat().name,
    field('Материал', chips(CONFIG.materials, () => st.material, (m) => set((x) => (x.material = m.id), m.name),
      (m) => [m.name, h('small', {}, m.price ? `+${money(m.price)}` : 'включено')])),
    colorBox, patBox, rimBox,
    field('Фигурка на адреснике', chips(CONFIG.toppers, () => st.topper || 'none', (t) => set((x) => (x.topper = t.id), t.name),
      (t) => [t.name, h('small', {}, t.price ? `+${money(t.price)}` : '')])),
    topColor));

  // 3. Лицевая сторона
  const [n1, c1] = textInput(() => st.front.line1, (v) => set((x) => (x.front.line1 = v)), CONFIG.limits.frontLine, 'Кличка питомца', CONFIG.pricePerFrontChar);
  const [n2, c2] = textInput(() => st.front.line2, (v) => set((x) => (x.front.line2 = v)), CONFIG.limits.frontLine2, 'Напр.: «Я потерялся»', CONFIG.pricePerFrontChar);
  P.append(step(3, 'Надпись спереди', () => st.front.line1 || '—',
    field('Имя питомца', n1, c1),
    field('Вторая строка (необязательно)', n2, c2),
    field('Шрифт', chips(CONFIG.fonts, () => st.front.font, (f) => set((x) => (x.front.font = f.id), `Шрифт «${f.name}»`),
      (f) => [h('span', { style: `font:${f.css.replace('{s}', 20)}` }, st.front.line1 || 'Бублик'), h('small', {}, f.name)])),
    field('Цвет надписи', chips(CONFIG.textColors, () => st.front.textColor, (c) => set((x) => (x.front.textColor = c.id)), (c) => [c.name])),
    field('Значок', chips(CONFIG.icons, () => st.front.icon, (i) => set((x) => (x.front.icon = i.id), i.name),
      (i) => [i.name, h('small', {}, i.price ? `+${money(i.price)}` : '')]))
  ));

  // 4. Обратная сторона
  const [b1, bc1] = textInput(() => st.back.line1, (v) => set((x) => (x.back.line1 = v)), CONFIG.limits.backLine, '+7 900 000-00-00', CONFIG.pricePerBackChar);
  const [b2, bc2] = textInput(() => st.back.line2, (v) => set((x) => (x.back.line2 = v)), CONFIG.limits.backLine, 'Напр.: «Хозяйка Анна»', CONFIG.pricePerBackChar);
  b1.setAttribute('inputmode', 'tel');
  const showBack = () => { if (scene && Math.round(scene.flipTarget / Math.PI) % 2 === 0) scene.flip(); };
  b1.addEventListener('focus', showBack);
  b2.addEventListener('focus', showBack);
  P.append(step(4, 'Обратная сторона', () => st.back.line1 || '—',
    field('Телефон', b1, bc1), field('Дополнительная строка', b2, bc2),
    h('p', { class: 'note' }, 'При вводе адресник сам повернётся обратной стороной.')));

  // 5. Шнурок
  const cord = () => byId(CONFIG.cords, st.cord);
  const cordColor = field('Цвет шнурка', swatches(CONFIG.cordColors, () => st.cordColor, (c) => set((x) => (x.cordColor = c))));
  const chainColor = field('Цвет цепочки', chips(CONFIG.chainColors, () => st.chainColor, (c) => set((x) => (x.chainColor = c.id)), (c) => [c.name]));
  const neckInp = h('input', { class: 'input', inputmode: 'decimal', maxlength: 5, placeholder: 'Например, 24', value: st.neck || '',
    oninput: (e) => set((x) => (x.neck = e.target.value.replace(/[^\d.,]/g, ''))) });
  const neckBox = field('Обхват шеи питомца, см*', neckInp);
  const neckNote = h('p', { class: 'note' }, 'Измерьте шею мягким сантиметром и добавьте 2 пальца. Узлы на ошейнике регулируют длину.');
  refreshers.push(() => {
    cordColor.hidden = !['wax', 'paracord', 'collar'].includes(st.cord);
    chainColor.hidden = st.cord !== 'chain';
    neckBox.hidden = neckNote.hidden = st.cord !== 'collar';
  });
  const petNote = h('p', { class: 'note' }, 'Для кошек советуем безопасную застёжку: если кошка зацепится ошейником за ветку, он расстегнётся. Стальной тросик для кошек не делаем.');
  refreshers.push(() => (petNote.hidden = st.pet !== 'cat'));
  P.append(step(5, 'Шнурок или ошейник', () => cord().name,
    field('Для кого', chips([{ id: 'dog', name: '🐶 Собака' }, { id: 'cat', name: '🐱 Кошка' }], () => st.pet || 'dog', (p) => set((x) => {
      x.pet = p.id;
      // стальной тросик — только собакам; кошкам предлагаем безопасную застёжку
      x.extras = x.extras.filter((id) => (CONFIG.extras.find((e) => e.id === id)?.only || p.id) === p.id);
    }, p.id === 'cat' ? 'Для кошки' : 'Для собаки'), (p) => [p.name])),
    petNote,
    field('Крепление', chips(CONFIG.cords, () => st.cord, (c) => set((x) => (x.cord = c.id), c.name),
      (c) => [c.name, h('small', {}, c.price ? money(c.price) : 'включено')])),
    cordColor, chainColor, neckBox, neckNote));

  // 6. Бусины
  const pick = { type: 'round', color: CONFIG.beadColors[0] };
  const pickRef = () => pick;
  // у каждой детали свой цвет по умолчанию; количество сбрасывается, чтобы «× 4» не перенеслось на другую деталь
  const pickType = (b) => { pick.type = b.id; if (b.color) pick.color = b.color; count.n = 1; refresh(); };
  const typeChips = chips(CONFIG.beads.filter((b) => b.group !== 'charm'), () => pick.type, pickType, (b) => [b.name, h('small', {}, money(b.price))]);
  const charmChips = chips(CONFIG.beads.filter((b) => b.group === 'charm'), () => pick.type, pickType, (b) => [b.name, h('small', {}, money(b.price))]);
  const count = { n: 1 };
  const countChips = chips([1, 2, 4, 6].map((n) => ({ id: n, name: `× ${n}` })), () => count.n, (c) => { count.n = c.id; refresh(); }, (c) => [c.name]);
  const isLetter = () => !!byId(CONFIG.beads, pick.type).letter;
  const colorChips = swatches(CONFIG.beadColors, () => pick.color, (c) => { pick.color = c; refresh(); });
  const letterInp = h('input', { class: 'input', maxlength: CONFIG.limits.beads, placeholder: 'Слово из букв-бусин, напр. БУБЛИК' });
  const letterBox = field('Буквы', letterInp);
  const full = () => st.beads.length >= CONFIG.limits.beads;
  const addBtn = h('button', { type: 'button', class: 'btn primary', onclick: () => {
    const t = byId(CONFIG.beads, pick.type);
    if (isLetter()) {
      const letters = [...letterInp.value.replace(/\s/g, '')].slice(0, CONFIG.limits.beads - st.beads.length);
      if (!letters.length) { letterInp.focus(); toast('Введите буквы'); return; }
      set((x) => {
        x.beads.push(...letters.map((l) => ({ id: uid(), type: pick.type, color: pick.color, letter: l })));
        x.beadLayout = 'row'; // слово читается подряд
      }, `Буквы «${letters.join('')}»`);
      letterInp.value = '';
    } else {
      const n = Math.min(count.n, CONFIG.limits.beads - st.beads.length);
      set((x) => x.beads.push(...Array.from({ length: n }, () => ({ id: uid(), type: t.id, color: pick.color }))),
        `${t.group === 'charm' ? 'Подвеска' : 'Бусина'} «${t.name}»${n > 1 ? ` × ${n}` : ''}`);
    }
  } }, '+ Добавить');
  const list = h('div', { class: 'bead-list' });
  const noCord = h('p', { class: 'note' }, 'Бусины и подвески надеваются на шнурок, цепочку или ошейник — выберите в шаге 5.');
  const layout = chips([{ id: 'sym', name: 'Симметрично' }, { id: 'row', name: 'В ряд' }], () => st.beadLayout || 'sym',
    (l) => set((x) => (x.beadLayout = l.id)), (l) => [l.name]);
  const clearBtn = h('button', { type: 'button', class: 'btn ghost sm', onclick: () => set((x) => (x.beads = []), 'Бусины убраны') }, 'Убрать все');
  refreshers.push(() => {
    const off = st.cord === 'none';
    noCord.hidden = !off;
    addBtn.disabled = off || full();
    const grp = byId(CONFIG.beads, pickRef().type).group;
    addBtn.textContent = full() ? `Максимум ${CONFIG.limits.beads}` : isLetter() ? '+ Добавить буквы' : grp === 'charm' ? '+ Добавить подвеску' : '+ Добавить бусину';
    letterBox.hidden = !isLetter();
    countBox.hidden = isLetter();
    clearBtn.hidden = !st.beads.length;
    list.replaceChildren(...st.beads.map((b, i) => h('span', { class: 'bead-item' },
      h('i', { style: `background:${b.color};color:${b.letter ? '#0008' : 'transparent'}` }, b.letter || '•'),
      `${i + 1}. ${byId(CONFIG.beads, b.type).name}`,
      h('button', { type: 'button', 'aria-label': 'Убрать', onclick: () => set((x) => (x.beads = x.beads.filter((y) => y.id !== b.id)), 'Бусина убрана') }, '×'))));
  });
  const countBox = field('Сколько добавить', countChips);
  P.append(step(6, 'Бусины и подвески', () => (st.beads.length ? `${st.beads.length} шт.` : 'нет'),
    noCord, field('Бусины', typeChips), field('Подвески-фигурки', charmChips), field('Цвет', colorChips), letterBox, countBox,
    h('div', { class: 'row' }, addBtn, clearBtn), list, field('Расположение', layout)));

  // 7. Стразы и дополнительно
  const extras = h('div', { class: 'chips' });
  const exBtns = CONFIG.extras.map((e) => {
    const b = h('button', { type: 'button', class: 'chip', onclick: () => set((x) => {
      x.extras = x.extras.includes(e.id) ? x.extras.filter((i) => i !== e.id) : [...x.extras, e.id];
    }, e.name) }, e.name, h('small', {}, `+${money(e.price)}`));
    extras.append(b);
    return [e, b];
  });
  refreshers.push(() => exBtns.forEach(([e, b]) => {
    b.setAttribute('aria-pressed', String(st.extras.includes(e.id)));
    b.hidden = !!e.only && e.only !== (st.pet || 'dog');
  }));
  const wristInp = h('input', { class: 'input', inputmode: 'decimal', maxlength: 5, placeholder: 'Например, 16', value: st.wrist || '',
    oninput: (e) => set((x) => (x.wrist = e.target.value.replace(/[^\d.,]/g, ''))) });
  const wristBox = field('Обхват запястья хозяина, см*', wristInp);
  refreshers.push(() => (wristBox.hidden = !st.extras.includes('bracelet')));
  P.append(step(7, 'Стразы и дополнительно', () => [st.strass ? `стразы ${st.strass}` : '', ...st.extras.map((id) => byId(CONFIG.extras, id).name.split(' ')[0])].filter(Boolean).join(', ') || '—',
    field('Стразы по краю', chips(CONFIG.strassCounts.map((n) => ({ id: n, name: n ? `${n} шт.` : 'Без страз' })), () => st.strass,
      (c) => set((x) => (x.strass = c.id), c.id ? `Стразы ${c.id} шт.` : 'Без страз'),
      (c) => [c.name, h('small', {}, c.id ? money(c.id * CONFIG.pricePerStrass) : '')])),
    field('Цвет страз', chips(CONFIG.strassColors, () => st.strassColor, (c) => set((x) => (x.strassColor = c.id)), (c) => [c.name])),
    field('Дополнительно', extras), wristBox));

  // 8. Пожелания
  const ta = h('textarea', { class: 'input', maxlength: 1000, placeholder: 'Пожелания мастеру: оттенок, расположение бусин, сроки…', oninput: (e) => set((x) => (x.comment = e.target.value)) });
  ta.value = st.comment;
  P.append(step(8, 'Комментарий и пожелания', () => (st.comment ? 'есть' : '—'), ta));
}

// ---------- Заказ ----------
const dlg = $('#dlg');
let orderId = '';


function photo() {
  return scene ? scene.snapshot() : '';
}

function downloadPhoto() {
  const a = h('a', { href: photo(), download: `adresnik-${(orderId || 'maket').replace('#', '')}.png` });
  document.body.append(a); a.click(); a.remove();
}


function showSend(text, title, sub) {
  $('#orderForm').hidden = true;
  $('#sent').hidden = false;
  $('#sentTitle').textContent = title;
  $('#sentText').textContent = sub;
  $('#orderPreview').textContent = text;
  $('#sendWa').href = waLink(text);
  $('#sendWa').hidden = !CONFIG.contacts.whatsapp;
  $('#sendTg').hidden = !CONFIG.contacts.telegram;
  // обычная ссылка надёжнее window.open; текст копируем в момент нажатия
  $('#sendTg').href = tgLink();
  $('#sendTg').onclick = () => {
    goal('messenger_click', { via: 'telegram' });
    copy(text).then((ok) => ok && toast('Текст заказа скопирован — вставьте его в чат'));
  };
  $('#sendWa').onclick = () => goal('messenger_click', { via: 'whatsapp' });
  $('#copyOrder').onclick = async () => toast((await copy(text)) ? 'Скопировано' : 'Не удалось скопировать');
  if (!dlg.open) dlg.showModal();
}

function openOrder() {
  if (!st.front.line1.trim()) { toast('Добавьте имя питомца — шаг 3'); return; }
  if (st.cord === 'collar' && !String(st.neck || '').trim()) { toast('Укажите обхват шеи — шаг 5'); return; }
  if (st.extras.includes('bracelet') && !String(st.wrist || '').trim()) { toast('Укажите обхват запястья для браслета — шаг 7'); return; }
  try {
    const c = JSON.parse(localStorage.getItem('pettag-customer') || 'null');
    if (c) for (const [k, v] of Object.entries(c)) { const el = $(`#orderForm [name="${k}"]`); if (el && !el.value && v) el.value = v; }
  } catch { /* ignore */ }
  $('#orderForm').hidden = false;
  $('#sent').hidden = true;
  dlg.showModal();
}

$('#orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try { localStorage.setItem('pettag-customer', JSON.stringify({ name: f.get('name'), phone: f.get('phone'), contact: f.get('contact'), delivery: f.get('delivery') })); } catch { /* ignore */ }
  const customer = { name: f.get('name').trim(), phone: f.get('phone').trim(), contact: f.get('contact'), delivery: f.get('delivery').trim() };
  orderId = newOrderId();
  const text = orderText(st, customer, orderId);
  const { total } = calcPrice(st);
  goal('order_submit', { order_price: total });
  if (f.get('website')) { showSend(text, 'Спасибо!', 'Заказ принят.'); return; } // ловушка для ботов
  if (CONFIG.orderEndpoint) {
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true; btn.textContent = 'Отправляем…';
    const ok = await postToMaster({ kind: 'order', id: orderId, text, image: photo() });
    btn.disabled = false; btn.textContent = 'Отправить заказ';
    if (ok) {
      showSend(text, `Заказ ${orderId} отправлен! 🎉`, 'Мастер уже получил заказ и скоро свяжется с вами. Копия заказа ниже.');
      return;
    }
    toast('Не удалось отправить автоматически — отправьте вручную');
  }
  showSend(text, `Заказ ${orderId} почти готов`, 'Отправьте его мастеру одним нажатием. Фото макета можно скачать и приложить.');
});

function advice() {
  goal('advice_click');
  const { total } = calcPrice(st);
  const text = ['Здравствуйте! Хочу посоветоваться по адреснику 🐾', '', ...describe(st), `Сумма по конструктору: ${money(total)}`,
    st.comment ? `\nВопрос/пожелания: ${st.comment}` : ''].join('\n').trim();
  orderId = '';
  showSend(text, 'Написать мастеру', 'Ваш макет уже в сообщении — останется задать вопрос.');
}

// ---------- Быстрый старт и пошаговая сборка ----------
function applyPreset(p) {
  st = presetState(p);
  try { localStorage.setItem(STORE, JSON.stringify(st)); } catch { /* ignore */ }
  $('#panel').replaceChildren();
  refreshers.length = 0;
  buildPanel();
  enhancePanel();
  refresh(`Идея «${p.title}» — меняйте что угодно`);
  scene?.replay();
}

function enhancePanel() {
  const P = $('#panel');
  const strip = h('div', { class: 'quick' }, h('b', {}, 'Быстрый старт — возьмите готовую идею:'),
    h('div', { class: 'quick-row' }, ...CONFIG.presets.map((p) => h('button', { type: 'button', class: 'chip', onclick: () => applyPreset(p) }, p.title))));
  P.prepend(strip);
  // кнопка «Далее» в каждом шаге: закрывает текущий, открывает следующий
  const steps = [...P.querySelectorAll('details.step')];
  steps.forEach((d, i) => {
    const next = steps[i + 1];
    const btn = next
      ? h('button', { type: 'button', class: 'btn ghost next', onclick: () => { d.open = false; next.open = true; next.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Далее →')
      : h('button', { type: 'button', class: 'btn primary next', onclick: () => openOrder() }, 'Оформить заказ');
    d.querySelector('.step-body').append(btn);
  });
}

// ---------- Запуск ----------
async function init() {
  initAnalytics();
  if (preset) setTimeout(() => toast(`Идея «${preset.title}» — меняйте что угодно`), 900);
  $('#brand').textContent = CONFIG.brand;
  $('#tagline').textContent = CONFIG.tagline;
  document.title = `${CONFIG.brand} — конструктор адресника`;
  buildPanel();
  enhancePanel();
  refresh();

  $('#totalBtn').onclick = () => {
    const b = $('#breakdown'); b.hidden = !b.hidden;
    $('#totalBtn').setAttribute('aria-expanded', String(!b.hidden));
  };
  document.addEventListener('click', (e) => { if (!e.target.closest('.bar')) $('#breakdown').hidden = true; });
  $('#order').onclick = openOrder;
  $('#advice').onclick = advice;
  $('#adviceTop').onclick = advice;
  $('#dlPhoto').onclick = downloadPhoto;
  dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === dlg) dlg.close(); });

  // шрифты нужны до отрисовки надписей
  await Promise.race([
    Promise.all(CONFIG.fonts.map((f) => document.fonts.load(f.css.replace('{s}', 40), 'АаZz0'))).catch(() => {}),
    new Promise((r) => setTimeout(r, 3000)),
  ]);

  try {
    const { TagScene } = await import('./scene.js');
    scene = new TagScene($('#c'));
    scene.update(st);
    $('#loading').remove();
    setTimeout(() => scene.replay(), 200);
  } catch (err) {
    console.error(err);
    $('#loading').textContent = '3D-превью не загрузилось. Конструктор и расчёт цены работают.';
    return;
  }
  $('#flip').onclick = () => scene.flip();
  $('#replay').onclick = () => scene.replay();
  $('#photo').onclick = downloadPhoto;
  $('#spin').onclick = (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    scene.setAutoRotate(on);
  };
  window.__scene = scene; // для отладки
}

init();
