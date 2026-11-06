import { CONFIG } from './config.js';

// Отправка заказов/заявок мастеру и аналитика — общее для главной и конструктора.

export const waLink = (text) => `https://wa.me/${CONFIG.contacts.whatsapp}?text=${encodeURIComponent(text)}`;
export const tgLink = () => `https://t.me/${CONFIG.contacts.telegram}`;

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.append(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

// POST на серверную функцию. true — дошло до мастера, false — нужно отправить вручную.
export async function postToMaster(payload) {
  if (!CONFIG.orderEndpoint) return false;
  try {
    const r = await fetch(CONFIG.orderEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function newId(prefix = '#') {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${prefix}${p(d.getDate())}${p(d.getMonth() + 1)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// ---------- Яндекс.Метрика ----------
let metrikaReady = false;
export function initAnalytics() {
  const id = String(CONFIG.metrikaId || '').replace(/\D/g, '');
  if (!id || metrikaReady) return;
  metrikaReady = true;
  window.ym = window.ym || function () { (window.ym.a = window.ym.a || []).push(arguments); };
  window.ym.l = Date.now();
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.append(s);
  window.ym(Number(id), 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
}

// Цели: open_constructor, lead_submit, order_submit, advice_click, messenger_click
export function goal(name, params) {
  const id = Number(String(CONFIG.metrikaId || '').replace(/\D/g, ''));
  try {
    if (id && window.ym) window.ym(id, 'reachGoal', name, params);
  } catch { /* аналитика не должна ломать сайт */ }
}
