// The homepage's small drawings. Illustrations, not data: every mark is fixed
// geometry, so nothing here fetches and nothing ever reads as a real score.
// Inks come from the `.home` custom properties in globals.css (--tint,
// --signal-soft, --signal-faint), which are mixed from the house palette, so
// dark mode follows without a second set of colours.

type FigureProps = { className?: string };

/* --- Find it / Understand it / Follow it ---------------------------------- */

// A 20×5 field of companies with a handful lit up: the strong hits in signal,
// the near-misses at half strength.
const SCAN_COLS = 20;
const SCAN_ROWS = 5;
const SCAN_PITCH = 24.4;
const SCAN_HITS = new Set(["13,0", "7,1", "1,2", "6,3", "8,4"]);
const SCAN_NEAR = new Set(["4,0", "15,1", "12,2", "19,3"]);

export function ScanFigure({ className }: FigureProps) {
  const dots = [];
  for (let row = 0; row < SCAN_ROWS; row += 1) {
    for (let col = 0; col < SCAN_COLS; col += 1) {
      const key = `${col},${row}`;
      const fill = SCAN_HITS.has(key)
        ? "var(--signal)"
        : SCAN_NEAR.has(key)
          ? "var(--signal-soft)"
          : "var(--tint)";
      dots.push(
        <circle key={key} cx={8 + col * SCAN_PITCH} cy={8 + row * SCAN_PITCH} r={8} fill={fill} />,
      );
    }
  }
  return (
    <svg viewBox="0 0 480 114" className={className} aria-hidden>
      {dots}
    </svg>
  );
}

// A quarter's worth of documents, read down to one page.
const RESEARCH_BARS = [45, 28, 53, 36, 23, 48, 34, 39, 26, 50, 31, 42];
const RESEARCH_LINES = [45, 58, 35, 51];

export function ResearchFigure({ className }: FigureProps) {
  return (
    <svg viewBox="0 0 480 74" className={className} aria-hidden>
      {RESEARCH_BARS.map((h, i) => (
        <rect key={i} x={i * 29.5} y={74 - h} width={22} height={h} rx={1.5} fill="var(--tint)" />
      ))}
      <path
        d="M362 37 H378 M373 32 L378 37 L373 42"
        fill="none"
        stroke="var(--ink-soft)"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={394} y={0} width={86} height={74} rx={4} fill="var(--signal)" />
      {RESEARCH_LINES.map((w, i) => (
        <line
          key={i}
          x1={406}
          x2={406 + w}
          y1={12 + i * 10.7}
          y2={12 + i * 10.7}
          stroke="var(--paper-2)"
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

// A score stepping quarter to quarter: grey history, the latest step in
// signal, the next one flagged in --mark; the quarter rail underneath.
export function TrackFigure({ className }: FigureProps) {
  const dashes = Array.from({ length: 8 }, (_, i) => i * 61);
  return (
    <svg viewBox="0 0 480 78" className={className} aria-hidden>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M2 46 H60 V51 H120 V38 H180 V30 H240 V34 H300 V22 H360"
          stroke="var(--tint)"
          strokeWidth={3}
        />
        <path d="M360 22 V18 H420 V10" stroke="var(--signal)" strokeWidth={3.5} />
        <path d="M420 10 H478" stroke="var(--mark)" strokeWidth={3.5} />
        {dashes.map((x, i) => (
          <line
            key={x}
            x1={x + 3}
            x2={x + 50}
            y1={73}
            y2={73}
            stroke={i === dashes.length - 1 ? "var(--signal)" : "var(--tint)"}
            strokeWidth={5}
          />
        ))}
      </g>
    </svg>
  );
}

/* --- What we cover: one glyph per company-page read ------------------------ */

function TileSvg({ className, children }: FigureProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 256 56" className={className} overflow="visible" aria-hidden>
      {children}
    </svg>
  );
}

function SegmentsGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <rect x={0} y={22} width={124} height={13} rx={2} fill="var(--signal)" />
      <rect x={128} y={22} width={74} height={13} rx={2} fill="var(--tint)" />
      <rect x={206} y={22} width={49} height={13} rx={2} fill="var(--tint)" />
    </TileSvg>
  );
}

function IndustryGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <line x1={9} x2={246} y1={28} y2={28} stroke="var(--tint)" strokeWidth={2} />
      {[0, 79, 158, 237].map((x) => (
        <rect
          key={x}
          x={x}
          y={19}
          width={18}
          height={18}
          rx={3}
          fill={x === 158 ? "var(--signal)" : "var(--tint)"}
        />
      ))}
    </TileSvg>
  );
}

function DealWinsGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <rect x={0} y={9} width={139} height={8} rx={4} fill="var(--tint)" />
      <rect x={0} y={24} width={203} height={8} rx={4} fill="var(--signal)" />
      <rect x={0} y={38} width={101} height={8} rx={4} fill="var(--tint)" />
    </TileSvg>
  );
}

function MoatGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <circle cx={28} cy={28} r={27} fill="none" stroke="var(--tint)" strokeWidth={1.6} />
      <circle cx={28} cy={28} r={18} fill="none" stroke="var(--tint)" strokeWidth={1.6} />
      <circle cx={28} cy={28} r={8} fill="var(--signal)" />
    </TileSvg>
  );
}

function KeyVariablesGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <polyline
        points="0,41 42,35 85,38 127,25 170,28 212,15 252,9"
        fill="none"
        stroke="var(--tint)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={252} cy={9} r={6.5} fill="var(--signal)" />
    </TileSvg>
  );
}

function GrowthGlyph({ className }: FigureProps) {
  const tops = [40, 33, 26, 17, 2];
  return (
    <TileSvg className={className}>
      {tops.map((top, i) => (
        <rect
          key={i}
          x={i * 52.4}
          y={top}
          width={45}
          height={55 - top}
          rx={2}
          fill={i === tops.length - 1 ? "var(--signal)" : "var(--tint)"}
        />
      ))}
    </TileSvg>
  );
}

function ValuationGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <g stroke="var(--tint)" strokeWidth={2} strokeLinecap="round">
        <line x1={1} x2={254} y1={28} y2={28} />
        <line x1={1} x2={1} y1={20} y2={36} />
        <line x1={127} x2={127} y1={23} y2={33} />
        <line x1={254} x2={254} y1={20} y2={36} />
      </g>
      <circle cx={81} cy={28} r={7} fill="var(--signal)" />
    </TileSvg>
  );
}

function AnnouncementsGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <circle cx={6} cy={28} r={11} fill="var(--signal-faint)" />
      <circle cx={6} cy={28} r={6.5} fill="var(--signal)" />
      <g stroke="var(--tint)" strokeWidth={2} strokeLinecap="round">
        <line x1={23} x2={115} y1={28} y2={28} />
        <line x1={145} x2={235} y1={28} y2={28} />
      </g>
      <circle cx={129} cy={28} r={4} fill="var(--tint)" />
      <circle cx={249} cy={28} r={4} fill="var(--tint)" />
    </TileSvg>
  );
}

function GuidanceGlyph({ className }: FigureProps) {
  return (
    <TileSvg className={className}>
      <rect
        x={0.7}
        y={15}
        width={215}
        height={10}
        rx={2}
        fill="none"
        stroke="var(--ink-soft)"
        strokeOpacity={0.7}
        strokeWidth={1.4}
        strokeDasharray="4 3"
      />
      <rect x={0} y={33} width={198} height={9} rx={2} fill="var(--signal)" />
    </TileSvg>
  );
}

export const COVER_TILES = [
  { label: "Segments", Glyph: SegmentsGlyph },
  { label: "Industry", Glyph: IndustryGlyph },
  { label: "Deal wins", Glyph: DealWinsGlyph },
  { label: "Moat", Glyph: MoatGlyph },
  { label: "Key variables", Glyph: KeyVariablesGlyph },
  { label: "Growth", Glyph: GrowthGlyph },
  { label: "Valuation", Glyph: ValuationGlyph },
  { label: "Announcements", Glyph: AnnouncementsGlyph },
  { label: "Guidance", Glyph: GuidanceGlyph },
] as const;

/* --- Signal, not noise ----------------------------------------------------- */

// Forty grey bars of chatter with three tall signal bars standing out of it.
const COMMUNITY_BARS = [
  18, 28, 12, 22, 16, 30, 58, 24, 18, 13,
  30, 15, 24, 18, 10, 26, 20, 13, 30, 58,
  22, 10, 32, 18, 13, 25, 20, 14, 29, 16,
  20, 30, 58, 22, 14, 20, 26, 12, 22, 16,
];

export function CommunityFigure({ className }: FigureProps) {
  return (
    <svg viewBox="0 0 476 58" className={className} aria-hidden>
      {COMMUNITY_BARS.map((h, i) => (
        <rect
          key={i}
          x={i * 12}
          y={58 - h}
          width={8}
          height={h}
          rx={1}
          fill={h === 58 ? "var(--signal)" : "var(--tint)"}
        />
      ))}
    </svg>
  );
}
