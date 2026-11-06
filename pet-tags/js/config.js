// =====================================================================
//  НАСТРОЙКИ МАСТЕРСКОЙ — меняйте цены, контакты и ассортимент здесь.
//  Всё остальное подхватится автоматически.
// =====================================================================

export const CONFIG = {
  brand: 'Лапушка',
  tagline: 'Адресники для питомцев ручной работы',
  currency: '₽',

  // Контакты мастера (без «+», только цифры для WhatsApp; ник Telegram без @)
  contacts: {
    whatsapp: '79990000000',
    telegram: 'your_telegram',
    email: '',
  },

  // Адрес серверной функции приёма заказов и заявок (см. README → «Заявки в Telegram»).
  // Пусто — клиент отправляет заказ/заявку через WhatsApp/Telegram вручную.
  orderEndpoint: '',

  // Яндекс.Метрика: номер счётчика (только цифры). Пусто — аналитика выключена.
  metrikaId: '',

  // ⚠️ Проверьте и поправьте под свои реальные условия — эти тексты видят клиенты.
  productionDays: '3–5 рабочих дней',
  delivery: 'Отправляем по всей России Почтой, СДЭК или Ozon — стоимость по тарифу службы доставки.',
  payment: 'После того как мастер подтвердит макет: переводом по СБП или на карту.',

  limits: { frontLine: 12, frontLine2: 18, backLine: 18, beads: 12 },

  // ---------- Форма адресника: базовая цена ----------
  shapes: [
    { id: 'circle', name: 'Кружочек', price: 450 },
    { id: 'bone', name: 'Косточка', price: 500 },
    { id: 'heart', name: 'Сердечко', price: 500 },
    { id: 'flower', name: 'Цветочек', price: 550 },
    { id: 'star', name: 'Звёздочка', price: 550 },
    { id: 'fish', name: 'Рыбка', price: 550 },
    { id: 'tag', name: 'Жетон', price: 450 },
  ],

  sizes: [
    { id: 'S', name: 'S · 2,5 см', scale: 0.85, price: 0 },
    { id: 'M', name: 'M · 3 см', scale: 1, price: 100 },
    { id: 'L', name: 'L · 3,5 см', scale: 1.15, price: 200 },
  ],

  // kind: metal — металл целиком; enamel — цветная эмаль с металлическим бортиком; acrylic — цветной акрил
  materials: [
    { id: 'steel', name: 'Сталь', kind: 'metal', color: '#c9ccd1', price: 0 },
    { id: 'gold', name: 'Золото', kind: 'metal', color: '#e6b84f', price: 250 },
    { id: 'rose', name: 'Розовое золото', kind: 'metal', color: '#e7a98f', price: 250 },
    { id: 'enamel', name: 'Эмаль', kind: 'enamel', price: 200 },
    { id: 'acrylic', name: 'Акрил', kind: 'acrylic', price: 100 },
  ],

  tagColors: ['#f28bb0', '#ff6b6b', '#ffb347', '#ffe066', '#7ed6a5', '#5ec8e5', '#6c8cff', '#b48cff', '#ffffff', '#2d2d3a'],
  rimColors: [
    { id: 'silver', name: 'Серебро', color: '#d3d6db' },
    { id: 'gold', name: 'Золото', color: '#e6b84f' },
  ],

  // ---------- Надписи ----------
  pricePerFrontChar: 25, // за каждый символ на лицевой стороне (пробелы бесплатно)
  pricePerBackChar: 15, // за каждый символ на обороте
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
    { id: 'none', name: 'Без значка', price: 0 },
    { id: 'paw', name: 'Лапка', price: 100 },
    { id: 'heart', name: 'Сердце', price: 100 },
    { id: 'bone', name: 'Косточка', price: 100 },
    { id: 'star', name: 'Звезда', price: 100 },
    { id: 'crown', name: 'Корона', price: 100 },
  ],

  // ---------- Шнурок ----------
  cords: [
    { id: 'none', name: 'Только колечко', price: 0 },
    { id: 'wax', name: 'Вощёный шнур', price: 120, radius: 0.055 },
    { id: 'paracord', name: 'Паракорд', price: 180, radius: 0.085 },
    { id: 'chain', name: 'Цепочка', price: 300 },
  ],
  cordColors: ['#e94e77', '#ff8c42', '#ffd23f', '#3bb273', '#2e86de', '#6c5ce7', '#8d6e63', '#1e1e24', '#f5f5f5'],
  chainColors: [
    { id: 'silver', name: 'Серебро', color: '#d3d6db' },
    { id: 'gold', name: 'Золото', color: '#e6b84f' },
  ],

  // ---------- Бусины ----------
  beads: [
    { id: 'round', name: 'Круглая', price: 40 },
    { id: 'facet', name: 'Гранёная', price: 60 },
    { id: 'pearl', name: 'Жемчуг', price: 70 },
    { id: 'metal', name: 'Металлик', price: 50 },
    { id: 'heart', name: 'Сердечко', price: 80 },
    { id: 'star', name: 'Звёздочка', price: 80 },
    { id: 'letter', name: 'Буква', price: 60 },
  ],
  beadColors: ['#ff4f81', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#2e86de', '#a29bfe', '#ffffff', '#222f3e', '#f8c8dc'],

  // ---------- Стразы ----------
  pricePerStrass: 20,
  strassCounts: [0, 6, 10, 16],
  strassColors: [
    { id: 'clear', name: 'Прозрачные', color: '#f4fbff' },
    { id: 'pink', name: 'Розовые', color: '#ff8fc7' },
    { id: 'blue', name: 'Голубые', color: '#8fd8ff' },
  ],

  // ---------- Готовые идеи на главной (открываются в конструкторе для правки) ----------
  // Поля как в конструкторе; не указанное берётся по умолчанию.
  presets: [
    { id: 'princess', title: 'Для кошки-принцессы', state: {
      shape: 'heart', material: 'enamel', tagColor: '#f28bb0', rim: 'gold', strass: 6, strassColor: 'pink',
      front: { line1: 'Мурка', font: 'Lobster', icon: 'crown' }, cord: 'wax', cordColor: '#e94e77',
      beads: [{ type: 'pearl', color: '#ffffff' }, { type: 'heart', color: '#ff4f81' }, { type: 'pearl', color: '#ffffff' }] } },
    { id: 'classic', title: 'Классика для собаки', state: {
      shape: 'bone', material: 'gold', front: { line1: 'Рекс', font: 'Montserrat', icon: 'paw' }, cord: 'chain', chainColor: 'gold' } },
    { id: 'name', title: 'Имя из бусин', state: {
      shape: 'circle', material: 'steel', front: { line1: 'Бублик', font: 'Comfortaa', icon: 'paw' }, cord: 'wax', cordColor: '#1e1e24', beadLayout: 'row',
      beads: [...'БУБЛИК'].map((l) => ({ type: 'letter', color: '#ffffff', letter: l })) } },
    { id: 'fish', title: 'Рыбка для кота', state: {
      shape: 'fish', material: 'enamel', tagColor: '#5ec8e5', rim: 'silver', front: { line1: 'Барсик', font: 'Comfortaa', icon: 'none' },
      cord: 'paracord', cordColor: '#2e86de', beads: [{ type: 'facet', color: '#48dbfb' }, { type: 'metal', color: '#d3d6db' }] } },
    { id: 'flower', title: 'Цветочек с бусинами', state: {
      shape: 'flower', material: 'acrylic', tagColor: '#ffe066', front: { line1: 'Ася', font: 'Caveat', icon: 'heart' }, cord: 'wax', cordColor: '#3bb273',
      beads: [{ type: 'round', color: '#ff9f43' }, { type: 'star', color: '#feca57' }, { type: 'round', color: '#ff9f43' }, { type: 'star', color: '#feca57' }] } },
    { id: 'star', title: 'Звёздочка со стразами', state: {
      shape: 'star', material: 'enamel', tagColor: '#6c8cff', rim: 'silver', strass: 10, strassColor: 'clear',
      front: { line1: 'Луна', font: 'Lobster', icon: 'none' }, cord: 'chain', chainColor: 'silver', beads: [{ type: 'pearl', color: '#f8c8dc' }] } },
  ],

  // ---------- Частые вопросы на главной ----------
  // {days}, {delivery}, {payment} подставляются из настроек выше.
  faq: [
    ['Сколько делается адресник?', 'Обычно {days}. Если нужно быстрее — выберите «Срочно» в конструкторе, сделаем за 1–2 дня.'],
    ['Цена в конструкторе окончательная?', 'Да, это стоимость самого адресника со всеми выбранными деталями. Доставка оплачивается отдельно.'],
    ['Как вы доставляете?', '{delivery}'],
    ['Как оплатить?', '{payment}'],
    ['Можно поменять макет после заказа?', 'Да. Перед началом работы мастер связывается с вами, и все детали можно поправить.'],
    ['Можно сделать по моей идее?', 'Конечно. Опишите её в комментарии к заказу или оставьте заявку — мастер подскажет, как лучше воплотить.'],
  ],

  // ---------- Дополнительно ----------
  extras: [
    { id: 'box', name: 'Подарочная коробочка', price: 150 },
    { id: 'urgent', name: 'Срочно — за 1–2 дня', price: 300 },
  ],
};
