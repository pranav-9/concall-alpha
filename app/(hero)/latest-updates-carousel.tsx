import {
  formatRelativeActivityTime,
  typeChipClass,
  type UnifiedUpdate,
} from "@/lib/activity-feed";
import { getCachedHomepageActivityFeed } from "@/lib/homepage-activity-feed";
import LatestUpdatesCarouselRail, {
  type CarouselUpdateItem,
} from "./latest-updates-carousel-rail";

export function LatestUpdatesCarouselFallback() {
  return (
    <div className="w-full">
      <div className="mb-3 h-9 w-56 rounded-lg bg-card animate-pulse" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 w-60 shrink-0 rounded-xl border border-border bg-card animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function toCarouselItem(item: UnifiedUpdate): CarouselUpdateItem {
  return {
    id: item.id,
    companyName: item.companyName,
    companyIsNew: item.companyIsNew,
    score: item.score,
    contextLabel: item.contextLabel,
    sourceLabel: item.sourceLabel,
    chipClass: typeChipClass(item.type),
    detail: item.type !== "guidance_monitor" && item.detail ? item.detail : null,
    timeLabel: formatRelativeActivityTime(item.atRaw),
    atRaw: item.atRaw,
    href:
      item.artifactHref ??
      (item.companyCode ? `/company/${item.companyCode}` : null),
  };
}

export default async function LatestUpdatesCarousel() {
  const updates = await getCachedHomepageActivityFeed(10);
  if (updates.length === 0) return null;
  return <LatestUpdatesCarouselRail updates={updates.map(toCarouselItem)} />;
}
