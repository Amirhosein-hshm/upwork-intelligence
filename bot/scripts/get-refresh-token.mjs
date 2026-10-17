#!/usr/bin/env node
// Run once on your own machine to obtain a Gmail Refresh Token.
//
//   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/get-refresh-token.mjs
//
// A browser opens; sign in with the dedicated Upwork Gmail account and grant access.
// The Refresh Token is printed in the terminal; store it only with put-secret.mjs and keep it private.

import http from 'node:http';
import { exec } from 'node:child_process';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 8787;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET are required.');
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
    res.writeHead(400).end(`Error: ${error || 'no code'}`);
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
      res.writeHead(500).end('No refresh_token received. Retry with prompt=consent.');
      console.error('No refresh_token in response. Keys:', Object.keys(json));
      server.close();
      process.exit(1);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(
      '<h3>Done. Close this window and return to the terminal.</h3>'
    );
    console.log('\nREFRESH TOKEN (shown only once):\n' + json.refresh_token + '\n');
    console.log('Now store it as GMAIL_REFRESH_TOKEN with put-secret.mjs.');
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 200);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Open this sign-in link:\n' + authUrl + '\n');
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${opener} "${authUrl}"`, () => {});
});
