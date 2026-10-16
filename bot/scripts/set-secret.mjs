#!/usr/bin/env node
// تنظیم یک secret روی ربات، بدون اینکه مقدار در تاریخچه‌ی shell یا چت تلگرام بماند.
//
//   node scripts/set-secret.mjs --owner <TG_USER_ID> <SECRET_NAME>
//
// مقدار را پنهان تایپ می‌کنید. سپس این اسکریپت `npx tgcloud run endpoints/setSecret` را اجرا می‌کند.
// نام‌های مجاز: همان لیست SECRET_NAMES در tgcloud/lib/config.js
//
// اولین بار: node scripts/set-secret.mjs --owner 123456 OWNER_TG_ID   (مقدار همان --owner است)

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const ownerIdx = args.indexOf('--owner');
if (ownerIdx === -1 || !args[ownerIdx + 1]) {
  console.error('استفاده: node scripts/set-secret.mjs --owner <TG_USER_ID> <SECRET_NAME>');
  process.exit(1);
}
const ownerId = args[ownerIdx + 1];
if (!/^\d+$/.test(ownerId)) {
  console.error('--owner باید عدد باشد (شناسه‌ی عددی تلگرام).');
  process.exit(1);
}
const name = args.find((a, i) => i !== ownerIdx && i !== ownerIdx + 1 && !a.startsWith('--'));
if (!name || !/^[A-Z_]+$/.test(name)) {
  console.error('نام secret را وارد کنید، مثلاً GEMINI_API_KEY');
  process.exit(1);
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('این اسکریپت باید در ترمینال تعاملی اجرا شود.'));
      return;
    }
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') {
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };
    process.stdin.on('data', onData);
    process.stdin.resume();
  });
}

// OWNER_TG_ID مقدارش همان --owner است؛ پرسیدن ندارد
const value =
  name === 'OWNER_TG_ID' ? ownerId : (await readHidden(`مقدار ${name} (پنهان است، Enter بزنید): `)).trim();
if (!value) {
  console.error('مقدار خالی است.');
  process.exit(1);
}

const payload = JSON.stringify({ action: 'set', name, value });
const ctx = JSON.stringify({ initData: { user: { id: Number(ownerId) } } });

const res = spawnSync('npx', ['tgcloud', 'run', 'endpoints/setSecret', payload, '--ctx', ctx], {
  stdio: ['ignore', 'inherit', 'inherit'],
  shell: process.platform === 'win32',
});
if (res.status !== 0) {
  console.error(`\nناموفق بود (کد خروج ${res.status}). خطای بالا را بخوانید.`);
  process.exit(res.status ?? 1);
}
console.log(`\n✓ ${name} ذخیره شد.`);
