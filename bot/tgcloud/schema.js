import { table, text } from 'sdk/db';

// Only configuration secrets live here (API keys, OAuth refresh token, owner id).
// Email content, job data and proposals are NEVER stored. Gmail's UNREAD label is the only dedupe state.
export const secrets = table('secrets', {
  name: text('name').primaryKey(),
  value: text('value').notNull(),
});
