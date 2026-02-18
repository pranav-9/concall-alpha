"use client";

import { usePathname } from "next/navigation";
import { RequestIntakeButton } from "@/components/request-intake-button";

const enabledPaths = [/^\/$/, /^\/leaderboards(?:\/|$)/, /^\/company(?:\/|$)/];

export function RequestIntakeFab() {
  const pathname = usePathname();
  const show = enabledPaths.some((rx) => rx.test(pathname));
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <RequestIntakeButton
        triggerLabel="Submit Request"
        triggerVariant="default"
        triggerClassName="rounded-full shadow-lg px-4 h-10"
      />
    </div>
  );
}
