// "Why it's different" — the four differentiation points, rendered as a house
// hairline list (NOT icon-in-circle cards). Same idiom as the "Six reads"
// ledger below it, so the page reads as one system rather than a marketing
// grid stapled onto a data page.

const POINTS = [
  {
    term: "Done-for-you research",
    body: "The concalls, presentations and filings — read and summarised, not left for you to trawl.",
  },
  {
    term: "Four scored lenses",
    body: "Concall, growth, valuation and moat — each scored on its own, then resolved into one read.",
  },
  {
    term: "Moat analysis",
    body: "The structural edge, scored against a framework — rare to find priced out anywhere else.",
  },
  {
    term: "Compare across sectors",
    body: "The same four numbers on every company, so you can hold them side by side in seconds.",
  },
] as const;

export default function WhyDifferent() {
  return (
    <section aria-labelledby="why-different-heading">
      <p className="house-data house-micro text-[var(--ink-soft)]">Why it&apos;s different</p>
      <h2 id="why-different-heading" className="sr-only">
        Why it&apos;s different
      </h2>
      <ul className="mt-3 border-t border-[var(--rule)]">
        {POINTS.map((point) => (
          <li
            key={point.term}
            className="border-b border-[var(--rule)] py-3"
          >
            <p className="house-display text-base text-[var(--ink)]">{point.term}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{point.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
