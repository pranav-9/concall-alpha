// Pure selection for the desk "Most viewed" block. Lives OUTSIDE the
// `server-only` desk-leaderboard module so it can be unit-tested without the RSC
// guard (mirrors home-featured-read-core.ts). `import type` is erased at compile,
// so this never pulls the server-only module in at runtime.
import type { DeskRow } from "./desk-leaderboard";

const upper = (value: string) => value.toUpperCase();

/** Minimal coverage shape this helper needs (a slice of CoverageInfo). */
export type CoveredInfo = { name: string | null; sector: string | null };

/**
 * Turn the RPC's popularity-ordered company codes into display rows.
 *
 *   codes (popularity order)
 *     └─ drop excludedKeys        (off-discovery: large-cap / below-cut)
 *     └─ drop codes not covered   (fake / uncovered codes → not in coveredByCode)
 *     └─ enrich from rowByCode     (score / sparkline / filed, when the company
 *        has a scored concall row; covered-but-unscored still renders, no score)
 *     └─ preserve order, cap at limit
 */
export function selectMostViewed(args: {
  orderedCodes: string[];
  // ReadonlyMap/Set so the caller can pass its wider CoverageInfo map directly
  // (read-only value position keeps the types covariant, no cast needed).
  coveredByCode: ReadonlyMap<string, CoveredInfo>;
  excludedKeys: ReadonlySet<string>;
  rowByCode: ReadonlyMap<string, DeskRow>;
  limit: number;
}): DeskRow[] {
  const { orderedCodes, coveredByCode, excludedKeys, rowByCode, limit } = args;
  const out: DeskRow[] = [];
  const seen = new Set<string>();

  for (const raw of orderedCodes) {
    if (out.length >= limit) break;
    const code = upper(raw);
    if (seen.has(code)) continue; // guard: never list a company twice
    if (excludedKeys.has(code)) continue; // discovery gate
    const info = coveredByCode.get(code);
    if (!info) continue; // not covered / fake code → drop
    seen.add(code);

    const enriched = rowByCode.get(code);
    out.push({
      code: enriched?.code ?? raw,
      name: enriched?.name ?? info.name ?? raw,
      sector: enriched?.sector ?? info.sector ?? null,
      isNew: enriched?.isNew ?? false,
      latestScore: enriched?.latestScore ?? null,
      delta: null,
      twistPct: null,
      sparkPoints: enriched?.sparkPoints ?? [],
      filedRaw: enriched?.filedRaw ?? null,
      moatLabel: null,
      growthLabel: null,
      growthDownside: null,
      growthUpside: null,
      growthScore: null,
    });
  }

  return out;
}
