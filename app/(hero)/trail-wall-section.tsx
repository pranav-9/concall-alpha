import { getCachedHomeTrails } from "@/lib/home-trails";
import TrailWall from "./trail-wall";

export function TrailWallFallback() {
  return (
    <section className="house-block">
      <div className="h-9 w-64 animate-pulse rounded bg-[var(--paper-2)]" />
      <div className="mt-6 h-[22rem] animate-pulse rounded border border-[var(--rule)] bg-[var(--paper-2)]" />
    </section>
  );
}

export default async function TrailWallSection() {
  const { wall } = await getCachedHomeTrails();
  return <TrailWall wall={wall} />;
}
