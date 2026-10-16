// اعتبارسنجی دستی خروجی LLM (بدون کتابخانه). اگر ساختار نادرست باشد خطا می‌دهد.

export const EMAIL_TYPES = ['job_alert', 'invitation', 'message', 'offer', 'contract', 'other', 'not_a_job'];
export const RED_FLAG_CODES = [
  'vague_scope',
  'budget_mismatch',
  'too_many_proposals',
  'client_no_history',
  'pay_low_effort_high_scope',
  'ask_for_free_work',
  'urgent_pressure_no_detail',
  'off_platform_contact',
  'unusual_payment_request',
];

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const str = (x, max) => (typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : null);
const num = (x) => {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (typeof x === 'string') {
    const n = Number(x.replace(/[,$\s]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
const pickEnum = (x, allowed) => (allowed.includes(x) ? x : null);
const strArr = (x, max) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string' && s.trim()).slice(0, max) : []);
const clampScore = (x) => {
  const n = num(x);
  return n === null ? 50 : Math.min(100, Math.max(0, n));
};

export function validateExtraction(d) {
  if (!isObj(d)) throw new Error('extract: خروجی JSON نیست');
  if (!EMAIL_TYPES.includes(d.email_type)) throw new Error('extract: email_type نامعتبر');
  if (d.job == null) return { email_type: d.email_type, job: null };
  const j = d.job;
  if (!isObj(j)) throw new Error('extract: job نامعتبر');
  const title = str(j.title, 200);
  if (!title || title.length < 3) throw new Error('extract: عنوان جاب نیست');
  const url = str(j.url, 500);
  const budget = isObj(j.budget)
    ? {
        currency: str(j.budget.currency, 5) || 'USD',
        min: num(j.budget.min),
        max: num(j.budget.max),
        unit: pickEnum(j.budget.unit, ['hour', 'project']),
      }
    : null;
  const client = isObj(j.client)
    ? {
        country: str(j.client.country, 80),
        payment_verified: typeof j.client.payment_verified === 'boolean' ? j.client.payment_verified : null,
        rating: num(j.client.rating),
        total_spent_usd: num(j.client.total_spent_usd),
        hires: num(j.client.hires),
      }
    : null;
  return {
    email_type: d.email_type,
    job: {
      title,
      url,
      description_summary: str(j.description_summary, 600) || '',
      job_type: pickEnum(j.job_type, ['hourly', 'fixed', 'unknown']),
      budget,
      experience_level: str(j.experience_level, 20),
      duration: str(j.duration, 100),
      workload: str(j.workload, 100),
      client,
      skills: strArr(j.skills, 20),
      proposals_count: num(j.proposals_count),
      connects_required: num(j.connects_required),
      posted_at: str(j.posted_at, 60),
      screening_questions: strArr(j.screening_questions, 10),
    },
  };
}

export function validateScore(d) {
  if (!isObj(d)) throw new Error('score: خروجی JSON نیست');
  const redFlags = (Array.isArray(d.red_flags) ? d.red_flags : [])
    .filter((f) => isObj(f) && RED_FLAG_CODES.includes(f.code))
    .map((f) => ({
      code: f.code,
      confidence: ['high', 'medium', 'low'].includes(f.confidence) ? f.confidence : 'low',
      evidence: str(f.evidence_quote, 200) || '',
    }));
  return {
    skill_match: clampScore(d.skill_match),
    scope_clarity: clampScore(d.scope_clarity),
    question_fit: clampScore(d.question_fit),
    red_flags: redFlags,
    summary_fa: str(d.summary_fa, 600) || '',
    missing_info: strArr(d.missing_info, 3),
  };
}

export function validateProposal(d) {
  if (!isObj(d)) throw new Error('proposal: خروجی JSON نیست');
  const text = str(d.proposal_text, 4000);
  if (!text) throw new Error('proposal: متن پروپوزال خالی است');
  return {
    proposal_text: text,
    word_count: text.split(/\s+/).filter(Boolean).length,
    placeholders: strArr(d.placeholders, 10),
    questions_for_human: strArr(d.questions_for_human, 5),
    risks: strArr(d.risks, 5),
    do_not_apply_recommended: d.do_not_apply_recommended === true,
  };
}
