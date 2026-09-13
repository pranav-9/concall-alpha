// Desk join strip in the house skin (paper-2 ground, hairline rule; 12px
// radius on the phone to match the desk mobile cards). The desk is the second
// most viewed surface (2026-09 PostHog) and its right rail is hidden below
// `sm`, so the strip lives in the main flow where phone readers see it too —
// the page owns its slot and spacing (app/desk/page.tsx). Server component;
// env-gated like every other join affordance.

import { getTelegramJoinUrl } from "@/lib/community";
import { TelegramJoinLink } from "@/components/telegram-join-link";

export function DeskTelegramStrip() {
  const href = getTelegramJoinUrl();
  if (!href) return null;

  return (
    <aside
      aria-label="Telegram group"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] px-4 py-3 sm:rounded"
    >
      <div className="min-w-0">
        <p className="house-data house-micro text-[var(--ink-soft)]">Telegram group</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
          Section changes — a guidance re-read, a fresh quarter scored — get posted there
          first. Small, plain, no calls.
        </p>
      </div>
      <TelegramJoinLink
        href={href}
        surface="desk"
        className="house-data inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--ink)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--paper-2)] transition-transform hover:-translate-y-0.5"
      >
        Join →
      </TelegramJoinLink>
    </aside>
  );
}

export default DeskTelegramStrip;
