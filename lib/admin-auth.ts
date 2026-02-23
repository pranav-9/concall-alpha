import { timingSafeEqual } from "crypto";

export const ADMIN_ACCESS_COOKIE = "admin_access";
export const ADMIN_ACCESS_COOKIE_VALUE = "1";

export function hasAdminAccess(cookieValue: string | undefined): boolean {
  return cookieValue === ADMIN_ACCESS_COOKIE_VALUE;
}

export function isValidAdminPasscode(passcode: string): boolean {
  const expected = process.env.ADMIN_PANEL_PASSCODE;
  if (!expected || !passcode) return false;

  const passcodeBuf = Buffer.from(passcode);
  const expectedBuf = Buffer.from(expected);
  if (passcodeBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(passcodeBuf, expectedBuf);
}
