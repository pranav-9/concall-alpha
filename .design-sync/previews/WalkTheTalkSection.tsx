import { WalkTheTalkSection, walkTheTalkSinceBadge } from "concall-alpha";
// Walk-the-talk is a DERIVED view: Phase 6 guidance threads -> commitment rows
// -> tier. Both transforms are pure, so the previews run the real pipeline
// (guidance rows -> normalizeGuidanceTrackingRows -> normalizeWalkTheTalk)
// instead of hand-writing a NormalizedWalkTheTalk, whose counts and tier would
// otherwise be free to disagree with its own commitment list.
import { normalizeGuidanceTrackingRows } from "@/lib/guidance-tracking/normalize";
import { normalizeWalkTheTalk } from "@/lib/walk-the-talk/normalize";

// Trishul Speciality Chemicals (TRISHULCH) — CDMO + performance intermediates
// + agro actives, out of Dahej and Ankleshwar. Phase 6 extracts growth-family
// commitments only (revenue / EBITDA / PAT), so every thread below lands in the
// Revenue bucket; the capex and capacity buckets stay empty by design.
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

const THREADS: Thread[] = [
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
    key: "growth/revenue::consolidated::FY26",
    text: "Consolidated revenue to grow 18-20% in FY26",
    subtype: "revenue",
    segment: null,
    fy: "FY26",
    first: "Q1 FY26",
    latest: "Q4 FY26",
    latestView: "Closed FY26 at 19.4% — inside the guided band.",
    value: pct(19, "18-20% revenue growth"),
  },
  {
    key: "growth/ebitda::consolidated::FY26",
    text: "EBITDA to grow at least 25% in FY26",
    subtype: "ebitda",
    segment: null,
    fy: "FY26",
    first: "Q1 FY26",
    latest: "Q4 FY26",
    latestView: "Delivered 27% on a full year of the Dahej Unit-3 debottlenecking.",
    value: pct(25, "at least 25% EBITDA growth"),
  },
  {
    key: "growth/pat::consolidated::FY26",
    text: "PAT to grow 30% in FY26",
    subtype: "pat",
    segment: null,
    fy: "FY26",
    first: "Q2 FY26",
    latest: "Q4 FY26",
    latestView: "Landed at 31.2%, helped by the interest saving on the June prepayment.",
    value: pct(30, "30% PAT growth"),
  },
  {
    key: "growth/revenue::agro-actives::FY26",
    text: "Agro actives to reach ₹300 cr of revenue in FY26",
    subtype: "revenue",
    segment: "Agro Actives",
    fy: "FY26",
    first: "Q1 FY26",
    latest: "Q3 FY26",
    latestView: "Cut to ₹250-260 cr in Q3 FY26 after the Ankleshwar shutdown ran four weeks long.",
    value: cr(255, "₹250-260 cr"),
  },
  {
    key: "growth/revenue::performance-intermediates::FY26",
    text: "Performance intermediates to grow in the mid-teens in FY26",
    subtype: "revenue",
    segment: "Performance Intermediates",
    fy: "FY26",
    first: "Q1 FY26",
    latest: "Q4 FY26",
    latestView: "Finished at 15.8% despite Chinese pricing pressure through H1.",
    value: pct(15, "mid-teens growth"),
  },
  {
    key: "growth/revenue::cdmo::FY26",
    text: "CDMO revenue to cross ₹700 cr in FY26",
    subtype: "revenue",
    segment: "CDMO",
    fy: "FY26",
    first: "Q2 FY26",
    latest: "Q4 FY26",
    latestView: "Closed at ₹742 cr on two unplanned campaign extensions.",
    value: cr(700, "cross ₹700 cr"),
  },
  {
    key: "growth/revenue::consolidated::FY25",
    text: "Revenue to cross ₹1,500 cr in FY25",
    subtype: "revenue",
    segment: null,
    fy: "FY25",
    first: "Q1 FY25",
    latest: "Q4 FY25",
    latestView: "Closed FY25 at ₹1,543 cr.",
    value: cr(1500, "cross ₹1,500 cr"),
  },
  {
    key: "growth/ebitda::consolidated::FY25",
    text: "EBITDA to grow above 20% in FY25",
    subtype: "ebitda",
    segment: null,
    fy: "FY25",
    first: "Q2 FY25",
    latest: "Q4 FY25",
    latestView: "Delivered 22.6%.",
    value: pct(20, "above 20% EBITDA growth"),
  },
  {
    key: "growth/revenue::agro-actives::FY25",
    text: "Agro actives to grow 25% in FY25",
    subtype: "revenue",
    segment: "Agro Actives",
    fy: "FY25",
    first: "Q1 FY25",
    latest: "Q4 FY25",
    latestView: "Grew 11% — the kharif channel destocked through H2.",
    value: pct(25, "25% growth"),
  },
  {
    key: "growth/pat::consolidated::FY25",
    text: "PAT to grow 35% in FY25",
    subtype: "pat",
    segment: null,
    fy: "FY25",
    first: "Q2 FY25",
    latest: "Q4 FY25",
    latestView: "Delivered 36.4%.",
    value: pct(35, "35% PAT growth"),
  },
];

