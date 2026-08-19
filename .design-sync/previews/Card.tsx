import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "concall-alpha";

// Card is the portal's generic container. It shows up in three shapes:
// a company summary (header + action + body + footer), a bare frame that
// only exists to host a chart (`bg-transparent border-0 shadow-none`, see
// app/company/[code]/chart.tsx), and the auth forms. Section content on the
// company page uses SectionCard instead — reach for Card when there is no
// analysis section to title.

export const CompanySummary = () => (
  <Card className="max-w-lg">
    <CardHeader className="border-b">
      <CardTitle className="text-lg">Neuland Laboratories</CardTitle>
      <CardDescription>
        NEULANDLAB · Pharmaceuticals · CDMO + generic drug substances
      </CardDescription>
      <CardAction>
        <Button variant="outline" size="sm">
          Open company
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-2xl font-semibold tabular-nums">8.2</div>
          <div className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
            Strongly Bullish
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Q1 FY27 ConcallScore
          </div>
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">7.6</div>
          <div className="text-[11px] font-medium text-teal-700 dark:text-teal-300">
            Bullish
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Trailing 4 quarters
          </div>
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">#3</div>
          <div className="text-[11px] font-medium text-muted-foreground">
            of 100 covered
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Overall read rank
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Management framed the CDMO ramp as the swing factor for the next four
        quarters rather than volume growth in the base business. Two commercial
        molecules moved to validation batches; the peptide block is still
        pre-revenue.
      </p>
    </CardContent>
    <CardFooter className="justify-between border-t text-xs text-muted-foreground">
      <span>Scored 12 Aug 2026 · official transcript</span>
      <Badge variant="secondary">Moat v14</Badge>
    </CardFooter>
  </Card>
);

export const StatCards = () => (
  <div className="grid grid-cols-3 gap-4">
    {[
      { value: "100", label: "Companies covered", sub: "Mid and small cap only" },
      { value: "1,284", label: "Transcripts scored", sub: "Since FY22" },
      { value: "38", label: "Reported this week", sub: "Q1 FY27 season" },
    ].map((stat) => (
      <Card key={stat.label} className="gap-2 py-5">
        <CardHeader className="px-5">
          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.09em]">
            {stat.label}
          </CardDescription>
          <CardTitle className="text-3xl tabular-nums">{stat.value}</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <p className="text-xs text-muted-foreground">{stat.sub}</p>
        </CardContent>
      </Card>
    ))}
  </div>
);

// The chart frame the company page actually uses: the Card keeps the spacing
// rhythm but drops border, background and shadow so the chart sits directly
// on the page ground.
export const ChartFrame = () => (
  <Card className="w-full max-w-2xl border-0 bg-transparent shadow-none">
    <CardHeader className="px-0">
      <CardTitle className="text-base">ConcallScore history</CardTitle>
      <CardDescription>MTAR Technologies · last eight quarters</CardDescription>
    </CardHeader>
    <CardContent className="px-0 pt-0">
      <div className="flex items-end gap-3">
        {[
          { q: "Q2 FY25", v: 5.4 },
          { q: "Q3 FY25", v: 5.9 },
          { q: "Q4 FY25", v: 6.2 },
          { q: "Q1 FY26", v: 5.8 },
          { q: "Q2 FY26", v: 6.6 },
          { q: "Q3 FY26", v: 7.0 },
          { q: "Q4 FY26", v: 6.8 },
          { q: "Q1 FY27", v: 7.3 },
        ].map((point) => (
          <div key={point.q} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {point.v.toFixed(1)}
            </span>
            <div
              className="w-full rounded-sm bg-teal-500"
              style={{ height: `${point.v * 22}px` }}
            />
            <span className="text-[10px] text-muted-foreground">{point.q}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export const SignInForm = () => (
  <Card className="max-w-sm">
    <CardHeader>
      <CardTitle className="text-lg">Sign in</CardTitle>
      <CardDescription>
        Save companies to a watchlist and get an email when a covered name
        reports.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="card-preview-email">Email</Label>
        <Input
          id="card-preview-email"
          type="email"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="card-preview-password">Password</Label>
        <Input id="card-preview-password" type="password" />
      </div>
      <Button className="w-full">Sign in</Button>
    </CardContent>
    <CardFooter className="justify-center border-t text-xs text-muted-foreground">
      No card required. Coverage is free while we build.
    </CardFooter>
  </Card>
);

export const EmptyState = () => (
  <Card className="max-w-md">
    <CardHeader>
      <CardTitle className="text-base">Valuation Check</CardTitle>
      <CardDescription>Solara Active Pharma Sciences</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm leading-relaxed text-muted-foreground">
        No verdict is shown. The last price-and-multiple read is older than four
        days, and a stale valuation is worse than none — it will reappear after
        the next refresh.
      </p>
    </CardContent>
    <CardFooter>
      <Button variant="outline" size="sm" disabled>
        Awaiting refresh
      </Button>
    </CardFooter>
  </Card>
);
