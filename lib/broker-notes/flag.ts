/**
 * Server-side flag for the company page's Broker Notes tab. Read on the server only,
 * like SIGNUP_GATE (lib/signup-gate.ts), so flipping it needs a redeploy. Off: no tab,
 * no panel and no `broker_notes` query.
 */
export function isBrokerNotesEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const value = env.BROKER_NOTES_ENABLED;
  return value === "1" || value === "true";
}
