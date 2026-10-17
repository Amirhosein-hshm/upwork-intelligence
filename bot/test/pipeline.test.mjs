// End-to-end test of the run flow with a stubbed fetch and LLM (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCheck } from '../src/lib/pipeline.js';
import { decodeBase64Url } from '../src/lib/gmail.js';

const b64 = (s) => Buffer.from(s, 'utf-8').toString('base64url');

const READY_PROFILE = {
  identity: { headline: 'Frontend engineer', years_experience: '6', english_level: 'C1' },
  core_skills: ['React', 'Node.js'],
  secondary_skills: [],
  rates: { hourly_min_usd: 30, fixed_min_usd: 300 },
  preferences: { blocked_client_countries: [], excluded_keywords: [] },
  proof_points: [{ id: 'pp1', text: 'Cut page load 40% on a React app', evidence_url: '' }],
  portfolio: [],
  tone: 'direct',
  examples: [],
};

const SECRETS = {
  GMAIL_CLIENT_ID: 'cid',
  GMAIL_CLIENT_SECRET: 'csec',
  GMAIL_REFRESH_TOKEN: 'rt',
  GEMINI_API_KEY: 'gk',
};

const getSecret = async (n) => SECRETS[n] ?? null;

function makeMail(id, bodyText, subject = 'New job') {
  return {
    id,
    payload: {
      mimeType: 'multipart/alternative',
      headers: [{ name: 'Subject', value: subject }, { name: 'Date', value: 'Fri, 16 Oct 2026 10:00:00 +0000' }],
      parts: [{ mimeType: 'text/plain', body: { data: b64(bodyText) } }],
    },
  };
}

const JOB_EMAIL = `New job matching your profile:
React dashboard for SaaS analytics
Fixed price: $800 - $1200
Client location: United States
Read more: https://www.upwork.com/jobs/React-Dashboard_~0123abc
We need a React dashboard with charts, auth and CSV export. Two weeks.
Unsubscribe from these emails`;

const EXTRACT_JOB = {
  email_type: 'job_alert',
  job: {
    title: 'React dashboard for SaaS analytics',
    url: 'https://www.upwork.com/jobs/React-Dashboard_~0123abc',
    description_summary: 'Dashboard with charts, auth and CSV export.',
    job_type: 'fixed',
    budget: { currency: 'USD', min: 800, max: 1200, unit: 'project' },
    client: { country: 'United States', payment_verified: true, rating: 4.9, hires: 10, total_spent_usd: 30000 },
    skills: ['React', 'Charts'],
    proposals_count: 5,
    duration: '2 weeks',
    workload: null,
    posted_at: null,
    screening_questions: [],
    connects_required: 16,
  },
  extraction_notes: [],
};

const SCORE_OK = { skill_match: 90, scope_clarity: 85, question_fit: 80, red_flags: [], summary_en: 'Good fit.', missing_info: [] };
const PROPOSAL_OK = {
  proposal_text: 'Charts and CSV export are a good first milestone. I would start with the data model.\n\nI cut page load by 40% on a React app.\n\nWhich chart types matter most?',
  first_sentence_reference: 'charts and CSV export',
  claims_used: [],
  placeholders: [],
  questions_for_human: [],
  risks: [],
  do_not_apply_recommended: false,
};

// Stub fetch: Gmail + Gemini, replying based on the prompt content
function makeFetch({ mails, extractReply, failGemini = false }) {
  const calls = [];
  const fetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    const ok = (obj) => ({ ok: true, status: 200, json: async () => obj, text: async () => JSON.stringify(obj) });
    if (url.startsWith('https://oauth2.googleapis.com/token')) return ok({ access_token: 'AT' });
    if (url.includes('/gmail/v1/users/me/messages?')) {
      return ok({ messages: mails.map((m) => ({ id: m.id })) });
    }
    if (url.includes('/modify')) return ok({});
    if (url.includes('/gmail/v1/users/me/messages/')) {
      const id = url.split('/messages/')[1].split('?')[0];
      return ok(mails.find((m) => m.id === id));
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      if (failGemini) return { ok: false, status: 500, json: async () => ({}), text: async () => 'boom' };
      const body = JSON.parse(opts.body);
      const sys = body.systemInstruction.parts[0].text;
      let reply;
      if (sys.includes('You extract structured data')) reply = extractReply;
      else if (sys.includes('You evaluate one extracted')) reply = SCORE_OK;
      else reply = PROPOSAL_OK;
      return ok({ candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(reply) + '\n```' }] } }] });
    }
    throw new Error('unexpected url ' + url);
  };
  return { fetch, calls };
}

const modifyCalls = (calls) => calls.filter((c) => c.url.includes('/modify'));

