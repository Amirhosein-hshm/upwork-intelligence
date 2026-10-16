import { db, api, fetch } from 'sdk';
import { eq } from 'sdk/db';
import { secrets } from '../schema.js';
import { runCheck } from '../lib/pipeline.js';
import { HELP_TEXT, esc } from '../lib/format.js';

async function getSecret(name) {
  const row = await db.select().from(secrets).where(eq(secrets.name, name)).get();
  return row ? row.value : null;
}

// Telegram delivers the Message object as `message` (payload of handlers/message).
export default async function (message) {
  const chatId = message.chat.id;
  const send = (text) =>
    api.sendMessage({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });

  // فقط مالک ربات پاسخ می‌گیرد؛ بقیه بی‌صدا نادیده گرفته می‌شوند
  const owner = await getSecret('OWNER_TG_ID');
  if (!owner) {
    // راه‌اندازی اولیه: شناسه‌ی عددی تلگرام خود را برای تنظیم OWNER_TG_ID بگیرید
    if (message.from && (message.text || '').trim().startsWith('/start')) {
      await send(`شناسه‌ی تلگرام شما: <code>${message.from.id}</code>\nبرای تنظیم مالک، این عدد را در ترمینال استفاده کنید.`);
    }
    return;
  }
  if (String(message.from?.id) !== owner) {
    return;
  }

  const command = (message.text || '').trim().split(/\s+/)[0].split('@')[0];

  try {
    if (command === '/check') {
      const s = await runCheck({ fetch, getSecret, send });
      await send(
        `✅ بررسی تمام شد.\n` +
          `پیش‌نویس ارسال‌شده: ${s.job_sent} · رد شده (SKIP): ${s.skipped} · غیرجاب: ${s.not_job} · خطا: ${s.failed}`
      );
    } else if (command === '/start' || command === '/help') {
      await send(HELP_TEXT);
    } else {
      await send('فرمان ناشناخته است. /help را بزنید.');
    }
  } catch (err) {
    console.error('handler error', String(err?.message || err).slice(0, 300));
    await send(`⚠️ خطا: ${esc(err?.message || 'نامشخص')}`);
  }
}
