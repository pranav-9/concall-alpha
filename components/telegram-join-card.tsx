import { getTelegramJoinUrl } from "@/lib/community";
import type { CommunitySurface } from "@/lib/analytics";

import { TelegramJoinLink } from "./telegram-join-link";

/**
 * The Journal's "join the group" card. Server component: reads the env-driven
 * invite URL and renders nothing when it is unset. Copy is written as a caption
 * for a cold first-time reader — what happens in the group, in plain words —
 * not as a headline.
 */
export function TelegramJoinCard({ surface }: { surface: CommunitySurface }) {
  const href = getTelegramJoinUrl();
  if (!href) return null;

  return (
    <aside
      aria-label="Telegram group"
      className="rounded-2xl border border-border bg-muted/30 px-5 py-4"
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