const buildRows = (statuses: string[]) =>
  THREADS.map((thread, index) => ({
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
    status: statuses[index],
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
      },
      {
        quarter: thread.latest,
        summary: thread.latestView,
        mention_type: "update",
        document_type: "transcript",
      },
    ],
  }));

const snapshotFrom = (statuses: string[]) =>
  normalizeWalkTheTalk({
    companyCode: "TRISHULCH",
    generatedAtRaw: "2026-08-14T09:20:00+05:30",
    updatedAtRaw: "2026-08-14T09:20:00+05:30",
    analysisWindowQuarters: 4,
    guidanceItems: normalizeGuidanceTrackingRows(buildRows(statuses)),
    sourceFiles: [],
    details: null,
  });

// Only met / missed / delayed / dropped / revised count toward the grade; the
// three live FY27-FY28 threads are excluded until they resolve.
const MIXED = [
  "active", "active", "active",
  "met", "met", "met", "revised", "met", "met", "met", "met", "missed", "met",
];
const RELIABLE = MIXED.map((status) => (status === "missed" ? "met" : status));
const WEAK = [
  "active", "active", "active",
  "met", "missed", "missed", "revised", "met", "missed", "met", "revised", "missed", "met",
];
// Two decided outcomes against a minimum of three — enough threads to render,
// too few resolved to grade.
const PENDING = THREADS.map((_, index) =>
  index === 3 ? "met" : index === 11 ? "missed" : index % 4 === 1 ? "not_yet_clear" : "active",
);

const mixed = snapshotFrom(MIXED);
const reliable = snapshotFrom(RELIABLE);
const weak = snapshotFrom(WEAK);
const pending = snapshotFrom(PENDING);

// schemaStatus "missing" — Phase 6 has never run for this company.
const missing = normalizeWalkTheTalk(null, "TRISHULCH");

const caption = "text-[11px] leading-relaxed text-muted-foreground";
const badgeClass =
  "inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

/**
 * Canonical: the verdict view on the company page. The data-span badge the
 * SectionCard header renders comes from the same snapshot, so it sits above.
 * Only the Revenue bucket appears — Phase 6 extracts growth-family commitments
 * only, so capex and capacity are empty by design, not by omission.
 */
export const MixedTrackRecord = () => (
  <div className="space-y-3">
    <span className={badgeClass}>{walkTheTalkSinceBadge(mixed)}</span>
    <WalkTheTalkSection snapshot={mixed} />
  </div>
);

/** Top of the tier ramp: 9 of 10 resolved commitments landed on time. */
export const ReliableGrade = () => <WalkTheTalkSection snapshot={reliable} />;

/** Bottom of the ramp: 4 of 10 — the rose accent bar and Weak chip carry it. */
export const WeakGrade = () => <WalkTheTalkSection snapshot={weak} />;

/**
 * A designed state, not an empty one: threads exist but fewer than three have a
 * decided outcome, so the grade is withheld and the reason is spelled out.
 */
export const GradePending = () => <WalkTheTalkSection snapshot={pending} />;

/** Phase 6 has never run for this company — no snapshot at all. */
export const NotEnoughData = () => (
  <div className="space-y-2">
    <WalkTheTalkSection snapshot={missing} />
    <p className={caption}>
      walkTheTalkSinceBadge returns null for this snapshot, so the section header renders
      without the data-span badge shown in the first card.
    </p>
  </div>
);
