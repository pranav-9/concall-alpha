import type { CSSProperties } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { NormalizedAboutCompany } from "@/lib/business-snapshot/types";
import type { BusinessFact, ProfileSource } from "@/lib/business-snapshot/profile";
import { elevatedBlockClass } from "./surface-tokens";
import { SCROLL_MARGIN_TOP } from "./section-card";

const labelClass = "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
const copyClass = "text-sm leading-relaxed text-foreground/85";
const disclosureClass = "group inline-block max-w-full";
const summaryClass = "inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden";
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
            <Sources sources={fact.sources} />
          </dd>
        </div>
      ))}
    </dl>
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
        <div className={`grid gap-3 ${mainText && change ? "lg:grid-cols-[1.15fr_1fr]" : ""}`}>
          {mainText ? (
            <div id="business-overview-about" style={anchorStyle} className={`${elevatedBlockClass} min-w-0 p-4 sm:p-5`}>
              <p className={labelClass}>The business</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">{mainText}</h3>
              {intro && intro !== mainText ? <p className={`mt-3 ${copyClass}`}>{intro}</p> : null}
              {moreText ? (
                <details className="group/about mt-3">
                  <summary className={summaryClass}>
                    <span className="group-open/about:hidden">More about the business</span>
                    <span className="hidden group-open/about:inline">Show less</span>
                    <ChevronDown className="h-3 w-3 transition-transform group-open/about:rotate-180 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <p className={`mt-2 ${copyClass}`}>{moreText}</p>
                </details>
              ) : null}
            </div>
          ) : null}
          {change ? (
            <div className={`${elevatedBlockClass} min-w-0 border-t-2 border-t-emerald-500/70 p-4 sm:p-5`}>
              <p className={labelClass}>What is changing?</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl">{change.headline}</h3>
              <p className={`mt-3 ${copyClass}`}>{change.text}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-xs text-muted-foreground">{change.period}</p>
                <Sources sources={change.sources} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {timeline.length > 0 ? (
        <section id="business-overview-timeline" style={anchorStyle} aria-labelledby="business-timeline-heading" className={`${elevatedBlockClass} p-4 sm:p-5`}>
          <p className={labelClass}>How it got here</p>
          <h3 id="business-timeline-heading" className="mt-1 text-base font-semibold text-foreground">Company timeline</h3>
          <ol className="ml-1 mt-5 grid lg:ml-0 lg:grid-cols-[repeat(var(--milestone-count),minmax(0,1fr))]" style={{ "--milestone-count": timeline.length } as CSSProperties}>
            {timeline.map((event, index) => (
              <li key={`${event.year}-${index}`} className="relative min-w-0 border-l border-border/60 pb-5 pl-5 last:pb-0 lg:border-l-0 lg:border-t lg:pb-0 lg:pl-0 lg:pr-4 lg:pt-5">
                <span aria-hidden className={`absolute -left-[5px] top-1.5 h-[9px] w-[9px] rounded-full border-2 border-emerald-600 dark:border-emerald-400 lg:-top-[5px] lg:left-0 ${index === timeline.length - 1 ? "bg-emerald-600 dark:bg-emerald-400" : "bg-background"}`} />
                <p className="text-base font-semibold tabular-nums text-foreground">{event.year}</p>
                <p className="mt-1 break-words text-sm leading-snug text-foreground/90">{event.title}</p>
                {event.detail ? <p className="mt-2 break-words text-xs leading-relaxed text-muted-foreground">{event.detail}</p> : null}
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
