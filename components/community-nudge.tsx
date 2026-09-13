"use client";

// Site-wide engagement nudge for the Telegram group. Mounted once in the root
// layout; renders nothing until an engagement rule fires (lib/community-nudge.ts)
// and never on a cold first pageview. A pill pinned to the lower edge, in the
// same slot the homepage uses for its own sticky CTA, so it also hides itself
// on every excluded path (home, Journal, auth, admin) even after it has fired.
// Dismiss snoozes it; a click-through retires it. Mobile-first: on a phone the
// navbar link is behind the menu, so this is the one join affordance most
// readers will actually see.

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { analytics, type CommunityNudgeTrigger } from "@/lib/analytics";
import {
  NUDGE_LAST_PATH_KEY,
  NUDGE_SESSION_KEY,
  NUDGE_SHOWN_KEY,
  NUDGE_STORAGE_KEY,
  type NudgeState,
  isNudgeEligiblePath,
  isNudgeSuppressed,
  nextSessionPageviews,
  nudgeDelayFor,
  parseNudgeState,
} from "@/lib/community-nudge";
import { TOUCH_TARGET, TOUCH_TARGET_ICON } from "@/lib/design/shell";
import { cn } from "@/lib/utils";

import { TelegramJoinLink } from "./telegram-join-link";

function readState(): NudgeState {
  try {
    return parseNudgeState(window.localStorage.getItem(NUDGE_STORAGE_KEY));
  } catch {
    return parseNudgeState(null);
  }
}

function writeState(patch: Partial<NudgeState>) {
  try {
    const next: NudgeState = { ...readState(), ...patch };
    window.localStorage.setItem(NUDGE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked — the nudge just shows again next visit.
  }
}

// In-memory mirror of the session counter for browsers where sessionStorage
// throws (private mode, "block all cookies"). Survives client navigations
// within the SPA, which is all the second-page rule needs.
let memPages = 0;
let memLastPath: string | null = null;

/** Count this session's pageviews — once per pathname, so a re-run of the
 *  effect on the same page (React StrictMode, an error-boundary reset) does
 *  not count twice and cannot fire the nudge on a cold first pageview. */
function countPageview(pathname: string): number {
  try {
    const ss = window.sessionStorage;
    if (ss.getItem(NUDGE_LAST_PATH_KEY) === pathname) {
      return nextSessionPageviews(ss.getItem(NUDGE_SESSION_KEY)) - 1;
    }
    const n = nextSessionPageviews(ss.getItem(NUDGE_SESSION_KEY));
    ss.setItem(NUDGE_SESSION_KEY, String(n));
    ss.setItem(NUDGE_LAST_PATH_KEY, pathname);
    return n;
  } catch {
    if (memLastPath !== pathname) {
      memPages += 1;
      memLastPath = pathname;
    }
    return memPages;
  }
}

/** The impression event fires once per browser session — a reload with the
 *  pill still up shows it again but does not inflate the denominator. */
function markShownOnce(): boolean {
  try {
    if (window.sessionStorage.getItem(NUDGE_SHOWN_KEY)) return false;
    window.sessionStorage.setItem(NUDGE_SHOWN_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

export function CommunityNudge({ href }: { href: string }) {
  const pathname = usePathname();
  const [trigger, setTrigger] = useState<CommunityNudgeTrigger | null>(null);
  // Sticky per mount: once shown, stays across client navigations until acted
  // on, so it does not flicker away when the reader taps into a company page.
  // Dismiss/click events are attributed to the page it appeared on.
  const [shownOn, setShownOn] = useState<string | null>(null);
  // Ref, not state: the guard must hold inside a timer callback and across a
  // double-invoked effect without waiting for a re-render.
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (isNudgeSuppressed(readState(), Date.now())) return;
    const pages = countPageview(pathname);
    const delay = nudgeDelayFor(pathname, pages);
    if (delay == null) return;

    const fire = (t: CommunityNudgeTrigger) => {
      if (firedRef.current) return;
      // Re-check: a click or dismiss in another tab may have landed while the
      // dwell timer was running.
      if (isNudgeSuppressed(readState(), Date.now())) return;
      firedRef.current = true;
      setTrigger(t);
      setShownOn(pathname);
      if (markShownOnce()) analytics.communityNudgeShown(t, pathname);
    };
    if (delay === 0) {
      fire("second_page");
      return;
    }
    const timer = window.setTimeout(() => fire("company_dwell"), delay);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!trigger || !shownOn) return null;
  // Fired elsewhere, then navigated to an excluded page: stay out of the
  // homepage CTA's slot, the Journal's own card, and the auth forms.
  if (!isNudgeEligiblePath(pathname)) return null;

  const dismiss = () => {
    writeState({ dismissedAt: Date.now() });
    analytics.communityNudgeDismiss(trigger, shownOn);
    setTrigger(null);
  };

  // /desk carries a fixed phone tab bar on the same edge below `sm`
  // (components/desk-mobile-tab-bar, 4.25rem tall); sit above it there.
  const onDesk = pathname === "/desk";

  return (
    <div
      role="complementary"
      aria-label="Telegram group nudge"
      className={cn(
        // z-30: below the navbar's open-menu backdrop (z-40) so the pill is
        // covered, not tappable, while the menu is open.
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300",
        onDesk
          ? "pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          : "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-background py-1.5 pl-4 pr-1.5 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.45)] dark:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)]">
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground">
          Reading along? The Telegram group is where I post what changed, and why.
        </p>
        <TelegramJoinLink
          href={href}
          surface="nudge"
          className={cn(
            "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90",
            TOUCH_TARGET,
          )}
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
