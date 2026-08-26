// Server wrapper for the Exchange Desk feed: fetches the classified BSE
// announcement data and hands it to the client filter component. Self-fetching +
// Suspense-wrapped (same shape as DeskHotThemes) so it streams independently and
// returns nothing until the feed has material rows.

import { getExchangeDeskData } from "@/lib/exchange-desk";
import DeskExchangeUpdates from "./desk-exchange-updates";

// Match-final-state fallback: mirrors the populated feed's house-block header +
// filter tabs + a slice of rows, reserving the space so streaming the real feed
// in doesn't shove the Hot Themes section below it down. The feed renders null
// only on a genuinely empty window (rare — the desk is a live tape).
export function DeskExchangeSectionFallback() {
  return (
    <section aria-hidden className="house-block">
      <div className="h-3 w-24 animate-pulse rounded bg-[var(--rule)]" />
      <div className="mt-2 h-8 w-48 animate-pulse rounded bg-[var(--rule)]" />
      <div className="mt-5 flex gap-2">
        {[16, 12, 14].map((w, i) => (
          <div
            key={i}
            className="h-7 animate-pulse rounded-full bg-[var(--rule)]"
            style={{ width: `${w * 4}px` }}
          />
        ))}
      </div>
      <div className="mt-4 space-y-px">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded bg-[var(--rule)]" />
        ))}
      </div>
    </section>
  );
}

export default async function DeskExchangeSection() {
  const data = await getExchangeDeskData();
  return <DeskExchangeUpdates data={data} />;
}
