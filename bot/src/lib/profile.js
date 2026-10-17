// Your profile: the only source of truth for scoring and proposals.
// ⚠️ Replace every [TODO] with true information about yourself; while a [TODO] remains, the run refuses to start.
// Only write things that are actually true; the agent never invents new claims.

export const PROFILE = {
  identity: {
    headline: '[TODO: e.g. Frontend Engineer — React / Next.js]',
    years_experience: '[TODO: number]',
    english_level: '[TODO: e.g. C1]',
  },
  core_skills: ['[TODO: core skill 1]', '[TODO: core skill 2]'],
  secondary_skills: [],
  // Your minimum rates (USD). Used by hard gate G1.
  rates: {
    hourly_min_usd: 30,
    fixed_min_usd: 300,
  },
  preferences: {
    blocked_client_countries: [],        // e.g. ['Country X']
    excluded_keywords: ['data entry'],   // If present in the title/summary, the job is rejected (G3).
  },
  // Only verifiable results that you have confirmed yourself
  proof_points: [
    { id: 'pp1', text: '[TODO: a numeric result or a true description]', evidence_url: '[TODO: public link or leave empty]' },
  ],
  portfolio: [],
  tone: 'direct, friendly, professional',
  // Two of your successful proposals (style reference only; facts are never copied)
  examples: [],
};

export function assertProfileReady(profile = PROFILE) {
  if (JSON.stringify(profile).includes('[TODO')) {
    throw new Error('lib/profile.js is not complete yet; fill in every [TODO]');
  }
}
