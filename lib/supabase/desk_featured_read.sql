-- Desk "Featured Reads" editorial strip — one curated card per notable section
-- upgrade or new-coverage event. Authored by the concallyser producer skills
-- (guidance-deep-track, company-quarter-refresh, valuation-refresh) at promote
-- time; the concall-alpha portal is a read-only consumer. Deliberately SEPARATE
-- from homepage_activity_feed, which is a rebuilt-from-scratch projection that
-- would clobber any editorial copy written onto it.
--
-- Structural authority: /schemas/desk_featured_read_v1.json (versioned, shared).
-- Manual-apply file: paste into the Supabase SQL editor, then run
--   notify pgrst, 'reload schema';
-- PostgREST caches the schema; without the notify the new table 404s.

create table if not exists public.desk_featured_read (
  id text primary key,
  company_code text not null,
  company_name text not null,
  sector text null,
  section text not null check (
    section in (
      'guidance',
      'growth',
      'quarter',
      'valuation',
      'business_snapshot',
      'key_variables',
      'moat'
    )
  ),
  tag_label text not null,
  change_kind text not null check (
    change_kind in ('new_coverage', 'upgraded', 'refreshed')
  ),
  headline text not null,
  summary text not null,
  section_href text not null,
  feature_weight integer not null default 0 check (feature_weight between 0 and 100),
  published_at timestamptz not null default now(),
  status text not null default 'eligible' check (status in ('eligible', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional producer-supplied card image (2026-09-14): a site-relative path to a
-- file under concall-alpha/public (e.g. a Journal write-up's poster) plus its alt
-- text. Additive and nullable, so it is safe to apply before or after the portal
-- deploy — the portal falls back to its old column list until these exist.
alter table public.desk_featured_read
  add column if not exists image_url text null,
  add column if not exists image_alt text null;

-- The portal reads only eligible rows and takes the freshest few. Column order
-- mirrors the query exactly (lib/desk-featured/data.ts, driven by
-- SELECTION_ORDER): equality filter first, then the recency sort key, then the
-- tie-breaker. Leading with feature_weight instead cannot serve that sort.
drop index if exists public.idx_desk_featured_read_pool;
create index if not exists idx_desk_featured_read_eligible_recent
  on public.desk_featured_read (status, published_at desc, feature_weight desc, id);

alter table public.desk_featured_read enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'desk_featured_read'
      and policyname = 'allow_read_desk_featured_read'
  ) then
    create policy allow_read_desk_featured_read
      on public.desk_featured_read
      for select
      to anon, authenticated
      using (status = 'eligible');
  end if;
end $$;
