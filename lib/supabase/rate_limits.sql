-- Fixed-window rate limiter backed by a single table + RPC.
-- Key is `{scope}:{identifier}` (e.g. "comments:POST:ip:1.2.3.4|v:abcd").
create table if not exists public.rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  count int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_window_started_at
  on public.rate_limits (window_started_at);

alter table public.rate_limits enable row level security;

-- No direct client access; only the RPC below mutates this table.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'rate_limits'
      and policyname = 'rate_limits_no_direct_access'
  ) then
    create policy rate_limits_no_direct_access
      on public.rate_limits
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end $$;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns table(allowed boolean, remaining int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_started timestamptz;
  v_count int;
  v_now timestamptz := now();
  v_window interval := make_interval(secs => p_window_seconds);
begin
  insert into public.rate_limits(key, window_started_at, count, updated_at)
  values (p_key, v_now, 1, v_now)
  on conflict (key) do update
  set
    window_started_at = case
      when public.rate_limits.window_started_at + v_window <= v_now
      then v_now
      else public.rate_limits.window_started_at
    end,
    count = case
      when public.rate_limits.window_started_at + v_window <= v_now
      then 1
      else public.rate_limits.count + 1
    end,
    updated_at = v_now
  returning public.rate_limits.window_started_at, public.rate_limits.count
  into v_window_started, v_count;

  return query select
    (v_count <= p_limit) as allowed,
    greatest(p_limit - v_count, 0) as remaining,
    (v_window_started + v_window) as reset_at;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;
