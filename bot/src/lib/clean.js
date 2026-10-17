// Clean email text before sending it to the LLM. It is never stored.

export const MAX_EMAIL_CHARS = 12000;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    const v = ENTITIES[e.toLowerCase()];
    return v === undefined ? match : v;
  });
}

export function htmlToText(html) {
  const stripped = html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(stripped);
}

// Footer/unsubscribe lines that are useless for extraction
const FOOTER = /(unsubscribe|manage (your )?(email|notification|preferences)|you('| a)re receiving|privacy policy|all rights reserved|©|view in browser|this email was sent)/i;

export function cleanEmail(raw, isHtml) {
  let text = isHtml ? htmlToText(raw) : raw;
  // Very long links (usually tracking) are removed
  text = text.replace(/https?:\/\/\S{200,}/g, '[long-link]');

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter((l) => !FOOTER.test(l));

  const out = [];
  let prevBlank = true;
  for (const l of lines) {
    if (!l) {
      if (!prevBlank) out.push('');
      prevBlank = true;
    } else {
      out.push(l);
      prevBlank = false;
    }
  }
  let res = out.join('\n').trim();
  if (res.length > MAX_EMAIL_CHARS) res = res.slice(0, MAX_EMAIL_CHARS) + '\n[truncated]';
  return res;
}

// Find the job link directly in the text (not in LLM output) so it is never guessed
export function findJobUrl(text) {
  const m = text.match(/https:\/\/www\.upwork\.com\/(?:jobs|nx\/find-work)\/[^\s"'<>\])]+/i);
  return m ? m[0].replace(/[.,;:]+$/, '') : null;
}
