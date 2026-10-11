import type { CSSProperties, ReactNode } from "react";

// The four plates of the EMS sector map (Journal, 2026-10-11): the cohorts,
// the re-rating split as EPS × P/E, the chain, and which way each specialist
// is moving. Server components in the house tokens, registered for MDX in
// ../mdx-components.tsx and placed by the post as <EmsPlate01 /> … <EmsPlate04 />.
//
// Every number is a promoted row read on 9-10 Oct 2026 and named beside the
// value: `company.coverage_rank`, `price_phases.payload.phases[-1]`
// (price_ratio = eps_ratio × pe_ratio), `valuation_check.market_data`,
// `business_snapshot.revenue_breakdown.by_segment`, and the guidance deep-track
// threads. The one exception is Plate 03's per-layer margin ranges, which are
// typical industry figures and say so on the plate.
//
// A plate breaks out of the post's 672px column to 1180px on a wide screen
// and falls back to the column (stacked) on a phone.

type Phase = "up" | "side" | "down";

const PHASE_DOT: Record<Phase, string> = {
  up: "bg-[var(--signal)]",
  side: "bg-[var(--ink-soft)]",
  down: "bg-[var(--alarm)]",
};

const PHASE_LABEL: Record<Phase, string> = { up: "price up", side: "sideways", down: "down" };

// ── frame ──────────────────────────────────────────────────────────────────

