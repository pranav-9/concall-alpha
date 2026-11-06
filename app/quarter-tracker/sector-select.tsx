"use client";

// The board's sector filter. Every option's URL is built on the server
// (trackerHref), so this only navigates: the filtered view is still a link.

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

export type SectorOption = { value: string; label: string; href: string };

export function SectorSelect({ options, value }: { options: SectorOption[]; value: string }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex shrink-0">
      <span className="sr-only">Sector</span>
      <select
        value={value}
        onChange={(event) => {
          const option = options.find((o) => o.value === event.target.value);
          if (option) router.push(option.href, { scroll: false });
        }}
        className="h-7 max-w-[13rem] cursor-pointer appearance-none truncate rounded-[5px] border border-[var(--rule)] bg-[var(--paper-2)] pl-2.5 pr-7 text-[11.5px] text-[var(--ink)] transition-colors hover:border-[var(--ink-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-soft)]"
      />
    </label>
  );
}
