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
    sort integer not null default 0,     -- display order among featured themes
    updated_at timestamptz not null default now()
);

-- Only featured themes are ever rendered or hand-maintained.
create index if not exists idx_theme_featured
    on theme (sort) where is_featured;

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
