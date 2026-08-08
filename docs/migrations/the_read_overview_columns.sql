-- "The Read" overview redesign (T1) — new columns on the company-page overview
-- cache. The page reads only the `selectColumns` list in
-- lib/company-overview-cache.ts, so these must exist in the table AND be added
-- to that list (already done) or the fields render as null.
--
-- Apply MANUALLY in the Supabase SQL editor (portal SQL is not auto-migrated),
-- then reload the PostgREST schema cache. `read` is intentionally NOT a column:
-- it is derived on read from the three leg scores (deriveOverviewRead).

alter table company_page_overview_cache
  add column if not exists quarter_label text,
  add column if not exists qoq_delta numeric,
  add column if not exists quarter_series jsonb,
  add column if not exists growth_scenarios jsonb,
  add column if not exists valuation_score numeric,
  add column if not exists valuation_priced_as_of text,
  add column if not exists valuation_stale boolean not null default false;

notify pgrst, 'reload schema';
