-- Lightweight API route performance telemetry for admin analytics.
-- Apply manually in Supabase SQL editor, then run:
--   notify pgrst, 'reload schema';

create table if not exists public.api_route_metrics (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  method text not null,
  status_code integer not null,
  duration_ms integer not null,
  result_count integer null,
  query_length integer null,
  error_code text null,
  created_at timestamptz not null default now(),
  constraint api_route_metrics_route_length_check check (char_length(route) <= 160),
  constraint api_route_metrics_method_length_check check (char_length(method) <= 12),
  constraint api_route_metrics_status_code_check check (status_code between 100 and 599),
  constraint api_route_metrics_duration_ms_check check (duration_ms >= 0),
  constraint api_route_metrics_result_count_check check (result_count is null or result_count >= 0),
  constraint api_route_metrics_query_length_check check (query_length is null or query_length >= 0),
  constraint api_route_metrics_error_code_length_check check (
    error_code is null or char_length(error_code) <= 80
  )
);

create index if not exists idx_api_route_metrics_created_at_desc
  on public.api_route_metrics (created_at desc);

create index if not exists idx_api_route_metrics_route_created_at
  on public.api_route_metrics (route, created_at desc);

create index if not exists idx_api_route_metrics_status_created_at
  on public.api_route_metrics (status_code, created_at desc);

alter table public.api_route_metrics enable row level security;

-- Insert-only from server route handlers using the public anon key.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'api_route_metrics'
      and policyname = 'allow_insert_api_route_metrics'
  ) then
    create policy allow_insert_api_route_metrics
      on public.api_route_metrics
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;
