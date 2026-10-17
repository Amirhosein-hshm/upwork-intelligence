// قالب پیام تلگرام (HTML). همه‌ی متن‌های پویا escape می‌شوند.

export const TELEGRAM_LIMIT = 4096;
const SAFE_CHUNK = 3500;

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// تقسیم متن به تکه‌های کوچک‌تر از max، ترجیحاً در مرز خط یا فاصله
export function chunkText(text, max = SAFE_CHUNK) {
  const chunks = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) {
      cut = max;
      // اگر وسط یک entity مثل &amp; قطع می‌شود، کمی عقب‌تر ببریم
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
  if (!b || (b.min == null && b.max == null)) return 'بودجه: تأیید نشد';
  const cur = b.currency || 'USD';
  const range = b.min != null && b.max != null && b.min !== b.max ? `${b.min}–${b.max}` : `${b.max ?? b.min}`;
  const unit = b.unit === 'hour' || job.job_type === 'hourly' ? '/ساعت' : ' (کل پروژه)';
  return `${cur} ${range}${unit}`;
}

const ICON = { APPLY: '🟢', MAYBE: '🟡', SKIP: '⚪' };

/**
 * @returns {string[]} پیام‌های آماده‌ی ارسال (هر کدام زیر ۴۰۹۶ کاراکتر)
 */
export function formatJobMessage({ job, ev, scoreRes, proposal, provider, model }) {
  const flags = ev.red_flags.length ? ev.red_flags.map((f) => f.code).join('، ') : 'ندارد';
  const questions = scoreRes.missing_info.length ? scoreRes.missing_info.map((q) => `• ${esc(q)}`).join('\n') : '—';
  const placeholders = proposal.placeholders.length
    ? `\n⚠️ <b>placeholder باید پر شود:</b> ${proposal.placeholders.map(esc).join('، ')}`
    : '';
  const warnTxt = proposal.word_count > 200 ? `\n⚠️ پروپوزال ${proposal.word_count} کلمه است (بیش از ۲۰۰)` : '';
  const risk = proposal.do_not_apply_recommended ? '\n🛑 <b>توصیه: اپلای نکنید</b> (خارج از پروفایل)' : '';

  const header = [
    `${ICON[ev.verdict]} <b>${ev.verdict}</b> · امتیاز ${ev.score}/100`,
    `📌 <b>${esc(job.title)}</b>`,
    `💰 ${esc(budgetText(job))}${job.client?.country ? ` · 🌍 ${esc(job.client.country)}` : ''}`,
    job.proposals_count != null ? `👥 پروپوزال‌های رقیب: ${job.proposals_count}` : null,
    job.connects_required != null ? `🔌 Connects: ${job.connects_required}` : null,
    `⚠️ ریسک‌ها: ${esc(flags)}`,
    `🧠 ${esc(scoreRes.summary_fa || 'تأیید نشد')}`,
    `❓ قبل از اپلای:\n${questions}`,
    `🔗 ${esc(job.url)}`,
  ]
    .filter(Boolean)
    .join('\n');

  const footer =
    `${placeholders}${warnTxt}${risk}\n` +
    `🖊 ${proposal.word_count} کلمه · مدل: ${esc(provider)}/${esc(model)}\n` +
    `ℹ️ ارسال را خودتان روی Upwork انجام دهید؛ این ربات هیچ‌چیز ارسال نمی‌کند.`;

  // بخش‌ها: هدر+فوتر، برچسب، و تکه‌های متن پروپوزال در <pre> (برای کپی آسان)
  const parts = [header + footer, '📝 <b>پیش‌نویس (کپی کنید):</b>'];
  // تقسیم روی متن escape‌شده انجام می‌شود تا طول نهایی HTML از حد تلگرام نگذرد
  for (const chunk of chunkText(esc(proposal.proposal_text))) {
    parts.push(`<pre>${chunk}</pre>`);
  }
  return mergeIntoLimit(parts);
}

// پیام‌های کوتاه را ادغام می‌کند تا تعداد پیام‌ها کم شود ولی هیچ پیامی از حد نگذرد
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
  return `ℹ️ این ایمیل جاب نبود (نوع: ${esc(type)}): ${esc(mail.subject || '(بدون عنوان)')}\nعلامت «خوانده‌شده» گذاشته شد.`;
}

export function formatError(id, err) {
  return `⚠️ یک ایمیل پردازش نشد و خوانده‌نشده ماند (id: ${esc(id)}).\nخطا: ${esc(String(err?.message || err).slice(0, 300))}`;
}

export const HELP_TEXT = [
  '<b>Upwork Proposal Agent</b>',
  '/check — ایمیل‌های خوانده‌نشده‌ی برچسب Upwork-Alerts را بررسی و پیش‌نویس بساز',
  '/help — همین راهنما',
  '',
  'ایجنت هیچ‌وقت خودش روی Upwork اپلای نمی‌کند.',
].join('\n');
