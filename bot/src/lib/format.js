// Telegram message templates (HTML). Every dynamic value is escaped.

export const TELEGRAM_LIMIT = 4096;
const SAFE_CHUNK = 3500;

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Split text into chunks smaller than max, preferring line or space boundaries.
export function chunkText(text, max = SAFE_CHUNK) {
  const chunks = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) {
      cut = max;
      // If an entity such as &amp; would be split, move back a little.
      const amp = rest.lastIndexOf('&', max);
      if (amp > max - 8) cut = amp;
    }
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export function budgetText(job) {
  const b = job.budget;
  if (!b || (b.min == null && b.max == null)) return 'Budget: not stated';
  const cur = b.currency || 'USD';
  const range = b.min != null && b.max != null && b.min !== b.max ? `${b.min}–${b.max}` : `${b.max ?? b.min}`;
  const unit = b.unit === 'hour' || job.job_type === 'hourly' ? '/hour' : ' (total project)';
  return `${cur} ${range}${unit}`;
}

const ICON = { APPLY: '🟢', MAYBE: '🟡', SKIP: '⚪' };

/**
 * @returns {string[]} Messages ready to send (each under the 4096-character Telegram limit)
 */
export function formatJobMessage({ job, ev, scoreRes, proposal, provider, model }) {
  const flags = ev.red_flags.length ? ev.red_flags.map((f) => f.code).join(', ') : 'none';
  const questions = scoreRes.missing_info.length ? scoreRes.missing_info.map((q) => `• ${esc(q)}`).join('\n') : '—';
  const placeholders = proposal.placeholders.length
    ? `\n⚠️ <b>Placeholders to fill:</b> ${proposal.placeholders.map(esc).join(', ')}`
    : '';
  const warnTxt = proposal.word_count > 200 ? `\n⚠️ The proposal is ${proposal.word_count} words (over 200)` : '';
  const risk = proposal.do_not_apply_recommended ? '\n🛑 <b>Recommendation: do not apply</b> (outside your profile)' : '';

  const header = [
    `${ICON[ev.verdict]} <b>${ev.verdict}</b> · Score ${ev.score}/100`,
    `📌 <b>${esc(job.title)}</b>`,
    `💰 ${esc(budgetText(job))}${job.client?.country ? ` · 🌍 ${esc(job.client.country)}` : ''}`,
    job.proposals_count != null ? `👥 Competing proposals: ${job.proposals_count}` : null,
    job.connects_required != null ? `🔌 Connects: ${job.connects_required}` : null,
    `⚠️ Risks: ${esc(flags)}`,
    `🧠 ${esc(scoreRes.summary_en || 'not available')}`,
    `❓ Before you apply:\n${questions}`,
    `🔗 ${esc(job.url)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const footer =
    `${placeholders}${warnTxt}${risk}\n` +
    `🖊 ${proposal.word_count} words · Model: ${esc(provider)}/${esc(model)}\n` +
    `ℹ️ Submit manually on Upwork; this bot never sends anything.`;

  // Sections: header + footer, label, then proposal chunks in <pre> (easy to copy).
  const parts = [header + footer, '📝 <b>Draft (copy this):</b>'];
  // Split the escaped text so the final HTML never exceeds the Telegram limit.
  for (const chunk of chunkText(esc(proposal.proposal_text))) {
    parts.push(`<pre>${chunk}</pre>`);
  }
  return mergeIntoLimit(parts);
}

// Merge short messages to reduce the number sent, without any message exceeding the limit.
function mergeIntoLimit(parts) {
  const out = [];
  let cur = '';
  for (const p of parts) {
    const candidate = cur ? `${cur}\n\n${p}` : p;
    if (candidate.length <= TELEGRAM_LIMIT) {
      cur = candidate;
    } else {
      if (cur) out.push(cur);
      cur = p;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function formatNotJob(mail, type) {
  return `ℹ️ This email was not a job post (type: ${esc(type)}): ${esc(mail.subject || '(no subject)')}\nMarked as read.`;
}

export function formatError(id, err) {
  return (
    `⚠️ One email could not be processed (id: ${esc(id)}).\nError: ${esc(String(err?.message || err).slice(0, 300))}\n` +
    'It was marked as read so it will not be retried.'
  );
}

export const HELP_TEXT = [
  '<b>Upwork Proposal Agent</b>',
  '/check — review unread emails with the Upwork-Alerts label and draft proposals',
  '/help — this help text',
  '',
  'The agent never applies on Upwork by itself.',
].join('\n');
