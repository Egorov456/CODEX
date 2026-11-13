// =====================================================================
//  ТЕХНИЧЕСКИЕ НАСТРОЙКИ: id, цвета, 3D-параметры, готовые идеи.
//  Цены, названия, тексты, контакты и FAQ — в /content.json (правятся в админке /admin).
// =====================================================================

// Бусины для готовых идей: 'тип:вариант' (цвет берётся из варианта) или 'ch-…' (подвеска с цветом по умолчанию)
const B = (...ids) => ids.map((x) => { const [type, v] = x.split(':'); return v ? { type, v } : { type }; });

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
  // Паракорд (и ошейник-бусы из паракорда) — 20 цветов по фото поставщика
  paracordColors: [
    ['#1f4fc4', 'Королевский синий'], ['#a9b9d4', 'Серо-голубой'], ['#1a86d6', 'Лазурный'], ['#3ab4e0', 'Бирюзово-голубой'],
    ['#a6dcf2', 'Бледно-голубой'], ['#7a1428', 'Бордовый'], ['#5a5856', 'Графит'], ['#c4c4c2', 'Светло-серый'],
    ['#0e7f72', 'Изумрудный'], ['#8fe6cc', 'Мятный'], ['#1e1e20', 'Чёрный'], ['#4a2c22', 'Шоколадный'],
    ['#b07a3c', 'Койот'], ['#b48a86', 'Пыльная роза'], ['#9a8670', 'Тауп'], ['#6b3fc0', 'Фиолетовый'],
    ['#c0249a', 'Маджента'], ['#e8277a', 'Ярко-розовый'], ['#f4b4cc', 'Нежно-розовый'], ['#f5f5f2', 'Белый'],
  ].map(([color, name]) => ({ id: color, color, name })),
  chainColors: [
    { id: 'silver', name: 'Серебро', color: '#d3d6db' },
    { id: 'gold', name: 'Золото', color: '#e6b84f' },
  ],

  // ---------- Бусины ----------
  // group: bead — бусина на шнурке, charm — подвеска-фигурка; letter: true — с буквой/цифрой.
  // У бусин из каталога (есть в beadVariants) цвет выбирается только из своих вариантов.
  beads: [
    { id: 'pony', group: 'bead' },
    { id: 'pony-clear', group: 'bead' },
    { id: 'pony-fx', group: 'bead' },
    { id: 'marble', group: 'bead' },
    { id: 'spotted', group: 'bead' },
    { id: 'flower', group: 'bead' },
    { id: 'heart-frame', group: 'bead' },
    { id: 'heart-puffy', group: 'bead' },
    { id: 'letter', group: 'bead', letter: true, color: '#ffffff' },
    { id: 'disc', group: 'bead', letter: true, color: '#ffffff' },
    { id: 'ch-strawberry', group: 'charm', color: '#e0283a' },
    { id: 'ch-croissant', group: 'charm' },
    { id: 'ch-teddy', group: 'charm', color: '#c8956a' },
    { id: 'ch-kitty', group: 'charm', color: '#f2c48d' },
    { id: 'ch-bow', group: 'charm', color: '#d3d6db' },
    { id: 'ch-duck', group: 'charm', color: '#ffd23f' },
  ],
  // Варианты бусин по фото поставщика: [id, название, цвет, отделка, второй цвет].
  // Отделка: gloss — глянец, clear — прозрачная, facet — прозрачная гранёная, milky — молочная,
  // ab — перламутр AB, metal — металлик, stars — со звёздами, bubble — «лёд» с пузырьками,
  // marble — мрамор, marble-clear — прозрачный мрамор, swirl — перламутровые разводы, glitter — с блёстками,
  // spots — пятна, speckle — крапинка, confetti — конфетти, ombre — омбре.
  beadVariants: {
    pony: [
      ['fuchsia', 'Фуксия', '#e8287a'], ['ivory', 'Слоновая кость', '#f3e9c6'], ['pink', 'Розовый', '#f6a3be'],
      ['lemon', 'Лимонный', '#f2ea1c'], ['sky', 'Небесный', '#6aaee6'], ['purple', 'Фиолетовый', '#9257d6'],
      ['mint', 'Мятный', '#8fe0b0'], ['peach', 'Персиковый', '#f6a07a'], ['lavender', 'Лавандовый', '#a46ae8'],
      ['hotpink', 'Ярко-розовый', '#f0479a'], ['blue', 'Голубой', '#6fb3ea'],
    ].map((v) => [...v, 'gloss']),
    'pony-clear': [
      ['violet', 'Фиолетовый', '#8a3fd0'], ['fuchsia', 'Фуксия', '#e0157a'], ['orange', 'Оранжевый', '#ff6a10'],
      ['lime', 'Лайм', '#a8e03a'], ['blue', 'Синий', '#1e7ae0'], ['clear', 'Прозрачный', '#eef3f6'],
      ['red', 'Красный', '#d0141c'], ['aqua', 'Аква', '#2ec4d6'],
    ].map((v) => [...v, 'facet']),
    'pony-fx': [
      ['stars', 'Со звёздочками', '#eef3f6', 'stars'], ['ab', 'Перламутр AB', '#f4e4ec', 'ab'], ['gold', 'Золото', '#d4a83c', 'metal'],
      ['ice', 'Лёд с пузырьками', '#eef3f6', 'bubble'], ['garnet', 'Гранат', '#7a1220', 'marble-clear', '#2a0306'],
      ['beige', 'Бежевый мрамор', '#efd2b6', 'marble', '#b77a4a'], ['caramel', 'Карамельный мрамор', '#f6efe6', 'marble', '#c47a2c'],
      ['vein', 'Кость с прожилками', '#efe4cf', 'marble', '#9c6a3e'], ['amber', 'Янтарь', '#c06a1c', 'clear'],
      ['rootbeer', 'Рутбир', '#5a1e10', 'clear'], ['tortoise', 'Черепаха', '#a07a40', 'marble-clear', '#3a2410'],
    ],
    marble: [
      ['fuchsia', 'Фуксия', '#e0206e'], ['lilac', 'Сирень', '#d9a6e0'], ['sky', 'Небесный', '#6cc6ea'],
      ['turquoise', 'Бирюза', '#3fc4b4'], ['violet', 'Фиолетовый', '#9a6ad6'], ['blackab', 'Чёрный AB', '#1c1424', 'ab'],
      ['pink', 'Розовый', '#f08cb4'], ['pearl', 'Белый жемчуг', '#f4f1ee'], ['cornflower', 'Васильковый', '#5a7ee0'],
      ['red', 'Красный', '#d81c28'], ['yellow', 'Жёлтый', '#f6cc2a'], ['orange', 'Оранжевый', '#ff6a28'],
      ['green', 'Светло-зелёный', '#9be08a'], ['glitter', 'Красный с блёстками', '#c8141e', 'glitter'],
    ].map(([id, n, c, f]) => [id, n, c, f || 'swirl', '#ffffff']),
    spotted: [
      ['leopard', 'Леопард', '#b07a3c', 'spots'], ['burgundy', 'Бордо в пятнышко', '#7a1424', 'spots'],
      ['granite', 'Гранит', '#7a8494', 'spots'], ['green', 'Зелёный в пятнышко', '#2f7a44', 'spots'],
      ['raspberry', 'Малиновый в крапинку', '#b8245a', 'speckle'], ['confetti', 'Конфетти', '#f4efe6', 'confetti'],
    ].map((v) => [...v, '#1a1210']),
    flower: [
      ['turquoise', 'Бирюза омбре', '#3cc4b8', 'ombre', '#24343a'], ['red', 'Красный', '#e0202a', 'gloss'],
      ['champagne', 'Шампань', '#e8d6b0', 'clear'], ['malachite', 'Малахит', '#1e6e44', 'marble', '#0a3420'],
      ['milky', 'Молочный', '#f2f4f6', 'milky'], ['white', 'Белый AB', '#f4f2ee', 'ab'],
      ['orange', 'Оранжевый прозрачный', '#e06a10', 'clear'], ['lightblue', 'Светло-голубой', '#cfe0f6', 'gloss'],
      ['brown', 'Коричневый прозрачный', '#5a2e18', 'clear'], ['zebra', 'Чёрно-белый мрамор', '#f2f2f2', 'marble', '#1a1a1a'],
      ['clear', 'Прозрачный', '#eef3f6', 'clear'], ['pink', 'Розовый', '#f2479a', 'gloss'],
      ['black', 'Чёрный', '#1a1a1e', 'gloss'], ['blush', 'Нежно-розовый', '#f8c6d4', 'gloss'],
    ],
    'heart-frame': [
      ['red', 'Красный', '#d81c20'], ['orange', 'Оранжевый', '#ff6a10'], ['sand', 'Песочный', '#c9a06a'],
      ['choco', 'Шоколад', '#6b3a1e'], ['black', 'Чёрный', '#141416'], ['cobalt', 'Кобальт', '#1e3aa8'],
      ['raspberry', 'Малиновый', '#c41e5a'], ['pink', 'Розовый', '#f26aa0'], ['blush', 'Нежно-розовый', '#f8c0d0'],
      ['yellow', 'Жёлтый', '#f6dc5a'], ['green', 'Салатовый', '#8ad66a'], ['sky', 'Голубой', '#8cc8f0'],
      ['lavender', 'Лавандовый', '#b8a0e8'], ['white', 'Белый', '#f6f6f4'],
    ].map((v) => [...v, 'gloss']),
    'heart-puffy': [
      ['lavender', 'Лавандовый', '#b39ae8'], ['pistachio', 'Фисташковый', '#b4e486'], ['mint', 'Мятный', '#86e6c8'],
      ['butter', 'Сливочный', '#f4e070'], ['pink', 'Розовый', '#f6a8c4'], ['peach', 'Персиковый', '#f8ae8a'],
      ['baby', 'Детский голубой', '#8ccef4'],
    ].map((v) => [...v, 'gloss']),
  },
  // Цвета для букв и подвесок-фигурок
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
      cord: 'collar', cordColor: '#9a8670', beadLayout: 'sym', extras: ['bracelet'],
      beads: B('pony:peach', 'pony:peach', 'pony-fx:beige', 'pony-fx:beige', 'pony-fx:gold', 'pony-fx:gold', 'pony-fx:tortoise', 'pony-fx:tortoise', 'pony:ivory', 'pony:ivory') } },
    { id: 'oldmoney', collection: 'oldmoney', title: 'Old Money', badge: 'Новинка', state: {
      shape: 'tag', material: 'steel', front: { line1: 'Вита', font: 'Montserrat', icon: 'none' },
      cord: 'collar', cordColor: '#5a5856', beadLayout: 'sym',
      beads: B('pony-fx:vein', 'pony-fx:vein', 'pony-fx:caramel', 'pony-fx:caramel', 'pony-fx:gold', 'pony-fx:gold', 'pony-fx:rootbeer', 'pony-fx:rootbeer') } },
    { id: 'strawberry', title: 'Клубничный ошейник', badge: 'Хит', state: {
      shape: 'bone', material: 'enamel', tagColor: '#d62839', rim: 'gold', front: { line1: 'Финик', font: 'Montserrat', textColor: 'gold', icon: 'none' },
      cord: 'collar', cordColor: '#e8277a', beadLayout: 'sym',
      beads: B('ch-strawberry', 'ch-strawberry', 'marble:pink', 'marble:pink', 'pony-clear:red', 'pony-clear:red', 'heart-frame:pink', 'heart-frame:pink', 'marble:pearl', 'marble:pearl', 'pony-clear:red', 'pony-clear:red') } },
    { id: 'barista', title: 'Кофе с круассаном', badge: 'Новинка', state: {
      shape: 'circle', material: 'clay', tagColor: '#f4ecd8', front: { line1: 'Барни', font: 'Comfortaa', textColor: 'black', icon: 'paw' },
      cord: 'collar', cordColor: '#4a2c22', beadLayout: 'sym',
      beads: B('ch-teddy', 'ch-croissant', 'heart-frame:sand', 'heart-frame:sand', 'pony:ivory', 'pony:ivory', 'pony-fx:amber', 'pony-fx:amber', 'pony-fx:caramel', 'pony-fx:caramel') } },
    { id: 'tennis', title: 'Теннис и леопард', state: {
      shape: 'bone', material: 'enamel', tagColor: '#c58b5a', pattern: 'leopard', rim: 'gold', front: { line1: 'Луно', font: 'Montserrat', textColor: 'white', icon: 'none' },
      cord: 'collar', cordColor: '#0e7f72', beadLayout: 'sym',
      beads: B('ch-bow', 'spotted:leopard', 'pony-fx:rootbeer', 'pony-fx:rootbeer', 'spotted:leopard', 'pony-clear:lime', 'pony-clear:lime', 'pony-fx:gold', 'pony-fx:gold', 'pony-fx:rootbeer') } },
    { id: 'nova', title: 'Имя из бусин', state: {
      shape: 'heart', material: 'enamel', tagColor: '#f28bb0', rim: 'gold', front: { line1: 'Нова', font: 'Lobster', icon: 'none' },
      cord: 'collar', cordColor: '#f4b4cc', beadLayout: 'row',
      beads: [...B('marble:pink', 'pony:hotpink'), ...[...'НОВА'].map((letter) => ({ type: 'disc', color: '#ffffff', letter })), ...B('pony:hotpink', 'marble:pink')] } },
    { id: 'stripes', title: 'Полоски с пёсиком', badge: 'Хит', state: {
      shape: 'circle', material: 'clay', tagColor: '#8fb8e8', pattern: 'stripes', topper: 'teddy', topperColor: '#d9b38c',
      front: { line1: 'Майло', font: 'Montserrat', textColor: 'gold', icon: 'none' }, cord: 'none' } },
    { id: 'goldleaf', title: 'Поталь', state: {
      shape: 'circle', material: 'epoxy', tagColor: '#f4f1ea', pattern: 'goldleaf', front: { line1: 'Барби', font: 'Lobster', textColor: 'gold', icon: 'none' },
      cord: 'paracord', cordColor: '#0e7f72' } },
    { id: 'princess', title: 'Для кошки-принцессы', state: {
      pet: 'cat', extras: ['breakaway'],
      shape: 'heart', material: 'enamel', tagColor: '#f28bb0', rim: 'gold', strass: 6, strassColor: 'pink',
      front: { line1: 'Мурка', font: 'Lobster', icon: 'crown' }, cord: 'wax', cordColor: '#e94e77',
      beads: B('marble:pearl', 'heart-puffy:pink', 'marble:pearl') } },
    { id: 'kitty', title: 'Котик в горошек', state: {
      pet: 'cat', extras: ['breakaway'],
      shape: 'flower', material: 'clay', tagColor: '#9a6fb0', pattern: 'dots', topper: 'kitty', topperColor: '#f2c48d',
      front: { line1: 'Ася', font: 'Caveat', textColor: 'white', icon: 'none' }, cord: 'wax', cordColor: '#f5f5f5',
      beads: B('flower:milky', 'flower:milky', 'heart-puffy:lavender', 'heart-puffy:lavender') } },
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
