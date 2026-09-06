import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionFeedbackButton } from "./section-feedback-button";
import { SectionHelpfulnessFooter } from "./section-helpfulness-footer";

type SectionTone = "sky" | "emerald" | "amber" | "violet" | "rose" | "slate";

/**
 * Every section header is the same two things: the title on the left and the
 * last-updated date on the right. Render the date through this so the
 * typography matches across sections.
 */
export function SectionUpdatedAt({ date }: { date: string | null | undefined }) {
  if (!date) return null;
  return (
    <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
      {date}
    </span>
  );
}

interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Right-hand slot — the last-updated date (use SectionUpdatedAt). */
  headerAction?: React.ReactNode;
  feedbackEnabled?: boolean;
  feedbackCompanyCode?: string;
  feedbackCompanyName?: string | null;
  helpfulnessEnabled?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  tone?: SectionTone;
}

const SECTION_TONE_BY_ID: Record<string, SectionTone> = {
  "industry-context": "sky",
  "sub-sector": "sky",
  "business-overview": "emerald",
  "moat-analysis": "emerald",
  "key-variables": "violet",
  "sentiment-score": "amber",
  "future-growth": "sky",
  "walk-the-talk": "emerald",
  "guidance-history": "amber",
  "valuation-check": "violet",
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
    shell: "border-sky-200/55 bg-sky-50/20 dark:border-sky-700/30 dark:bg-sky-950/18",
    accent: "bg-sky-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.16),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.20),_transparent_40%)]",
  },
  emerald: {
    shell:
      "border-emerald-200/55 bg-emerald-50/20 dark:border-emerald-700/30 dark:bg-emerald-950/18",
    accent: "bg-emerald-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.16),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.20),_transparent_40%)]",
  },
  amber: {
    shell: "border-amber-200/55 bg-amber-50/20 dark:border-amber-700/30 dark:bg-amber-950/18",
    accent: "bg-amber-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.12),_transparent_44%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.14),_transparent_44%)]",
  },
  violet: {
    shell:
      "border-violet-200/55 bg-violet-50/20 dark:border-violet-700/30 dark:bg-violet-950/18",
    accent: "bg-violet-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(167,139,250,0.16),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(167,139,250,0.20),_transparent_40%)]",
  },
  rose: {
    shell: "border-rose-200/55 bg-rose-50/20 dark:border-rose-700/30 dark:bg-rose-950/18",
    accent: "bg-rose-500",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(251,113,133,0.16),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(251,113,133,0.20),_transparent_40%)]",
  },
  slate: {
    shell: "border-border/70 bg-card/95 dark:bg-card/90",
    accent: "bg-muted-foreground",
    glow:
      "bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.12),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(148,163,184,0.10),_transparent_40%)]",
  },
};

const CARD_SHELL =
  "group relative scroll-mt-40 overflow-hidden rounded-[1.55rem] border shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm";

/** Sticky navbar + company tabs clearance for anything targeted by a hash. */
export const SCROLL_MARGIN_TOP =
  "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)";

export function SectionCard({
  id,
  title,
  children,
  className = "",
  headerAction,
  feedbackEnabled = false,
  feedbackCompanyCode,
  feedbackCompanyName,
  helpfulnessEnabled = feedbackEnabled,
  collapsible = false,
  defaultOpen = true,
  tone,
}: SectionCardProps) {
  const resolvedTone = tone ?? SECTION_TONE_BY_ID[id] ?? "slate";
  const toneClasses = TONE_CLASSES[resolvedTone];
  const shellClassName = cn(CARD_SHELL, toneClasses.shell, className);
  const feedbackAction =
    feedbackEnabled && feedbackCompanyCode ? (
      <SectionFeedbackButton
        companyCode={feedbackCompanyCode}
        companyName={feedbackCompanyName}
        sectionId={id}
        sectionTitle={title}
      />
    ) : null;
  const helpfulnessFooter =
    helpfulnessEnabled && feedbackCompanyCode && id !== "community" ? (
      <SectionHelpfulnessFooter
        companyCode={feedbackCompanyCode}
        companyName={feedbackCompanyName}
        sectionId={id}
        sectionTitle={title}
        action={feedbackAction}
      />
    ) : null;
  // "Improve this section" lives in the footer next to "Was this section
  // helpful?"; it only falls back to the header when there is no footer.
  const headerFeedbackAction = helpfulnessFooter ? null : feedbackAction;

  const header = (
    <div className="relative flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", toneClasses.accent)} />
        <p className="min-w-0 text-lg font-bold leading-tight text-foreground">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
        {headerAction}
        {headerFeedbackAction}
      </div>
    </div>
  );

  if (collapsible) {
    return (
      <details
        id={id}
        className={shellClassName}
        style={{
          scrollMarginTop: SCROLL_MARGIN_TOP,
        }}
        open={defaultOpen ? true : undefined}
      >
        <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
          <div className="relative p-3 sm:p-5">
            <div className={`pointer-events-none absolute inset-0 ${toneClasses.glow}`} />
            <div className={`absolute inset-x-0 top-0 h-1 ${toneClasses.accent}`} />
            <div className="relative flex flex-wrap items-center justify-between gap-3 transition-colors group-hover:text-foreground">
              <p className="min-w-0 flex-1 text-lg font-bold leading-tight text-foreground">{title}</p>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {headerAction || headerFeedbackAction ? (
                  <div className="hidden flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground sm:flex group-open:flex">
                    {headerAction}
                    {headerFeedbackAction}
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground/80 group-open:hidden">
                    Open analysis
                  </span>
                  <span className="hidden text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground/80 group-open:inline">
                    Hide details
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:text-foreground/80 group-open:rotate-180" />
                </div>
              </div>
            </div>
          </div>
        </summary>
        <div className="relative border-t border-border/45 p-3 pt-3 sm:p-5 sm:pt-4">
          <div className={`pointer-events-none absolute inset-0 ${toneClasses.glow}`} />
          <div className={`absolute inset-x-0 top-0 h-1 ${toneClasses.accent}`} />
          <div className="relative flex flex-col gap-4">
            <div>{children}</div>
            {helpfulnessFooter}
          </div>
        </div>
      </details>
    );
  }

  return (
    <div
      id={id}
      className={shellClassName}
      style={{
        scrollMarginTop: SCROLL_MARGIN_TOP,
      }}
    >
      <div className="relative p-3 sm:p-5">
        <div className={`pointer-events-none absolute inset-0 ${toneClasses.glow}`} />
        <div className={`absolute inset-x-0 top-0 h-1 ${toneClasses.accent}`} />
        <div className="relative flex flex-col gap-4">
          {header}
          <div className="border-b border-border/70" />
          <div>{children}</div>
          {helpfulnessFooter}
        </div>
      </div>
    </div>
  );
}
