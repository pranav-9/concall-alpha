import { GuidanceHistorySection } from "concall-alpha";
// items are NormalizedGuidanceItem[] — derived rows, not raw ones: the trail is
// sorted, first/latest mention periods are read back OUT of the trail, and the
// status vocabulary is coerced. Building them by hand would let the header
// periods disagree with the trail underneath. lib/guidance-tracking/normalize
// is pure TS, so the previews run the real normalizer.
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";

// Trishul Speciality Chemicals (TRISHULCH) — CDMO + performance intermediates
// + agro actives, out of Dahej and Ankleshwar. Phase 6 tracks growth-family
// threads only (revenue / EBITDA / PAT), so the Margins / CapEx / Others family
// tabs stay hidden and the section renders untabbed.
//
// CLOCK NOTE: the section splits threads into "current" and "track record" by
// comparing each thread's applies_to FY against currentFiscalYear(), which reads
// the wall clock. The preview harness pins the browser clock, so the FY24/FY23
// threads below are the ones that land behind the "Show track record" toggle.
type Thread = {
  key: string;
  text: string;
  subtype: "revenue" | "ebitda" | "pat";
  segment: string | null;
  fy: string;
  first: string;
  latest: string;
  latestView: string;
  value: Record<string, unknown>;
  priorValue?: Record<string, unknown>;
};

const pct = (n: number, text: string) => ({
  value_kind: "percent",
  numeric_value: n,
  unit: "pct",
  magnitude_percent: n,
  value_text: text,
});

const cr = (n: number, text: string) => ({
  value_kind: "absolute",
  numeric_value: n,
  unit: "INRcr",
  magnitude_percent: null,
  value_text: text,
});

// Live commitments — what management is on the hook for right now.
const LIVE_THREADS: Thread[] = [
  {
    key: "growth/revenue::consolidated::FY27",
    text: "Consolidated revenue to grow 22-26% in FY27",
    subtype: "revenue",
    segment: null,
    fy: "FY27",
    first: "Q4 FY26",
    latest: "Q1 FY27",
    latestView: "Reiterated on the Q1 FY27 call, with the Unit-4 ramp named as the swing factor.",
    value: pct(24, "22-26% revenue growth"),
  },
  {
    key: "growth/ebitda::consolidated::FY27",
    text: "EBITDA to grow 28-32% in FY27",
    subtype: "ebitda",
    segment: null,
    fy: "FY27",
    first: "Q4 FY26",
    latest: "Q1 FY27",
    latestView: "Held after a 22.1% Q1 margin; the richer CDMO mix is expected to carry the rest.",
    value: pct(30, "28-32% EBITDA growth"),
  },
  {
    key: "growth/revenue::cdmo::FY28",
    text: "CDMO revenue to roughly double by FY28",
    subtype: "revenue",
    segment: "CDMO",
    fy: "FY28",
    first: "Q2 FY26",
    latest: "Q1 FY27",
    latestView: "Nine molecules in validation; two are contracted to move to commercial supply in H2 FY27.",
    value: cr(1900, "₹1,900 cr of CDMO revenue by FY28"),
  },
  {
    key: "growth/revenue::agro-actives::FY26",
    text: "Agro actives to reach ₹300 cr of revenue",
    subtype: "revenue",
    segment: "Agro Actives",
    fy: "FY26",
    first: "Q1 FY26",
    latest: "Q3 FY26",
    latestView: "Cut to ₹250-260 cr after the Ankleshwar statutory shutdown ran four weeks long.",
    value: cr(255, "₹250-260 cr"),
    priorValue: cr(300, "₹300 cr"),
  },
];

// Resolved commitments — the delivery record, collapsed behind the toggle.
const PAST_THREADS: Thread[] = [
  {
    key: "growth/revenue::consolidated::FY24",
    text: "Revenue to cross ₹1,200 cr in FY24",
    subtype: "revenue",
    segment: null,
    fy: "FY24",
    first: "Q1 FY24",
    latest: "Q4 FY24",
    latestView: "Closed FY24 at ₹1,243 cr.",
    value: cr(1200, "cross ₹1,200 cr"),
  },
  {
    key: "growth/ebitda::consolidated::FY24",
    text: "EBITDA to grow 22% in FY24",
    subtype: "ebitda",
    segment: null,
    fy: "FY24",
    first: "Q2 FY24",
    latest: "Q4 FY24",
    latestView: "Delivered 23.4% on the Dahej Unit-3 debottlenecking.",
    value: pct(22, "22% EBITDA growth"),
  },
  {
    key: "growth/pat::consolidated::FY23",
    text: "PAT to grow 30% in FY23",
    subtype: "pat",
    segment: null,
    fy: "FY23",
    first: "Q2 FY23",
    latest: "Q4 FY23",
    latestView: "Landed at 18% — solvent costs ran ahead of the pass-through clauses all year.",
    value: pct(30, "30% PAT growth"),
  },
  {
    key: "growth/revenue::cdmo::FY24",
    text: "CDMO revenue to cross ₹450 cr in FY24",
    subtype: "revenue",
    segment: "CDMO",
    fy: "FY24",
    first: "Q2 FY24",
    latest: "Q4 FY24",
    latestView: "Closed at ₹468 cr on two unplanned campaign extensions.",
    value: cr(450, "cross ₹450 cr"),
  },
  {
    key: "growth/revenue::agro-actives::FY23",
    text: "Agro actives to grow 25% in FY23",
    subtype: "revenue",
    segment: "Agro Actives",
    fy: "FY23",
    first: "Q1 FY23",
    latest: "Q4 FY23",
    latestView: "Grew 11% — the kharif channel destocked through H2.",
    value: pct(25, "25% growth"),
  },
];

