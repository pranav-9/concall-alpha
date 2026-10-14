// What each scan is called and how it introduces itself — on the /scanners index
// card, as its own page's title, and in its metadata. One table so the three
// can't drift.

import type { ScanId } from "./href";

export type ScanMeta = {
  label: string;
  /** The rule in one line — the index card and the page's meta description. */
  blurb: string;
  /** What the index card's number counts ("21 pass"). */
  countNoun: string;
};

export const SCAN_META: Record<ScanId, ScanMeta> = {
  "red-flags": {
    label: "Red flags",
    blurb: "Companies whose forensic checks trip on the annual numbers — cash conversion, debt, pledges and more.",
    countNoun: "flagged",
  },
  peg: {
    label: "PEG ratio",
    blurb: "Priced under 1× PEG on both forward growth and the growth actually delivered.",
    countNoun: "under 1×",
  },
  garp: {
    label: "GARP",
    blurb: "Growth at a reasonable price: a Solid-or-better growth score with a Fair-or-better valuation.",
    countNoun: "pass",
  },
  guidance: {
    label: "Guidance upgrades",
    blurb: "Management raised a live target on the latest call.",
    countNoun: "raised",
  },
  trend: {
    label: "Price trend",
    blurb: "Every company's current price phase — rising, sideways or falling — and whether earnings or the P/E drove it.",
    countNoun: "scanned",
  },
};
