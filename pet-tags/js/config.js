// =====================================================================
//  НАСТРОЙКИ МАСТЕРСКОЙ — меняйте цены, контакты и ассортимент здесь.
//  Всё остальное подхватится автоматически.
// =====================================================================

export const CONFIG = {
  brand: 'Mona Vita',
  tagline: 'Адресники и ошейники ручной работы',
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

  limits: { frontLine: 12, frontLine2: 18, backLine: 18, beads: 24 },

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
    { id: 'clay', name: 'Полимерная глина', kind: 'clay', price: 150 },
    { id: 'epoxy', name: 'Эпоксидная смола', kind: 'epoxy', price: 250 },
  ],

  // Узор лицевой и обратной стороны (для всех материалов, кроме металла)
  patterns: [
    { id: 'none', name: 'Однотонный', price: 0 },
    { id: 'stripes', name: 'Полоски', price: 100 },
    { id: 'dots', name: 'Горошек', price: 100 },
    { id: 'leopard', name: 'Леопард', price: 150 },
    { id: 'marble', name: 'Мрамор', price: 150 },
    { id: 'goldleaf', name: 'Поталь (золото)', price: 200 },
  ],

  // Объёмная фигурка поверх адресника
  toppers: [
    { id: 'none', name: 'Без фигурки', price: 0 },
    { id: 'teddy', name: 'Мордочка пёсика', price: 250 },
    { id: 'kitty', name: 'Мордочка котика', price: 250 },
    { id: 'bow', name: 'Бантик', price: 150 },
  ],
  topperColors: ['#d9b38c', '#c8956a', '#f2c48d', '#ffffff', '#f28bb0', '#2d2d3a', '#d3d6db'],

  tagColors: ['#7a7d4a', '#c4683f', '#3d3f45', '#d8c3a5', '#f28bb0', '#d62839', '#c58b5a', '#f4f1ea', '#8fb8e8', '#9a6fb0', '#ff6b6b', '#ffb347', '#ffe066', '#7ed6a5', '#5ec8e5', '#6c8cff', '#b48cff', '#ffffff', '#2d2d3a'],
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
    { id: 'collar', name: 'Ошейник-бусы', price: 450, radius: 0.11 },
  ],
  cordColors: ['#7a7d4a', '#c4683f', '#3d3f45', '#d62839', '#8a9a2b', '#6b4226', '#d8c3a5', '#e94e77', '#ff8c42', '#ffd23f', '#3bb273', '#2e86de', '#6c5ce7', '#8d6e63', '#1e1e24', '#f5f5f5'],
  chainColors: [
    { id: 'silver', name: 'Серебро', color: '#d3d6db' },
    { id: 'gold', name: 'Золото', color: '#e6b84f' },
  ],

  // ---------- Бусины ----------
  // group: bead — бусина на шнурке, charm — подвеска-фигурка; letter: true — с буквой/цифрой
  beads: [
    { id: 'round', name: 'Круглая', price: 40, group: 'bead' },
    { id: 'facet', name: 'Гранёная', price: 60, group: 'bead' },
    { id: 'pearl', name: 'Жемчуг', price: 70, group: 'bead' },
    { id: 'metal', name: 'Металлик', price: 50, group: 'bead' },
    { id: 'heart', name: 'Сердечко', price: 80, group: 'bead' },
    { id: 'star', name: 'Звёздочка', price: 80, group: 'bead' },
    { id: 'silicone', name: 'Силиконовая матовая', price: 50, group: 'bead', color: '#c4683f' },
    { id: 'daisy', name: 'Цветочек', price: 70, group: 'bead', color: '#ffd23f' },
    { id: 'tennis', name: 'Мячик', price: 80, group: 'bead', color: '#cde34a' },
    { id: 'letter', name: 'Буква-кубик', price: 60, group: 'bead', letter: true, color: '#ffffff' },
    { id: 'disc', name: 'Буква-кругляш', price: 50, group: 'bead', letter: true, color: '#ffffff' },
    { id: 'ch-strawberry', name: 'Клубничка', price: 180, group: 'charm', color: '#e0283a' },
    { id: 'ch-croissant', name: 'Круассан', price: 200, group: 'charm' },
    { id: 'ch-teddy', name: 'Пёсик', price: 250, group: 'charm', color: '#c8956a' },
    { id: 'ch-kitty', name: 'Котик', price: 250, group: 'charm', color: '#f2c48d' },
    { id: 'ch-bow', name: 'Бантик', price: 150, group: 'charm', color: '#d3d6db' },
    { id: 'ch-duck', name: 'Уточка', price: 180, group: 'charm', color: '#ffd23f' },
  ],
  beadColors: ['#7a7d4a', '#c4683f', '#3d3f45', '#d8c3a5', '#d62839', '#c8956a', '#f4ecd8', '#cde34a', '#6b4226', '#ff4f81', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#2e86de', '#a29bfe', '#ffffff', '#222f3e', '#f8c8dc'],

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
    { id: 'family', title: 'Фэмили-лук: ошейник + браслет', badge: 'Парные', state: {
      pet: 'cat', extras: ['breakaway'],
      shape: 'bone', material: 'enamel', tagColor: '#d8c3a5', rim: 'gold', front: { line1: 'Моника', font: 'Montserrat', textColor: 'black', icon: 'none' },
      cord: 'collar', cordColor: '#7a7d4a', beadLayout: 'sym', extras: ['bracelet'],
      beads: [['silicone', '#c4683f'], ['silicone', '#c4683f'], ['round', '#d8c3a5'], ['round', '#d8c3a5'], ['metal', '#e6b84f'], ['metal', '#e6b84f'],
        ['silicone', '#7a7d4a'], ['silicone', '#7a7d4a'], ['round', '#d8c3a5'], ['round', '#d8c3a5']].map(([type, color]) => ({ type, color })) } },
    { id: 'oldmoney', title: 'Old Money', badge: 'Новинка', state: {
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
      shape: 'flower', material: 'clay', tagColor: '#9a6fb0', pattern: 'dots', topper: 'kitty', topperColor: '#f2c48d',
      front: { line1: 'Ася', font: 'Caveat', textColor: 'white', icon: 'none' }, cord: 'wax', cordColor: '#f5f5f5',
      beads: [{ type: 'daisy', color: '#ffd23f' }, { type: 'daisy', color: '#ffd23f' }, { type: 'pearl', color: '#ffffff' }, { type: 'pearl', color: '#ffffff' }] } },
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
    { id: 'bracelet', name: 'Парный браслет для хозяина', price: 690 },
    { id: 'nfc', name: 'NFC-метка: контакты касанием телефона', price: 290 },
    { id: 'steel', name: 'Стальной тросик внутри шнура', price: 250, only: 'dog' },
    { id: 'breakaway', name: 'Безопасная застёжка (расстёгивается при рывке)', price: 150, only: 'cat' },
    { id: 'box', name: 'Подарочная коробочка', price: 150 },
    { id: 'urgent', name: 'Срочно — за 1–2 дня', price: 300 },
  ],
};