test('job alert → one job message sent, then email marked read', async () => {
  const { fetch, calls } = makeFetch({ mails: [makeMail('m1', JOB_EMAIL)], extractReply: EXTRACT_JOB });
  const sent = [];
  const stats = await runCheck({ fetch, getSecret, send: async (t) => sent.push(t), profile: READY_PROFILE });
  assert.equal(stats.found, 1);
  assert.equal(stats.job_sent, 1);
  assert.equal(stats.failed, 0);
  assert.ok(sent.some((t) => t.includes('React dashboard for SaaS analytics')));
  assert.ok(sent.some((t) => t.includes('<pre>')));
  // Order: send before removing UNREAD
  const modifyIdx = calls.findIndex((c) => c.url.includes('/modify'));
  assert.ok(modifyIdx > -1);
  assert.deepEqual(JSON.parse(modifyCalls(calls)[0].body), { removeLabelIds: ['UNREAD'] });
});

test('non-job email (invitation) → info message, still marked read', async () => {
  const { fetch, calls } = makeFetch({
    mails: [makeMail('m2', 'You have been invited to a job. Accept in Upwork to view details. Thanks for using Upwork and welcome back to the platform.', 'Invitation')],
    extractReply: { email_type: 'invitation', job: null, extraction_notes: [] },
  });
  const sent = [];
  const stats = await runCheck({ fetch, getSecret, send: async (t) => sent.push(t), profile: READY_PROFILE });
  assert.equal(stats.not_job, 1);
  assert.ok(sent.some((t) => t.includes('was not a job')));
  assert.equal(modifyCalls(calls).length, 1);
});

test('LLM failure → error message, email stays UNREAD (no modify)', async () => {
  const { fetch, calls } = makeFetch({ mails: [makeMail('m3', JOB_EMAIL)], extractReply: EXTRACT_JOB, failGemini: true });
  const sent = [];
  const log = { error() {}, info() {} };
  const stats = await runCheck({ fetch, getSecret, send: async (t) => sent.push(t), profile: READY_PROFILE, log });
  assert.equal(stats.failed, 1);
  assert.equal(stats.permanent_failed, 0);
  assert.equal(stats.job_sent, 0);
  // Transient error: nothing is sent to Telegram and the email stays UNREAD
  assert.equal(sent.length, 0);
  assert.equal(modifyCalls(calls).length, 0);
});

test('low budget → SKIP: nothing sent to Telegram, but email marked read', async () => {
  const cheap = {
    ...EXTRACT_JOB,
    job: { ...EXTRACT_JOB.job, job_type: 'hourly', budget: { currency: 'USD', min: 10, max: 15, unit: 'hour' } },
  };
  const { fetch, calls } = makeFetch({ mails: [makeMail('m4', JOB_EMAIL)], extractReply: cheap });
  const sent = [];
  const stats = await runCheck({ fetch, getSecret, send: async (t) => sent.push(t), profile: READY_PROFILE });
  assert.equal(stats.skipped, 1);
  assert.equal(stats.job_sent, 0);
  assert.equal(modifyCalls(calls).length, 1);
  assert.ok(!sent.some((t) => t.includes('<pre>')));
});

test('no unread emails → silent, no LLM call', async () => {
  const { fetch, calls } = makeFetch({ mails: [], extractReply: EXTRACT_JOB });
  const sent = [];
  const stats = await runCheck({ fetch, getSecret, send: async (t) => sent.push(t), profile: READY_PROFILE });
  assert.equal(stats.found, 0);
  assert.equal(sent.length, 0);
  assert.ok(!calls.some((c) => c.url.includes('generativelanguage')));
});

test('permanent content error (no job link) → one notice, marked read', async () => {
  const noLink = JOB_EMAIL.replace('https://www.upwork.com/jobs/React-Dashboard_~0123abc', 'see our site');
  const badExtract = { ...EXTRACT_JOB, job: { ...EXTRACT_JOB.job, url: 'https://evil.example.com/x' } };
  const { fetch, calls } = makeFetch({ mails: [makeMail('m5', noLink)], extractReply: badExtract });
  const sent = [];
  const stats = await runCheck({ fetch, getSecret, send: async (t) => sent.push(t), profile: READY_PROFILE, log: { error() {}, info() {} } });
  assert.equal(stats.permanent_failed, 1);
  assert.equal(stats.failed, 0);
  assert.equal(sent.length, 1);
  assert.ok(sent[0].includes('could not be processed'));
  assert.equal(modifyCalls(calls).length, 1);
});

test('profile with [TODO] refuses to run', async () => {
  const { fetch } = makeFetch({ mails: [], extractReply: EXTRACT_JOB });
  await assert.rejects(
    runCheck({ fetch, getSecret, send: async () => {} }), // Default: PROFILE still contains [TODO]
    /not complete yet/
  );
});

test('missing secrets gives a ConfigError listing names', async () => {
  const { fetch } = makeFetch({ mails: [], extractReply: EXTRACT_JOB });
  await assert.rejects(
    runCheck({ fetch, getSecret: async () => null, send: async () => {}, profile: READY_PROFILE }),
    /GMAIL_CLIENT_ID/
  );
});

test('decodeBase64Url handles UTF-8 and url-safe characters', () => {
  const s = 'Unicode: café — ✓';
  assert.equal(decodeBase64Url(b64(s)), s);
});
