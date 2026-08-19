import { Avatar, AvatarFallback, AvatarImage, Separator } from "concall-alpha";

// Avatar carries a company mark on list rows. Most covered mid/small caps have
// no usable logo asset, so the initials fallback is the state the portal
// actually renders — always author the fallback, image or not.

const mark = (initials: string, bg: string) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="12" fill="${bg}"/>` +
      `<text x="32" y="42" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" ` +
      `font-size="26" font-weight="700" fill="#ffffff">${initials}</text></svg>`,
  );

export const Initials = () => (
  <div className="flex items-center gap-5">
    {[
      { initials: "NL", name: "Neuland Laboratories" },
      { initials: "MT", name: "MTAR Technologies" },
      { initials: "PR", name: "Pricol" },
      { initials: "HF", name: "HFCL" },
    ].map((c) => (
      <div key={c.initials} className="flex flex-col items-center gap-2">
        <Avatar>
          <AvatarFallback className="text-xs font-semibold">{c.initials}</AvatarFallback>
        </Avatar>
        <span className="text-[11px] text-muted-foreground">{c.name}</span>
      </div>
    ))}
  </div>
);

export const WithImage = () => (
  <div className="flex items-center gap-6">
    <div className="flex flex-col items-center gap-2">
      <Avatar className="h-12 w-12">
        <AvatarImage src={mark("NL", "#0f766e")} alt="Neuland Laboratories" />
        <AvatarFallback className="text-sm font-semibold">NL</AvatarFallback>
      </Avatar>
      <span className="text-[11px] text-muted-foreground">Image resolves</span>
    </div>
    <Separator orientation="vertical" className="h-16" />
    <div className="flex flex-col items-center gap-2">
      <Avatar className="h-12 w-12">
        <AvatarImage src="/logos/solara.png" alt="Solara Active Pharma" />
        <AvatarFallback className="text-sm font-semibold">SO</AvatarFallback>
      </Avatar>
      <span className="text-[11px] text-muted-foreground">Missing asset → fallback</span>
    </div>
  </div>
);

export const Sizes = () => (
  <div className="flex items-end gap-5">
    {[
      { cls: "h-6 w-6", label: "24", text: "text-[10px]" },
      { cls: "size-8", label: "32 (default)", text: "text-xs" },
      { cls: "size-10", label: "40", text: "text-sm" },
      { cls: "h-12 w-12", label: "48", text: "text-base" },
    ].map((s) => (
      <div key={s.label} className="flex flex-col items-center gap-2">
        <Avatar className={s.cls}>
          <AvatarFallback className={`${s.text} font-semibold`}>FF</AvatarFallback>
        </Avatar>
        <span className="text-[11px] text-muted-foreground">{s.label}</span>
      </div>
    ))}
  </div>
);

export const InAList = () => (
  <div className="w-full max-w-lg rounded-xl border bg-card">
    {[
      { initials: "NL", name: "Neuland Laboratories", sector: "Pharma & CDMO", score: "8.2", bg: "#0f766e" },
      { initials: "MT", name: "MTAR Technologies", sector: "Capital Goods", score: "6.8", bg: "#1d4ed8" },
      { initials: "FF", name: "Fedbank Financial", sector: "NBFC", score: "6.1", bg: "#9333ea" },
      { initials: "SO", name: "Solara Active Pharma", sector: "Pharma & CDMO", score: "4.3", bg: "#b45309" },
    ].map((row, i) => (
      <div key={row.initials}>
        {i > 0 ? <Separator /> : null}
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar>
            <AvatarImage src={mark(row.initials, row.bg)} alt={row.name} />
            <AvatarFallback className="text-xs font-semibold">{row.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">{row.sector}</p>
          </div>
          <span className="ml-auto text-sm font-semibold tabular-nums">{row.score}</span>
        </div>
      </div>
    ))}
  </div>
);
