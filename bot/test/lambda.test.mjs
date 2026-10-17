// تست end-to-end نقطه‌ی ورود Lambda: SSM و fetch (Gmail، LLM، Telegram) ساختگی‌اند.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SSMClient } from '@aws-sdk/client-ssm';

import { PROFILE } from '../src/lib/profile.js';
// پروفایل واقعی هنوز [TODO] دارد (عمداً). در تست، مقدار ساختگی درون حافظه‌ی همین فرایند می‌گذاریم.
Object.assign(PROFILE, {
  identity: { headline: 'Frontend engineer', years_experience: '6', english_level: 'C1' },
  core_skills: ['React', 'Node.js'],
  secondary_skills: [],
  rates: { hourly_min_usd: 30, fixed_min_usd: 300 },
  preferences: { blocked_client_countries: [], excluded_keywords: [] },
  proof_points: [{ id: 'pp1', text: 'Cut page load 40%', evidence_url: '' }],
  portfolio: [],
  tone: 'direct',
  examples: [],
});

const b64 = (s) => Buffer.from(s, 'utf-8').toString('base64url');

const SSM = {
  '/upwork-agent/TELEGRAM_BOT_TOKEN': '123:TOKEN',
  '/upwork-agent/OWNER_TG_ID': '42',
  '/upwork-agent/GMAIL_CLIENT_ID': 'cid',
  '/upwork-agent/GMAIL_CLIENT_SECRET': 'csec',
  '/upwork-agent/GMAIL_REFRESH_TOKEN': 'rt',
  '/upwork-agent/GEMINI_API_KEY': 'gk',
};
SSMClient.prototype.send = async () => ({
  Parameters: Object.entries(SSM).map(([Name, Value]) => ({ Name, Value })),
});

const EMAIL = `New job
React dashboard for SaaS analytics
Fixed price: $800 - $1200
Read more: https://www.upwork.com/jobs/React-Dashboard_~0123abc
Charts, auth and CSV export. Two weeks.`;

const EXTRACT = {
  email_type: 'job_alert',
  job: {
    title: 'React dashboard for SaaS analytics',
    url: 'https://www.upwork.com/jobs/React-Dashboard_~0123abc',
    description_summary: 'Dashboard',
    job_type: 'fixed',
    budget: { currency: 'USD', min: 800, max: 1200, unit: 'project' },
    client: { country: 'United States', payment_verified: true, rating: 4.9, hires: 10 },
    skills: ['React'],
    proposals_count: 5,
    screening_questions: [],
  },
  extraction_notes: [],
};
const SCORE = { skill_match: 90, scope_clarity: 85, question_fit: 80, red_flags: [], summary_fa: 'مناسب', missing_info: [] };
const PROPOSAL = { proposal_text: 'Charts first. I cut load time 40% before.\n\nWhich chart types matter?', placeholders: [], do_not_apply_recommended: false };

const calls = [];
globalThis.fetch = async (url, opts = {}) => {
  calls.push({ url, method: opts.method || 'GET', body: opts.body });
  const ok = (o) => ({ ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o) });
  if (url.startsWith('https://oauth2.googleapis.com')) return ok({ access_token: 'AT' });
  if (url.includes('/gmail/v1/users/me/messages?')) return ok({ messages: [{ id: 'm1' }] });
  if (url.endsWith('/modify')) return ok({});
  if (url.includes('/gmail/v1/users/me/messages/m1')) {
    return ok({ payload: { mimeType: 'text/plain', headers: [{ name: 'Subject', value: 'New job' }], body: { data: b64(EMAIL) } } });
  }
  if (url.includes('generativelanguage')) {
    const sys = JSON.parse(opts.body).systemInstruction.parts[0].text;
    const reply = sys.includes('You extract') ? EXTRACT : sys.includes('You evaluate') ? SCORE : PROPOSAL;
    return ok({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] });
  }
  if (url.startsWith('https://api.telegram.org/bot123:TOKEN/sendMessage')) return ok({ ok: true });
  throw new Error('unexpected ' + url);
};

test('scheduled run: job found → Telegram message to owner → email marked read', async () => {
  const { handler } = await import('../src/lambda.mjs');
  const res = await handler({});
  assert.equal(res.ok, true);
  assert.equal(res.found, 1);
  assert.equal(res.job_sent, 1);

  const tg = calls.filter((c) => c.url.includes('api.telegram.org'));
  assert.equal(tg.length, 1);
  const body = JSON.parse(tg[0].body);
  assert.equal(body.chat_id, '42');
  assert.equal(body.parse_mode, 'HTML');

  const mod = calls.find((c) => c.url.endsWith('/modify'));
  assert.ok(mod, 'UNREAD removed after send');
  assert.deepEqual(JSON.parse(mod.body), { removeLabelIds: ['UNREAD'] });
  // ترتیب: ارسال قبل از علامت‌گذاری
  assert.ok(calls.indexOf(tg[0]) < calls.indexOf(mod));
});
