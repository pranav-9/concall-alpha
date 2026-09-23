import assert from "node:assert/strict";

import {
  GATE_MIN_HIDDEN_PX,
  GATE_PEEK_PX,
  buildGateNext,
  companyCodeFromNext,
  gatedSectionCopy,
  isGatedSection,
  isSignupGateEnabled,
  resolveClipHeight,
  shouldGateSection,
} from "../lib/signup-gate";
import { isSafeNextPath } from "../lib/safe-next-path";
import { nextAuthIntent } from "../lib/auth-intent";
import { isInAppBrowser } from "../lib/in-app-browser";

// ── Which tabs gate ─────────────────────────────────────────────────────────
const GATED = [
  "business-overview",
  "quality",
  "key-variables",
  "future-growth",
  "valuation-check",
  "guidance-history",
];
for (const id of GATED) {
  assert.equal(isGatedSection(id), true, id);
  if (isGatedSection(id)) assert.equal(gatedSectionCopy(id).below.length, 3, id);
}
// Overview, Announcements and Quarterly (where tweets land) stay open; so do
// unknown ids and prototype keys.
for (const id of ["overview", "company-announcements", "sentiment-score", "industry-context", "", "toString", "constructor"]) {
  assert.equal(isGatedSection(id), false, id);
}

// ── The flag: only the literal "on" ─────────────────────────────────────────
assert.equal(isSignupGateEnabled({}), false);
assert.equal(isSignupGateEnabled({ SIGNUP_GATE: "" }), false);
assert.equal(isSignupGateEnabled({ SIGNUP_GATE: "true" }), false);
assert.equal(isSignupGateEnabled({ SIGNUP_GATE: "ON" }), false);
assert.equal(isSignupGateEnabled({ SIGNUP_GATE: "on" }), true);

// ── The one rule, every branch ──────────────────────────────────────────────
const gate = (enabled: boolean, isAuthenticated: boolean, sectionId: string) =>
  shouldGateSection({ enabled, isAuthenticated, sectionId });
assert.equal(gate(true, false, "quality"), true);
assert.equal(gate(false, false, "quality"), false); // flag off
assert.equal(gate(true, true, "quality"), false); // signed in
assert.equal(gate(true, false, "overview"), false); // open tab
assert.equal(gate(true, false, "sentiment-score"), false);
assert.equal(gate(true, false, "nope"), false); // unknown id

// ── Return path: lands on the same tab and survives the redirect guard ──────
assert.equal(buildGateNext("HFCL", "quality"), "/company/HFCL#quality");
assert.equal(buildGateNext("M&M", "future-growth"), "/company/M%26M#future-growth");
assert.equal(isSafeNextPath(buildGateNext("M&M", "future-growth")), true);
assert.equal(isSafeNextPath(buildGateNext("../../evil", "x")), true); // encoded, still same-site
assert.equal(buildGateNext("../../evil", "x"), "/company/..%2F..%2Fevil#x");

assert.equal(companyCodeFromNext("/company/HFCL#quality"), "HFCL");
assert.equal(companyCodeFromNext("/company/M%26M?x=1"), "M&M");
assert.equal(companyCodeFromNext("/company/HFCL/extra"), "HFCL");
assert.equal(companyCodeFromNext("/watchlists"), null);
assert.equal(companyCodeFromNext("/company/"), null);
assert.equal(companyCodeFromNext("/company/%E0%A4%A"), null); // malformed escape
assert.equal(companyCodeFromNext(null), null);

// ── Where to clip ───────────────────────────────────────────────────────────
// Marker found: clip a peek below it.
assert.equal(resolveClipHeight({ markerTop: 400, contentHeight: 2000 }), 400 + GATE_PEEK_PX);
assert.equal(resolveClipHeight({ markerTop: 0, contentHeight: 2000 }), GATE_PEEK_PX);
assert.equal(resolveClipHeight({ markerTop: 400.6, contentHeight: 2000 }), 497);
// Too little hidden to be worth a card: open. Boundary is inclusive of the minimum.
assert.equal(resolveClipHeight({ markerTop: 400, contentHeight: 400 + GATE_PEEK_PX + GATE_MIN_HIDDEN_PX - 1 }), null);
assert.equal(
  resolveClipHeight({ markerTop: 400, contentHeight: 400 + GATE_PEEK_PX + GATE_MIN_HIDDEN_PX }),
  400 + GATE_PEEK_PX,
);
// No marker (lazy tab not loaded yet, or a thin render path): never guess, stay open.
assert.equal(resolveClipHeight({ markerTop: null, contentHeight: 3000 }), null);
assert.equal(resolveClipHeight({ markerTop: -5, contentHeight: 3000 }), null);
assert.equal(resolveClipHeight({ markerTop: Number.NaN, contentHeight: 3000 }), null);
// Empty / unmeasurable panel.
assert.equal(resolveClipHeight({ markerTop: 100, contentHeight: 0 }), null);
assert.equal(resolveClipHeight({ markerTop: 100, contentHeight: Number.NaN }), null);

// ── Attribution survives the hand-off to /auth/sign-up ──────────────────────
const gateIntent = { method: "email", source: "gate", companyCode: "HFCL", sectionId: "quality", at: 1 } as const;
assert.deepEqual(nextAuthIntent("google", gateIntent), {
  method: "google",
  source: "gate",
  companyCode: "HFCL",
  sectionId: "quality",
});
assert.deepEqual(nextAuthIntent("email", null), { method: "email", source: "auth_page" });
assert.deepEqual(
  nextAuthIntent("email", { method: "google", source: "auth_page", at: 1 }),
  { method: "email", source: "auth_page" },
);

// ── In-app browsers (Google OAuth is blocked there) ─────────────────────────
const IN_APP = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.50",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148", // bare WKWebView (Telegram iOS)
  "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0]",
];
const REAL = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
];
for (const ua of IN_APP) assert.equal(isInAppBrowser(ua), true, ua);
for (const ua of REAL) assert.equal(isInAppBrowser(ua), false, ua);
assert.equal(isInAppBrowser(null), false);
assert.equal(isInAppBrowser(""), false);

console.log("signup-gate: ok");
