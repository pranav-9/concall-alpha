-- Denormalized homepage activity feed for fast, cacheable top-N reads.
create table if not exists public.homepage_activity_feed (
  id text primary key,
  event_type text not null check (
    event_type in (
      'quarter',
      'growth',
      'business_snapshot',
      'key_variables',
      'guidance_monitor'
    )
  ),
  company_code text null,
  company_name text not null,
  company_is_new boolean not null default false,
  source_label text not null,
  detail text null,
  context_label text null,
  score numeric null,
  prior_score numeric null,
  artifact_href text null,
  event_at timestamptz null,
  sort_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_homepage_activity_feed_sort_at_desc
  on public.homepage_activity_feed (sort_at desc);

create index if not exists idx_homepage_activity_feed_company_code_sort_at
  on public.homepage_activity_feed (company_code, sort_at desc);

alter table public.homepage_activity_feed enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'homepage_activity_feed'
      and policyname = 'allow_read_homepage_activity_feed'
  ) then
    create policy allow_read_homepage_activity_feed
      on public.homepage_activity_feed
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;
