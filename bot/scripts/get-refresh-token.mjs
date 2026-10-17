#!/usr/bin/env node
// اجرای یک‌باره روی سیستم خودتان (نه روی Telegram Serverless) برای گرفتن Refresh Token Gmail.
//
//   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/get-refresh-token.mjs
//
// مرورگر باز می‌شود؛ با حساب Gmail اختصاصی Upwork وارد شوید و دسترسی بدهید.
// Refresh Token در ترمینال چاپ می‌شود؛ آن را فقط با setSecret ذخیره کنید و جای امن نگه دارید.

import http from 'node:http';
import { exec } from 'node:child_process';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 8787;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('GMAIL_CLIENT_ID و GMAIL_CLIENT_SECRET لازم است.');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400).end(`خطا: ${error || 'code نیست'}`);
    console.error('OAuth error:', error || 'no code');
    server.close();
    process.exit(1);
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const json = await tokenRes.json();
    if (!json.refresh_token) {
      res.writeHead(500).end('refresh_token دریافت نشد. دوباره با prompt=consent امتحان کنید.');
      console.error('No refresh_token in response. Keys:', Object.keys(json));
      server.close();
      process.exit(1);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
      '<h3>انجام شد. این پنجره را ببندید و به ترمینال برگردید.</h3>'
    );
    console.log('\nREFRESH TOKEN (فقط یک‌بار نمایش داده می‌شود):\n' + json.refresh_token + '\n');
    console.log('حالا با setSecret آن را به نام GMAIL_REFRESH_TOKEN ذخیره کنید.');
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 200);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('لینک ورود را باز کنید:\n' + authUrl + '\n');
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${opener} "${authUrl}"`, () => {});
});
