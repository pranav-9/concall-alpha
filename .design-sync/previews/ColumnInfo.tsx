import {
  ColumnInfo,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "concall-alpha";

// ColumnInfo is the per-column explainer on the portal's dense boards. It is a
// Popover, not a Tooltip — the panel portals out so the board's horizontal
// scroll container can't clip it, and a tap target exists on touch where a
// title= tooltip would not.
//
// It is NEVER used alone: it always sits inline after a column label, inside a
// table header cell. So every card here is a real header row. The panel itself
// is a floating overlay that only exists once opened, which no static render can
// show — see the Popover card for the panel chrome.
//
// Copy discipline (from the component's own header comment): every line restates
// vocabulary that already exists in code — lib/score-band, lib/growth-band,
// lib/valuation-band, lib/board-read. Never write a claim the pipeline doesn't
// make.

const HEAD_CLASS = "px-3 py-3 text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground";

/**
 * Canonical: the Overall coverage board's header. Five of its seven columns
 * carry an explainer because five independent vocabularies meet in one row.
 */
export const OverallBoardHeader = () => (
  <div className="rounded-xl border border-border/60 bg-background/70 p-1">
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b border-border/35">
          <TableHead className={`${HEAD_CLASS} w-10`}>#</TableHead>
          <TableHead className={HEAD_CLASS}>Company</TableHead>
          <TableHead className={HEAD_CLASS}>
            <span className="inline-flex items-center gap-1">
              Latest
              <ColumnInfo label="Latest">
                <p>
                  The company&apos;s{" "}
                  <span className="font-medium text-foreground">single newest</span> ConcallScore,
                  0–10, with its quarter label — the freshest print on its own, before it is
                  averaged into anything. The word beneath is the band it falls in.
                </p>
                <p>
                  <span className="font-medium text-foreground">New · 24h</span> means this print
                  was written or re-written in the last twenty-four hours.
                </p>
              </ColumnInfo>
            </span>
          </TableHead>
          <TableHead className={HEAD_CLASS}>
            <span className="inline-flex items-center gap-1">
              4Q Avg
              <ColumnInfo label="4Q Avg">
                <p>
                  The{" "}
                  <span className="font-medium text-foreground">trailing four-quarter average</span>{" "}
                  ConcallScore, 0–10 — the stable read on how the company has been doing across its
                  four newest scored quarters, next to the single fresh print on its left.
                </p>
                <p>
                  This is also the leg the coverage ranking uses. The Read leans on a{" "}
                  <span className="font-medium text-foreground">recency-weighted</span> version of
                  it instead.
                </p>
              </ColumnInfo>
            </span>
          </TableHead>
          <TableHead className={HEAD_CLASS}>
            <span className="inline-flex items-center gap-1">
              Growth
              <ColumnInfo label="Growth">
                <p>
                  Growth outlook, 0–10 — a forward read rather than a print. Band cuts are fixed and
                  absolute (Exceptional ≥ 8.5 down to Weak), not percentiles of the cohort, so they
                  stay comparable across companies and over time.
                </p>
              </ColumnInfo>
            </span>
          </TableHead>
          <TableHead className={HEAD_CLASS}>
            <span className="inline-flex items-center gap-1">
              Valuation
              <ColumnInfo label="Valuation">
                <p>
                  Price read, 0–10, where higher is more attractively valued — a lens on the current
                  price, independent of the ConcallScore.
                </p>
                <p>
                  Only published, non-stale reads appear.{" "}
                  <span className="font-medium text-foreground">—</span> covers three different
                  things: no verdict, not yet published, or a price too old to stand behind.
                </p>
              </ColumnInfo>
            </span>
          </TableHead>
          <TableHead className={HEAD_CLASS} style={{ color: "var(--warn)" }}>
            <span className="inline-flex items-center gap-1">
              Read
              <ColumnInfo label="Read">
                <p>
                  The synthesis, and the number the board is ranked by: the recency-weighted quarter
                  leg blended with the forward and price legs.
                </p>
                <p>
                  The word beneath is the{" "}
                  <span className="font-medium text-foreground">configuration</span> — Aligned &amp;
                  cheap, Priced for it — not a band word.
                </p>
              </ColumnInfo>
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="border-b border-border/25">
          <TableCell className="px-3 py-2.5 text-[12px] tabular-nums text-muted-foreground">1</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-medium">Neuland Laboratories</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-semibold tabular-nums">8.2</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] tabular-nums">7.8</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] tabular-nums">8.1</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] tabular-nums text-muted-foreground">5.4</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-semibold tabular-nums">7.6</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="px-3 py-2.5 text-[12px] tabular-nums text-muted-foreground">2</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-medium">Pricol</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-semibold tabular-nums">7.4</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] tabular-nums">7.1</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] tabular-nums">7.6</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] tabular-nums">7.2</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-semibold tabular-nums">7.3</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);

