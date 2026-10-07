// The admin panel's chrome and primitives, in the house skin (`.house` is put
// on by app/admin/layout.tsx). One shell, one panel, one stat cell, one table
// recipe — every section page composes these and nothing else, so the eight
// sections read as one instrument.

import Link from "next/link";
import type { ReactNode } from "react";

import { formatCount, formatDelta, type Delta } from "@/lib/admin/metrics";
import { adminHref, priorLabel, rangeLabel, RANGE_OPTIONS, type RangeKey } from "@/lib/admin/range";
import { cn } from "@/lib/utils";

import { AdminLogoutButton } from "./admin-logout-button";
import { EYEBROW, HOUSE_BTN } from "./tokens";

export const ADMIN_SECTIONS = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "accounts", label: "Accounts", href: "/admin/accounts" },
  { key: "companies", label: "Companies", href: "/admin/companies" },
  { key: "watchlists", label: "Watchlists", href: "/admin/watchlists" },
  { key: "requests", label: "Requests", href: "/admin/requests" },
  { key: "api", label: "API", href: "/admin/api" },
  { key: "polls", label: "Polls", href: "/admin/polls" },
  { key: "ops", label: "Ops", href: "/admin/ops" },
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]["key"];

// Class recipes live in ./tokens (no React) so client components can share
// them; re-exported here for the server pages.
export {
  EYEBROW,
  HOUSE_BTN,
  HOUSE_BTN_PRIMARY,
  HOUSE_INPUT,
  HOUSE_TEXTAREA,
  ROW_HOVER,
  TABLE,
  TD,
  TD_CODE,
  TD_MUTED,
  TD_NUM,
  TD_TIME,
  TH,
  TH_NUM,
} from "./tokens";

// ── shell ────────────────────────────────────────────────────────────────────

