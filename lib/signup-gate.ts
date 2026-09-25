/**
 * Soft sign-up gate on the company page's deep-dive tabs.
 *
 * Logged-out readers get the top of each gated section; the rest is clipped at
 * the section's `data-gate-cut` element behind a free sign-up card. Overview,
 * Announcements and Quarterly stay fully open (Quarterly is where tweets land).
 * Journal posts gate the same way past their opening (the cut is derived in
 * app/blog/related.ts `gatePost`); everything else stays open. The content is
 * still sent — this is a nudge with an incentive, not a paywall.
 *
 * Rollback: unset `SIGNUP_GATE` and redeploy. Read server-side only, so it is
 * not an instant switch.
 */
export const GATE_CUT_ATTRIBUTE = "data-gate-cut";

/** How much of the first hidden block shows through the fade, in px. */
export const GATE_PEEK_PX = 96;
/** Below this much hidden content the gate isn't worth showing. */
export const GATE_MIN_HIDDEN_PX = 160;

/**
 * What lies below the cut, per tab — the card's pitch. Written from what each
 * section component really renders after its marker; a section restructure
 * changes its list in the same PR. Fixed per tab, never per company.
 */
const GATED_SECTIONS = {
  "business-overview": {
    label: "Business",
    below: [
      "The revenue split across its business segments",
      "How that mix has shifted year by year",
      "Segment revenue and growth history, quarter by quarter",
    ],
  },
  quality: {
    label: "Quality",
    below: [
      "Return ratios and margins, year by year, with the read",
      "The moat: what protects the business and whether it lasts",
      "Who owns the stock, and nine forensic checks on the books",
    ],
  },
  "key-variables": {
    label: "Key Variables",
    below: [
      "Each key variable, with its numbers quarter by quarter",
      "What each one tracks and why it matters right now",
      "Variables we have stopped deep-tracking",
    ],
  },
  "future-growth": {
    label: "Growth",
    below: [
      "The top growth drivers, ranked, with how much each could add",
      "Other growth ideas we looked at and set aside",
      "Bear, base and bull cases with confidence levels",
    ],
  },
  "valuation-check": {
    label: "Valuation",
    below: [
      "What growth the current price is already assuming",
      "Its multiples against their own five-year range and the industry",
      "PEG on expected and delivered growth, and how the score was built",
    ],
  },
  "guidance-history": {
    label: "Guidance",
    below: [
      "Every promise still live, split into this year and longer term",
      "Whether management has kept its word before",
      "The guided-vs-delivered record and the documents behind it",
    ],
  },
} as const satisfies Record<string, { label: string; below: readonly [string, string, string] }>;

export type GatedSectionId = keyof typeof GATED_SECTIONS;

export function isGatedSection(sectionId: string): sectionId is GatedSectionId {
  return Object.prototype.hasOwnProperty.call(GATED_SECTIONS, sectionId);
}

export function gatedSectionCopy(sectionId: GatedSectionId) {
  return GATED_SECTIONS[sectionId];
}

/** Server-side flag. Only the literal "on" enables the gate. */
export function isSignupGateEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SIGNUP_GATE === "on";
}

/** The one rule: flag on, a gated tab, and nobody signed in. */
export function shouldGateSection(input: {
  enabled: boolean;
  isAuthenticated: boolean;
  sectionId: string;
}): boolean {
  return input.enabled && !input.isAuthenticated && isGatedSection(input.sectionId);
}

/** Return path that lands the reader back on the same company tab. */
export function buildGateNext(companyCode: string, sectionId: string): string {
  return `/company/${encodeURIComponent(companyCode)}#${sectionId}`;
}

/** `section_id` the Journal gate reports under; the post is its own property. */
export const JOURNAL_GATE_SECTION = "journal";

/** Id of the Journal cut marker — where a reader lands after signing up. */
export const JOURNAL_CONTINUE_ANCHOR = "continue-reading";

/** Return path that lands the reader back on the same Journal post, at the cut. */
export function buildJournalGateNext(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}#${JOURNAL_CONTINUE_ANCHOR}`;
}

/** Company code from a gate return path, for the sign-up page's headline. */
export function companyCodeFromNext(nextPath: string | null | undefined): string | null {
  if (!nextPath) return null;
  const match = /^\/company\/([^/?#]+)/.exec(nextPath);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Where to clip, given the marker's offset inside the panel and the panel's
 * full height. null = don't gate: either there is no marker (a lazy tab whose
 * chunk hasn't landed, or a thin render path with nothing deep to hide) or too
 * little lies below it. Never guess a height — a guessed clip on the lazy
 * Guidance tab moved the card when the real one arrived (CLS 0.048).
 */
export function resolveClipHeight(input: {
  markerTop: number | null;
  contentHeight: number;
}): number | null {
  const { markerTop, contentHeight } = input;
  if (!Number.isFinite(contentHeight) || contentHeight <= 0) return null;
  if (markerTop === null || !Number.isFinite(markerTop) || markerTop < 0) return null;
  const height = markerTop + GATE_PEEK_PX;
  if (contentHeight - height < GATE_MIN_HIDDEN_PX) return null;
  return Math.round(height);
}
