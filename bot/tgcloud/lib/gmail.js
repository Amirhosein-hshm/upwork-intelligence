// Gmail REST API با fetch (بدون npm). fetch به‌صورت پارامتر تزریق می‌شود تا قابل تست باشد.
// Scope: gmail.modify (خواندن + تغییر برچسب؛ ارسال ایمیل نداریم).

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function failIfNotOk(res, what) {
  if (res.ok) return;
  let detail = '';
  try {
    detail = (await res.text()).slice(0, 200);
  } catch {
    /* ignore */
  }
  throw new Error(`${what} ناموفق (HTTP ${res.status})${detail ? `: ${detail}` : ''}`);
}

export async function getAccessToken(fetch, { clientId, clientSecret, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  await failIfNotOk(res, 'تازه‌سازی توکن Gmail');
  const json = await res.json();
  if (!json.access_token) throw new Error('توکن Gmail در پاسخ نبود');
  return json.access_token;
}

// Returns up to `max` unread message ids matching `query`, plus whether more exist.
export async function listUnreadIds(fetch, token, query, max) {
  const params = new URLSearchParams({ q: query, maxResults: String(max) });
  const res = await fetch(`${API}/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await failIfNotOk(res, 'خواندن لیست ایمیل‌ها');
  const json = await res.json();
  const ids = (json.messages || []).map((m) => m.id).slice(0, max);
  return { ids, more: Boolean(json.nextPageToken) };
}

export function decodeBase64Url(data) {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

// Prefer text/plain; fall back to text/html.
export function extractBody(payload) {
  const plain = [];
  const html = [];
  const walk = (part) => {
    if (!part) return;
    if (part.body && part.body.data) {
      if (part.mimeType === 'text/plain') plain.push(decodeBase64Url(part.body.data));
      else if (part.mimeType === 'text/html') html.push(decodeBase64Url(part.body.data));
    }
    for (const child of part.parts || []) walk(child);
  };
  walk(payload);
  if (plain.length) return { body: plain.join('\n'), isHtml: false };
  if (html.length) return { body: html.join('\n'), isHtml: true };
  return { body: '', isHtml: false };
}

function header(headers, name) {
  const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

export async function getMessage(fetch, token, id) {
  const res = await fetch(`${API}/messages/${encodeURIComponent(id)}?format=full`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await failIfNotOk(res, 'خواندن ایمیل');
  const json = await res.json();
  const { body, isHtml } = extractBody(json.payload);
  return {
    id,
    subject: header(json.payload?.headers, 'Subject'),
    date: header(json.payload?.headers, 'Date'),
    body,
    isHtml,
  };
}

// Called ONLY after a successful Telegram send.
export async function markRead(fetch, token, id) {
  const res = await fetch(`${API}/messages/${encodeURIComponent(id)}/modify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
  });
  await failIfNotOk(res, 'حذف برچسب UNREAD');
}
