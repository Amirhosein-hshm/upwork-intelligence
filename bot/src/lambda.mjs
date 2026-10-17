// AWS Lambda entry point. EventBridge invokes this function every 5 minutes.
// Secrets are read from SSM Parameter Store (SecureString) under the /upwork-agent/ prefix.

import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { runCheck } from './lib/pipeline.js';

const PREFIX = process.env.SSM_PREFIX || '/upwork-agent/';
const ssm = new SSMClient({});

let secretsCache = null; // kept between warm invocations

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

// Send to Telegram; the bot token is in the URL, so no error message ever includes the URL.
async function sendTelegram(token, chatId, text, retry = true) {
  let res;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
  } catch {
    throw new Error('Telegram send failed (network error)');
  }
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  const wait = body?.parameters?.retry_after;
  if (res.status === 429 && retry && wait) {
    await new Promise((r) => setTimeout(r, Math.min(wait, 20) * 1000));
    return sendTelegram(token, chatId, text, false);
  }
  throw new Error(`Telegram send failed (HTTP ${res.status}): ${String(body.description || '').slice(0, 150)}`);
}

export const handler = async () => {
  const started = Date.now();
  let tg = null;
  try {
    const secrets = await loadSecrets();
    const token = secrets.TELEGRAM_BOT_TOKEN;
    const chatId = secrets.OWNER_TG_ID;
    if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN or OWNER_TG_ID is missing from SSM');
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
    // Send a one-time notice to the owner for a whole-run failure (e.g. invalid Gmail token).
    if (tg) {
      try {
        await sendTelegram(tg.token, tg.chatId, `⚠️ Scheduled run failed: ${msg.replace(/[<>&]/g, '')}`);
      } catch {
        /* If Telegram is unreachable too, the log entry is enough. */
      }
    }
    throw err; // Let CloudWatch record the invocation as a failure.
  }
};
