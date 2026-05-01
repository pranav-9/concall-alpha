"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_VALUE = "__all__";

export function SubSectorSelect({
  sectorSlug,
  entries,
  totalCount,
  value,
}: {
  sectorSlug: string;
  entries: Array<[name: string, count: number]>;
  totalCount: number;
  value: string | null;
}) {
  const router = useRouter();

  const handleChange = (next: string) => {
    const query = new URLSearchParams();
    if (next !== ALL_VALUE) query.set("subSector", next);
    const qs = query.toString();
    router.push(qs ? `/sector/${sectorSlug}?${qs}` : `/sector/${sectorSlug}`, { scroll: false });
  };

  return (
    <Select value={value ?? ALL_VALUE} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[15rem] rounded-full border-border/60 bg-background/80 px-3 text-xs">
        <SelectValue placeholder="All sub-sectors" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All sub-sectors ({totalCount})</SelectItem>
        {entries.map(([name, count]) => (
          <SelectItem key={name} value={name}>
            {name} ({count})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
