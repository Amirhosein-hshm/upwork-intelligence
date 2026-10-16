// جریان اصلی /check. هیچ import از 'sdk' ندارد تا در Node قابل تست باشد.
// وابستگی‌ها تزریق می‌شوند: fetch، getSecret(name) و send(text).
//
// قاعده‌ی dedupe: فقط بعد از ارسال موفق پیام، برچسب UNREAD حذف می‌شود.
// اگر LLM یا Gmail خطا بدهد، ایمیل UNREAD می‌ماند و در /check بعدی دوباره بررسی می‌شود.

import { loadConfig } from './config.js';
import { getAccessToken, listUnreadIds, getMessage, markRead } from './gmail.js';
import { callJson } from './llm.js';
import { cleanEmail, findJobUrl } from './clean.js';
import { EXTRACT_SYSTEM, SCORE_SYSTEM, PROPOSAL_SYSTEM, extractUser, scoreUser, proposalUser } from './prompts.js';
import { validateExtraction, validateScore, validateProposal, ValidationError } from './validate.js';
import { evaluateJob } from './score.js';
import { PROFILE, assertProfileReady } from './profile.js';
import { formatJobMessage, formatNotJob, formatError } from './format.js';

async function processMail({ mail, fetch, cfg, profile }) {
  const text = cleanEmail(mail.body, mail.isHtml);
  if (text.length < 20) {
    return { kind: 'not_job', messages: [formatNotJob(mail, 'متن خالی')] };
  }

  // 1) استخراج فیلدها
  const extracted = await callJson({
    fetch,
    providers: cfg.llm,
    system: EXTRACT_SYSTEM,
    user: extractUser(mail, text),
  });
  const ext = validateExtraction(extracted.data);
  if (ext.email_type !== 'job_alert' || !ext.job) {
    return { kind: 'not_job', messages: [formatNotJob(mail, ext.email_type)] };
  }
  const job = ext.job;
  // لینک جاب را از خود متن ایمیل می‌گیریم؛ اگر پیدا نشد از خروجی LLM (که باید با upwork.com شروع شود)
  job.url = findJobUrl(text) || job.url;
  if (!job.url || !/^https:\/\/www\.upwork\.com\//.test(job.url)) {
    throw new ValidationError('لینک معتبر جاب در ایمیل پیدا نشد');
  }

  // 2) امتیاز: زیرامتیازهای LLM + قواعد کد
  const scored = await callJson({
    fetch,
    providers: cfg.llm,
    system: SCORE_SYSTEM,
    user: scoreUser(job, profile),
  });
  const scoreRes = validateScore(scored.data);
  const ev = evaluateJob({ job, llm: scoreRes, rates: profile.rates, prefs: profile.preferences });

  // SKIP: پیامی فرستاده نمی‌شود (پیش‌فرض rubric)، ولی ایمیل خوانده‌شده می‌شود
  if (ev.verdict === 'SKIP') {
    return { kind: 'skipped', messages: [] };
  }

  // 3) پیش‌نویس پروپوزال (فقط APPLY/MAYBE)
  const proposalRes = await callJson({
    fetch,
    providers: cfg.llm,
    system: PROPOSAL_SYSTEM,
    user: proposalUser(job, profile),
  });
  const proposal = validateProposal(proposalRes.data);

  return {
    kind: 'job_sent',
    messages: formatJobMessage({
      job,
      ev,
      scoreRes,
      proposal,
      provider: proposalRes.provider,
      model: proposalRes.model,
    }),
  };
}

/**
 * اجرای خودکار (Lambda). فقط پیام‌های جاب و خطاهای دائمی به تلگرام می‌روند.
 * خطای موقت (سهمیه، شبکه) فقط در لاگ ثبت می‌شود و ایمیل UNREAD می‌ماند تا اجرای بعدی.
 * @param {object} args
 * @param {(text: string) => Promise<void>} args.send  ارسال به تلگرام
 * @param {(name: string) => Promise<string|null>} args.getSecret
 * @returns {Promise<{found:number, job_sent:number, skipped:number, not_job:number, failed:number, permanent_failed:number, more:boolean}>}
 */
export async function runCheck({ fetch, getSecret, send, profile = PROFILE, log = console }) {
  assertProfileReady(profile);
  const cfg = await loadConfig(getSecret); // ConfigError اگر secret ناقص باشد

  const token = await getAccessToken(fetch, cfg.gmail);
  const { ids, more } = await listUnreadIds(fetch, token, cfg.gmail.query, cfg.maxPerRun);

  const stats = { found: ids.length, job_sent: 0, skipped: 0, not_job: 0, failed: 0, permanent_failed: 0, more };

  for (const id of ids) {
    try {
      const mail = await getMessage(fetch, token, id);
      const result = await processMail({ mail, fetch, cfg, profile });
      // ابتدا ارسال، بعد علامت‌گذاری
      for (const m of result.messages) {
        await send(m);
      }
      stats[result.kind] += 1;
      await markRead(fetch, token, id);
    } catch (err) {
      const msg = String(err?.message || err).slice(0, 300);
      if (err?.permanent) {
        // ایمیل مشکل‌دار است؛ یک بار اعلام و خوانده‌شده می‌شود تا هر ۵ دقیقه تکرار نشود
        stats.permanent_failed += 1;
        await send(formatError(id, err));
        await markRead(fetch, token, id);
      } else {
        stats.failed += 1;
        log.error('transient failure, will retry next run', { id, error: msg });
      }
    }
  }

  log.info?.('run finished', stats);
  return stats;
}
