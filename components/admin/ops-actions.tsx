"use client";

// Every admin action in one place, each with the same shape: what it does,
// one control, one result line. The routes are the existing /api/admin/*
// handlers — nothing new is written server-side.

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { RangeKey } from "@/lib/admin/range";

import { AdminPanel } from "./shell";
import { EYEBROW, HOUSE_BTN, HOUSE_BTN_PRIMARY, HOUSE_INPUT } from "./tokens";

type Status =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "idle") return null;
  if (status.kind === "busy") return <p className="house-data text-[11px] text-[var(--ink-soft)]">Working…</p>;
  return (
    <p className={`house-data text-[11px] ${status.kind === "ok" ? "text-[var(--signal)]" : "text-[var(--alarm)]"}`}>
      {status.message}
    </p>
  );
}

function Action({
  id,
  title,
  blurb,
  children,
}: {
  id: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-6 border-b border-[var(--rule)] px-4 py-4 last:border-b-0">
      <p className={EYEBROW}>{title}</p>
      <p className="mt-1 max-w-xl text-[13px] leading-snug text-[var(--ink-soft)]">{blurb}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
  return [body.error ?? `Request failed (${res.status})`, body.detail].filter(Boolean).join(" — ");
}

function parseFilename(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "admin-report.md";
}

export function OpsActions({ range }: { range: RangeKey }) {
  const router = useRouter();
  const [feed, setFeed] = useState<Status>({ kind: "idle" });
  const [overview, setOverview] = useState<Status>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [calendar, setCalendar] = useState<Status>({ kind: "idle" });
  const [report, setReport] = useState<Status>({ kind: "idle" });

  const refreshFeed = async () => {
    setFeed({ kind: "busy" });
    try {
      const res = await fetch("/api/admin/refresh-homepage-activity", { method: "POST" });
      if (!res.ok) return setFeed({ kind: "error", message: await readError(res) });
      const body = (await res.json()) as { refreshed?: number; deletedStale?: number | null };
      setFeed({
        kind: "ok",
        message: `Refreshed ${body.refreshed ?? 0} rows${
          body.deletedStale != null ? `, removed ${body.deletedStale} stale` : ""
        }.`,
      });
      router.refresh();
    } catch (err) {
      setFeed({ kind: "error", message: err instanceof Error ? err.message : "Request failed." });
    }
  };

  const refreshOverview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const companyCode = code.trim().toUpperCase();
    if (!companyCode) return;
    setOverview({ kind: "busy" });
    try {
      const res = await fetch("/api/admin/refresh-company-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode }),
      });
      if (!res.ok) return setOverview({ kind: "error", message: await readError(res) });
      const body = (await res.json()) as { companyCode?: string; refreshedAt?: string };
      setOverview({ kind: "ok", message: `${body.companyCode ?? companyCode} rebuilt and the page cache revalidated.` });
      router.refresh();
    } catch (err) {
      setOverview({ kind: "error", message: err instanceof Error ? err.message : "Request failed." });
    }
  };

  const syncCalendar = async () => {
    setCalendar({ kind: "busy" });
    try {
      const res = await fetch("/api/admin/sync-earnings-calendar", { method: "POST" });
      if (!res.ok) return setCalendar({ kind: "error", message: await readError(res) });
      const body = (await res.json()) as {
        rawCount?: number;
        resultEvents?: number;
        upserted?: number;
        matchedToCompanies?: number;
      };
      setCalendar({
        kind: "ok",
        message: `NSE returned ${body.rawCount ?? 0} events, ${body.resultEvents ?? 0} results events upserted, ${
          body.matchedToCompanies ?? 0
        } matched to covered companies.`,
      });
      router.refresh();
    } catch (err) {
      setCalendar({ kind: "error", message: err instanceof Error ? err.message : "Request failed." });
    }
  };

  const generateReport = async () => {
    setReport({ kind: "busy" });
    try {
      const res = await fetch(`/api/admin/generate-report?range=${encodeURIComponent(range)}`);
      if (!res.ok) return setReport({ kind: "error", message: await readError(res) });
      const filename = parseFilename(res.headers.get("content-disposition"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setReport({ kind: "ok", message: `Downloaded ${filename}.` });
    } catch (err) {
      setReport({ kind: "error", message: err instanceof Error ? err.message : "Request failed." });
    }
  };

  return (
    <AdminPanel eyebrow="Actions" flush>
      <Action
        id="home-feed"
        title="Latest updates feed"
        blurb="Rebuild the homepage activity feed from the newest promoted rows and revalidate it. Run after a batch of promotes."
      >
        <button type="button" className={HOUSE_BTN_PRIMARY} disabled={feed.kind === "busy"} onClick={refreshFeed}>
          Refresh feed
        </button>
        <StatusLine status={feed} />
      </Action>

      <Action
        id="overview"
        title="Company overview cache"
        blurb="Rebuild one company's overview row (ranks, scores, takeaways) and revalidate its page. Use after a section promote for that company."
      >
        <form onSubmit={refreshOverview} className="flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CODE"
            aria-label="Company code"
            className={`${HOUSE_INPUT} house-data w-36 uppercase`}
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button type="submit" className={HOUSE_BTN_PRIMARY} disabled={overview.kind === "busy" || !code.trim()}>
            Rebuild
          </button>
        </form>
        <StatusLine status={overview} />
      </Action>

      <Action
        id="calendar"
        title="Earnings calendar"
        blurb="Pull the NSE event calendar and upsert results dates, matching NSE symbols to covered companies."
      >
        <button type="button" className={HOUSE_BTN_PRIMARY} disabled={calendar.kind === "busy"} onClick={syncCalendar}>
          Sync from NSE
        </button>
        <StatusLine status={calendar} />
      </Action>

      <Action
        id="report"
        title="Analytics report"
        blurb={`Download the Markdown analytics report for the current range (${range}). Same numbers as these pages, in a file you can paste into a note.`}
      >
        <button type="button" className={HOUSE_BTN} disabled={report.kind === "busy"} onClick={generateReport}>
          Download report
        </button>
        <StatusLine status={report} />
      </Action>
    </AdminPanel>
  );
}
