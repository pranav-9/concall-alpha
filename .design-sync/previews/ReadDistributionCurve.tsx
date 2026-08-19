import {
  ReadDistributionCurve,
  ReadDistributionHeadline,
  ReadDistributionLegend,
} from "concall-alpha";
// Pure statistics, no React — the component owns geometry, lib/read-distribution
// owns the maths. Building the fixture through the real builder is the only way
// to get an honest curve, rug, tick set and label rationing.
import { buildReadDistribution } from "@/lib/read-distribution";

// The Read across the covered ~100 mid- and small-caps: quality-tilted, so the
// body sits 5.5-7.5 with a thin right tail and a short left one. One value per
// covered company — these are also the ticks drawn as the baseline rug.
const COVERED_UNIVERSE_READS = [
  4.6, 4.9, 5.0, 5.1, 5.2, 5.3,
  5.4, 5.4, 5.5, 5.5, 5.6, 5.6, 5.7, 5.7, 5.8, 5.8, 5.8, 5.9, 5.9, 5.9, 6.0, 6.0, 6.0, 6.0,
  6.1, 6.1, 6.1, 6.1, 6.2, 6.2, 6.2, 6.2, 6.2, 6.2, 6.3, 6.3, 6.3, 6.3, 6.3, 6.3,
  6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.4, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.6, 6.6, 6.6, 6.6, 6.6, 6.6,
  6.7, 6.7, 6.7, 6.7, 6.8, 6.8, 6.8, 6.8, 6.8, 6.9, 6.9, 6.9, 6.9,
  7.0, 7.0, 7.0, 7.0, 7.1, 7.1, 7.1, 7.2, 7.2, 7.2, 7.3, 7.3, 7.3, 7.4, 7.4, 7.5, 7.5,
  7.6, 7.6, 7.7, 7.8, 7.9, 8.0, 8.1, 8.2, 8.3, 8.5, 8.7,
];

// A real watchlist: the Read plus the configuration word lib/board-read gives it.
// One holding has no valuation leg yet, so it has no read — counted, not plotted.
const WATCHLIST = [
  { code: "NEULANDLAB", name: "Neuland Laboratories", score: 8.2, readLabel: "Priced for it" },
  { code: "PRICOLLTD", name: "Pricol", score: 7.4, readLabel: "Aligned & cheap" },
  { code: "PRIVISCL", name: "Privi Speciality", score: 7.1, readLabel: "Balanced" },
  { code: "MTARTECH", name: "MTAR Technologies", score: 6.9, readLabel: "Outlook-led" },
  { code: "FEDFINA", name: "Fedbank Financial", score: 6.3, readLabel: "Quality at a fair price" },
  { code: "HFCL", name: "HFCL", score: 5.4, readLabel: "Cheap & weak" },
  { code: "SOLARA", name: "Solara Active Pharma", score: 4.8, readLabel: "Cheap, quality forming" },
  { code: "TIMEX", name: "Timex Group India", score: null, readLabel: null },
];

const SECTOR_HOLDINGS = [
  { code: "NEULANDLAB", name: "Neuland Laboratories", score: 8.2, readLabel: "Priced for it" },
  { code: "SOLARA", name: "Solara Active Pharma", score: 4.8, readLabel: "Cheap, quality forming" },
  { code: "PRIVISCL", name: "Privi Speciality", score: 7.1, readLabel: "Balanced" },
];

const watchlistDistribution = buildReadDistribution(COVERED_UNIVERSE_READS, WATCHLIST)!;
const sectorDistribution = buildReadDistribution(COVERED_UNIVERSE_READS, SECTOR_HOLDINGS)!;

/** The bare figure: population shape + rug, dashed universe median, sky needles. */
export const CurveOnly = () => (
  <ReadDistributionCurve distribution={watchlistDistribution} subjectLabel="this watchlist" />
);

/** Canonical: the whole "Where this list sits" panel from the watchlist page. */
export const WhereThisListSits = () => (
  <div className="rounded-xl border border-border/60 p-4">
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Where this list sits
      </h2>
      <ReadDistributionHeadline distribution={watchlistDistribution} />
    </div>
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <ReadDistributionLegend
          distribution={watchlistDistribution}
          subjectLabel="this watchlist"
        />
        <p className="text-[11px] text-muted-foreground">
          Read, 0–10 — the composite the board below ranks on
        </p>
      </div>
      <ReadDistributionCurve
        distribution={watchlistDistribution}
        subjectLabel="this watchlist"
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        The shape is every covered company with a read; each tick under the axis is one of
        them. Your companies are the sky needles — hover one for its read and where it lands
        against the field. Names are printed for the ones furthest from the median.
      </p>
    </div>
  </div>
);

/** A handful of marks: every needle clears the label rationing, so all are named. */
export const FewCompaniesMarked = () => (
  <div className="space-y-3">
    <ReadDistributionLegend distribution={sectorDistribution} subjectLabel="Pharma & Chemicals" />
    <ReadDistributionCurve
      distribution={sectorDistribution}
      subjectLabel="Pharma & Chemicals"
    />
  </div>
);