function Plate({
  n,
  label,
  right,
  children,
  foot,
}: {
  n: string;
  label: string;
  right?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <section
      className="house relative left-1/2 my-10 w-[min(calc(100vw-3rem),1180px)] -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--rule)]"
      aria-label={`Plate ${n}: ${label}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[var(--rule)] px-5 py-3 sm:px-7">
        <span className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          Plate {n} — {label}
        </span>
        {right ? (
          <span className="house-data flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-soft)]">
            {right}
          </span>
        ) : null}
      </div>
      <div className="px-5 py-6 sm:px-7 sm:py-8">{children}</div>
      {foot ? (
        <div className="border-t border-[var(--rule)] px-5 py-3 text-[12px] leading-[1.5] text-[var(--ink-soft)] sm:px-7">
          {foot}
        </div>
      ) : null}
    </section>
  );
}

function Dot({ phase }: { phase: Phase }) {
  return <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${PHASE_DOT[phase]}`} />;
}

function Headline({ children }: { children: ReactNode }) {
  return (
    <h3 className="house-display mb-6 max-w-[62ch] text-[22px] leading-[1.2] sm:text-[26px] [text-wrap:pretty]">
      {children}
    </h3>
  );
}

// ── Plate 01 — what EMS is, and who does it ────────────────────────────────

type Name = { code: string; name: string; phase: Phase };

// `price_phases.payload.phases[-1].kind`, as of 2026-10-09.
const AC_MAKERS: Name[] = [
  { code: "DIXON", name: "Dixon Technologies", phase: "up" },
  { code: "AMBER", name: "Amber Enterprises", phase: "down" },
  { code: "PGEL", name: "PG Electroplast", phase: "down" },
  { code: "EPACK", name: "EPACK Durable", phase: "down" },
  { code: "VOEPL", name: "Virtuoso Optoelectronics", phase: "up" },
];

const SPECIALISTS: Name[] = [
  { code: "SYRMA", name: "Syrma SGS", phase: "up" },
  { code: "KAYNES", name: "Kaynes Technology", phase: "side" },
  { code: "AVALON", name: "Avalon Technologies", phase: "up" },
  { code: "CYIENTDLM", name: "Cyient DLM", phase: "up" },
  { code: "CENTUM", name: "Centum Electronics", phase: "up" },
  { code: "VINYAS", name: "Vinyas Innovative", phase: "up" },
  { code: "AIMTRON", name: "Aimtron Technologies", phase: "up" },
];

function Cohort({ title, blurb, names }: { title: string; blurb: string; names: Name[] }) {
  return (
    <div>
      <h4 className="house-display text-[20px] leading-tight">{title}</h4>
      <p className="mt-1.5 max-w-[48ch] text-[13.5px] leading-[1.55] text-[var(--ink-soft)]">{blurb}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
        {names.map((n) => (
          <li
            key={n.code}
            className="flex items-start justify-between gap-2 rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="house-data block text-[12px] font-semibold tracking-[0.04em]">{n.code}</span>
              <span className="mt-0.5 block text-[12px] leading-[1.35] text-[var(--ink-soft)]">{n.name}</span>
            </span>
            <span className="mt-1 shrink-0">
              <Dot phase={n.phase} />
              <span className="sr-only">{PHASE_LABEL[n.phase]}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CHAIN_STEPS: { title: string; sub: string; ems: boolean }[] = [
  { title: "Chips & parts", sub: "bought in", ems: false },
  { title: "Circuit board", sub: "solder chips onto it", ems: true },
  { title: "Box build", sub: "board → finished unit", ems: true },
  { title: "Brand", sub: "puts its name on it", ems: false },
];

export function EmsPlate01() {
  return (
    <Plate
      n="01"
      label="What EMS is, and who does it · two cohorts"
      right={(["up", "side", "down"] as Phase[]).map((p) => (
        <span key={p} className="flex items-center gap-1.5">
          <Dot phase={p} />
          {PHASE_LABEL[p]}
        </span>
      ))}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div>
          <span className="house-display inline-block rounded-md bg-[color-mix(in_srgb,var(--signal)_22%,var(--paper))] px-5 py-2 text-[56px] leading-none tracking-[-0.05em] sm:text-[72px]">
            EMS
          </span>
          <p className="house-display mt-3 text-[20px] leading-tight">Electronics Manufacturing Services</p>
          <p className="mt-2 max-w-[42ch] text-[14px] leading-[1.55] text-[var(--ink-soft)]">
            The contract factory: a brand designs the product, an EMS firm builds it.
          </p>
        </div>
        <div>
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {CHAIN_STEPS.map((s, i) => (
              <li
                key={s.title}
                className={`relative rounded-lg border px-3.5 py-3 ${
                  s.ems
                    ? "border-[color-mix(in_srgb,var(--signal)_45%,var(--rule))] bg-[color-mix(in_srgb,var(--signal)_14%,var(--paper-2))]"
                    : "border-[var(--rule)] bg-[var(--paper-2)]"
                }`}
              >
                <span className="house-display block text-[15px] leading-tight">{s.title}</span>
                <span className="mt-1 block text-[12px] text-[var(--ink-soft)]">{s.sub}</span>
                {i < CHAIN_STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-[var(--ink-soft)] sm:block"
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="house-data mt-2.5 text-center text-[10px] uppercase tracking-[0.16em] text-[var(--signal)] sm:pl-[25%] sm:pr-[25%]">
            EMS does these two
          </p>
        </div>
      </div>
      <div className="mt-8 grid gap-8 border-t border-[var(--rule)] pt-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Cohort
          title="AC / consumer makers"
          blurb="Build consumer products — ACs, phones, TVs, appliances — for brands. High volume, 4–10% margin, seasonal, Indian customers."
          names={AC_MAKERS}
        />
        <Cohort
          title="Specialists"
          blurb="Low-volume, high-mix work for industrial, aerospace, defence, medical and semicap customers. 10–20% margin, export-heavy, order-book driven."
          names={SPECIALISTS}
        />
      </div>
    </Plate>
  );
}

// ── Plate 02 — two cohorts, one re-rating ──────────────────────────────────

// `price_phases.payload.phases[-1]` as of 2026-10-09: price_ratio, eps_ratio,
// pe_ratio of the current phase. `split: false` = a loss year at one end, so
// the EPS × P/E split is not computable (EPACK, CENTUM).
type Bar = {
  code: string;
  price: number;
  eps?: number;
  pe?: number;
  since: string;
  /** Short note printed beside the value on an up bar. */
  note?: string;
  /** What the right-hand "of which" column says instead of the EPS · P/E split. */
  aside?: string;
  tone?: "signal";
};

const SPECIALIST_BARS: Bar[] = [
  { code: "CYIENTDLM", price: 3.42, eps: 0.98, pe: 3.51, since: "Mar 2026" },
  { code: "AVALON", price: 2.88, eps: 1.53, pe: 1.89, since: "Jan 2026" },
  { code: "SYRMA", price: 2.59, eps: 1.54, pe: 1.68, since: "Jan 2026" },
  { code: "AIMTRON", price: 2.45, eps: 1.29, pe: 1.9, since: "Jan 2026" },
  { code: "VINYAS", price: 1.78, eps: 1.46, pe: 1.22, since: "Apr 2026", note: "earnings-led", tone: "signal" },
  { code: "KAYNES", price: 1.06, eps: 0.96, pe: 1.11, since: "Jun 2026", note: "sideways since Jun" },
  { code: "CENTUM", price: 3.55, since: "Mar 2025", aside: "since Mar 2025 · n/a" },
];

const AC_BARS: Bar[] = [
  { code: "DIXON", price: 1.29, eps: 1.34, pe: 0.96, since: "Apr 2026" },
  { code: "VOEPL", price: 1.95, eps: 1.29, pe: 1.51, since: "Mar 2026" },
  { code: "AMBER", price: 0.73, eps: 0.85, pe: 0.85, since: "May 2026" },
  { code: "PGEL", price: 0.81, eps: 1.0, pe: 0.81, since: "Aug 2026" },
  { code: "EPACK", price: 0.43, since: "Sep 2025", aside: "since Sep 2025 · loss year · n/a" },
];

// Log scale, so the EPS and P/E segments add up to the price move.
const X_MIN = 0.33;
const X_MAX = 3.9;
const pos = (v: number) => ((Math.log(v) - Math.log(X_MIN)) / (Math.log(X_MAX) - Math.log(X_MIN))) * 100;
const GRID = [0.5, 1, 2, 3];

const HATCH =
  "bg-[repeating-linear-gradient(45deg,var(--rule)_0_3px,transparent_3px_7px)] border border-[var(--rule)]";
const EPS_FILL = "bg-[color-mix(in_srgb,var(--signal)_38%,var(--paper))]";
const PE_FILL = "bg-[color-mix(in_srgb,var(--mark)_55%,var(--paper))]";

function seg(a: number, b: number): CSSProperties {
  const [l, r] = a < b ? [a, b] : [b, a];
  return { left: `${pos(l)}%`, width: `${pos(r) - pos(l)}%` };
}

function BarRow({ b }: { b: Bar }) {
  const hasSplit = b.eps !== undefined && b.pe !== undefined;
  const down = b.price < 1;
  const labelStyle: CSSProperties = down
    ? { right: `${100 - pos(b.price)}%`, paddingRight: 8 }
    : { left: `${pos(b.price)}%`, paddingLeft: 8 };
  return (
    <li className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-3 py-2 sm:grid-cols-[96px_minmax(0,1fr)_150px]">
      <span className={`house-data text-[12px] font-semibold ${b.tone === "signal" ? "text-[var(--signal)]" : ""}`}>
        {b.code}
      </span>
      {/* Below sm the track keeps 2.5rem clear on the right for the value label (the plate clips overflow). */}
      <span className="relative mr-10 block h-5 sm:mr-0">
        {GRID.map((g) => (
          <span
            key={g}
            aria-hidden
            className={`absolute top-0 h-full w-px ${g === 1 ? "bg-[var(--ink)]" : "bg-[var(--rule)]"}`}
            style={{ left: `${pos(g)}%` }}
          />
        ))}
        {hasSplit ? (
          <>
            <span aria-hidden className={`absolute top-0.5 h-4 ${EPS_FILL}`} style={seg(1, b.eps!)} />
            <span aria-hidden className={`absolute top-0.5 h-4 ${PE_FILL}`} style={seg(b.eps!, b.price)} />
          </>
        ) : (
          <span aria-hidden className={`absolute top-0.5 h-4 ${HATCH}`} style={seg(1, b.price)} />
        )}
        <span
          className={`house-data absolute top-0 flex h-5 items-center whitespace-nowrap text-[12px] font-semibold ${
            down ? "text-[var(--alarm)]" : ""
          }`}
          style={labelStyle}
        >
          {b.price.toFixed(1)}×
          {b.note ? (
            <span className={`ml-2 hidden font-normal sm:inline ${b.tone === "signal" ? "text-[var(--signal)]" : "text-[var(--ink-soft)]"}`}>
              {b.note}
            </span>
          ) : null}
        </span>
      </span>
      <span className="house-data hidden text-right text-[11px] text-[var(--ink-soft)] sm:block">
        {b.aside ?? (hasSplit ? `EPS ${b.eps!.toFixed(1)} · P/E ${b.pe!.toFixed(1)}` : "n/a")}
      </span>
    </li>
  );
}

function Summary({
  cohort,
  big,
  median,
  line,
  eps,
  pe,
  tint,
}: {
  cohort: string;
  big: string;
  median: string;
  line: string;
  eps: number;
  pe: number;
  tint?: boolean;
}) {
  // The mini bar stacks EPS then P/E on the same log scale, 1× at the base, 2× marked.
  // Axis ticks sit left of the bar, the two segment labels right of it, never
  // closer than 13px so a tiny AC-maker stack still reads.
  const H = 120; // px for the 1×→2.6× span
  const h = (v: number) => (Math.log(v) / Math.log(2.6)) * H;
  const epsLabel = Math.max(0, h(eps) - 6);
  const peLabel = Math.max(epsLabel + 13, h(eps * pe) - 6);
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_124px] gap-4 rounded-xl border px-5 py-5 ${
        tint
          ? "border-[color-mix(in_srgb,var(--signal)_35%,var(--rule))] bg-[color-mix(in_srgb,var(--signal)_10%,var(--paper-2))]"
          : "border-[var(--rule)] bg-[var(--paper-2)]"
      }`}
    >
      <div>
        <span className="house-data text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">{cohort}</span>
        <span className="house-display mt-2 block text-[52px] leading-none tracking-[-0.04em] sm:text-[64px]">{big}</span>
        <span className="mt-1.5 block text-[13px] text-[var(--ink-soft)]">average · median {median}</span>
        <p className="mt-4 max-w-[30ch] text-[15px] font-medium leading-[1.4]">{line}</p>
      </div>
      <div className="relative self-end" style={{ height: H + 24 }}>
        <span aria-hidden className="absolute bottom-0 left-6 right-0 h-px bg-[var(--ink)]" />
        <span aria-hidden className="absolute left-6 right-0 border-t border-dashed border-[var(--rule)]" style={{ bottom: h(2) }} />
        <span className="house-data absolute left-0 text-[10px] text-[var(--ink-soft)]" style={{ bottom: h(2) - 6 }}>
          2×
        </span>
        <span className="house-data absolute left-0 -bottom-1.5 text-[10px] text-[var(--ink-soft)]">1×</span>
        <span aria-hidden className={`absolute bottom-0 left-7 w-9 ${EPS_FILL}`} style={{ height: h(eps) }} />
        <span aria-hidden className={`absolute left-7 w-9 ${PE_FILL}`} style={{ bottom: h(eps), height: h(eps * pe) - h(eps) }} />
        <span className="house-data absolute left-[72px] whitespace-nowrap text-[10px] text-[var(--ink-soft)]" style={{ bottom: epsLabel }}>
          EPS {eps.toFixed(2)}
        </span>
        <span className="house-data absolute left-[72px] whitespace-nowrap text-[10px] text-[var(--ink-soft)]" style={{ bottom: peLabel }}>
          P/E {pe.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export function EmsPlate02() {
  return (
    <Plate
      n="02"
      label="Two cohorts, one multiple moved · price × = EPS × · P/E ×"
      right={
        <>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block h-2.5 w-4 ${EPS_FILL}`} /> EPS
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block h-2.5 w-4 ${PE_FILL}`} /> P/E
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block h-2.5 w-4 ${HATCH}`} /> split n/a
          </span>
          <span>log scale</span>
        </>
      }
      foot="Log scale, so the teal and amber segments add up to the price move. Left of 1× is a fall. Hatched: a loss year at one end makes the split meaningless. Cohort averages are over the names with a split (4 AC makers, 6 specialists)."
    >
      <Headline>Earnings grew in both cohorts. The multiple moved in only one.</Headline>
      <div className="grid gap-4 sm:grid-cols-2">
        <Summary
          cohort="AC makers · 4 names"
          big="1.04×"
          median="0.81×"
          line="Earnings up a little; the multiple did not move."
          eps={1.12}
          pe={1.03}
        />
        <Summary
          cohort="Specialists · 6 names"
          big="2.53×"
          median="2.59×"
          line="Earnings up a little more — and the multiple nearly doubled."
          eps={1.29}
          pe={1.89}
          tint
        />
      </div>
      <div className="mt-8">
        <div className="house-data flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          <span>By company</span>
          <span className="hidden sm:block">of which</span>
        </div>
        <div className="relative mt-2 grid grid-cols-[76px_minmax(0,1fr)] gap-3 sm:grid-cols-[96px_minmax(0,1fr)_150px]">
          <span />
          <span className="relative mr-10 block h-4 sm:mr-0">
            {GRID.map((g) => (
              <span
                key={g}
                className={`house-data absolute -translate-x-1/2 text-[10px] ${g === 1 ? "font-semibold" : "text-[var(--ink-soft)]"}`}
                style={{ left: `${pos(g)}%` }}
              >
                {g}×
              </span>
            ))}
          </span>
        </div>
        <ul className="mt-1 border-t border-[var(--rule)]">
          <li className="py-2.5 text-[13px]">
            <span className="font-semibold">Specialists</span>
            <span className="ml-3 text-[var(--ink-soft)]">five up since Jan–Apr 2026; two moved earlier</span>
          </li>
          {SPECIALIST_BARS.map((b) => (
            <BarRow key={b.code} b={b} />
          ))}
          <li className="mt-2 border-t border-[var(--rule)] py-2.5 text-[13px]">
            <span className="font-semibold">AC / consumer makers</span>
            <span className="ml-3 text-[var(--ink-soft)]">mixed</span>
          </li>
          {AC_BARS.map((b) => (
            <BarRow key={b.code} b={b} />
          ))}
        </ul>
      </div>
    </Plate>
  );
}

// ── Plate 03 — the chain ───────────────────────────────────────────────────

type Band = "rich" | "adequate" | "thin";

type Layer = {
  title: string;
  sub: string;
  margin: string;
  band: Band;
  col: number; // 1..6 on the desktop grid
  note?: string;
  ours?: boolean; // the two layers every Indian EMS name lives in
};

// Margin ranges are typical industry figures (not from filings). The two
// `ours` boxes carry our cohort's own FY26 operating margins
// (`company_quality` P&L: AC makers 4–10%, specialists 10–20%).
const LAYERS: Layer[] = [
  { title: "Chip design", sub: "draw the circuit", margin: "25–35%", band: "rich", col: 1 },
  { title: "Wafer fab", sub: "print it on silicon", margin: "35–55%", band: "rich", col: 2, note: "no Indian fab" },
  { title: "Packaging & test", sub: "cut, seal, test (OSAT)", margin: "15–25%", band: "adequate", col: 3 },
  { title: "Circuit board", sub: "solder chips onto a board", margin: "4–12%", band: "thin", col: 4, note: "all EMS", ours: true },
  { title: "Box build", sub: "board → finished unit", margin: "5–10%", band: "thin", col: 5, ours: true },
  { title: "Brand / system", sub: "your phone, AC, radar", margin: "10–20%", band: "adequate", col: 6 },
];

const BANDS: { key: Band; label: string; range: string; row: number }[] = [
  { key: "rich", label: "Rich", range: ">20%", row: 2 },
  { key: "adequate", label: "Adequate", range: "10–20%", row: 3 },
  { key: "thin", label: "Thin", range: "<10%", row: 4 },
];

type Supplier = { title: string; margin: string; sub: string; names: string[]; col: number };

// Who sells into the fab and packaging layers (the semiconductor poster's
// twelve, 2026-10-09): `business_snapshot` / `growth_outlook` rows name the
// customer count and the revenue share.
const SUPPLIERS: Supplier[] = [
  { title: "Chemicals", margin: "18–28%", sub: "ultra-pure chemicals used to print chips", names: ["Acutaas ~1%", "Aether trials"], col: 2 },
  { title: "Equipment & parts", margin: "10–15%", sub: "the machines that make chips — one customer each", names: ["Avalon", "Centum", "Cyient DLM", "Sansera"], col: 3 },
  { title: "Plant infrastructure", margin: "15–22%", sub: "power, gases, cryogenics", names: ["INOX India", "Schneider"], col: 4 },
];

type Who = { col: number; listed: string[]; global: string[]; coming?: string };

const WHO: Who[] = [
  { col: 1, listed: [], global: ["Qualcomm", "Apple"] },
  { col: 2, listed: [], global: ["TSMC", "Tata Dholera (building)"] },
  { col: 3, listed: [], global: ["Tata Assam", "Micron"], coming: "Kaynes Sanand · Q3 FY27" },
  { col: 4, listed: ["Dixon", "Kaynes", "Syrma", "Vinyas", "Cyient DLM", "Centum"], global: [] },
  { col: 5, listed: ["Avalon", "Aimtron", "Syrma", "Dixon"], global: [] },
  { col: 6, listed: [], global: ["Voltas", "Siemens", "Apple"] },
];

function Chip({ children, kind }: { children: ReactNode; kind: "listed" | "global" | "coming" }) {
  const cls =
    kind === "listed"
      ? "border-[var(--rule)] bg-[var(--paper-2)]"
      : kind === "global"
        ? "border-dashed border-[var(--rule)] bg-transparent text-[var(--ink-soft)]"
        : "border-[color-mix(in_srgb,var(--mark)_70%,var(--rule))] bg-[color-mix(in_srgb,var(--mark)_18%,var(--paper-2))]";
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11.5px] leading-[1.5] ${cls}`}>{children}</span>;
}

function LayerCard({ l, compact }: { l: Layer; compact?: boolean }) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg border px-3.5 py-3 ${
        l.ours
          ? "border-[color-mix(in_srgb,var(--signal)_45%,var(--rule))] bg-[color-mix(in_srgb,var(--signal)_14%,var(--paper-2))]"
          : "border-[var(--rule)] bg-[var(--paper-2)]"
      }`}
    >
      <span className="house-display text-[15px] leading-tight">{l.title}</span>
      <span className="mt-1 text-[12px] leading-[1.4] text-[var(--ink-soft)]">{l.sub}</span>
      <span className={`house-data flex flex-wrap items-baseline gap-x-2 text-[13px] ${compact ? "mt-2" : "mt-auto pt-4"}`}>
        <span className="whitespace-nowrap">{l.margin}</span>
        {l.note ? (
          <span className={`text-[11px] ${l.ours ? "text-[var(--signal)]" : "text-[var(--alarm)]"}`}>{l.note}</span>
        ) : null}
      </span>
    </div>
  );
}

export function EmsPlate03() {
  const colStyle = (col: number, row: number, span = 1): CSSProperties => ({
    gridColumn: `${col + 1} / span ${span}`,
    gridRow: row,
  });
  return (
    <Plate
      n="03"
      label="The chain · six layers, two acts"
      right={
        <>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-5 rounded-full border border-[var(--rule)] bg-[var(--paper-2)]" />
            listed in India
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-5 rounded-full border border-dashed border-[var(--rule)]" />
            global / unlisted
          </span>
        </>
      }
      foot={
        <>
          <strong className="font-semibold text-[var(--ink)]">Margins per layer are typical industry ranges, not from the filings.</strong>{" "}
          The two green boxes are where every Indian EMS name in this piece earns its money; their 4–20% is the cohort&rsquo;s own FY26
          operating margins. Supplier names come from each company&rsquo;s filings and are one customer or about 1% of sales in every case.
        </>
      }
    >
      <Headline>
        The money is in making the chip. Using it — where every Indian EMS name lives — is the thin end. Each new plant in Plate 04 is a move
        away from, or deeper into, those two green boxes.
      </Headline>

      {/* Desktop: a band × layer grid. */}
      <div className="hidden lg:block">
        <div className="house-data mb-2 grid grid-cols-[92px_repeat(6,minmax(0,1fr))] gap-x-3 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
          <span />
          <span className="col-span-3 flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-[var(--rule)]" />
            Making the chip
            <span aria-hidden className="h-px flex-1 bg-[var(--rule)]" />
          </span>
          <span className="col-span-3 flex items-center gap-3">
            <span aria-hidden className="h-px flex-1 bg-[var(--rule)]" />
            Using the chip
            <span aria-hidden className="h-px flex-1 bg-[var(--rule)]" />
          </span>
        </div>
        <div className="relative grid grid-cols-[92px_repeat(6,minmax(0,1fr))] grid-rows-[auto_auto_auto_auto] gap-x-3 gap-y-3">
          {BANDS.map((b, i) => (
            <div
              key={b.key}
              aria-hidden
              className={`col-span-7 -mx-2 rounded-md ${i % 2 === 0 ? "bg-[color-mix(in_srgb,var(--ink-soft)_8%,transparent)]" : ""}`}
              style={{ gridColumn: "1 / -1", gridRow: b.row }}
            />
          ))}
          {BANDS.map((b) => (
            <div key={b.key} className="house-data self-center px-2 py-6 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]" style={{ gridColumn: 1, gridRow: b.row }}>
              <span className="block text-[var(--ink)]">{b.label}</span>
              <span className="block normal-case tracking-normal">{b.range}</span>
            </div>
          ))}
          {LAYERS.map((l) => (
            <div key={l.title} className="py-2" style={colStyle(l.col, BANDS.find((b) => b.key === l.band)!.row)}>
              <LayerCard l={l} />
            </div>
          ))}
          <div className="house-data self-start px-2 pt-2 text-[10px] uppercase leading-[1.5] tracking-[0.16em] text-[var(--ink-soft)]" style={{ gridColumn: 1, gridRow: 5 }}>
            Feeds the fab &amp; plant
          </div>
          {SUPPLIERS.map((s) => (
            <div key={s.title} className="flex flex-col rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-3.5 py-3" style={colStyle(s.col, 5)}>
              <span className="house-display text-[15px] leading-tight">{s.title}</span>
              <span className="house-data mt-1 text-[12px]">{s.margin}</span>
              <span className="mt-1.5 text-[12px] leading-[1.4] text-[var(--ink-soft)]">{s.sub}</span>
              <span className="mt-3 flex flex-wrap gap-1.5">
                {s.names.map((n) => (
                  <Chip key={n} kind="listed">
                    {n}
                  </Chip>
                ))}
              </span>
            </div>
          ))}
          <p className="self-start pt-1 text-[12.5px] leading-[1.5] text-[var(--ink-soft)]" style={colStyle(5, 5, 2)}>
            Suppliers feed layers 2 and 3 — mostly one fab or one OSAT customer each. Adequate margins, order-driven.
          </p>
          <div className="house-data self-start px-2 pt-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]" style={{ gridColumn: 1, gridRow: 6 }}>
            Who
          </div>
          {WHO.map((w) => (
            <div key={w.col} className="flex flex-wrap content-start gap-1.5 pt-1" style={colStyle(w.col, 6)}>
              {w.global.map((n) => (
                <Chip key={n} kind="global">
                  {n}
                </Chip>
              ))}
              {w.listed.map((n) => (
                <Chip key={n} kind="listed">
                  {n}
                </Chip>
              ))}
              {w.coming ? <Chip kind="coming">{w.coming}</Chip> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Phone and tablet: the six layers in order, each with its band. */}
      <ol className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {LAYERS.map((l, i) => {
          const who = WHO[i];
          return (
            <li key={l.title} className="flex flex-col gap-2">
              <span className="house-data flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">
                <span>{i < 3 ? "Making the chip" : "Using the chip"}</span>
                <span aria-hidden className="h-px flex-1 bg-[var(--rule)]" />
                <span className="text-[var(--ink)]">{BANDS.find((b) => b.key === l.band)!.label}</span>
              </span>
              <LayerCard l={l} compact />
              <span className="flex flex-wrap gap-1.5">
                {who.global.map((n) => (
                  <Chip key={n} kind="global">
                    {n}
                  </Chip>
                ))}
                {who.listed.map((n) => (
                  <Chip key={n} kind="listed">
                    {n}
                  </Chip>
                ))}
                {who.coming ? <Chip kind="coming">{who.coming}</Chip> : null}
              </span>
            </li>
          );
        })}
        <li className="sm:col-span-2">
          <span className="house-data block text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Feeds the fab &amp; plant</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {SUPPLIERS.map((s) => (
              <div key={s.title} className="rounded-lg border border-[var(--rule)] bg-[var(--paper-2)] px-3.5 py-3">
                <span className="house-display text-[15px] leading-tight">{s.title}</span>
                <span className="house-data mt-1 block text-[12px]">{s.margin}</span>
                <span className="mt-1 block text-[12px] text-[var(--ink-soft)]">{s.sub}</span>
                <span className="mt-2.5 flex flex-wrap gap-1.5">
                  {s.names.map((n) => (
                    <Chip key={n} kind="listed">
                      {n}
                    </Chip>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </li>
      </ol>
    </Plate>
  );
}

// ── Plate 04 — which way each is moving ────────────────────────────────────

type CellKind = "earns" | "new" | "both" | "promised";
type Cell = { col: number; label: string; kind: CellKind; tag?: string };

type Move = {
  code: string;
  mcap: string; // valuation_check.market_data.market_cap_cr, priced 7-9 Oct 2026
  pe: number; // valuation_check trailing P/E
  price: string; // price_phases current phase: price × · EPS × · P/E ×
  cells: Cell[];
  head: string;
  body: string;
  tone?: "signal";
};

const CHAIN_COLS = ["Design", "Fab", "Package", "Board", "Box", "System"];

// Segment shares: business_snapshot.revenue_breakdown.by_segment (FY26).
// New plants and dates: guidance_snapshot.deep_track threads (status active /
// delayed), promoted 7-9 Oct 2026.
const MOVES: Move[] = [
  {
    code: "KAYNES",
    mcap: "₹21,922 Cr",
    pe: 63,
    price: "1.1× · EPS 1.0 · P/E 1.1",
    cells: [
      { col: 3, label: "OSAT", kind: "new" },
      { col: 4, label: "49%", kind: "earns" },
      { col: 5, label: "22%", kind: "earns" },
    ],
    head: "Upstream, two layers. The only chip move.",
    body: "OSAT packaging at Sanand, ₹3,200 Cr. Delayed five times — FY25-end → Q4 FY26 → Apr → Jul 2026 → Q3 FY27; nothing billed by June. Also exiting meter installation, a forward step it regretted.",
  },
  {
    code: "SYRMA",
    mcap: "₹33,433 Cr",
    pe: 91,
    price: "2.6× · EPS 1.5 · P/E 1.7",
    cells: [
      { col: 4, label: "PCBA", kind: "earns", tag: "bare PCB" },
      { col: 5, label: "ODM", kind: "earns" },
    ],
    head: "Upstream, into its own input: the bare PCB.",
    body: "A bare-board plant in Andhra Pradesh, ₹1,500–1,600 Cr by FY30 (phase 1 ₹800 Cr), Elemaster and Kaga JVs. Trial production Q3 FY27, commercial Q4 FY27/Q1 FY28. ODM to 25% is a forward move by mix.",
  },
  {
    code: "AIMTRON",
    mcap: "₹3,720 Cr",
    pe: 85,
    price: "2.5× · EPS 1.3 · P/E 1.9",
    cells: [
      { col: 4, label: "29%", kind: "earns" },
      { col: 5, label: "69% +", kind: "both" },
    ],
    head: "Same layer, more of it.",
    body: "Mechatronics greenfield — 6 SMT lines, +₹500 Cr capacity — plus the acquired US plant (AIC). Greenfield funded, first line delayed; AIC at 54% utilisation / 11% margin, target 90% / 20%+. A small step into cable assembly and components later.",
  },
  {
    code: "AVALON",
    mcap: "₹15,385 Cr",
    pe: 115,
    price: "2.9× · EPS 1.5 · P/E 1.9",
    cells: [
      { col: 4, label: "PCBA", kind: "earns" },
      { col: 5, label: "~60%", kind: "both" },
    ],
    head: "Same layer, on purpose — sideways into new markets.",
    body: "Refused a PCB/component plant despite incentives. Large Chennai land parcel for modular complex box builds; new end-markets in semicap, defence and data-centre racks. No size or cost announced; US breakeven pushed to late FY27.",
  },
  {
    code: "VINYAS",
    mcap: "₹1,818 Cr",
    pe: 60,
    price: "1.8× · EPS 1.5 · P/E 1.2",
    cells: [
      { col: 4, label: "Boards", kind: "earns" },
      { col: 5, label: "Def. 79%", kind: "earns" },
      { col: 6, label: "Subsystem", kind: "new" },
    ],
    head: "Up the chain, one step: boards → the sub-system the board sits in.",
    body: "SMT doubling at Mysuru plus a 25,000 sq ft Class 3 integration facility — harnesses, assemblies, tested sub-systems for the same defence customers. Capex nearly done, capacity due Q2 FY27; system orders ₹247 → 324 Cr in ten months.",
    tone: "signal",
  },
  {
    code: "CENTUM",
    mcap: "₹6,087 Cr",
    pe: 70,
    price: "3.5× · split n/a",
    cells: [
      { col: 4, label: "EMS 72%", kind: "earns" },
      { col: 5, label: "BTS 28%", kind: "earns" },
      { col: 6, label: "System", kind: "new" },
    ],
    head: "Up the chain, furthest along: sub-systems it designs → whole systems.",
    body: "KIADB Aerospace Park integration facility for full radars, naval navigation, satellite payloads; ₹50–70 Cr fit-out from late FY28. FY27 capex ₹40–45 Cr, half on BTS R&D; ~₹520 Cr booked of a ₹2,000 Cr FY28 goal. EMS funds the working capital.",
  },
  {
    code: "CYIENTDLM",
    mcap: "₹7,740 Cr",
    pe: 95,
    price: "3.4× · EPS 1.0 · P/E 3.5",
    cells: [
      { col: 4, label: "B2P", kind: "earns" },
      { col: 5, label: "B2S 6%", kind: "earns" },
      { col: 6, label: "FY28+", kind: "promised" },
    ],
    head: "Up the chain, slowest: fill the plants, then own the design.",
    body: "No new capacity at 50–60% utilisation; Mysore land bought for an own factory. B2S volume from FY28, AI data-centre and robotics ‘order intake this year, revenue later’. Margin 11–13% by FY29, 13–18% from FY30 — a three-phase plan, none of it billed yet.",
  },
];

const CELL_CLASS: Record<CellKind, string> = {
  earns: "border-[color-mix(in_srgb,var(--signal)_40%,var(--rule))] bg-[color-mix(in_srgb,var(--signal)_16%,var(--paper-2))]",
  new: "border-[color-mix(in_srgb,var(--mark)_80%,var(--rule))] border-[1.5px] bg-[color-mix(in_srgb,var(--mark)_18%,var(--paper-2))]",
  both: "border-[color-mix(in_srgb,var(--mark)_80%,var(--rule))] border-[1.5px] bg-[color-mix(in_srgb,var(--signal)_16%,var(--paper-2))]",
  promised: "border-dashed border-[color-mix(in_srgb,var(--mark)_80%,var(--rule))] bg-transparent text-[var(--ink-soft)]",
};

function ChainRow({ cells }: { cells: Cell[] }) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
      {CHAIN_COLS.map((name, i) => {
        const c = cells.find((x) => x.col === i + 1);
        return (
          <div key={name} className="relative">
            <div
              className={`flex h-11 items-center justify-center rounded-md border px-1 text-center text-[11px] font-semibold leading-tight sm:h-12 sm:text-[12px] ${
                c ? CELL_CLASS[c.kind] : "border-[var(--rule)] bg-[var(--paper-2)]"
              }`}
            >
              {c?.label ?? <span className="sr-only">{name}: nothing</span>}
            </div>
            {c?.tag ? (
              <span className="house-data absolute -bottom-4 left-0 whitespace-nowrap text-[10px] text-[color-mix(in_srgb,var(--mark)_75%,var(--ink))]">
                ↑ {c.tag}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function EmsPlate04() {
  return (
    <Plate
      n="04"
      label="Which way each is moving"
      right={
        <>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block h-3 w-4 rounded-sm border ${CELL_CLASS.earns}`} /> earns today
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block h-3 w-4 rounded-sm border ${CELL_CLASS.new}`} /> new plant
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block h-3 w-4 rounded-sm border ${CELL_CLASS.promised}`} /> promised
          </span>
        </>
      }
      foot="Market caps and P/E from the Valuation Check rows priced 7–9 Oct 2026; the price line is the current phase on the Price journey card. Segment shares are FY26 from the Business tab. Plant dates are the companies’ own, from the guidance ledgers."
    >
      <Headline>
        Two names go backward into the chip side, three go forward toward the system, two stay put and add capacity. Only KAYNES
        touches the chip itself — and it has slipped five times.
      </Headline>
      <div className="house-data hidden grid-cols-[180px_minmax(0,1fr)_minmax(0,1.15fr)] gap-x-6 border-b border-[var(--rule)] pb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ink-soft)] lg:grid">
        <span>Company · price</span>
        <span className="grid grid-cols-6 gap-2 text-center">
          {CHAIN_COLS.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </span>
        <span>The move</span>
      </div>
      <ol>
        {MOVES.map((m) => (
          <li
            key={m.code}
            className="grid gap-x-6 gap-y-4 border-b border-[var(--rule)] py-5 last:border-b-0 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center"
          >
            <div className="flex items-baseline justify-between gap-3 lg:block">
              <span className={`house-display text-[20px] leading-none ${m.tone === "signal" ? "text-[var(--signal)]" : ""}`}>{m.code}</span>
              <span className="house-data text-right text-[11px] leading-[1.6] text-[var(--ink-soft)] lg:mt-1.5 lg:block lg:text-left">
                <span className="block">
                  {m.mcap} · P/E {m.pe}
                </span>
                <span className="block">{m.price}</span>
              </span>
            </div>
            <div className="pb-4 lg:pb-0">
              <span className="house-data mb-1.5 grid grid-cols-6 gap-2 text-center text-[9px] uppercase tracking-[0.1em] text-[var(--ink-soft)] lg:hidden">
                {CHAIN_COLS.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </span>
              <ChainRow cells={m.cells} />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-[1.35]">{m.head}</p>
              <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ink-soft)]">{m.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Plate>
  );
}
