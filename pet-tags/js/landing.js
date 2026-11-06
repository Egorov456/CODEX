import { CONFIG } from './config.js';
import { buildShape } from './shapes.js';
import { calcPrice, defaultState, presetState } from './pricing.js';
import { copy, goal, initAnalytics, newId, postToMaster, tgLink, waLink } from './send.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => `${n.toLocaleString('ru-RU')} ${CONFIG.currency}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fill = (s) => s.replace('{days}', CONFIG.productionDays).replace('{delivery}', CONFIG.delivery).replace('{payment}', CONFIG.payment);
const minPrice = Math.min(...CONFIG.shapes.map((s) => s.price));
const presets = CONFIG.presets.map((p) => ({ ...p, st: presetState(p) }));

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------- Тексты из настроек ----------
function fillTexts() {
  $$('[data-brand]').forEach((el) => (el.textContent = CONFIG.brand));
  $$('[data-tagline]').forEach((el) => (el.textContent = CONFIG.tagline));
  $$('[data-days]').forEach((el) => (el.textContent = CONFIG.productionDays));
  $$('[data-min-price]').forEach((el) => (el.textContent = `от ${money(minPrice)}`));

  const c = CONFIG.contacts;
  const links = [];
  if (c.whatsapp) links.push(`<a href="${esc(waLink('Здравствуйте! Хочу адресник для питомца 🐾'))}" target="_blank" rel="noopener" data-goal="messenger_click">WhatsApp</a>`);
  if (c.telegram) links.push(`<a href="${esc(tgLink())}" target="_blank" rel="noopener" data-goal="messenger_click">Telegram @${esc(c.telegram)}</a>`);
  if (c.email) links.push(`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`);
  $('#contacts').innerHTML = links.length ? `Или напишите напрямую: ${links.join(' · ')}` : '';
  $('#footContacts').innerHTML = links.join('');
  $('#navSocial').innerHTML = [
    c.telegram && `<a href="${esc(tgLink())}" target="_blank" rel="noopener" aria-label="Telegram" data-goal="messenger_click">TG</a>`,
    c.whatsapp && `<a href="${esc(waLink('Здравствуйте! Хочу адресник для питомца 🐾'))}" target="_blank" rel="noopener" aria-label="WhatsApp" data-goal="messenger_click">WA</a>`,
  ].filter(Boolean).join('');
  $('#floatMsg').innerHTML = [
    c.whatsapp && `<a href="${esc(waLink('Здравствуйте! Хочу адресник для питомца 🐾'))}" target="_blank" rel="noopener" style="background:#25d366" aria-label="Написать в WhatsApp" data-goal="messenger_click">WA</a>`,
    c.telegram && `<a href="${esc(tgLink())}" target="_blank" rel="noopener" style="background:#2aabee" aria-label="Написать в Telegram" data-goal="messenger_click">TG</a>`,
  ].filter(Boolean).join('');
}

// ---------- Цены ----------
function fillPrices() {
  const beadMin = Math.min(...CONFIG.beads.map((b) => b.price));
  const paidCords = CONFIG.cords.filter((c) => c.price);
  const iconPrice = CONFIG.icons.find((i) => i.price)?.price || 0;
  const rows = [
    ['Основа адресника (форма)', `от ${money(minPrice)}`],
    ['Размер M / L', CONFIG.sizes.filter((s) => s.price).map((s) => `+${money(s.price)}`).join(' / ')],
    ['Золото, эмаль, акрил', `+${money(Math.min(...CONFIG.materials.filter((m) => m.price).map((m) => m.price)))} – ${money(Math.max(...CONFIG.materials.map((m) => m.price)))}`],
    ['Буква на лицевой стороне', money(CONFIG.pricePerFrontChar)],
    ['Символ на обороте (телефон)', money(CONFIG.pricePerBackChar)],
    ['Значок (лапка, сердце, корона…)', money(iconPrice)],
    ['Шнурок или цепочка', `${money(Math.min(...paidCords.map((c) => c.price)))} – ${money(Math.max(...paidCords.map((c) => c.price)))}`],
    ['Бусина', `от ${money(beadMin)}`],
    ['Страза', money(CONFIG.pricePerStrass)],
    ...CONFIG.extras.map((e) => [e.name, money(e.price)]),
  ];
  $('#priceTable').innerHTML = rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('');

  const st = defaultState();
  const { items, total } = calcPrice(st);
  $('#priceExample').innerHTML = `<b>Пример: косточка «${esc(st.front.line1)}» с телефоном и шнурком</b>` +
    items.map((i) => `<div class="row-p"><span>${esc(i.label)}</span><span>${money(i.price)}</span></div>`).join('') +
    `<div class="row-p total"><span>Итого</span><span>${money(total)}</span></div>`;
}

