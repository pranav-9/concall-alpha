import type { CSSProperties } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { NormalizedAboutCompany } from "@/lib/business-snapshot/types";
import type { BusinessFact, ChangeStat, ProfileSource } from "@/lib/business-snapshot/profile";
import { elevatedBlockClass } from "./surface-tokens";
import { SCROLL_MARGIN_TOP } from "./section-card";
import { FactMetricBar, formatMetric } from "./fact-metric-bar";

const labelBase = "text-[11px] font-semibold uppercase tracking-[0.14em]";
// text-foreground/60, not text-muted-foreground: this small text now sits on the section wash and the
// change half's tint, where the muted token measures just under AA (4.5:1) in the light theme.
const quietClass = "text-foreground/60";
const labelClass = `${labelBase} ${quietClass}`;
const changeLabelClass = `${labelBase} text-emerald-700 dark:text-emerald-400/80`;
const copyClass = "text-sm leading-relaxed text-foreground/85";
const panelClass = "flex min-w-0 flex-col p-5 sm:px-6";
const headlineClass = "mt-3 text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-[22px]";
const panelCopyClass = "text-[13px] leading-relaxed text-foreground/70";
const disclosureClass = "group inline-block max-w-full";
const summaryClass = "inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-foreground/60 underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden";
const anchorStyle = { scrollMarginTop: SCROLL_MARGIN_TOP };

