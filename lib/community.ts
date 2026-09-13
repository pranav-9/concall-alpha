// Owned community surfaces.
//
// Telegram is the dialog venue: the hypothesis doc (§3, "Peer-dialog sourcing,
// stated honestly") says the engaged cohort is anonymous — analytics rows with no
// contact path. A group people opt into is that path. The invite URL is an env
// var so it can rotate (Telegram invite links get revoked/regenerated) with a
// redeploy and no code change; when it is empty every join affordance renders
// nothing, so a preview or a local checkout never shows a dead link.

const ALLOWED_HOSTS = new Set(["t.me", "telegram.me", "www.t.me"]);

// An invite (`/+AbC…`), a legacy invite (`/joinchat/…`), or a public handle.
// Anything else — the bare origin, a bot deep link, a userinfo trick — is a
// typo'd env var and must not ship as a live outbound link.
const ALLOWED_PATH = /^\/(\+[A-Za-z0-9_-]+|joinchat\/[A-Za-z0-9_-]+|[A-Za-z][A-Za-z0-9_]{3,31})$/;

// t.me routes that are not a chat: `/proxy` and `/socks` change the reader's
// Telegram network settings on tap, the rest open flows nobody meant to link.
const RESERVED_HANDLES = new Set([
  "share", "proxy", "socks", "setlanguage", "login", "iv", "addstickers",
  "addemoji", "addtheme", "confirmphone", "invoice", "bg", "msg", "boost",
  "giftcode", "contact", "addlist", "nft",
]);

export function getTelegramJoinUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) return null;
    if (url.port || url.username || url.password || url.search) return null;
    const pathname = url.pathname.replace(/\/+$/, "");
    if (!ALLOWED_PATH.test(pathname)) return null;
    if (RESERVED_HANDLES.has(pathname.slice(1).toLowerCase())) return null;
    return `${url.origin}${pathname}`;
  } catch {
    return null;
  }
}