const ALL_THREADS = [...LIVE_THREADS, ...PAST_THREADS];

const rowFor = (thread: Thread, index: number, status: string) => ({
  id: 4100 + index,
  company_code: "TRISHULCH",
  guidance_key: thread.key,
  guidance_text: thread.text,
  guidance_family: "growth",
  metric_subtype: thread.subtype,
  segment: thread.segment,
  segment_canonical: thread.segment
    ? thread.segment.toLowerCase().replace(/\s+/g, "_")
    : null,
  status,
  latest_view: thread.latestView,
  confidence: 0.82,
  generated_at: "2026-08-14T09:20:00+05:30",
  horizon: {
    horizon_type: "single_fy",
    applies_from: thread.fy,
    applies_to: thread.fy,
    horizon_text: thread.fy,
  },
  value: thread.value,
  trail: [
    {
      quarter: thread.first,
      summary: "First stated on the earnings call.",
      mention_type: "first_mention",
      document_type: "transcript",
      document_label: `${thread.first} earnings call transcript`,
      value: thread.priorValue ?? thread.value,
      confidence: 0.7,
    },
    {
      quarter: thread.latest,
      summary: thread.latestView,
      mention_type: thread.priorValue ? "revision" : "update",
      document_type: "transcript",
      document_label: `${thread.latest} earnings call transcript`,
      value: thread.value,
      confidence: 0.85,
    },
  ],
});

const SOURCE_FILES = [
  { source_doc_id: 9114, period_label: "Q1 FY27", fy: 2027, qtr: 1, doc_type: "transcript", url: "https://www.trishulchem.example/ir/q1fy27-transcript.pdf" },
  { source_doc_id: 9115, period_label: "Q1 FY27", fy: 2027, qtr: 1, doc_type: "presentation", url: "https://www.trishulchem.example/ir/q1fy27-investor-deck.pdf" },
  { source_doc_id: 9092, period_label: "Q4 FY26", fy: 2026, qtr: 4, doc_type: "transcript", url: "https://www.trishulchem.example/ir/q4fy26-transcript.pdf" },
  { source_doc_id: 9071, period_label: "FY26", fy: 2026, qtr: null, doc_type: "annual_report", url: null },
];

//                 live: rev27  ebitda27  cdmo28   agro26      past: rev24  ebitda24  pat23     cdmo24  agro23
const DELIVERS = ["active", "active", "active", "revised", "met", "met", "missed", "met", "met"];
const WEAK = ["active", "active", "active", "revised", "missed", "missed", "missed", "met", "missed"];

const itemsFor = (statuses: string[]) =>
  normalizeGuidanceTrackingRows(
    ALL_THREADS.map((thread, index) => rowFor(thread, index, statuses[index])),
  );

const delivers = itemsFor(DELIVERS);
const weak = itemsFor(WEAK);
const liveOnly = normalizeGuidanceTrackingRows(
  LIVE_THREADS.slice(0, 3).map((thread, index) => rowFor(thread, index, "active")),
);

const caption = "text-[11px] leading-relaxed text-muted-foreground";

/**
 * Canonical company-page render: the track-record band, the table/card view
 * switch, an Overall table and a Segment-level table of the live commitments,
 * the resolved ones collapsed behind Show track record, and the Sources
 * disclosure. Table view is the default; the card grid and the per-thread
 * drawer both sit behind interaction.
 */
export const GrowthCommitments = () => (
  <GuidanceHistorySection items={delivers} sourceFiles={SOURCE_FILES} />
);

/**
 * The credibility band graded the other way — one of six resolved commitments
 * met, so the lead phrase flips to Weak delivery and the rose Missed count
 * leads the four-stat row.
 */
export const WeakDelivery = () => (
  <GuidanceHistorySection items={weak} sourceFiles={SOURCE_FILES} />
);

/**
 * Only live commitments: nothing has resolved yet, so the band says so instead
 * of asserting a hit rate, and the Show-track-record toggle is hidden because
 * there is nothing behind it.
 */
export const AllThreadsStillLive = () => (
  <GuidanceHistorySection items={liveOnly} />
);

/** Phase 6 found no trackable commitments — the section's own empty state. */
export const NoThreadsTracked = () => (
  <div className="space-y-2">
    <GuidanceHistorySection items={[]} />
    <p className={caption}>
      An empty items array short-circuits before the tabs, band and tables — the section
      renders this single block and nothing else.
    </p>
  </div>
);