function Sources({ sources }: { sources: ProfileSource[] }) {
  return (
    <details className={disclosureClass}>
      <summary className={summaryClass}>
        {sources.length === 1 ? "Source" : `Sources (${sources.length})`}
        <ChevronDown className="h-3 w-3 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <ul className="space-y-2 pb-1 text-xs leading-relaxed">
        {sources.map((source, index) => (
          <li key={`${source.url}-${index}`}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="break-words text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {source.label}{source.locator ? ` · ${source.locator}` : ""}
              <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function FactGrid({ facts }: { facts: BusinessFact[] }) {
  return (
    <dl className="grid gap-x-8 sm:grid-cols-2">
      {facts.map((fact, index) => (
        <div key={`${fact.category}-${index}`} className="min-w-0 border-t border-border/35 py-4">
          <dt className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-foreground">{fact.title}</span>
            <span className="text-xs text-muted-foreground">{fact.period}</span>
          </dt>
          <dd className="mt-1.5">
            <p className={`${copyClass} break-words`}>{fact.text}</p>
            {fact.metrics && fact.metrics.length === 1 ? (
              <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
                {formatMetric(fact.metrics[0])}
                <span className="ml-2 text-xs font-medium text-muted-foreground">{fact.metrics[0].label}</span>
              </p>
            ) : fact.metrics && fact.metrics.length >= 2 ? (
              <FactMetricBar metrics={fact.metrics} />
            ) : null}
            <Sources sources={fact.sources} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

// One side of a "from to" period: FY24, H1 FY26, 9M FY26, March 2026, 30 June, 11 August 2026.
const PERIOD_SIDE = /^(?:(?:[HQ][1-4]|[1-9]M)\s+)?FY\s?\d{2,4}$|^(?:\d{1,2}\s+)?[A-Za-z]+\s+\d{4}$|^\d{1,2}\s+[A-Za-z]+$/i;

// The change's headline number with its caption ("defence share, FY22 → FY26").
// The number is the producer's own string; only the sign glyph and the unit are
// dressed here. Emerald is the panel's accent, not a verdict, so a negative number
// is drawn neutral rather than green. "FY24 to H1 FY26" reads as a range only when
// both sides are periods ("Up to FY26" is not one); any other period is as written.
function ChangeStatBlock({ stat, period }: { stat: ChangeStat; period: string }) {
  const [from, to, ...rest] = period.split(/\s+to\s+/i);
  const range = to !== undefined && rest.length === 0 && PERIOD_SIDE.test(from) && PERIOD_SIDE.test(to) ? { from, to } : null;
  const negative = stat.value.startsWith("-");
  const tight = stat.unit === "%" || stat.unit === "x";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <p className={`flex shrink-0 items-baseline ${tight ? "" : "gap-1"} ${negative ? "text-foreground" : "text-emerald-700 dark:text-emerald-400/80"}`}>
        <span className="text-[26px] font-bold leading-none tracking-tighter tabular-nums">{stat.value.replace(/^-/, "−")}</span>
        {stat.unit ? <span className="text-[13px] font-semibold">{stat.unit === "x" ? "×" : stat.unit}</span> : null}
      </p>
      <p className={`max-w-[9.5rem] break-words text-xs leading-snug ${quietClass}`}>
        {stat.label},{" "}
        <span className="inline-block">
          {range ? (
            <>
              {range.from}
              <span aria-hidden> → </span>
              <span className="sr-only"> to </span>
              {range.to}
            </>
          ) : period}
        </span>
      </p>
    </div>
  );
}

export function BusinessCompanyBackground({
  about,
  headline,
  supportingText,
}: {
  about: NormalizedAboutCompany | null;
  headline: string | null;
  supportingText: string | null;
}) {
  const intro = about?.intro;
  const change = about?.change;
  const mainText = headline ?? intro ?? supportingText;
  const moreText = supportingText && supportingText !== mainText && supportingText !== intro
    ? supportingText : null;
  const timeline = about?.timeline ?? [];
  const facts = about?.facts ?? [];

  return (
    <>
      {mainText || change ? (
        <div className={`${elevatedBlockClass} grid min-w-0 overflow-hidden ${mainText && change ? "lg:grid-cols-2" : ""}`}>
          {mainText ? (
            <div id="business-overview-about" style={anchorStyle} className={panelClass}>
              <p className={labelClass}>The business</p>
              <h3 className={headlineClass}>{mainText}</h3>
              {intro && intro !== mainText ? <p className={`mt-3 ${panelCopyClass}`}>{intro}</p> : null}
              {moreText ? (
                <details className="group/about mt-auto pt-4">
                  <summary className={summaryClass}>
                    <span className="group-open/about:hidden">More about the business</span>
                    <span className="hidden group-open/about:inline">Show less</span>
                    <ChevronDown className="h-3 w-3 transition-transform group-open/about:rotate-180 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <p className={`mt-2 ${panelCopyClass}`}>{moreText}</p>
                </details>
              ) : null}
            </div>
          ) : null}
          {change ? (
            <div className={`${panelClass} bg-emerald-500/[0.06] dark:bg-emerald-400/5 ${mainText ? "border-t border-emerald-500/25 dark:border-emerald-400/25 lg:border-l lg:border-t-0" : ""}`}>
              <p className={changeLabelClass}>What is changing?</p>
              <h3 className={headlineClass}>{change.headline}</h3>
              <p className={`mt-3 ${panelCopyClass}`}>{change.text}</p>
              {/* Bottom-aligned while the source list is shut; top-aligned once it opens, so the number doesn't ride down with it. */}
              <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-4 has-[details[open]]:items-start">
                {change.stat
                  ? <ChangeStatBlock stat={change.stat} period={change.period} />
                  : <p className={`inline-flex min-h-8 min-w-0 items-center break-words text-xs ${quietClass}`}>{change.period}</p>}
                <Sources sources={change.sources} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {timeline.length > 0 ? (
        <section id="business-overview-timeline" style={anchorStyle} aria-labelledby="business-timeline-heading" className="pt-3">
          <p className={labelClass}>How it got here</p>
          <h3 id="business-timeline-heading" className="mt-1 text-base font-semibold text-foreground">Company timeline</h3>
          <ol className="ml-2 mt-6 grid lg:ml-0 lg:grid-cols-[repeat(var(--milestone-count),minmax(0,1fr))]" style={{ "--milestone-count": timeline.length } as CSSProperties}>
            {timeline.map((event, index) => (
              <li key={`${event.year}-${index}`} className="relative min-w-0 border-l border-border/60 pb-5 pl-5 last:pb-0 lg:border-l-0 lg:border-t lg:pb-0 lg:pl-0 lg:pr-4 lg:pt-5">
                <span aria-hidden className={`absolute -left-[6.5px] top-[5px] h-3 w-3 rounded-full border-2 border-emerald-600 dark:border-emerald-400/80 lg:-top-[6.5px] lg:left-0 ${index === timeline.length - 1 ? "bg-emerald-600 dark:bg-emerald-400/80" : "bg-background"}`} />
                <p className="text-[17px] font-bold leading-tight tracking-tight tabular-nums text-foreground">{event.year}</p>
                <p className="mt-1 break-words text-[13px] leading-snug text-foreground/70">{event.title}</p>
                {event.detail ? <p className={`mt-2 break-words text-xs leading-relaxed ${quietClass}`}>{event.detail}</p> : null}
                <Sources sources={event.sources} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {facts.length > 0 ? (
        <section id="business-overview-profile" style={anchorStyle} aria-labelledby="business-profile-heading" className={`${elevatedBlockClass} p-4 sm:p-5`}>
          <p className={labelClass}>Business profile</p>
          <h3 id="business-profile-heading" className="mb-3 mt-1 text-base font-semibold text-foreground">The facts behind the business</h3>
          <FactGrid facts={facts.slice(0, 4)} />
          {facts.length > 4 ? (
            <details>
              <summary className={summaryClass}>More business facts ({facts.length - 4})</summary>
              <FactGrid facts={facts.slice(4)} />
            </details>
          ) : null}
        </section>
      ) : null}

      {about?.hasInvalidProfile ? <p className="px-1 text-xs text-muted-foreground">Some company background details are temporarily unavailable.</p> : null}
    </>
  );
}
