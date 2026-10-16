import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanEmail, htmlToText, findJobUrl, decodeEntities } from '../src/lib/clean.js';

test('decodes common entities and numeric references', () => {
  assert.equal(decodeEntities('a &amp; b &lt;c&gt; &#39;d&#39; &#x41;'), "a & b <c> 'd' A");
});

test('html to text removes style/script and keeps block breaks', () => {
  const html = '<style>p{color:red}</style><p>Hello&nbsp;<b>world</b></p><script>x()</script><div>Line 2</div>';
  const text = htmlToText(html);
  assert.ok(!text.includes('color'));
  assert.ok(!text.includes('x()'));
  assert.match(text, /Hello\s+world/);
  assert.match(text, /Line 2/);
});

test('cleanEmail drops footer lines and collapses blank runs', () => {
  const raw = 'Job: React dashboard\n\n\n\nBudget: $500\nUnsubscribe from these emails\nAll rights reserved.';
  const out = cleanEmail(raw, false);
  assert.equal(out, 'Job: React dashboard\n\nBudget: $500');
});

test('cleanEmail replaces very long links', () => {
  const long = 'https://track.example.com/' + 'a'.repeat(300);
  assert.match(cleanEmail(`see ${long}`, false), /\[long-link\]/);
});

test('findJobUrl finds the upwork job url and trims punctuation', () => {
  const text = 'Read more: https://www.upwork.com/jobs/React-Dashboard_~0123abc. Thanks';
  assert.equal(findJobUrl(text), 'https://www.upwork.com/jobs/React-Dashboard_~0123abc');
  assert.equal(findJobUrl('no link here'), null);
});
