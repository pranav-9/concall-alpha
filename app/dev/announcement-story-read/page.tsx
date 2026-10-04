import fs from "node:fs";
import path from "node:path";

import { notFound } from "next/navigation";

import { TopOfWeek } from "@/app/announcements/top-of-week";
import { getRecentStoryReads } from "@/lib/announcement-story-read";
import {
  parseStoryReads,
  qualifies,
  selectTopStoryReads,
} from "@/lib/announcement-story-read/select";
import type { AnnouncementStoryReadRow } from "@/lib/announcement-story-read/types";
import { getExchangeDeskData } from "@/lib/exchange-desk";

// Dev-only preview for "Top 5 this week" (the /announcements opening strip). Reads the sandbox records that
// concallyser/scripts/judge_announcements.py writes to
// /tmp/sandbox_announcement_story_read/<id>.json — so the block can be checked
// before the table exists or anything is promoted — or the promoted rows with
// ?source=live, and ranks them over the real tape exactly as the page does.
// ?asOf=<ISO> moves "now", to replay a past window (the tape holds 45 days).
// Below the block: every read in the window with its score, so the floor and
// the one-per-company rule can be checked against what was left out.
const SANDBOX_DIR = process.env.ANNOUNCEMENT_STORY_READ_SANDBOX_DIR ?? "/tmp/sandbox_announcement_story_read";

function sandboxRows(): { rows: AnnouncementStoryReadRow[]; failed: { id: string; error: string }[] } {
  const rows: AnnouncementStoryReadRow[] = [];
  const failed: { id: string; error: string }[] = [];
  let files: string[] = [];
  try {
    files = fs.readdirSync(SANDBOX_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return { rows, failed };
  }
  for (const file of files) {
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(SANDBOX_DIR, file), "utf8"));
      if (rec?.status === "judged" && rec.payload) rows.push({ announcement_id: rec.announcement_id, payload: rec.payload });
      else failed.push({ id: String(rec?.announcement_id ?? file), error: String(rec?.error ?? rec?.status ?? "unknown") });
    } catch {
      failed.push({ id: file, error: "unreadable sandbox file" });
    }
  }
  return { rows, failed };
}

export default async function AnnouncementStoryReadPreview({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string; source?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { asOf, source } = await searchParams;
  const parsedAsOf = asOf ? new Date(asOf) : null;
  const now = parsedAsOf && !Number.isNaN(parsedAsOf.getTime()) ? parsedAsOf : new Date();

  const sandbox = source === "live" ? { rows: [], failed: [] } : sandboxRows();
  const [tape, live] = await Promise.all([
    getExchangeDeskData(),
    source === "live" ? getRecentStoryReads(now) : Promise.resolve([]),
  ]);
  const parsed = source === "live" ? { reads: live, invalid: [] as string[] } : parseStoryReads(sandbox.rows);
  const picks = selectTopStoryReads(parsed.reads, tape.updates, tape.belowCut, now);

  const byId = new Map([...tape.updates, ...tape.belowCut].map((u) => [u.id, u]));
  const picked = new Set(picks.map((p) => p.update.id));
  const all = parsed.reads
    .map((read) => ({ read, update: byId.get(read.announcement_id) }))
    .sort((a, b) => b.read.score - a.read.score || a.read.company_code.localeCompare(b.read.company_code));

  return (
    <main className="house relative min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <p className="house-data house-micro text-[var(--ink-soft)]">
          Dev preview · Top 5 this week · {source === "live" ? "promoted rows" : `sandbox (${SANDBOX_DIR})`} · as of{" "}
          {now.toISOString()} · {parsed.reads.length} reads · {picks.length} picks
          {picks.length === 0 ? " — block hidden (fewer than three qualify)" : ""}
        </p>
        {parsed.invalid.length > 0 ? (
          <p className="mt-2 rounded border border-dashed border-[var(--alarm)] p-3 text-xs text-[var(--alarm)]">
            {parsed.invalid.length} payload(s) fail the v1 schema: {parsed.invalid.join(", ")}
          </p>
        ) : null}

        <div className="-mx-4 sm:mx-0">
          <TopOfWeek picks={picks} />
        </div>

        <h2 className="house-data house-micro mt-10 text-[var(--ink-soft)]">Every read in the window</h2>
        <table className="mt-3 w-full text-left text-xs">
          <thead className="house-data house-micro text-[var(--ink-soft)]">
            <tr>
              <th className="py-1 pr-3">Company</th>
              <th className="py-1 pr-3">Score</th>
              <th className="py-1 pr-3">Effect</th>
              <th className="py-1 pr-3">Tape</th>
              <th className="py-1 pr-3">State</th>
              <th className="py-1 pr-3">Headline</th>
              <th className="py-1">What it changes</th>
            </tr>
          </thead>
          <tbody>
            {all.map(({ read, update }) => (
              <tr key={read.announcement_id} className="border-t border-[var(--rule)] align-top">
                <td className="py-1.5 pr-3 text-[var(--ink)]">{read.company_code}</td>
                <td className="py-1.5 pr-3 tabular-nums">{read.score}</td>
                <td className="py-1.5 pr-3">{read.story_effect}</td>
                <td className="py-1.5 pr-3">{update ? `${update.impact} / ${update.category}` : "not on tape"}</td>
                <td className="py-1.5 pr-3">
                  {picked.has(read.announcement_id)
                    ? "PICK"
                    : !update
                      ? "dropped"
                      : qualifies(read, update.impact)
                        ? "qualifies"
                        : "below floor"}
                </td>
                <td className="py-1.5 pr-3 text-[var(--ink)]">{read.headline ?? "—"}</td>
                <td className="py-1.5 text-[var(--ink-soft)]">{read.changes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sandbox.failed.length > 0 ? (
          <p className="mt-4 text-xs text-[var(--ink-soft)]">
            Failed reads: {sandbox.failed.map((f) => `${f.id} (${f.error})`).join("; ")}
          </p>
        ) : null}
      </div>
    </main>
  );
}
