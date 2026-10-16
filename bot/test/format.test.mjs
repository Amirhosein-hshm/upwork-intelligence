import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatJobMessage, chunkText, esc, TELEGRAM_LIMIT } from '../tgcloud/lib/format.js';
import { validateScore, validateProposal } from '../tgcloud/lib/validate.js';
import { evaluateJob } from '../tgcloud/lib/score.js';

const job = {
  title: 'API & <Webhook> work',
  url: 'https://www.upwork.com/jobs/~01',
  description_summary: 's',
  job_type: 'fixed',
  budget: { currency: 'USD', min: 500, max: 800, unit: 'project' },
  client: { country: 'Canada', payment_verified: true, rating: 5, hires: 3 },
  skills: ['Node.js'],
  proposals_count: 7,
  connects_required: 16,
  duration: '2 weeks',
  workload: null,
  posted_at: null,
  screening_questions: [],
};
const llm = validateScore({ skill_match: 90, scope_clarity: 80, question_fit: 80, red_flags: [], summary_fa: 'خلاصه', missing_info: ['Q1?'] });
const ev = evaluateJob({ job, llm, rates: { hourly_min_usd: 30, fixed_min_usd: 300 }, prefs: { blocked_client_countries: [], excluded_keywords: [] }, now: Date.now() });

test('escapes HTML special characters', () => {
  assert.equal(esc('a<b>&c'), 'a&lt;b&gt;&amp;c');
});

test('chunkText keeps every chunk under the limit and loses no text', () => {
  const text = Array.from({ length: 400 }, (_, i) => `line ${i} ${'x'.repeat(20)}`).join('\n');
  const chunks = chunkText(text, 1000);
  assert.ok(chunks.every((c) => c.length <= 1000));
  assert.equal(chunks.join('\n').replace(/\s+/g, ''), text.replace(/\s+/g, ''));
});

test('chunkText never cuts an HTML entity in half', () => {
  const text = 'a'.repeat(95) + '&amp;' + 'b'.repeat(50);
  const chunks = chunkText(text, 100);
  assert.ok(chunks.every((c) => !/&[a-z]*$/.test(c) || c.endsWith(';')), JSON.stringify(chunks));
});

test('formatJobMessage: every message within Telegram limit, proposal in <pre>, title escaped', () => {
  const proposal = validateProposal({
    proposal_text: 'Hi & welcome <3 '.repeat(400),
    placeholders: ['[PLACEHOLDER: metric]'],
    do_not_apply_recommended: false,
  });
  const msgs = formatJobMessage({ job, ev, scoreRes: llm, proposal, provider: 'gemini', model: 'm' });
  assert.ok(msgs.length >= 2);
  assert.ok(msgs.every((m) => m.length <= TELEGRAM_LIMIT), 'limit');
  assert.ok(msgs[0].includes('API &amp; &lt;Webhook&gt; work'));
  assert.ok(msgs.join('\n').includes('<pre>'));
  assert.ok(msgs[0].includes('placeholder'));
  assert.ok(msgs[0].includes('APPLY') || msgs[0].includes('MAYBE'));
});
