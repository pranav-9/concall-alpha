"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  sectors: string[];
  selected: string | null;
};

export function SectorFilter({ sectors, selected }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("bucket");
    if (value) params.set("sector", value);
    else params.delete("sector");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  };

  return (
    <label className="inline-flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="shrink-0 font-semibold uppercase tracking-[0.16em]">Sector</span>
      <select
        value={selected ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-full rounded-full border border-border/50 bg-background/65 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        <option value="">All sectors</option>
        {sectors.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
