-- Anonymous page-view tracking for admin analytics
create table if not exists public.page_view_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  path text not null,
  company_code text null,
  user_agent text null,
  referrer text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_page_view_events_created_at_desc
  on public.page_view_events (created_at desc);

create index if not exists idx_page_view_events_visitor_id
  on public.page_view_events (visitor_id);

create index if not exists idx_page_view_events_company_code_created_at
  on public.page_view_events (company_code, created_at desc);

create index if not exists idx_page_view_events_path_created_at
  on public.page_view_events (path, created_at desc);

alter table public.page_view_events enable row level security;

-- Insert-only from anonymous/authenticated traffic.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'page_view_events'
      and policyname = 'allow_insert_page_view_events'
  ) then
    create policy allow_insert_page_view_events
      on public.page_view_events
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

-- Aggregation helper for admin metrics.
create or replace function public.count_unique_visitors(start_ts timestamptz)
returns bigint
language sql
stable
as $$
  select count(distinct visitor_id)::bigint
  from public.page_view_events
  where created_at >= start_ts;
$$;

create or replace function public.get_top_company_views(
  start_ts timestamptz,
  limit_n int default 50
)
returns table (
  company_code text,
  company_name text,
  views bigint,
  last_viewed timestamptz
)
language sql
stable
as $$
  select
    p.company_code,
    p.company_code as company_name,
    count(*)::bigint as views,
    max(p.created_at) as last_viewed
  from public.page_view_events p
  where p.company_code is not null
    and p.created_at >= start_ts
  group by p.company_code
  order by views desc, last_viewed desc
  limit greatest(limit_n, 1);
$$;

grant execute on function public.count_unique_visitors(timestamptz) to service_role;
grant execute on function public.get_top_company_views(timestamptz, int) to service_role;
