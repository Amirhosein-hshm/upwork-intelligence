// LLM client با fetch و fallback: Gemini → Groq → OpenRouter.
// هر provider یک بار تلاش می‌کند؛ خطا یا JSON نامعتبر → provider بعدی.

export function parseJsonLoose(raw) {
  const cleaned = String(raw).replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('JSON در پاسخ نبود');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function checkOk(res, name) {
  if (res.ok) return;
  throw new Error(`${name} HTTP ${res.status}`);
}

async function callGemini(fetch, { key, model }, system, user) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    }
  );
  await checkOk(res, 'Gemini');
  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('');
}

async function callOpenAICompatible(fetch, url, name, { key, model }, system, user) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  await checkOk(res, name);
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

const CALLERS = {
  gemini: (fetch, p, s, u) => callGemini(fetch, p, s, u),
  groq: (fetch, p, s, u) =>
    callOpenAICompatible(fetch, 'https://api.groq.com/openai/v1/chat/completions', 'Groq', p, s, u),
  openrouter: (fetch, p, s, u) =>
    callOpenAICompatible(fetch, 'https://openrouter.ai/api/v1/chat/completions', 'OpenRouter', p, s, u),
};

export async function callJson({ fetch, providers, system, user }) {
  const errors = [];
  for (const p of providers) {
    try {
      const raw = await CALLERS[p.name](fetch, p, system, user);
      const data = parseJsonLoose(raw);
      return { data, provider: p.name, model: p.model };
    } catch (err) {
      errors.push(`${p.name}: ${err.message}`);
    }
  }
  throw new Error(`همه‌ی LLMها ناموفق بودند (${errors.join(' | ')})`);
}