/**
 * The moat leaderboard's two explained columns — verbatim the copy the portal
 * ships. A short definition is the norm; the Overall board's two-paragraph
 * panels are the exception, not the pattern.
 */
export const MoatBoardHeader = () => (
  <div className="rounded-xl border border-border/60 bg-background/70 p-1">
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-b border-border/35">
          <TableHead className={`${HEAD_CLASS} w-10`}>#</TableHead>
          <TableHead className={HEAD_CLASS}>Company</TableHead>
          <TableHead className={HEAD_CLASS}>
            <span className="inline-flex items-center gap-1">
              Strength
              <ColumnInfo label="Strength">
                <p>Sub-grade within the moat rating (Strong / Mid / Weak).</p>
              </ColumnInfo>
            </span>
          </TableHead>
          <TableHead className={HEAD_CLASS}>
            <span className="inline-flex items-center gap-1">
              Active sources
              <ColumnInfo label="Active sources">
                <p>Moat sources where the company shows presence, out of the total assessed.</p>
              </ColumnInfo>
            </span>
          </TableHead>
          <TableHead className={HEAD_CLASS}>Cycle-tested</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="border-b border-border/25">
          <TableCell className="px-3 py-2.5 text-[12px] tabular-nums text-muted-foreground">1</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-medium">Neuland Laboratories</TableCell>
          <TableCell className="px-3 py-2.5 text-[12px]">Strong</TableCell>
          <TableCell className="px-3 py-2.5 text-[12px] tabular-nums">4 of 7</TableCell>
          <TableCell className="px-3 py-2.5 text-[12px] text-muted-foreground">Yes — FY20 cycle</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="px-3 py-2.5 text-[12px] tabular-nums text-muted-foreground">2</TableCell>
          <TableCell className="px-3 py-2.5 text-[13px] font-medium">MTAR Technologies</TableCell>
          <TableCell className="px-3 py-2.5 text-[12px]">Mid</TableCell>
          <TableCell className="px-3 py-2.5 text-[12px] tabular-nums">2 of 7</TableCell>
          <TableCell className="px-3 py-2.5 text-[12px] text-muted-foreground">Not yet</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);

/**
 * The affordance on its own, at the size it really occupies: a 12px glyph with
 * an invisible ~44px tap target around it. The panel is a portalled Popover —
 * it exists only while open, so no static render can show it.
 */
export const TriggerAnatomy = () => (
  <div className="space-y-4">
    <div className="flex items-baseline gap-1 rounded-xl border border-border/60 bg-background/70 px-3 py-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
        Valuation
      </span>
      <ColumnInfo label="Valuation">
        <p>
          Price read, 0–10, where higher is more attractively valued — a lens on the current price,
          independent of the ConcallScore.
        </p>
      </ColumnInfo>
    </div>
    <p className="text-[11px] leading-relaxed text-muted-foreground">
      The glyph is 12px; the click/tap target is a centred ~40px pseudo-element that costs no
      layout, so seven of these don&apos;t push a desktop board into horizontal scroll. Clicking it
      opens a Popover panel with the column&apos;s definition — the panel is portalled, so it never
      gets clipped by the board&apos;s <code>overflow-x-auto</code> container.
    </p>
  </div>
);
