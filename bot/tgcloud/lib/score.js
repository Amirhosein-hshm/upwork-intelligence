// Hard gates (G1–G7) و امتیاز وزنی از research/03-job-scoring-rubric.md. این ماژول خالص است (بدون LLM و بدون I/O).

export const WEIGHTS = {
  skill_match: 30,
  scope_clarity: 15,
  budget_fit: 20,
  client_quality: 15,
  timing: 10,
  logistics: 5,
  question_fit: 5,
};

export const PENALTIES = {
  vague_scope: 8,
  budget_mismatch: 8,
  too_many_proposals: 5,
  client_no_history: 6,
  pay_low_effort_high_scope: 10,
  ask_for_free_work: 15,
  urgent_pressure_no_detail: 5,
  off_platform_contact: 20,
  unusual_payment_request: 25,
};

const clamp = (x, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
const DAY_MS = 24 * 60 * 60 * 1000;

export function budgetValueOf(job) {
  const b = job.budget;
  if (!b) return null;
  if (typeof b.max === 'number') return b.max;
  if (typeof b.min === 'number') return b.min;
  return null;
}

function budgetFit(value, threshold, isUsd) {
  if (value === null || !isUsd || !threshold) return 50; // نامشخص: خنثی
  const r = value / threshold;
  if (r >= 2) return 100;
  if (r >= 1) return 85;
  if (r >= 0.7) return 50;
  return 15;
}

function clientQuality(c) {
  if (!c) return 50;
  let s = 50;
  if (c.payment_verified === true) s += 20;
  if (c.payment_verified === false) s -= 20;
  if (typeof c.rating === 'number') {
    if (c.rating >= 4.8) s += 15;
    else if (c.rating >= 4.5) s += 10;
    else if (c.rating < 4) s -= 15;
  }
  if (typeof c.hires === 'number') {
    if (c.hires === 0) s -= 10;
    else if (c.hires >= 5) s += 10;
  }
  if (typeof c.total_spent_usd === 'number' && c.total_spent_usd >= 5000) s += 5;
  return clamp(s);
}

function timing(job, now) {
  const p = job.proposals_count;
  let s;
  if (typeof p !== 'number') s = 50;
  else if (p < 5) s = 100;
  else if (p < 15) s = 80;
  else if (p < 30) s = 60;
  else if (p < 50) s = 40;
  else s = 20;
  const posted = Date.parse(job.posted_at || '');
  if (!Number.isNaN(posted) && now - posted > 3 * DAY_MS) s = Math.min(s, 40);
  return s;
}

function logistics(job) {
  let s = 50;
  if (job.duration) s += 25; // اطلاعات زمان‌بندی موجود است
  if (job.workload) s += 25;
  return s;
}

/**
 * @param {object} args
 * @param {object} args.job        خروجی validateExtraction().job
 * @param {object} args.llm        خروجی validateScore()
 * @param {object} args.rates      { hourly_min_usd, fixed_min_usd }
 * @param {object} args.prefs      { blocked_client_countries, excluded_keywords }
 */
export function evaluateJob({ job, llm, rates, prefs, now = Date.now() }) {
  const failed = [];
  const value = budgetValueOf(job);
  const isUsd = !job.budget || !job.budget.currency || job.budget.currency.toUpperCase() === 'USD';
  const isHourly = job.job_type === 'hourly' || job.budget?.unit === 'hour';
  const threshold = isHourly ? rates.hourly_min_usd : rates.fixed_min_usd;

  // G1: بودجه/نرخ زیر حداقل
  if (isUsd && value !== null && value < threshold) failed.push('G1');

  // G2: کشور کارفرمای ممنوع
  const country = job.client?.country;
  if (country && prefs.blocked_client_countries.some((c) => c.toLowerCase() === country.toLowerCase())) {
    failed.push('G2');
  }

  // G3: کلیدواژه‌ی حذف‌شده
  const haystack = `${job.title} ${job.description_summary} ${job.skills.join(' ')}`.toLowerCase();
  if (prefs.excluded_keywords.some((k) => haystack.includes(k.toLowerCase()))) failed.push('G3');

  // G4: پرداخت تأییدنشده با بودجه‌ی کم
  if (job.client?.payment_verified === false && value !== null && value < 500) failed.push('G4');

  // G5: مهارت اصلی خارج از پروفایل
  if (llm.skill_match < 30) failed.push('G5');

  // پرچم‌های با اطمینان پایین فقط هشدارند
  const accepted = [];
  const warnings = [];
  for (const f of llm.red_flags) {
    if (f.confidence === 'low') warnings.push(f);
    else accepted.push(f);
  }
  // G6: خروج از Upwork، G7: درخواست کار رایگان
  if (accepted.some((f) => f.code === 'off_platform_contact')) failed.push('G6');
  if (accepted.some((f) => f.code === 'ask_for_free_work')) failed.push('G7');

  const subscores = {
    skill_match: clamp(llm.skill_match),
    scope_clarity: clamp(llm.scope_clarity),
    budget_fit: budgetFit(value, threshold, isUsd),
    client_quality: clientQuality(job.client),
    timing: timing(job, now),
    logistics: logistics(job),
    question_fit: clamp(llm.question_fit),
  };

  const penalties = accepted.reduce((sum, f) => sum + (PENALTIES[f.code] || 0), 0);
  const weighted = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + (w * subscores[k]) / 100, 0);
  const score = Math.round(clamp(weighted - penalties));

  let verdict;
  if (failed.length) verdict = 'SKIP';
  else if (score >= 75) verdict = 'APPLY';
  else if (score >= 55) verdict = 'MAYBE';
  else verdict = 'SKIP';

  return {
    gates: { passed: failed.length === 0, failed },
    subscores,
    red_flags: accepted.map((f) => ({ code: f.code, penalty: PENALTIES[f.code] || 0, confidence: f.confidence, evidence: f.evidence })),
    warnings: warnings.map((f) => f.code),
    penalties,
    score,
    verdict,
  };
}
