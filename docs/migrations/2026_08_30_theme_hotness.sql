-- 2026-08-30 — Add the "In Focus" attention meter to the theme table.
--
-- hotness (1-5, nullable) is an editorial measure of how much a theme is drawing
-- attention now (earnings momentum, re-rating, community buzz). It is the PRIMARY
-- board ordering key on /themes and /desk (hotness desc nulls last, then sort).
-- Hand-set per results season. A measure of attention, NOT investment advice.
--
-- Data/DDL change, applied manually in the Supabase SQL editor. Run notify pgrst
-- afterwards so PostgREST picks up the new column.

alter table theme add column if not exists hotness smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'theme_hotness_range') then
    alter table theme add constraint theme_hotness_range
      check (hotness is null or hotness between 1 and 5);
  end if;
end $$;

-- Board order is hotness desc then sort — recreate the featured index to match.
-- (Cosmetic at 13 rows, but keeps the index aligned with the query.)
drop index if exists idx_theme_featured;
create index if not exists idx_theme_featured
  on theme (hotness desc nulls last, sort) where is_featured;

-- Seed the initial hand-set ratings (from the 2026-08-30 hotness review).
-- Featured themes only; benched themes stay null (no meter).
update theme set hotness = 5, updated_at = now() where slug = 'ai-datacentre-fibre';
update theme set hotness = 4, updated_at = now() where slug = 'defence-order-inflows';
update theme set hotness = 4, updated_at = now() where slug = 'metals-mining-upcycle';
update theme set hotness = 4, updated_at = now() where slug = 'transmission-grid-capex';
update theme set hotness = 3, updated_at = now() where slug = 'auto-components-premiumisation';
update theme set hotness = 2, updated_at = now() where slug = 'cdmo-crams';
update theme set hotness = 2, updated_at = now() where slug = 'specialty-chemicals-rebound';

-- PostgREST caches the schema — reload it so `hotness` is queryable:
--   notify pgrst, 'reload schema';
--
-- Verify:
--   select slug, is_featured, sort, hotness from theme order by hotness desc nulls last, sort;