export function AdminShell({
  section,
  range,
  title,
  lede,
  timeless = false,
  children,
}: {
  section: AdminSectionKey;
  range: RangeKey;
  title: string;
  lede?: string;
  /** Sections the range does not apply to (Polls, Ops) hide the picker. */
  timeless?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className={EYEBROW}>Admin · Story of a Stock</p>
          <h1 className="house-display mt-1.5 text-[28px] sm:text-[32px]">{title}</h1>
          {lede ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-snug text-[var(--ink-soft)]">{lede}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" prefetch={false} className={HOUSE_BTN}>
            Portal
          </Link>
          <AdminLogoutButton />
        </div>
      </header>

      <nav
        aria-label="Admin sections"
        className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-[var(--rule)]"
      >
        <ul className="-mb-px flex max-w-full gap-1 overflow-x-auto">
          {ADMIN_SECTIONS.map((item) => {
            const active = item.key === section;
            return (
              <li key={item.key} className="shrink-0">
                <Link
                  href={adminHref(item.href, range)}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "house-data block border-b-2 px-3 py-2.5 text-[11px] uppercase tracking-[0.1em] transition-colors",
                    active
                      ? "border-[var(--mark)] text-[var(--ink)]"
                      : "border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        {timeless ? null : <RangePicker section={section} range={range} />}
      </nav>

      <div className="mt-6 space-y-5">{children}</div>
    </main>
  );
}

function RangePicker({ section, range }: { section: AdminSectionKey; range: RangeKey }) {
  const href = ADMIN_SECTIONS.find((s) => s.key === section)?.href ?? "/admin";
  return (
    <div className="flex items-center gap-3 pb-2">
      <span className={cn(EYEBROW, "hidden sm:inline")}>{rangeLabel(range)}</span>
      <div className="flex rounded-[4px] border border-[var(--rule)] p-0.5">
        {RANGE_OPTIONS.map((option) => {
          const active = option.key === range;
          return (
            <Link
              key={option.key}
              href={adminHref(href, option.key)}
              prefetch={false}
              aria-current={active ? "true" : undefined}
              className={cn(
                "house-data rounded-[3px] px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] transition-colors",
                active
                  ? "bg-[var(--mark)] text-[#101a18]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── primitives ───────────────────────────────────────────────────────────────

/** A card with a hairline head. `flush` drops the body padding for tables. */
export function AdminPanel({
  eyebrow,
  right,
  id,
  flush = false,
  className,
  children,
}: {
  eyebrow: string;
  right?: ReactNode;
  id?: string;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--rule)] px-4 py-2.5">
        <h2 className={EYEBROW}>{eyebrow}</h2>
        {right ? <div className="flex items-center gap-2 text-[11px] text-[var(--ink-soft)]">{right}</div> : null}
      </div>
      <div className={flush ? "overflow-x-auto" : "px-4 py-4"}>{children}</div>
    </section>
  );
}

/** Hairline-divided stat cells in one panel: N readings of one instrument, not N cards. */
export function AdminStatRow({ children, columns = 5 }: { children: ReactNode; columns?: 3 | 4 | 5 }) {
  // Hairlines: each cell draws a 1px outline into the 1px grid gap, so any
  // column count divides cleanly without nth-child maths, and a slot left
  // empty on a narrow grid stays paper (an outline only exists where a cell
  // does). The container's overflow clip trims the outer edge.
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper-2)]",
        "grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        columns === 4 && "sm:grid-cols-4",
        columns === 5 && "sm:grid-cols-3 lg:grid-cols-5",
      )}
    >
      {children}
    </div>
  );
}

export function AdminStat({
  label,
  value,
  delta,
  range,
  note,
}: {
  label: string;
  value: number | string;
  /** When given, the cell prints the change against the prior window. */
  delta?: Delta;
  range?: RangeKey;
  /** A one-line qualifier instead of (or under) the delta. */
  note?: string;
}) {
  const deltaText = delta && range ? formatDelta(delta, priorLabel(range)) : null;
  const tone =
    delta?.direction === "up"
      ? "text-[var(--signal)]"
      : delta?.direction === "down"
        ? "text-[var(--alarm)]"
        : "text-[var(--ink-soft)]";
  return (
    <div className="bg-[var(--paper-2)] px-4 py-3.5 outline outline-1 outline-[var(--rule)]">
      <p className={EYEBROW}>{label}</p>
      <p className="house-display mt-1.5 text-[26px] leading-none sm:text-[30px]">
        {typeof value === "number" ? formatCount(value) : value}
      </p>
      {deltaText ? (
        <p className={cn("house-data mt-1.5 text-[11px]", tone)}>{deltaText}</p>
      ) : note ? (
        <p className="house-data mt-1.5 text-[11px] text-[var(--ink-soft)]">{note}</p>
      ) : (
        <p className="house-data mt-1.5 text-[11px] text-[var(--ink-soft)]">&nbsp;</p>
      )}
    </div>
  );
}

export function AdminEmpty({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-6 text-[13px] text-[var(--ink-soft)]">
          {children}
        </td>
      </tr>
    );
  }
  return <p className="text-[13px] text-[var(--ink-soft)]">{children}</p>;
}

export function AdminNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[12px] leading-snug text-[var(--ink-soft)]", className)}>{children}</p>;
}

export function AdminAlert({
  tone = "alarm",
  children,
}: {
  tone?: "alarm" | "warn";
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-[6px] border px-3.5 py-2.5 text-[13px]",
        tone === "alarm"
          ? "border-[color-mix(in_srgb,var(--alarm)_45%,transparent)] bg-[color-mix(in_srgb,var(--alarm)_8%,transparent)] text-[var(--alarm)]"
          : "border-[color-mix(in_srgb,var(--warn)_45%,transparent)] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] text-[var(--warn)]",
      )}
    >
      {children}
    </div>
  );
}

/** Outlined tag beside a value: `tone` picks the ink. */
export function AdminTag({
  children,
  tone = "muted",
  title,
}: {
  children: ReactNode;
  tone?: "signal" | "warn" | "alarm" | "muted";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "house-data inline-flex shrink-0 items-center whitespace-nowrap rounded-[3px] border px-1.5 py-px text-[9px] uppercase leading-tight tracking-[0.08em]",
        tone === "signal" && "border-[color-mix(in_srgb,var(--signal)_40%,transparent)] text-[var(--signal)]",
        tone === "warn" && "border-[color-mix(in_srgb,var(--warn)_45%,transparent)] text-[var(--warn)]",
        tone === "alarm" && "border-[color-mix(in_srgb,var(--alarm)_45%,transparent)] text-[var(--alarm)]",
        tone === "muted" && "border-[var(--rule)] text-[var(--ink-soft)]",
      )}
    >
      {children}
    </span>
  );
}

export const DATA_LOAD_ERROR =
  "Unable to load admin data. Check the Supabase tables and functions this section reads, and the service role key.";
