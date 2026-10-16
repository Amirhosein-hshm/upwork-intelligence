import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateJob } from '../tgcloud/lib/score.js';
import { validateScore } from '../tgcloud/lib/validate.js';

const rates = { hourly_min_usd: 30, fixed_min_usd: 300 };
const prefs = { blocked_client_countries: ['Atlantis'], excluded_keywords: ['data entry'] };
const NOW = Date.parse('2026-10-16T12:00:00Z');

const goodLlm = validateScore({
  skill_match: 90,
  scope_clarity: 80,
  question_fit: 80,
  red_flags: [],
  summary_fa: 'خوب است.',
  missing_info: [],
});

const baseJob = {
  title: 'React dashboard',
  url: 'https://www.upwork.com/jobs/~01',
  description_summary: 'Build a React dashboard',
  job_type: 'fixed',
  budget: { currency: 'USD', min: 800, max: 1200, unit: 'project' },
  client: { country: 'United States', payment_verified: true, rating: 4.9, hires: 12, total_spent_usd: 20000 },
  skills: ['React'],
  proposals_count: 4,
  duration: '1 month',
  workload: null,
  posted_at: '2026-10-16T10:00:00Z',
  screening_questions: [],
};

test('strong job gets APPLY', () => {
  const ev = evaluateJob({ job: baseJob, llm: goodLlm, rates, prefs, now: NOW });
  assert.equal(ev.gates.passed, true);
  assert.equal(ev.verdict, 'APPLY');
  assert.ok(ev.score >= 75, `score ${ev.score}`);
});

test('G1: hourly budget below minimum is SKIP', () => {
  const job = { ...baseJob, job_type: 'hourly', budget: { currency: 'USD', min: 10, max: 15, unit: 'hour' } };
  const ev = evaluateJob({ job, llm: goodLlm, rates, prefs, now: NOW });
  assert.deepEqual(ev.gates.failed, ['G1']);
  assert.equal(ev.verdict, 'SKIP');
});

test('G2: blocked country is SKIP', () => {
  const job = { ...baseJob, client: { ...baseJob.client, country: 'atlantis' } };
  const ev = evaluateJob({ job, llm: goodLlm, rates, prefs, now: NOW });
  assert.ok(ev.gates.failed.includes('G2'));
});

test('G3: excluded keyword is SKIP', () => {
  const job = { ...baseJob, title: 'Data Entry specialist' };
  const ev = evaluateJob({ job, llm: goodLlm, rates, prefs, now: NOW });
  assert.ok(ev.gates.failed.includes('G3'));
});

test('G4: unverified payment with small budget fails', () => {
  const job = { ...baseJob, budget: { currency: 'USD', min: 200, max: 300, unit: 'project' }, client: { ...baseJob.client, payment_verified: false } };
  const ev = evaluateJob({ job, llm: goodLlm, rates, prefs, now: NOW });
  assert.ok(ev.gates.failed.includes('G4'));
});

test('G5: skill_match below 30 fails', () => {
  const llm = { ...goodLlm, skill_match: 20 };
  const ev = evaluateJob({ job: baseJob, llm, rates, prefs, now: NOW });
  assert.ok(ev.gates.failed.includes('G5'));
});

test('G6: off-platform contact flag fails the gate and adds penalty', () => {
  const llm = validateScore({
    ...goodLlm,
    red_flags: [{ code: 'off_platform_contact', evidence_quote: 'message me on WhatsApp', confidence: 'high' }],
  });
  const ev = evaluateJob({ job: baseJob, llm, rates, prefs, now: NOW });
  assert.ok(ev.gates.failed.includes('G6'));
  assert.equal(ev.verdict, 'SKIP');
  assert.equal(ev.penalties, 20);
});

test('low-confidence red flag is a warning only, no penalty', () => {
  const llm = validateScore({
    ...goodLlm,
    red_flags: [{ code: 'vague_scope', evidence_quote: 'x', confidence: 'low' }],
  });
  const ev = evaluateJob({ job: baseJob, llm, rates, prefs, now: NOW });
  assert.equal(ev.penalties, 0);
  assert.deepEqual(ev.warnings, ['vague_scope']);
});

test('unknown payment (null) does not fail G4', () => {
  const job = { ...baseJob, budget: { currency: 'USD', min: 200, max: 300, unit: 'project' }, client: { ...baseJob.client, payment_verified: null } };
  const ev = evaluateJob({ job, llm: goodLlm, rates, prefs, now: NOW });
  assert.equal(ev.gates.passed, true);
});

test('weak fit gives MAYBE or SKIP, never APPLY', () => {
  const llm = validateScore({ skill_match: 45, scope_clarity: 40, question_fit: 40, red_flags: [], summary_fa: '', missing_info: [] });
  const ev = evaluateJob({ job: baseJob, llm, rates, prefs, now: NOW });
  assert.notEqual(ev.verdict, 'APPLY');
});

test('scores are clamped to 0..100', () => {
  const llm = validateScore({ skill_match: 500, scope_clarity: -5, question_fit: 100, red_flags: [], summary_fa: '', missing_info: [] });
  const ev = evaluateJob({ job: baseJob, llm, rates, prefs, now: NOW });
  assert.ok(ev.score >= 0 && ev.score <= 100);
  assert.equal(ev.subscores.skill_match, 100);
  assert.equal(ev.subscores.scope_clarity, 0);
});

test('old posting caps timing score', () => {
  const job = { ...baseJob, posted_at: '2026-10-01T00:00:00Z' };
  const ev = evaluateJob({ job, llm: goodLlm, rates, prefs, now: NOW });
  assert.ok(ev.subscores.timing <= 40);
});