// ---------- Готовые идеи ----------
function shapeSvg(id) {
  const pts = buildShape(id).shape.getPoints(40);
  const d = 'M' + pts.map((p) => `${p.x.toFixed(2)},${(-p.y).toFixed(2)}`).join('L') + 'Z';
  return `<svg viewBox="-1.9 -1.9 3.8 3.8" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
}

function fillIdeas() {
  $('#ideas-grid').innerHTML = presets.map((p) => {
    const shape = CONFIG.shapes.find((s) => s.id === p.st.shape)?.name || '';
    const mat = CONFIG.materials.find((m) => m.id === p.st.material)?.name || '';
    return `<a class="idea" href="constructor.html#preset-${esc(p.id)}" data-preset="${esc(p.id)}">
      <div class="idea-img"><span class="heart" aria-hidden="true">♡</span><div data-thumb="${esc(p.id)}" style="display:contents">${shapeSvg(p.st.shape)}</div></div>
      <div class="idea-body"><b>${esc(p.title)}</b><span>${money(calcPrice(p.st).total)} · ${esc(shape)}, ${esc(mat.toLowerCase())}</span>
      <span class="go">Изменить под себя →</span></div></a>`;
  }).join('');
  // силуэты в «полароидах» и категориях, пока не готовы 3D-превью
  $$('.polaroid [data-thumb], .cat [data-thumb]').forEach((el) => {
    const p = presets.find((x) => x.id === el.dataset.thumb);
    if (p) el.innerHTML = shapeSvg(p.st.shape);
  });
  $$('[data-preset]').forEach((a) => a.addEventListener('click', () => {
    try { localStorage.setItem('pettag-preset', a.dataset.preset); } catch { /* ignore */ }
    goal('open_constructor', { preset: a.dataset.preset });
  }));
}

// ---------- FAQ + разметка для поиска ----------
function fillFaq() {
  $('#faqList').innerHTML = CONFIG.faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(fill(a))}</p></details>`).join('');
  const ld = [
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: CONFIG.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: fill(a) } })) },
    { '@context': 'https://schema.org', '@type': 'Product', name: 'Адресник для питомца с гравировкой', brand: CONFIG.brand,
      description: 'Адресник для кошки или собаки ручной работы: кличка и телефон владельца, шнурок, бусины.',
      offers: { '@type': 'AggregateOffer', priceCurrency: 'RUB', lowPrice: minPrice, availability: 'https://schema.org/InStock' } },
  ];
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(ld);
  document.head.append(s);
}

