/**
 * Auth attribution: which surface and method a sign-up / log-in came from.
 *
 * Google OAuth and email confirmation both finish in a server route, so there
 * is no client code running at the moment of success. Instead the click that
 * starts an auth attempt leaves a small marker; IdentityBridge consumes it on
 * the next signed-in page load and fires `signup_completed` / `login_completed`.
 *
 *   click (Google | email form) ── writePendingAuthIntent ──> localStorage
 *        │
 *   …auth round-trip (maybe a new tab from the confirmation email)…
 *        │
 *   signed-in load ── IdentityBridge ── consumePendingAuthIntent (single use)
 *        ├─ user created < 10 min ago ─> signup_completed
 *        └─ otherwise                 ─> login_completed
 *
 * localStorage, not sessionStorage: an email-confirmation link opens a new
 * tab. The marker expires after 30 minutes so an abandoned attempt can't
 * credit an unrelated later login, and it is removed on read.
 */
export type AuthMethod = "google" | "email";
export type AuthSource = "auth_page" | "gate";

export type AuthIntent = {
  method: AuthMethod;
  source: AuthSource;
  companyCode?: string;
  sectionId?: string;
  at: number;
};

export const AUTH_INTENT_KEY = "auth-intent:v1";
export const AUTH_INTENT_TTL_MS = 30 * 60 * 1000;
export const NEW_USER_WINDOW_MS = 10 * 60 * 1000;
const SIGNUP_FIRED_PREFIX = "auth-intent:signup-fired:";

const METHODS: readonly string[] = ["google", "email"];
const SOURCES: readonly string[] = ["auth_page", "gate"];

export function encodeAuthIntent(intent: AuthIntent): string {
  return JSON.stringify(intent);
}

/** Parse a stored marker; null for garbage, unknown enums, or an expired entry. */
export function parseAuthIntent(raw: string | null | undefined, nowMs: number): AuthIntent | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.method !== "string" || !METHODS.includes(v.method)) return null;
  if (typeof v.source !== "string" || !SOURCES.includes(v.source)) return null;
  if (typeof v.at !== "number" || !Number.isFinite(v.at)) return null;
  if (v.at > nowMs || nowMs - v.at > AUTH_INTENT_TTL_MS) return null;
  return {
    method: v.method as AuthMethod,
    source: v.source as AuthSource,
    companyCode: typeof v.companyCode === "string" ? v.companyCode : undefined,
    sectionId: typeof v.sectionId === "string" ? v.sectionId : undefined,
    at: v.at,
  };
}

/** A Supabase user counts as a fresh sign-up for 10 minutes after `created_at`. */
export function isNewUser(createdAtIso: string | null | undefined, nowMs: number): boolean {
  if (!createdAtIso) return false;
  const created = Date.parse(createdAtIso);
  if (!Number.isFinite(created)) return false;
  const age = nowMs - created;
  return age >= 0 && age <= NEW_USER_WINDOW_MS;
}

// ── Storage wrappers — every access guarded; storage can throw or be absent ──

export function writePendingAuthIntent(intent: Omit<AuthIntent, "at">): void {
  try {
    window.localStorage.setItem(AUTH_INTENT_KEY, encodeAuthIntent({ ...intent, at: Date.now() }));
  } catch {
    /* attribution is best-effort; never block auth */
  }
}

export function clearPendingAuthIntent(): void {
  try {
    window.localStorage.removeItem(AUTH_INTENT_KEY);
  } catch {
    /* noop */
  }
}

/** Read and remove the marker in one step, so it can only ever credit one load. */
export function consumePendingAuthIntent(): AuthIntent | null {
  try {
    const raw = window.localStorage.getItem(AUTH_INTENT_KEY);
    if (raw === null) return null;
    window.localStorage.removeItem(AUTH_INTENT_KEY);
    return parseAuthIntent(raw, Date.now());
  } catch {
    return null;
  }
}

/** True the first time it is called for a user on this browser, false after. */
export function claimSignupFired(userId: string): boolean {
  try {
    const key = `${SIGNUP_FIRED_PREFIX}${userId}`;
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}
