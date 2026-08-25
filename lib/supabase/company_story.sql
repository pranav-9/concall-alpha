-- Company Story: the one-line "story engine" synthesized per company for the
-- Overview read card (app/company/components/overview-signal-board.tsx `Synthesis`).
--
-- Replaces the generic 12-bucket template gloss (lib/board-read.ts BOARD_READS)
-- with a per-company verdict: the ONE forward driver the investment case turns on
-- (engine_tag) plus where it stands this quarter and the price lean (story_line).
-- Derived, NOT hand-written: concallyser/scripts/generate_story_line.py synthesizes
-- it from the phase substrate (key_variables + growth catalysts + theme + moat +
-- valuation) via DeepSeek, sandbox-first and user-gated, and upserts here.
--
-- The portal reads this by code and attaches it to the overview cache row's `read`
-- on read (lib/company-overview-cache.ts). When absent, the read card falls back
-- to the bucket label + gloss, so a missing row never blanks the card.
--
-- Written by the service role (the generation script). Apply manually in the
-- Supabase SQL editor, then run:  notify pgrst, 'reload schema';

create table if not exists company_story (
    company_code   text primary key,
    -- 2-4 word pill naming the engine, e.g. "Copper pivot", "Monopoly exchange".
    engine_tag     text not null,
    -- One sentence: engine -> where it stands -> price lean. <=180 chars by
    -- convention (clamped in the generator, not enforced here).
    story_line     text not null,
    -- Provenance: when it was synthesized, the substrate fingerprint it was
    -- generated against (to detect staleness), and the model that wrote it.
    generated_at   timestamptz not null default now(),
    substrate_hash text,
    model          text,
    updated_at     timestamptz not null default now()
);

-- Public read, service-role write. Same convention as hot_themes.sql: RLS on with a
-- permissive SELECT policy for anon/authenticated; NO write policy, so only the
-- service role (the generation script) can write. Without the SELECT policy, RLS-on
-- returns zero rows to the app's anon client and every read card silently falls back
-- to the bucket gloss even though rows exist.
alter table public.company_story enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'company_story'
      and policyname = 'allow_read_company_story'
  ) then
    create policy allow_read_company_story
      on public.company_story
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- Integrity check after a generation run (surfaces typo'd / uncovered codes):
--   select cs.company_code
--   from company_story cs
--   left join company c on upper(c.code) = upper(cs.company_code)
--   where c.code is null;

-- After applying:
--   notify pgrst, 'reload schema';
