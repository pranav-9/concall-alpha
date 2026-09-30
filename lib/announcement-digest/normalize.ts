import {
  ACTIVITY_LABEL,
  AnnouncementDigestPayloadSchema,
  categoryLabel,
  IMPACT_META,
  type AnnouncementDigestRow,
  type DigestScale,
  type NormalizedAnnouncementDigest,
} from "./types";

export type NormalizeDigestResult = {
  digest: NormalizedAnnouncementDigest | null;
  /**
   * Set when a row exists but its payload fails the v1 schema. The section
   * falls back to its plain cards and logs this; the dev preview prints it.
   * Never silently render a broken payload.
   */
  error: string | null;
};

const crFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const crFormatterSmall = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** "₹2,329 cr" — one decimal under ten, whole crore above. */
export function formatCr(value: number): string {
  const text = value < 10 ? crFormatterSmall.format(value) : crFormatter.format(value);
  return `₹${text} cr`;
}

const dayMonth = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});
const dayMonthYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const istYear = new Intl.DateTimeFormat("en-CA", { year: "numeric", timeZone: "Asia/Kolkata" });

/** "14 Sept", or "14 Sept 2025" when the date is not in the reader's year. */
export function formatFiledLabel(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return istYear.format(at) === istYear.format(now) ? dayMonth.format(at) : dayMonthYear.format(at);
}

function scaleFrom(scale: NonNullable<ReturnType<typeof AnnouncementDigestPayloadSchema.parse>["biggest"]>["scale"]): DigestScale | null {
  if (!scale) return null;
  const ratio = Math.round(scale.ratio_pct);
  return {
    valueCr: scale.value_cr,
    valueLabel: formatCr(scale.value_cr),
    valueBasis: scale.value_basis,
    basisLabel: scale.basis_label,
    basisValueLabel: formatCr(scale.basis_value_cr),
    ratioPct: scale.ratio_pct,
    ratioLabel: ratio < 1 ? `under 1% of ${scale.basis_label}` : `≈ ${ratio}% of ${scale.basis_label}`,
  };
}

/**
 * Supabase row → display shape. A null row is "no digest" (not an error); a
 * row whose payload fails the schema is an error, surfaced by name.
 */
export function normalizeAnnouncementDigest(
  row: AnnouncementDigestRow | null | undefined,
  now: Date = new Date(),
): NormalizeDigestResult {
  if (!row) return { digest: null, error: null };
  const parsed = AnnouncementDigestPayloadSchema.safeParse(row.payload);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { digest: null, error: `announcement_digest_v1 payload invalid for ${row.company_code}: ${issues}` };
  }
  const p = parsed.data;
  const biggest = p.biggest;
  return {
    error: null,
    digest: {
      companyCode: p.company_code,
      generatedAt: p.generated_at,
      windowFrom: p.window.from,
      windowTo: p.window.to,
      windowDays: p.window.days,
      windowFromLabel: `Since ${formatFiledLabel(p.window.from, now)}`,
      materialCount: p.substrate.material_count,
      maxFiledAt: p.substrate.max_filed_at,
      announcementIds: p.substrate.announcement_ids,
      summary: {
        activity: p.summary.activity,
        activityLabel: ACTIVITY_LABEL[p.summary.activity],
        text: p.summary.text,
        chips: p.summary.chips.map((c) => ({ label: c.label, value: c.value, detail: c.detail ?? null })),
      },
      biggest: biggest
        ? {
            announcementId: biggest.announcement_id,
            filedAt: biggest.filed_at,
            filedLabel: formatFiledLabel(biggest.filed_at, now),
            headline: biggest.headline,
            title: biggest.summary.trim() || biggest.headline.trim() || categoryLabel(biggest.category),
            category: biggest.category,
            categoryLabel: categoryLabel(biggest.category),
            impact: biggest.impact,
            impactLabel: IMPACT_META[biggest.impact].label,
            what: biggest.what,
            soWhat: biggest.so_what,
            scale: scaleFrom(biggest.scale),
            pickReason: biggest.pick_reason,
            pickedBy: biggest.picked_by,
            pdfRead: biggest.pdf_read,
          }
        : null,
    },
  };
}

/**
 * How many tape rows landed after the digest was written. The section already
 * holds the tape, so this is a count, not a query. Unparseable dates count as
 * not-newer.
 */
export function countNewerThan(updates: { filedRaw: string }[], maxFiledAt: string): number {
  const cutoff = new Date(maxFiledAt).getTime();
  if (Number.isNaN(cutoff)) return 0;
  return updates.filter((u) => {
    const t = new Date(u.filedRaw).getTime();
    return !Number.isNaN(t) && t > cutoff;
  }).length;
}
