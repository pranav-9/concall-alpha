import { ChevronDown } from "lucide-react";

type SectionTone = "sky" | "emerald" | "amber" | "violet" | "rose" | "slate";

interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  headerDescription?: React.ReactNode;
  headerPills?: string[];
  collapsible?: boolean;
  defaultOpen?: boolean;
  tone?: SectionTone;
}

const SECTION_TONE_BY_ID: Record<string, SectionTone> = {
  "industry-context": "sky",
  "business-overview": "emerald",
  "key-variables": "violet",
  "sentiment-score": "amber",
  "future-growth": "sky",
  "guidance-history": "amber",
  "community": "rose",
};

const TONE_CLASSES: Record<
  SectionTone,
  {
    shell: string;
    accent: string;
    glow: string;
  }
> = {
  sky: {
    shell: "border-sky-200/60 bg-sky-50/20 dark:border-sky-700/35 dark:bg-sky-950/20",
    accent: "bg-sky-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_42%)]",
  },
  emerald: {
    shell:
      "border-emerald-200/60 bg-emerald-50/20 dark:border-emerald-700/35 dark:bg-emerald-950/20",
    accent: "bg-emerald-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.14),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.18),_transparent_42%)]",
  },
  amber: {
    shell: "border-amber-200/55 bg-amber-50/16 dark:border-amber-700/30 dark:bg-amber-950/16",
    accent: "bg-amber-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.09),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.11),_transparent_42%)]",
  },
  violet: {
    shell:
      "border-violet-200/60 bg-violet-50/20 dark:border-violet-700/35 dark:bg-violet-950/20",
    accent: "bg-violet-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(167,139,250,0.14),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(167,139,250,0.18),_transparent_42%)]",
  },
  rose: {
    shell: "border-rose-200/60 bg-rose-50/20 dark:border-rose-700/35 dark:bg-rose-950/20",
    accent: "bg-rose-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(251,113,133,0.14),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(251,113,133,0.18),_transparent_42%)]",
  },
  slate: {
    shell: "border-border/70 bg-card",
    accent: "bg-muted-foreground",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.12),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.10),_transparent_42%)]",
  },
};

export function SectionCard({
  id,
  title,
  children,
  className = "",
  headerAction,
  headerDescription,
  headerPills = [],
  collapsible = false,
  defaultOpen = true,
  tone,
}: SectionCardProps) {
  const resolvedTone = tone ?? SECTION_TONE_BY_ID[id] ?? "slate";
  const toneClasses = TONE_CLASSES[resolvedTone];

  if (collapsible) {
    return (
      <details
        id={id}
        className={`group relative scroll-mt-40 overflow-hidden rounded-[1.4rem] border p-4 ${toneClasses.shell} ${className}`}
        style={{
          scrollMarginTop:
            "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
        }}
        open={defaultOpen ? true : undefined}
      >
        <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 transition-colors group-hover:text-foreground">
            <p className="min-w-0 flex-1 text-lg lg:text-lg font-bold text-foreground !leading-tight">
              {title}
            </p>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {headerAction ? (
                <div className="hidden text-[11px] text-muted-foreground group-open:block">
                  {headerAction}
                </div>
              ) : null}
              <div className="flex items-center">
                <span className="text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground/80 group-open:hidden">
                  Open analysis
                </span>
                <span className="hidden text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground/80 group-open:inline">
                  Hide details
                </span>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/35 text-muted-foreground transition-colors group-hover:bg-muted/50 group-hover:text-foreground/80">
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </div>
            </div>
          </div>
        </summary>
        <div className={`pointer-events-none absolute inset-0 ${toneClasses.glow}`} />
        <div className={`absolute inset-x-0 top-0 h-1 ${toneClasses.accent}`} />
        <div className="mt-3 border-b border-border/60 group-open:block"></div>
        <div className="pt-3">{children}</div>
      </details>
    );
  }

  return (
    <div
      id={id}
      className={`group relative scroll-mt-40 overflow-hidden rounded-[1.4rem] border p-4 ${toneClasses.shell} ${className}`}
      style={{
        scrollMarginTop:
            "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      <div className={`pointer-events-none absolute inset-0 ${toneClasses.glow}`} />
      <div className={`absolute inset-x-0 top-0 h-1 ${toneClasses.accent}`} />
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-lg lg:text-lg font-bold text-foreground !leading-tight">
                {title}
            </p>
            {headerDescription ? (
              <p className="text-[13px] leading-snug text-foreground/82">
                {headerDescription}
              </p>
            ) : null}
          </div>
          {headerAction}
          </div>
          {headerPills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {headerPills.map((pill) => (
                <span
                  key={`${id}-${pill}`}
                  className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                >
                  {pill}
                </span>
              ))}
            </div>
          )}
          <div className="border-b border-border"></div>
          {children}
        </div>
      </div>
  );
}
