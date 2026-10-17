// Configuration loader. Values come from SSM Parameter Store (see scripts/put-secret.mjs).
// Pure: receives a getSecret(name) function, so it can be tested in Node.

export const SECRET_NAMES = [
  'TELEGRAM_BOT_TOKEN',
  'OWNER_TG_ID',
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',
  'GMAIL_QUERY',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'MAX_PER_RUN',
];

// Non-secret defaults. Model names change often; override them with put-secret.mjs.
export const DEFAULTS = {
  GMAIL_QUERY: 'label:"Upwork-Alerts" is:unread', // Match the label name you created in Gmail.
  GEMINI_MODEL: 'gemini-3.1-flash-lite', // Unverified for the free tier; check before use.
  GROQ_MODEL: 'openai/gpt-oss-20b',      // From Groq's Supported Models page (open-weight).
  OPENROUTER_MODEL: 'openai/gpt-oss-20b:free', // Unverified; check the free model list.
  MAX_PER_RUN: '5',
};

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

export async function loadConfig(getSecret) {
  const raw = {};
  for (const name of SECRET_NAMES) {
    raw[name] = (await getSecret(name)) ?? DEFAULTS[name] ?? null;
  }

  const missing = [];
  if (!raw.GMAIL_CLIENT_ID) missing.push('GMAIL_CLIENT_ID');
  if (!raw.GMAIL_CLIENT_SECRET) missing.push('GMAIL_CLIENT_SECRET');
  if (!raw.GMAIL_REFRESH_TOKEN) missing.push('GMAIL_REFRESH_TOKEN');
  if (!raw.GEMINI_API_KEY && !raw.GROQ_API_KEY && !raw.OPENROUTER_API_KEY) {
    missing.push('GEMINI_API_KEY or GROQ_API_KEY or OPENROUTER_API_KEY (at least one)');
  }
  if (missing.length) {
    throw new ConfigError(`Incomplete configuration: ${missing.join(', ')}`);
  }

  // LLM providers in fallback order: Gemini -> Groq -> OpenRouter.
  const llm = [];
  if (raw.GEMINI_API_KEY) llm.push({ name: 'gemini', key: raw.GEMINI_API_KEY, model: raw.GEMINI_MODEL });
  if (raw.GROQ_API_KEY) llm.push({ name: 'groq', key: raw.GROQ_API_KEY, model: raw.GROQ_MODEL });
  if (raw.OPENROUTER_API_KEY) llm.push({ name: 'openrouter', key: raw.OPENROUTER_API_KEY, model: raw.OPENROUTER_MODEL });

  const maxPerRun = Math.min(10, Math.max(1, parseInt(raw.MAX_PER_RUN, 10) || 5));

  return {
    gmail: {
      clientId: raw.GMAIL_CLIENT_ID,
      clientSecret: raw.GMAIL_CLIENT_SECRET,
      refreshToken: raw.GMAIL_REFRESH_TOKEN,
      query: raw.GMAIL_QUERY,
    },
    llm,
    maxPerRun,
  };
}
