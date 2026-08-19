import { Separator } from "concall-alpha";

// Separator is the hairline the company page uses to break a header from its
// body and to divide the meta line above a section. It is bg-border only —
// never a heavier rule, and never coloured.

export const CompanyHeader = () => (
  <div className="w-full max-w-[34rem] rounded-xl border bg-card p-5">
    <h3 className="text-lg font-semibold">Neuland Laboratories</h3>
    <p className="text-sm text-muted-foreground">
      Pharma &amp; CDMO · NSE: NEULANDLAB · Small cap at admission
    </p>
    <Separator className="my-4" />
    <p className="text-sm leading-relaxed text-muted-foreground">
      Q1 FY27 read of 8.2, up 0.6 on the quarter. The CDMO block is now the
      swing factor for the next four quarters rather than volume growth in the
      base API business.
    </p>
  </div>
);

export const VerticalMeta = () => (
  <div className="w-full max-w-[34rem] space-y-4">
    <div className="flex h-5 items-center gap-3 text-xs text-muted-foreground">
      <span>Q1 FY27</span>
      <Separator orientation="vertical" />
      <span>Scored 24 Jul 2026</span>
      <Separator orientation="vertical" />
      <span>Official transcript</span>
      <Separator orientation="vertical" />
      <span className="tabular-nums">Read 8.2</span>
    </div>
    <p className="text-xs text-muted-foreground">
      Vertical orientation needs a height on the parent — here a flex row at h-5.
    </p>
  </div>
);

export const ListDividers = () => (
  <div className="w-full max-w-lg rounded-xl border bg-card">
    {[
      { name: "Neuland Laboratories", sector: "Pharma & CDMO", score: "8.2" },
      { name: "MTAR Technologies", sector: "Capital Goods", score: "6.8" },
      { name: "HFCL", sector: "Telecom Equipment", score: "5.9" },
      { name: "Pricol", sector: "Auto Ancillaries", score: "5.4" },
    ].map((row, i) => (
      <div key={row.name}>
        {i > 0 ? <Separator /> : null}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.sector}</p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{row.score}</span>
        </div>
      </div>
    ))}
  </div>
);
