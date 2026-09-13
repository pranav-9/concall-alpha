"use client";

// Site-wide engagement nudge for the Telegram group. Mounted once in the root
// layout; renders nothing until an engagement rule fires (lib/community-nudge.ts)
// and never on a cold first pageview. A pill pinned to the lower edge, in the
// same slot the homepage uses for its own sticky CTA (which is why "/" is
// excluded). Dismiss snoozes it; a click-through retires it. Mobile-first: on
// a phone the navbar link is behind the menu, so this is the one join affordance
// most readers will actually see.

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { analytics, type CommunityNudgeTrigger } from "@/lib/analytics";
import {
  NUDGE_SESSION_KEY,
  NUDGE_STORAGE_KEY,
  isNudgeSuppressed,
  nudgeDelayFor,
  parseNudgeState,
} from "@/lib/community-nudge";
import { TOUCH_TARGET_ICON } from "@/lib/design/shell";
import { cn } from "@/lib/utils";

import { TelegramJoinLink } from "./telegram-join-link";

function readState() {
  try {
    return parseNudgeState(window.localStorage.getItem(NUDGE_STORAGE_KEY));
  } catch {
    return parseNudgeState(null);
  }
}

function writeState(patch: { dismissedAt?: number | null; clicked?: boolean }) {
  try {
    const next = { ...readState(), ...patch };
    window.localStorage.setItem(NUDGE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — the nudge just shows again next visit.
  }
}

/** Count this session's pageviews (one per pathname change). */
function bumpSessionPageviews(): number {
  try {
    const n = Number(window.sessionStorage.getItem(NUDGE_SESSION_KEY) ?? "0") + 1;
    window.sessionStorage.setItem(NUDGE_SESSION_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

export function CommunityNudge({ href }: { href: string }) {
  const pathname = usePathname();
  const [trigger, setTrigger] = useState<CommunityNudgeTrigger | null>(null);
  // Sticky per mount: once shown, stays across client navigations until acted
  // on, so it does not flicker away when the reader taps into a company page.
  const [shownOn, setShownOn] = useState<string | null>(null);

  useEffect(() => {
    if (shownOn) return;
    const pages = bumpSessionPageviews();
    if (isNudgeSuppressed(readState(), Date.now())) return;
    const delay = nudgeDelayFor(pathname, pages);
    if (delay == null) return;

    const fire = (t: CommunityNudgeTrigger) => {
      setTrigger(t);
      setShownOn(pathname);
      analytics.communityNudgeShown(t, pathname);
    };
    if (delay === 0) {
      fire("second_page");
      return;
    }
    const timer = window.setTimeout(() => fire("company_dwell"), delay);
    return () => window.clearTimeout(timer);
    // `shownOn` is intentionally not a dep: once shown, re-running on route
    // change must not re-fire the impression event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!trigger || !shownOn) return null;

  const dismiss = () => {
    writeState({ dismissedAt: Date.now() });
    analytics.communityNudgeDismiss(trigger, shownOn);
    setTrigger(null);
  };

  return (
    <div
      role="complementary"
      aria-label="Telegram group"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-background/95 py-1.5 pl-4 pr-1.5 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.45)] backdrop-blur-md dark:bg-background/90">
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
          Section changes get posted in the Telegram group first.
        </p>
        <TelegramJoinLink
          href={href}
          surface="nudge"
          className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
          onClick={() => {
            writeState({ clicked: true });
            setTrigger(null);
          }}
        >
          Join
        </TelegramJoinLink>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            TOUCH_TARGET_ICON,
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
