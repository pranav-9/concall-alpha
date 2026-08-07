"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";

import { Tabs } from "@/components/ui/tabs";
import { analytics } from "@/lib/analytics";

type Props = {
  defaultTab: string;
  className?: string;
  children: ReactNode;
};

export function LeaderboardTabs({ defaultTab, className, children }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = searchParams.get("tab") ?? defaultTab;

  const onValueChange = (next: string) => {
    if (next !== value) analytics.leaderboardTabChange(value, next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      {children}
    </Tabs>
  );
}
