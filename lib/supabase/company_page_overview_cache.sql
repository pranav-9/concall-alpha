-- First-screen company page overview cache for fast, cacheable /company/[code] reads.
create table if not exists public.company_page_overview_cache (
  company_code text primary key,
  company_name text not null,
  is_new boolean not null default false,
  sector text null,
  sub_sector text null,
  market_cap_band text null,
  latest_score numeric null,
  quarter_rank integer null,
  quarter_total integer null,
  quarter_percentile numeric null,
  growth_score numeric null,
  growth_rank integer null,
  growth_total integer null,
  growth_percentile numeric null,
  sector_rank integer null,
  sector_total integer null,
  sector_percentile numeric null,
  moat_label text null,
  moat_tier_label text null,
  key_variable_count integer null,
  guidance_count integer null,
  guidance_verdict_key text null,
  guidance_verdict_label text null,
  revenue_guidance_label text null,
  business_segment_mix jsonb null,
  overview_takeaways jsonb null,
  section_availability jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- v2 (overview scorecard takeaways). On existing DBs apply this ALTER manually,
-- then run: notify pgrst, 'reload schema';
alter table public.company_page_overview_cache
  add column if not exists overview_takeaways jsonb null;

-- v3 (AMFI market-cap band chip). On existing DBs apply this ALTER manually,
-- then run: notify pgrst, 'reload schema';
alter table public.company_page_overview_cache
  add column if not exists market_cap_band text null;

create index if not exists idx_company_page_overview_cache_sector
  on public.company_page_overview_cache (sector);

create index if not exists idx_company_page_overview_cache_refreshed_at_desc
  on public.company_page_overview_cache (refreshed_at desc);

alter table public.company_page_overview_cache enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_page_overview_cache'
      and policyname = 'allow_read_company_page_overview_cache'
  ) then
    create policy allow_read_company_page_overview_cache
      on public.company_page_overview_cache
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
