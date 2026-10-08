import { createHmac, timingSafeEqual } from "crypto";

// The /admin passcode gate. Unlocking sets an httpOnly cookie whose value is a
// signed token, `v1.<issuedAt>.<hmac>`, and every admin page and route checks
// it with hasAdminAccess(). Until 2026-10-08 the cookie held the constant "1",
// so anyone could set it by hand and skip the passcode.
//
// The signing key is the passcode plus the service-role key:
// - changing ADMIN_PANEL_PASSCODE signs everyone out;
// - the service-role key (long, random, server-only, already required by
//   /admin) means a short passcode can't be brute-forced offline from a
//   captured cookie, and no cookie can be minted without both secrets.
// The token carries its issue time, so a copied cookie dies after
// ADMIN_SESSION_SECONDS even if the browser ignores the cookie's maxAge.

type Env = Record<string, string | undefined>;

export const ADMIN_ACCESS_COOKIE = "admin_access";

/** How long one passcode unlock lasts. */
export const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

const TOKEN_VERSION = "v1";
/** Allowed clock skew for a token that claims to be from the near future. */
const MAX_FUTURE_SKEW_SECONDS = 60;

function signingKey(env: Env): string | null {
  const passcode = env.ADMIN_PANEL_PASSCODE;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!passcode || !serviceKey) return null;
  return `${passcode}\u0000${serviceKey}`;
}

function sign(key: string, issuedAt: number): string {
  return createHmac("sha256", key).update(`admin-access:${TOKEN_VERSION}:${issuedAt}`).digest("base64url");
}

/** A fresh token for the login route to set; null when a secret is missing. */
export function createAdminAccessToken(now: number = Date.now(), env: Env = process.env): string | null {
  const key = signingKey(env);
  if (!key) return null;
  const issuedAt = Math.floor(now / 1000);
  return `${TOKEN_VERSION}.${issuedAt}.${sign(key, issuedAt)}`;
}

export function hasAdminAccess(
  cookieValue: string | undefined,
  now: number = Date.now(),
  env: Env = process.env,
): boolean {
  if (!cookieValue) return false;
  const key = signingKey(env);
  if (!key) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION || !/^\d{1,12}$/.test(parts[1])) return false;

  const issuedAt = Number(parts[1]);
  const ageSeconds = Math.floor(now / 1000) - issuedAt;
  if (ageSeconds > ADMIN_SESSION_SECONDS || ageSeconds < -MAX_FUTURE_SKEW_SECONDS) return false;

  const expected = Buffer.from(sign(key, issuedAt));
  const given = Buffer.from(parts[2]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function isValidAdminPasscode(passcode: string, env: Env = process.env): boolean {
  const expected = env.ADMIN_PANEL_PASSCODE;
  if (!expected || !passcode) return false;

  const passcodeBuf = Buffer.from(passcode);
  const expectedBuf = Buffer.from(expected);
  if (passcodeBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(passcodeBuf, expectedBuf);
}
