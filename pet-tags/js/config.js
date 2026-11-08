// =====================================================================
//  ТЕХНИЧЕСКИЕ НАСТРОЙКИ: id, цвета, 3D-параметры, готовые идеи.
//  Цены, названия, тексты, контакты и FAQ — в /content.json (правятся в админке /admin).
// =====================================================================

const BASE = {
  // Адрес серверной функции приёма заказов и заявок (см. README → «Заявки в Telegram»).
  // Пусто — клиент отправляет заказ/заявку через WhatsApp/Telegram вручную.
  orderEndpoint: '',

  limits: { frontLine: 12, frontLine2: 18, backLine: 18, beads: 24 },

  // ---------- Форма адресника: базовая цена ----------
  shapes: [
    { id: 'circle' },
    { id: 'bone' },
    { id: 'heart' },
    { id: 'flower' },
    { id: 'star' },
    { id: 'fish' },
    { id: 'tag' },
  ],

  sizes: [
    { id: 'S', scale: 0.85 },
    { id: 'M', scale: 1 },
    { id: 'L', scale: 1.15 },
  ],

  // kind: metal — металл целиком; enamel — цветная эмаль с металлическим бортиком; acrylic — цветной акрил
  materials: [
    { id: 'steel', kind: 'metal', color: '#c9ccd1' },
    { id: 'gold', kind: 'metal', color: '#e6b84f' },
    { id: 'rose', kind: 'metal', color: '#e7a98f' },
    { id: 'enamel', kind: 'enamel' },
    { id: 'acrylic', kind: 'acrylic' },
    { id: 'clay', kind: 'clay' },
    { id: 'epoxy', kind: 'epoxy' },
  ],

  // Узор лицевой и обратной стороны (для всех материалов, кроме металла)
  patterns: [
    { id: 'none' },
    { id: 'stripes' },
    { id: 'dots' },
    { id: 'leopard' },
    { id: 'marble' },
    { id: 'goldleaf' },
  ],

  // Объёмная фигурка поверх адресника
  toppers: [
    { id: 'none' },
    { id: 'teddy' },
    { id: 'kitty' },
    { id: 'bow' },
  ],
  topperColors: ['#d9b38c', '#c8956a', '#f2c48d', '#ffffff', '#f28bb0', '#2d2d3a', '#d3d6db'],

  tagColors: ['#7a7d4a', '#c4683f', '#3d3f45', '#d8c3a5', '#f28bb0', '#d62839', '#c58b5a', '#f4f1ea', '#8fb8e8', '#9a6fb0', '#ff6b6b', '#ffb347', '#ffe066', '#7ed6a5', '#5ec8e5', '#6c8cff', '#b48cff', '#ffffff', '#2d2d3a'],
  rimColors: [
    { id: 'silver', name: 'Серебро', color: '#d3d6db' },
    { id: 'gold', name: 'Золото', color: '#e6b84f' },
  ],

  // ---------- Надписи ----------
  fonts: [
    { id: 'Montserrat', name: 'Строгий', css: '700 {s}px Montserrat' },
    { id: 'Comfortaa', name: 'Мягкий', css: '700 {s}px Comfortaa' },
    { id: 'Caveat', name: 'Рукописный', css: '700 {s}px Caveat' },
    { id: 'Lobster', name: 'Каллиграфия', css: '400 {s}px Lobster' },
  ],
  textColors: [
    { id: 'auto', name: 'Авто', color: null },
    { id: 'white', name: 'Белый', color: '#ffffff' },
    { id: 'black', name: 'Чёрный', color: '#1d1d24' },
    { id: 'gold', name: 'Золото', color: '#d9a838' },
  ],

  icons: [
    { id: 'none' },
    { id: 'paw' },
    { id: 'heart' },
    { id: 'bone' },
    { id: 'star' },
    { id: 'crown' },
  ],

  // ---------- Шнурок ----------
  cords: [
    { id: 'none' },
    { id: 'wax', radius: 0.055 },
    { id: 'paracord', radius: 0.085 },
    { id: 'chain' },
    { id: 'collar', radius: 0.11 },
  ],
  cordColors: ['#7a7d4a', '#c4683f', '#3d3f45', '#d62839', '#8a9a2b', '#6b4226', '#d8c3a5', '#e94e77', '#ff8c42', '#ffd23f', '#3bb273', '#2e86de', '#6c5ce7', '#8d6e63', '#1e1e24', '#f5f5f5'],
  chainColors: [
    { id: 'silver', name: 'Серебро', color: '#d3d6db' },
    { id: 'gold', name: 'Золото', color: '#e6b84f' },
  ],

  // ---------- Бусины ----------
  // group: bead — бусина на шнурке, charm — подвеска-фигурка; letter: true — с буквой/цифрой
  beads: [
    { id: 'round', group: 'bead' },
    { id: 'facet', group: 'bead' },
    { id: 'pearl', group: 'bead' },
    { id: 'metal', group: 'bead' },
    { id: 'heart', group: 'bead' },
    { id: 'star', group: 'bead' },
    { id: 'silicone', group: 'bead', color: '#c4683f' },
    { id: 'daisy', group: 'bead', color: '#ffd23f' },
    { id: 'tennis', group: 'bead', color: '#cde34a' },
    { id: 'letter', group: 'bead', letter: true, color: '#ffffff' },
    { id: 'disc', group: 'bead', letter: true, color: '#ffffff' },
    { id: 'ch-strawberry', group: 'charm', color: '#e0283a' },
    { id: 'ch-croissant', group: 'charm' },
    { id: 'ch-teddy', group: 'charm', color: '#c8956a' },
    { id: 'ch-kitty', group: 'charm', color: '#f2c48d' },
    { id: 'ch-bow', group: 'charm', color: '#d3d6db' },
    { id: 'ch-duck', group: 'charm', color: '#ffd23f' },
  ],
  beadColors: ['#7a7d4a', '#c4683f', '#3d3f45', '#d8c3a5', '#d62839', '#c8956a', '#f4ecd8', '#cde34a', '#6b4226', '#ff4f81', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#2e86de', '#a29bfe', '#ffffff', '#222f3e', '#f8c8dc'],

  // ---------- Стразы ----------
  strassCounts: [0, 6, 10, 16],
  strassColors: [
    { id: 'clear', name: 'Прозрачные', color: '#f4fbff' },
    { id: 'pink', name: 'Розовые', color: '#ff8fc7' },
    { id: 'blue', name: 'Голубые', color: '#8fd8ff' },
  ],

  // ---------- Готовые идеи на главной (открываются в конструкторе для правки) ----------
  // Поля как в конструкторе; не указанное берётся по умолчанию.
  presets: [
    { id: 'family', collection: 'oldmoney', title: 'Фэмили-лук: ошейник + браслет', badge: 'Парные', state: {
      shape: 'bone', material: 'enamel', tagColor: '#d8c3a5', rim: 'gold', front: { line1: 'Моника', font: 'Montserrat', textColor: 'black', icon: 'none' },
      cord: 'collar', cordColor: '#7a7d4a', beadLayout: 'sym', extras: ['bracelet'],
      beads: [['silicone', '#c4683f'], ['silicone', '#c4683f'], ['round', '#d8c3a5'], ['round', '#d8c3a5'], ['metal', '#e6b84f'], ['metal', '#e6b84f'],
        ['silicone', '#7a7d4a'], ['silicone', '#7a7d4a'], ['round', '#d8c3a5'], ['round', '#d8c3a5']].map(([type, color]) => ({ type, color })) } },
    { id: 'oldmoney', collection: 'oldmoney', title: 'Old Money', badge: 'Новинка', state: {
      shape: 'tag', material: 'steel', front: { line1: 'Вита', font: 'Montserrat', icon: 'none' },
      cord: 'collar', cordColor: '#3d3f45', beadLayout: 'sym',
      beads: [['silicone', '#d8c3a5'], ['silicone', '#d8c3a5'], ['silicone', '#c4683f'], ['silicone', '#c4683f'], ['metal', '#d3d6db'], ['metal', '#d3d6db'],
        ['silicone', '#3d3f45'], ['silicone', '#3d3f45']].map(([type, color]) => ({ type, color })) } },
    { id: 'strawberry', title: 'Клубничный ошейник', badge: 'Хит', state: {
      shape: 'bone', material: 'enamel', tagColor: '#d62839', rim: 'gold', front: { line1: 'Финик', font: 'Montserrat', textColor: 'gold', icon: 'none' },
      cord: 'collar', cordColor: '#d62839', beadLayout: 'sym',
      beads: [['ch-strawberry', '#e0283a'], ['ch-strawberry', '#e0283a'], ['pearl', '#f8c8dc'], ['pearl', '#f8c8dc'], ['round', '#d62839'], ['round', '#d62839'],
        ['facet', '#ff4f81'], ['facet', '#ff4f81'], ['pearl', '#ffffff'], ['pearl', '#ffffff'], ['round', '#d62839'], ['round', '#d62839']].map(([type, color]) => ({ type, color })) } },
    { id: 'barista', title: 'Кофе с круассаном', badge: 'Новинка', state: {
      shape: 'circle', material: 'clay', tagColor: '#f4ecd8', front: { line1: 'Барни', font: 'Comfortaa', textColor: 'black', icon: 'paw' },
      cord: 'collar', cordColor: '#6b4226', beadLayout: 'sym',
      beads: [['ch-teddy', '#c8956a'], ['ch-croissant', '#e0a458'], ['heart', '#c8956a'], ['heart', '#c8956a'], ['round', '#f4ecd8'], ['round', '#f4ecd8'],
        ['facet', '#ffffff'], ['facet', '#ffffff'], ['round', '#f4ecd8'], ['round', '#f4ecd8']].map(([type, color]) => ({ type, color })) } },
    { id: 'tennis', title: 'Теннис и леопард', state: {
      shape: 'bone', material: 'enamel', tagColor: '#c58b5a', pattern: 'leopard', rim: 'gold', front: { line1: 'Луно', font: 'Montserrat', textColor: 'white', icon: 'none' },
      cord: 'collar', cordColor: '#8a9a2b', beadLayout: 'sym',
      beads: [['ch-bow', '#d3d6db'], ['tennis', '#cde34a'], ['round', '#6b4226'], ['round', '#6b4226'], ['tennis', '#cde34a'], ['facet', '#8a9a2b'],
        ['facet', '#8a9a2b'], ['metal', '#d3d6db'], ['metal', '#d3d6db'], ['round', '#6b4226']].map(([type, color]) => ({ type, color })) } },
    { id: 'nova', title: 'Имя из бусин', state: {
      shape: 'heart', material: 'enamel', tagColor: '#f28bb0', rim: 'gold', front: { line1: 'Нова', font: 'Lobster', icon: 'none' },
      cord: 'collar', cordColor: '#f8c8dc', beadLayout: 'row',
      beads: [['pearl', '#f8c8dc'], ['round', '#ff4f81'], ...[...'НОВА'].map((l) => ['disc', '#ffffff', l]), ['round', '#ff4f81'], ['pearl', '#f8c8dc']]
        .map(([type, color, letter]) => ({ type, color, letter })) } },
    { id: 'stripes', title: 'Полоски с пёсиком', badge: 'Хит', state: {
      shape: 'circle', material: 'clay', tagColor: '#8fb8e8', pattern: 'stripes', topper: 'teddy', topperColor: '#d9b38c',
      front: { line1: 'Майло', font: 'Montserrat', textColor: 'gold', icon: 'none' }, cord: 'none' } },
    { id: 'goldleaf', title: 'Поталь', state: {
      shape: 'circle', material: 'epoxy', tagColor: '#f4f1ea', pattern: 'goldleaf', front: { line1: 'Барби', font: 'Lobster', textColor: 'gold', icon: 'none' },
      cord: 'paracord', cordColor: '#8a9a2b' } },
    { id: 'princess', title: 'Для кошки-принцессы', state: {
      pet: 'cat', extras: ['breakaway'],
      shape: 'heart', material: 'enamel', tagColor: '#f28bb0', rim: 'gold', strass: 6, strassColor: 'pink',
      front: { line1: 'Мурка', font: 'Lobster', icon: 'crown' }, cord: 'wax', cordColor: '#e94e77',
      beads: [{ type: 'pearl', color: '#ffffff' }, { type: 'heart', color: '#ff4f81' }, { type: 'pearl', color: '#ffffff' }] } },
    { id: 'kitty', title: 'Котик в горошек', state: {
      pet: 'cat', extras: ['breakaway'],
      shape: 'flower', material: 'clay', tagColor: '#9a6fb0', pattern: 'dots', topper: 'kitty', topperColor: '#f2c48d',
      front: { line1: 'Ася', font: 'Caveat', textColor: 'white', icon: 'none' }, cord: 'wax', cordColor: '#f5f5f5',
      beads: [{ type: 'daisy', color: '#ffd23f' }, { type: 'daisy', color: '#ffd23f' }, { type: 'pearl', color: '#ffffff' }, { type: 'pearl', color: '#ffffff' }] } },
  ],

  // ---------- Дополнительно ----------
  extras: [
    { id: 'bracelet' },
    { id: 'nfc' },
    { id: 'steel', only: 'dog' },
    { id: 'breakaway', only: 'cat' },
    { id: 'box' },
    { id: 'urgent' },
  ],
};

// ---------- Контент из админки (/content.json) ----------
// Названия и цены позиций подставляются по id; неизвестные id игнорируются, у пропущенных остаются только тех. поля.
export function applyContent(base, content) {
  const c = content && typeof content === 'object' ? content : {};
  const out = { ...base, currency: '₽', contacts: { whatsapp: '', telegram: '', email: '' },
    promises: [], reviews: [], seller: '', faq: [], pricePerFrontChar: 0, pricePerBackChar: 0, pricePerStrass: 0 };
  for (const k of ['brand', 'tagline', 'metrikaId', 'productionDays', 'delivery', 'payment', 'seller']) {
    if (typeof c[k] === 'string') out[k] = c[k];
  }
  for (const k of ['pricePerFrontChar', 'pricePerBackChar', 'pricePerStrass']) {
    if (Number.isFinite(c[k]) && c[k] >= 0) out[k] = c[k];
  }
  if (c.contacts && typeof c.contacts === 'object') out.contacts = { ...out.contacts, ...c.contacts };
  if (Array.isArray(c.promises)) out.promises = c.promises.filter((x) => typeof x === 'string' && x.trim());
  if (Array.isArray(c.reviews)) out.reviews = c.reviews.filter((r) => r && r.name && r.text);
  if (Array.isArray(c.faq)) out.faq = c.faq.filter((f) => f && f.q && f.a).map((f) => [f.q, f.a]);
  for (const [k, list] of Object.entries(base)) {
    if (!Array.isArray(list) || !list.length || typeof list[0] !== 'object' || !('id' in list[0])) continue;
    const items = Array.isArray(c.catalog?.[k]) ? c.catalog[k] : null;
    if (!items) continue;
    const byId = new Map(items.filter((x) => x && x.id).map((x) => [x.id, x]));
    out[k] = list.map((it) => {
      const x = byId.get(it.id) || {};
      return { ...it, name: String(x.name || it.name || it.id), price: Number.isFinite(x.price) && x.price >= 0 ? x.price : 0 };
    });
  }
  return out;
}

async function loadContent() {
  try {
    const r = await fetch(new URL('../content.json', import.meta.url), { cache: 'no-cache' });
    if (r.ok) return await r.json();
  } catch { /* без контента сайт покажет тех. значения */ }
  return {};
}

export const CONFIG = applyContent(BASE, typeof window === 'undefined' ? {} : await loadContent());
