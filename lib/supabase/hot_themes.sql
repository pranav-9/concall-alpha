-- Hot Themes: an editorial discovery surface (/themes + a homepage teaser).
--
-- Two portal-owned tables, populated BY HAND in the Supabase SQL editor (editorial,
-- not user-writable). No pipeline writes them. Apply manually, then run:
--   notify pgrst, 'reload schema';
--
-- Scores and Trend are NOT stored here. Each row joins to the leaderboard's live board
-- build (getConcallData -> buildScoreBoardRows) by company_code, so a company's four
-- scores on /themes are the leaderboard's numbers by construction and can never drift.
-- These tables are a thin editorial index: which themes are featured, and who belongs.

create table if not exists theme (
    slug text primary key,
    title text not null,
    blurb text,                          -- one-line "why now" editorial claim (leads each block)
    is_featured boolean not null default false,
    sort integer not null default 0,     -- display order among featured themes (tiebreak under hotness)
    -- "In Focus" attention meter, 1-5; null = no meter. Editorial, hand-set per
    -- results season. This is the PRIMARY board ordering key (hotness desc, nulls
    -- last, then sort) on both /themes and /desk. It is a measure of attention
    -- (earnings momentum, re-rating, community buzz), NOT investment advice.
    hotness smallint check (hotness is null or hotness between 1 and 5),
    updated_at timestamptz not null default now()
);

-- Idempotent alter for databases created before hotness existed (2026-08-30).
alter table theme add column if not exists hotness smallint;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'theme_hotness_range') then
    alter table theme add constraint theme_hotness_range
      check (hotness is null or hotness between 1 and 5);
  end if;
end $$;

-- Only featured themes are ever rendered or hand-maintained. Board order is
-- hotness desc then sort, so index both.
create index if not exists idx_theme_featured
    on theme (hotness desc nulls last, sort) where is_featured;

create table if not exists theme_membership (
    theme_slug text not null references theme (slug) on delete cascade,
    -- Joins to the board by code. Deliberately NOT FK'd to `company`: a typo'd or
    -- unknown code is caught by the data layer's build-time integrity check (it logs
    -- a warning and drops the row) rather than silently vanishing. Run the validation
    -- query below after editing to catch typos immediately.
    company_code text not null,
    rationale text,                      -- one line: why this name belongs in this theme
    as_of_quarter text,                  -- informational: the quarter the membership was set against
    -- Freshness is EDITOR-driven, not score-driven. Bumped when the editor re-confirms
    -- the membership thesis still holds. A seasonal report lists memberships whose
    -- last_reviewed_at predates the last results season. (A score-driven flag was
    -- rejected in eng review: it fires on every re-score with near-zero signal.)
    last_reviewed_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (theme_slug, company_code)
);

create index if not exists idx_theme_membership_theme
    on theme_membership (theme_slug);

-- Public read, service-role write. These are editorial content: everyone reads,
-- only the service role (SQL editor / admin) writes. RLS on with a permissive
-- SELECT policy is the portal convention (see homepage_activity_feed.sql); no
-- insert/update/delete policy, so the anon/authenticated roles cannot write.
-- WITHOUT the SELECT policy, RLS-on returns zero rows to the app's anon client
-- and /themes renders empty even though the rows exist.
alter table public.theme enable row level security;
alter table public.theme_membership enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'theme'
      and policyname = 'allow_read_theme'
  ) then
    create policy allow_read_theme
      on public.theme
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'theme_membership'
      and policyname = 'allow_read_theme_membership'
  ) then
    create policy allow_read_theme_membership
      on public.theme_membership
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Preferred maintenance path: `/themes-refresh` (scripts/themes-refresh.mjs) runs the
-- checks below plus missing-linkage suggestions and a gated membership upsert. Use raw
-- SQL for theme lifecycle (create / is_featured / sort / blurb), which the skill omits.
--
-- Integrity check to run after editing memberships (surfaces typo'd codes at edit time):
--   select tm.theme_slug, tm.company_code
--   from theme_membership tm
--   left join company c on upper(c.code) = upper(tm.company_code)
--   where c.code is null;
--
-- Seasonal freshness report (memberships not re-confirmed since a chosen date):
--   select theme_slug, company_code, last_reviewed_at
--   from theme_membership
--   where last_reviewed_at < '<last-season-start-date>'
--   order by theme_slug, last_reviewed_at;

-- After applying:
--   notify pgrst, 'reload schema';
