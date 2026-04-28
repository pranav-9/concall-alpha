"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode } from "react";

import { Tabs } from "@/components/ui/tabs";

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
