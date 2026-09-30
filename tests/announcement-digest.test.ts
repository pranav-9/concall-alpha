import assert from "node:assert/strict";

import {
  countNewerThan,
  formatCr,
  formatFiledLabel,
  normalizeAnnouncementDigest,
} from "../lib/announcement-digest/normalize";

const NOW = new Date("2026-09-30T06:00:00Z");

const payload = {
  company_code: "HFCL",
  generated_at: "2026-09-30T05:00:00+00:00",
  model: "deepseek-v4-flash",
  prompt_version: "v1",
  window: { from: "2026-07-02", to: "2026-09-30", days: 90 },
  substrate: {
    announcement_ids: ["a1", "a2", "a3"],
    max_filed_at: "2026-09-14T10:00:00+00:00",
    material_count: 3,
    hash: "0123456789abcdef",
  },
  summary: {
    activity: "order_led",
    text: "HFCL spent the quarter winning optical-fibre export orders and approving an ~Rs 820 crore capacity expansion; the rest of the tape was routine.",
    chips: [
      { label: "Orders", value: "4", detail: "₹3,730 cr disclosed across 3" },
      { label: "Capex & expansion", value: "2", detail: null },
    ],
  },
  biggest: {
    announcement_id: "a2",
    filed_at: "2026-09-01T09:30:00+00:00",
    headline: "Receipt of Order",
    summary: "Company entered into a three-year supply agreement. (~₹2,329 cr)",
    category: "order_win",
    impact: "positive",
    what: "A three-year supply agreement worth about Rs 2,329 crore for optical fibre cables with a domestic telecom operator.",
    so_what: "It fills the cable lines for three years and is the largest single agreement in the window.",
    scale: {
      value_cr: 2329,
      value_basis: "order value",
      basis_label: "FY26 revenue",
      basis_value_cr: 5200.4,
      ratio_pct: 44.8,
    },
    pick_reason: "Orders, positive impact, ₹2,329 cr disclosed — the clear leader of the window's tape.",
    picked_by: "rule",
    pdf_read: true,
  },
};

// ── normalize: happy path ──────────────────────────────────────────────────────
{
  const { digest, error } = normalizeAnnouncementDigest({ company_code: "HFCL", payload }, NOW);
  assert.equal(error, null);
  assert.ok(digest);
  assert.equal(digest.windowFromLabel, "Since 2 Jul");
  assert.equal(digest.materialCount, 3);
  assert.equal(digest.summary.activityLabel, "Order-led");
  assert.deepEqual(digest.summary.chips[1], { label: "Capex & expansion", value: "2", detail: null });
  assert.ok(digest.biggest);
  assert.equal(digest.biggest.filedLabel, "1 Sept");
  assert.equal(digest.biggest.title, "Company entered into a three-year supply agreement. (~₹2,329 cr)");
  assert.equal(digest.biggest.categoryLabel, "Order Wins");
  assert.equal(digest.biggest.impactLabel, "Positive");
  assert.equal(digest.biggest.scale?.valueLabel, "₹2,329 cr");
  assert.equal(digest.biggest.scale?.basisValueLabel, "₹5,200 cr");
  assert.equal(digest.biggest.scale?.ratioLabel, "≈ 45% of FY26 revenue");
}

// ── normalize: null biggest is a legitimate read, not an error ───────────────
{
  const quiet = { ...payload, summary: { ...payload.summary, activity: "routine" }, biggest: null };
  const { digest, error } = normalizeAnnouncementDigest({ company_code: "CCL", payload: quiet }, NOW);
  assert.equal(error, null);
  assert.equal(digest?.biggest, null);
  assert.equal(digest?.summary.activityLabel, "Routine tape");
}

// ── normalize: no row = no digest, no error ───────────────────────────────────
{
  assert.deepEqual(normalizeAnnouncementDigest(null, NOW), { digest: null, error: null });
}

// ── normalize: a stored payload that breaks the schema is named, never rendered
{
  const broken = { ...payload, summary: { ...payload.summary, text: "too short" } };
  const { digest, error } = normalizeAnnouncementDigest({ company_code: "HFCL", payload: broken }, NOW);
  assert.equal(digest, null);
  assert.ok(error && error.includes("HFCL") && error.includes("summary.text"));

  const stance = { ...payload, summary: { ...payload.summary, activity: "bullish" } };
  assert.ok(normalizeAnnouncementDigest({ company_code: "HFCL", payload: stance }, NOW).error?.includes("summary.activity"));
}

// ── title never blank: summary → headline → category label ────────────────────
{
  const bare = { ...payload, biggest: { ...payload.biggest, summary: "", headline: "" } };
  const { digest } = normalizeAnnouncementDigest({ company_code: "HFCL", payload: bare }, NOW);
  assert.equal(digest?.biggest?.title, "Order Wins");
  const raw = { ...payload, biggest: { ...payload.biggest, summary: "  ", headline: "Intimation attached" } };
  assert.equal(normalizeAnnouncementDigest({ company_code: "HFCL", payload: raw }, NOW).digest?.biggest?.title, "Intimation attached");
}

// ── scale: sub-1% reads "under 1%" ────────────────────────────────────────────
{
  const tiny = {
    ...payload,
    biggest: { ...payload.biggest, scale: { ...payload.biggest.scale, value_cr: 12, ratio_pct: 0.2 } },
  };
  const { digest } = normalizeAnnouncementDigest({ company_code: "HFCL", payload: tiny }, NOW);
  assert.equal(digest?.biggest?.scale?.ratioLabel, "under 1% of FY26 revenue");
}

// ── helpers ───────────────────────────────────────────────────────────────────
{
  assert.equal(formatCr(2329), "₹2,329 cr");
  assert.equal(formatCr(17200), "₹17,200 cr");
  assert.equal(formatCr(1.5), "₹1.5 cr");
  assert.equal(formatFiledLabel("2026-09-01T09:30:00+00:00", NOW), "1 Sept");
  assert.equal(formatFiledLabel("2025-09-01T09:30:00+00:00", NOW), "1 Sept 2025");
  assert.equal(formatFiledLabel("not a date", NOW), "");

  const updates = [
    { filedRaw: "2026-09-20T00:00:00+00:00" },
    { filedRaw: "2026-09-14T10:00:00+00:00" }, // equal to the digest's max: not newer
    { filedRaw: "2026-09-01T00:00:00+00:00" },
    { filedRaw: "garbage" },
  ];
  assert.equal(countNewerThan(updates, "2026-09-14T10:00:00+00:00"), 1);
  assert.equal(countNewerThan(updates, "garbage"), 0);
}

console.log("announcement-digest: ok");