// ---------- Заявка ----------
function initLead() {
  const form = $('#leadForm');
  const err = $('#leadErr');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    const problems = [];
    if (!name) problems.push('имя');
    if (phone.replace(/\D/g, '').length < 10) problems.push('телефон (не меньше 10 цифр)');
    if (!f.get('agree')) problems.push('согласие на обработку данных');
    if (problems.length) {
      err.textContent = `Заполните: ${problems.join(', ')}.`;
      err.hidden = false;
      return;
    }
    err.hidden = true;
    const id = newId('#З');
    const text = [`📩 Заявка ${id} с сайта`, '', `Имя: ${name}`, `Телефон: ${phone}`, `Питомец: ${f.get('pet')}`,
      f.get('message') ? `Сообщение: ${String(f.get('message')).trim()}` : ''].filter(Boolean).join('\n');
    goal('lead_submit');

    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Отправляем…';
    const ok = f.get('website') ? true : await postToMaster({ kind: 'lead', id, text });
    btn.disabled = false;
    btn.textContent = 'Получить консультацию';

    form.hidden = true;
    $('#leadDone').hidden = false;
    if (ok) {
      $('#leadDoneTitle').textContent = 'Заявка отправлена! 🐾';
      $('#leadDoneText').textContent = 'Мастер получил ваши контакты и скоро свяжется. А пока можно собрать адресник в конструкторе.';
      $('#leadSend').innerHTML = '<a class="btn primary" href="constructor.html">Открыть конструктор</a>';
    } else {
      $('#leadDoneTitle').textContent = 'Осталось отправить';
      $('#leadDoneText').textContent = 'Нажмите удобный мессенджер — заявка уже написана, останется отправить её мастеру.';
      $('#leadWa').href = waLink(text);
      $('#leadWa').hidden = !CONFIG.contacts.whatsapp;
      $('#leadTg').href = tgLink();
      $('#leadTg').hidden = !CONFIG.contacts.telegram;
      $('#leadTg').onclick = () => copy(text).then((c) => c && toast('Текст заявки скопирован — вставьте его в чат'));
    }
    $('#leadDone').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

// ---------- 3D: витрина на первом экране и превью идей ----------
async function init3d() {
  await Promise.race([
    Promise.all(CONFIG.fonts.map((f) => document.fonts.load(f.css.replace('{s}', 40), 'АаZz0'))).catch(() => {}),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  let TagScene;
  try {
    ({ TagScene } = await import('./scene.js'));
  } catch (e) {
    console.error(e);
    $('.hero-stage').hidden = true;
    return;
  }

  // витрина: по очереди показывает готовые идеи
  const hero = new TagScene($('#heroCanvas'), { interactive: false });
  const cap = $('#heroCaption');
  let i = 0;
  const show = () => {
    const p = presets[i % presets.length];
    hero.update(p.st);
    cap.innerHTML = `${esc(p.title)}<small>${money(calcPrice(p.st).total)}</small>`;
    i++;
  };
  show();
  hero.replay();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) hero.spin = 0;
  else setInterval(() => !document.hidden && show(), 5000);

  // превью идей рисуем, когда раздел приближается к экрану
  const grid = $('#ideas-grid');
  const io = new IntersectionObserver(async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const cv = document.createElement('canvas');
    const off = new TagScene(cv, { offscreen: { width: 520, height: 520 } });
    for (const p of presets) {
      await new Promise((r) => setTimeout(r, 30));
      const url = off.render(p.st);
      $$(`[data-thumb="${p.id}"]`).forEach((box) => (box.innerHTML = `<img src="${url}" alt="${esc(p.title)}" />`));
    }
    off.dispose();
  }, { rootMargin: '400px' });
  io.observe(grid);
}

// ---------- Огромное название: подгоняем под ширину ----------
function fitMarks() {
  for (const el of $$('.hero-mark, .foot-mark')) {
    const box = el.parentElement.clientWidth - 40;
    el.style.fontSize = '100px';
    const w = (el.querySelector('[data-brand]') || el).scrollWidth || 1;
    el.style.fontSize = `${Math.min(220, Math.floor((100 * box) / w))}px`;
  }
}

// ---------- Запуск ----------
initAnalytics();
fillTexts();
fillPrices();
fillIdeas();
fillFaq();
initLead();
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-goal]');
  if (g) goal(g.dataset.goal);
});
fitMarks();
document.fonts?.ready.then(fitMarks);
addEventListener('resize', fitMarks);
init3d();
