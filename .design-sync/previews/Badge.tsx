import { Badge, Separator } from "concall-alpha";
import { AlertTriangle, Clock, FileText, Sparkles } from "lucide-react";

// Badge is the portal's small qualifier: quarter tags, provenance, framework
// version, moat width. Colour on this portal is reserved for section tones and
// score bands, so most production badges lean on the neutral variants — see
// components/concall-score.tsx and top-strategies-display.tsx.

export const Variants = () => (
  <div className="flex flex-col gap-4">
    {(
      [
        ["default", "Q1 FY27"],
        ["secondary", "Official transcript"],
        ["destructive", "Guidance missed"],
        ["outline", "v14 framework"],
      ] as const
    ).map(([variant, text]) => (
      <div key={variant} className="flex items-center gap-4">
        <span className="w-24 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {variant}
        </span>
        <Badge variant={variant}>{text}</Badge>
      </div>
    ))}
  </div>
);

export const SectionHeaderPills = () => (
  <div className="w-full max-w-[34rem] rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="mr-1 text-lg font-semibold">Moat Analysis</h3>
      <Badge variant="secondary">NARROW</Badge>
      <Badge variant="outline">v14</Badge>
      <Badge variant="outline">Q1 FY27</Badge>
    </div>
    <p className="mt-2 text-sm text-muted-foreground">
      Durability of the earnings stream, assessed against the v14 framework.
    </p>
    <Separator className="my-4" />
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">Switching costs</Badge>
      <Badge variant="secondary">Scale economics</Badge>
      <Badge variant="outline">No network effect</Badge>
    </div>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Badge variant="secondary">
      <FileText />
      Transcript + PPT
    </Badge>
    <Badge variant="outline">
      <Clock />
      Priced 4 days ago
    </Badge>
    <Badge>
      <Sparkles />
      New · 24h
    </Badge>
    <Badge variant="destructive">
      <AlertTriangle />
      Unofficial
    </Badge>
  </div>
);

export const InABoardRow = () => (
  <div className="w-full max-w-xl rounded-xl border bg-card">
    {[
      { name: "Neuland Laboratories", quarter: "Q1 FY27", tags: [["default", "8.2"] as const, ["secondary", "Official"] as const] },
      { name: "MTAR Technologies", quarter: "Q1 FY27", tags: [["default", "6.8"] as const, ["outline", "Unofficial"] as const] },
      { name: "Solara Active Pharma", quarter: "Q4 FY26", tags: [["destructive", "4.3"] as const, ["outline", "Below cut"] as const] },
    ].map((row, i) => (
      <div key={row.name}>
        {i > 0 ? <Separator /> : null}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.quarter}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {row.tags.map(([variant, text]) => (
              <Badge key={text} variant={variant}>
                {text}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    ))}
  </div>
);
