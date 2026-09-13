import { getTelegramJoinUrl } from "@/lib/community";
import { TOUCH_TARGET } from "@/lib/design/shell";
import { cn } from "@/lib/utils";
import type { CommunitySurface } from "@/lib/analytics";

import { TelegramJoinLink } from "./telegram-join-link";

/**
 * The "join the group" card. Server component: reads the env-driven invite URL
 * and renders nothing when it is unset. Copy is written as a caption for a cold
 * first-time reader — what happens in the group, in plain words — not as a
 * headline.
 *
 * `variant="card"` (default) is the Journal's end-of-post aside. `variant="inline"`
 * is the one-line strip used on the company page under the overview board: the
 * most-viewed surface (2026-09 PostHog), so it must cost one line, not a block.
 * `companyName` makes the inline copy specific to the page.
 */
export function TelegramJoinCard({
  surface,
  variant = "card",
  companyName,
  className,
}: {
  surface: CommunitySurface;
  variant?: "card" | "inline";
  companyName?: string | null;
  className?: string;
}) {
  const href = getTelegramJoinUrl();
  if (!href) return null;

  if (variant === "inline") {
    return (
      <aside
        aria-label="Telegram group"
        className={cn(
          "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-2.5",
          className,
        )}
      >
        <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
          {companyName ? (
            <>
              When a section on <span className="font-medium text-foreground">{companyName}</span>{" "}
              changes, it gets posted in the Telegram group first.
            </>
          ) : (
            <>Section changes get posted in the Telegram group first.</>
          )}
        </p>
        <TelegramJoinLink
          href={href}
          surface={surface}
          className={cn(
            "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent",
            TOUCH_TARGET,
          )}
        >
          Join on Telegram
          <span aria-hidden="true">→</span>
        </TelegramJoinLink>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Telegram group"
      className={cn("rounded-2xl border border-border bg-muted/30 px-5 py-4", className)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Telegram group
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground">
        I post there when a section changes — a guidance re-read, a fresh
        quarter scored — and ask what you&apos;d want tracked next. Small,
        plain, no calls.
      </p>
      <TelegramJoinLink
        href={href}
        surface={surface}
        className="mt-3 inline-flex min-h-11 items-center gap-1 rounded-full bg-foreground px-3 py-2 text-xs font-medium text-background shadow-sm transition-colors hover:bg-foreground/90"
      >
        Join on Telegram
        <span aria-hidden="true">→</span>
      </TelegramJoinLink>
    </aside>
  );
}
