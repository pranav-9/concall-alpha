-- Admin Accounts → "Recently active": the latest session activity per account.
--
-- auth.sessions is not exposed over PostgREST, so this security-definer
-- function reads it and returns only an aggregate per user: when a session of
-- theirs last moved, and how many live sessions they hold. No tokens, IPs or
-- user agents leave the auth schema.
--
-- Why sessions: middleware.ts calls supabase.auth.getClaims() on every request,
-- which rotates an expired access token (1h by default) and bumps the
-- session's refreshed_at / updated_at. So the newest session timestamp is the
-- account's last page load, to within about an hour. auth.users.last_sign_in_at
-- is not: it only moves on a fresh sign-in, and most readers stay signed in.
--
-- Service role only — the revoke matters: functions are executable by PUBLIC
-- by default, and this one reads the auth schema.
--
-- Migration 2026-10-08: run in the Supabase SQL editor, then:
--   notify pgrst, 'reload schema';

create or replace function public.admin_account_activity()
returns table (user_id uuid, last_active_at timestamptz, session_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.user_id,
    -- refreshed_at is `timestamp` (UTC, no zone); updated_at is timestamptz.
    -- greatest() skips nulls, so a session that never refreshed still counts.
    greatest(max(s.updated_at), max(s.refreshed_at at time zone 'UTC')) as last_active_at,
    count(*)::bigint as session_count
  from auth.sessions s
  group by s.user_id;
$$;

revoke all on function public.admin_account_activity() from public, anon, authenticated;
grant execute on function public.admin_account_activity() to service_role;
