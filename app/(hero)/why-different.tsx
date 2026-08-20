// "Why it's different" — the four differentiation points as the mockup's 2×2
// card grid: an icon chip, a title, and one supporting line each.

import { Sparkles, Layers, ShieldCheck, BarChart3, type LucideIcon } from "lucide-react";

const POINTS: { icon: LucideIcon; term: string; body: string }[] = [
  { icon: Sparkles, term: "Done-for-you research", body: "The documents, read and summarised." },
  { icon: Layers, term: "Four scored lenses", body: "Concall, growth, valuation, moat." },
  { icon: ShieldCheck, term: "Moat analysis", body: "Structural edge, scored — rare anywhere else." },
  { icon: BarChart3, term: "Across sectors", body: "Compare like-for-like in seconds." },
];

export default function WhyDifferent() {
  return (
    <section aria-labelledby="why-different-heading">
      <p id="why-different-heading" className="house-data house-micro text-[var(--ink-soft)]">
        Why it&apos;s different
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, term, body }) => (
          <div
            key={term}
            className="rounded-2xl border border-[var(--rule)] bg-[var(--paper-2)] p-4"
          >
            <span
              aria-hidden
              className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--signal)]"
              style={{ background: "color-mix(in srgb, var(--signal) 12%, transparent)" }}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <p className="house-display text-base text-[var(--ink)]">{term}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
