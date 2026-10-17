// Main run flow. No 'sdk' imports, so it can be tested in Node.
// Dependencies are injected: fetch, getSecret(name) and send(text).
//
// Dedupe rule: the UNREAD label is removed only after a successful send.
// If the LLM or Gmail fails, the email stays UNREAD and is retried on the next run.

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
    return { kind: 'not_job', messages: [formatNotJob(mail, 'empty body')] };
  }

  // 1) Extract fields
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
  // Take the job link from the email body; if absent, fall back to the LLM output (which must start with upwork.com).
  job.url = findJobUrl(text) || job.url;
  if (!job.url || !/^https:\/\/www\.upwork\.com\//.test(job.url)) {
    throw new ValidationError('No valid job link found in the email');
  }

  // 2) Score: LLM subscores + code rules
  const scored = await callJson({
    fetch,
    providers: cfg.llm,
    system: SCORE_SYSTEM,
    user: scoreUser(job, profile),
  });
  const scoreRes = validateScore(scored.data);
  const ev = evaluateJob({ job, llm: scoreRes, rates: profile.rates, prefs: profile.preferences });

  // SKIP: nothing is sent (the rubric default), but the email is marked as read.
  if (ev.verdict === 'SKIP') {
    return { kind: 'skipped', messages: [] };
  }

  // 3) Draft the proposal (APPLY/MAYBE only)
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
 * Automated run (Lambda). Only job messages and permanent errors go to Telegram.
 * Transient errors (quota, network) are logged only, and the email stays UNREAD for the next run.
 * @param {object} args
 * @param {(text: string) => Promise<void>} args.send  Send to Telegram
 * @param {(name: string) => Promise<string|null>} args.getSecret
 * @returns {Promise<{found:number, job_sent:number, skipped:number, not_job:number, failed:number, permanent_failed:number, more:boolean}>}
 */
export async function runCheck({ fetch, getSecret, send, profile = PROFILE, log = console }) {
  assertProfileReady(profile);
  const cfg = await loadConfig(getSecret); // ConfigError if a secret is missing

  const token = await getAccessToken(fetch, cfg.gmail);
  const { ids, more } = await listUnreadIds(fetch, token, cfg.gmail.query, cfg.maxPerRun);

  const stats = { found: ids.length, job_sent: 0, skipped: 0, not_job: 0, failed: 0, permanent_failed: 0, more };

  for (const id of ids) {
    try {
      const mail = await getMessage(fetch, token, id);
      const result = await processMail({ mail, fetch, cfg, profile });
      // Send first, then mark as read
      for (const m of result.messages) {
        await send(m);
      }
      stats[result.kind] += 1;
      await markRead(fetch, token, id);
    } catch (err) {
      const msg = String(err?.message || err).slice(0, 300);
      if (err?.permanent) {
        // The email is malformed: notify once and mark it read so it is not retried every 5 minutes.
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
