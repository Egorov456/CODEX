// Серверная функция (Vercel, Node 18+): принимает заказы из конструктора и заявки с главной, пересылает мастеру в Telegram.
// Переменные окружения: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Токен никогда не попадает в браузер.

const MAX_TEXT = 3800;
const MAX_IMAGE = 6 * 1024 * 1024; // байт base64

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return res.status(500).json({ error: 'not configured' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'json' }); }
  }
  if (body?.website) return res.status(200).json({ ok: true }); // ловушка для ботов
  const text = typeof body?.text === 'string' ? body.text.slice(0, MAX_TEXT) : '';
  const id = typeof body?.id === 'string' ? body.id.slice(0, 20) : '';
  if (!text) return res.status(400).json({ error: 'empty' });

  const api = (m) => `https://api.telegram.org/bot${token}/${m}`;
  try {
    const img = typeof body.image === 'string' ? body.image : '';
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(img);
    if (m && m[1].length <= MAX_IMAGE) {
      const fd = new FormData();
      fd.append('chat_id', chat);
      fd.append('caption', `🐾 Макет заказа ${id}`);
      fd.append('photo', new Blob([Buffer.from(m[1], 'base64')], { type: 'image/png' }), 'maket.png');
      await fetch(api('sendPhoto'), { method: 'POST', body: fd });
    }
    // без parse_mode — текст клиента уходит как есть, без разметки
    const r = await fetch(api('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text }),
    });
    if (!r.ok) return res.status(502).json({ error: 'telegram' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'telegram' });
  }
}
