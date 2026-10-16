// نقطه‌ی ورود AWS Lambda. EventBridge هر ۵ دقیقه این تابع را صدا می‌زند.
// secrets از SSM Parameter Store (SecureString) خوانده می‌شوند، با پیشوند /upwork-agent/.

import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { runCheck } from './lib/pipeline.js';

const PREFIX = process.env.SSM_PREFIX || '/upwork-agent/';
const ssm = new SSMClient({});

let secretsCache = null; // بین اجراهای warm نگه داشته می‌شود

async function loadSecrets() {
  if (secretsCache) return secretsCache;
  const out = {};
  let NextToken;
  do {
    const res = await ssm.send(
      new GetParametersByPathCommand({ Path: PREFIX, WithDecryption: true, Recursive: false, NextToken })
    );
    for (const p of res.Parameters || []) {
      out[p.Name.slice(PREFIX.length)] = p.Value;
    }
    NextToken = res.NextToken;
  } while (NextToken);
  secretsCache = out;
  return out;
}

// ارسال به تلگرام؛ توکن ربات در URL است، پس هیچ خطایی با URL بیرون نمی‌آید
async function sendTelegram(token, chatId, text, retry = true) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch {
    throw new Error('ارسال به تلگرام ناموفق (شبکه)');
  }
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  const wait = body?.parameters?.retry_after;
  if (res.status === 429 && retry && wait) {
    await new Promise((r) => setTimeout(r, Math.min(wait, 20) * 1000));
    return sendTelegram(token, chatId, text, false);
  }
  throw new Error(`ارسال به تلگرام ناموفق (HTTP ${res.status}): ${String(body.description || '').slice(0, 150)}`);
}

export const handler = async () => {
  const started = Date.now();
  let tg = null;
  try {
    const secrets = await loadSecrets();
    const token = secrets.TELEGRAM_BOT_TOKEN;
    const chatId = secrets.OWNER_TG_ID;
    if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN یا OWNER_TG_ID در SSM نیست');
    tg = { token, chatId };

    const stats = await runCheck({
      fetch,
      getSecret: async (name) => secrets[name] ?? null,
      send: (text) => sendTelegram(token, chatId, text),
    });
    console.log(JSON.stringify({ ok: true, ms: Date.now() - started, ...stats }));
    return { ok: true, ...stats };
  } catch (err) {
    const msg = String(err?.message || err).slice(0, 300);
    console.error(JSON.stringify({ ok: false, ms: Date.now() - started, error: msg }));
    // خطای کل اجرا (مثلاً توکن Gmail باطل) را یک‌بار به مالک اعلام می‌کنیم
    if (tg) {
      try {
        await sendTelegram(tg.token, tg.chatId, `⚠️ اجرای خودکار ناموفق بود: ${msg.replace(/[<>&]/g, '')}`);
      } catch {
        /* اگر تلگرام هم در دسترس نیست، فقط لاگ کافی است */
      }
    }
    throw err; // تا CloudWatch خطا را به‌عنوان failure ثبت کند
  }
};
