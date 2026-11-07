// Движение в духе apple.com: появление при прокрутке, «приближение» 3D-адресника на первом экране,
// липкая сцена «Как заказать». Только transform/opacity, всё завязано на прокрутку (никаких бесконечных петель),
// prefers-reduced-motion — мягкие проявления без сдвигов. Логика сайта (landing.js) не меняется.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- появление при прокрутке ----------
const groups = [
  ['.sec-head, .parts-head, .about-text, .prices-copy, .lead-copy', 0],
  ['.idea', 4], ['.cat', 2], ['.part', 6], ['.sizes article', 3], ['.reviews blockquote', 3],
  ['.polaroid', 2], ['.price-table', 0], ['.lead-form', 0], ['.faq details', 0], ['.steps li', 3],
];
const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  io.unobserve(e.target);
}), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

for (const [sel, cols] of groups) {
  $$(sel).forEach((el, i) => {
    if (el.closest('.hero')) return;
    el.classList.add('rv');
    if (cols > 1) el.style.setProperty('--d', `${(i % cols) * 0.08}s`);   // лёгкая «лесенка» по колонкам
    io.observe(el);
  });
}
// после фильтра карточки уже на экране — показываем сразу
$('#ideaFilters')?.addEventListener('click', () => requestAnimationFrame(() => $$('.idea.rv').forEach((el) => el.classList.add('in'))));

// ---------- первый экран: адресник «приближается», текст уходит вверх ----------
const stage = $('.hero-stage');
const heroText = [$('.hero-mark'), $('.hero-left')].filter(Boolean);
const hero = $('.hero');

// ---------- «Как заказать»: липкая сцена на десктопе ----------
const how = $('#how');
const steps = how ? $$('.steps li', how) : [];
let bar = null;
const wide = matchMedia('(min-width: 761px) and (min-height: 600px)');
function setupHow() {
  if (!how) return;
  const on = !reduce && wide.matches;
  how.classList.toggle('how-sticky', on);
  if (on && !bar) {
    const p = document.createElement('div');
    p.className = 'progress'; p.setAttribute('aria-hidden', 'true');
    p.innerHTML = '<i></i>';
    $('.steps', how).after(p);
    bar = $('i', p);
  }
  if (!on) steps.forEach((s) => s.classList.remove('on', 'done'));
}
setupHow();
wide.addEventListener?.('change', () => { setupHow(); frame(); });

// ---------- один rAF-цикл на прокрутку ----------
let ticking = false;
function frame() {
  ticking = false;
  const vh = innerHeight;
  if (stage && hero) {
    const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * 0.9)));
    stage.style.transform = `translateY(${p * -40}px) scale(${1 + p * 0.12})`;
    heroText.forEach((el) => { el.style.transform = `translateY(${p * -60}px)`; el.style.opacity = String(1 - p * 1.1); });
  }
  if (how && how.classList.contains('how-sticky')) {
    const r = how.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (how.offsetHeight - vh)));
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length * 0.999));
    steps.forEach((s, i) => { s.classList.toggle('on', i === idx); s.classList.toggle('done', i < idx); });
    if (bar) bar.style.transform = `scaleX(${p})`;
  }
}
if (!reduce) {
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame);
  frame();
}
