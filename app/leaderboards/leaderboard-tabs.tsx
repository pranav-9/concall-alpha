"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Tabs } from "@/components/ui/tabs";
import { analytics } from "@/lib/analytics";
import { resolveLeaderboardTab } from "@/lib/leaderboard-tab";

type Props = {
  defaultTab: string;
  className?: string;
  children: ReactNode;
};

// The four boards are all rendered into the DOM at once (server component), so
// switching tabs is a pure client toggle and must NEVER wait on a navigation.
export function LeaderboardTabs({ defaultTab, className, children }: Props) {
  const searchParams = useSearchParams();

  // Local state owns the visible tab so the switch is instant. Previously `value`
  // was read from `searchParams`, which meant a tap couldn't flip the board until
  // `router.replace` completed a full RSC round-trip — hundreds of ms of dead UI
  // on mobile, which showed up as rageclicks on the tab strip (three users,
  // 2026-08-20). The URL is now synced *after* the switch, for deep-links and the
  // back button, not read back to drive it.
  const [value, setValue] = useState(defaultTab);

  // Reconcile when the URL changes underneath us — a real navigation that lands
  // with (or drops) ?tab. resolveLeaderboardTab maps an absent/unknown param
  // back to Overall, so clicking the footer's bare "/leaderboards" link while on
  // a sub-tab resets the board instead of sticking on the old one.
  const urlTab = searchParams.get("tab");
  useEffect(() => {
    setValue(resolveLeaderboardTab(urlTab));
  }, [urlTab]);

  const onValueChange = (next: string) => {
    // Idempotent: swallows the touch double-fire (focus + click both activate).
    if (next === value) return;
    setValue(next); // instant visible switch — no server round-trip
    analytics.leaderboardTabChange(value, next, "leaderboards");
    // Sync the URL for deep-links WITHOUT a Next navigation. router.replace here
    // refetched the whole page's RSC (getConcallData + fetchLeaderboardData +
    // readPriorRanks, plus the after() snapshot write) on every tap, for data
    // already in the DOM. history.replaceState is a pure client URL write — same
    // deep-link and back-button behaviour (replace semantics), zero server work.
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  return (
    // activationMode="manual": don't activate on focus. On touch, focus and click
    // fire ~10ms apart and each called onValueChange, double-logging every tap.
    <Tabs
      value={value}
      onValueChange={onValueChange}
      activationMode="manual"
      className={className}
    >
      {children}
    </Tabs>
  );
}
