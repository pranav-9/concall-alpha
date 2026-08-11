-- Daily snapshot of the Overall board's live ranking, so the board can show a
-- Δ (rank change) column. The `#` is computed live from the Read each render;
-- there is no other record of "where a company sat yesterday". This table is
-- that record: one row per (date, company), storing the live rank and the Read
-- it was ranked on.
--
-- WRITTEN lazily from the /leaderboards render path (lib/leaderboard-snapshot.ts):
-- the first visit of a UTC day writes that day's snapshot via the service-role
-- client, once. No cron. Gaps on zero-traffic days are fine — Δ looks back to
-- the nearest snapshot ≤7 days old, not to an exact calendar day.
--
-- Apply MANUALLY in the Supabase SQL editor (portal SQL is not auto-migrated),
-- then reload the PostgREST schema cache.

create table if not exists leaderboard_rank_snapshot (
  snapshot_date date not null,
  company_code  text not null,
  rank          integer not null,
  read_score    numeric,
  created_at    timestamptz not null default now(),
  primary key (snapshot_date, company_code)
);

-- The board reads a whole day's rows at once (the nearest snapshot ≤7d old),
-- so index the date.
create index if not exists leaderboard_rank_snapshot_date_idx
  on leaderboard_rank_snapshot (snapshot_date desc);

-- Public, non-sensitive ranking data: anyone may read; only the service-role
-- (which bypasses RLS) writes, from the lazy snapshot path. No insert/update
-- policy is defined, so anon/auth cannot write.
alter table leaderboard_rank_snapshot enable row level security;

drop policy if exists "leaderboard_rank_snapshot_read" on leaderboard_rank_snapshot;
create policy "leaderboard_rank_snapshot_read"
  on leaderboard_rank_snapshot for select
  using (true);

notify pgrst, 'reload schema';
