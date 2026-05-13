-- Feedback polls: outbound, time-boxed, quantitative questions surfaced as a
-- dismissible banner. Scales out the qualitative 1:1 feedback loop.
--
-- Two tables: feedback_polls (admin-authored definitions) and
-- feedback_poll_responses (visitor responses, deduped per visitor_id).
--
-- Apply manually in the Supabase SQL editor. After applying, run
--   notify pgrst, 'reload schema';
-- to clear the PostgREST schema cache.

-- ---------------------------------------------------------------------------
-- feedback_polls — admin-authored poll definitions
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_polls (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  question_text text not null,
  question_type text not null check (
    question_type in ('single_choice', 'multi_select', 'rating_1_5')
  ),
  options jsonb null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz null,
  status text not null default 'draft' check (
    status in ('draft', 'live', 'closed')
  ),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_feedback_polls_slug
  on public.feedback_polls (slug);

-- Composite index for the hot getActivePoll() query:
--   where status = 'live'
--     and starts_at <= now()
--     and (ends_at is null or ends_at > now())
--   order by starts_at desc limit 1
create index if not exists idx_feedback_polls_active
  on public.feedback_polls (status, starts_at desc, ends_at);

alter table public.feedback_polls enable row level security;

-- No anon read. Active-poll selection happens server-side via the anon
-- supabase client using a security-definer function; admin reads via service role.
-- (No insert/update policies for anon/authenticated — admin writes go through
-- the service-role-backed /api/admin/feedback-polls route.)

-- ---------------------------------------------------------------------------
-- feedback_poll_responses — one row per (poll_id, visitor_id) tuple
-- ---------------------------------------------------------------------------

create table if not exists public.feedback_poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.feedback_polls (id) on delete cascade,
  visitor_id text not null,
  response_value jsonb not null,
  source_path text null,
  user_agent text null,
  submitted_at timestamptz not null default now()
);

-- Dedup: at most one response per (poll, visitor) tuple.
create unique index if not exists idx_feedback_poll_responses_unique
  on public.feedback_poll_responses (poll_id, visitor_id);

-- Submission-time index for admin freshness queries.
create index if not exists idx_feedback_poll_responses_submitted_at
  on public.feedback_poll_responses (submitted_at desc);

alter table public.feedback_poll_responses enable row level security;

-- Allow anon and authenticated to insert responses. The /respond route
-- mediates the actual validation; this policy just allows the underlying
-- insert when called via the server-side anon client.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_poll_responses'
      and policyname = 'allow_insert_feedback_poll_responses'
  ) then
    create policy allow_insert_feedback_poll_responses
      on public.feedback_poll_responses
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- get_active_feedback_poll — security definer so the anon client can read
-- the single currently-live poll without granting blanket SELECT on the table.
-- ---------------------------------------------------------------------------

create or replace function public.get_active_feedback_poll()
returns table (
  id uuid,
  slug text,
  question_text text,
  question_type text,
  options jsonb,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, slug, question_text, question_type, options, starts_at, ends_at
  from public.feedback_polls
  where status = 'live'
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  order by starts_at desc
  limit 1;
$$;

grant execute on function public.get_active_feedback_poll() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- aggregate_feedback_poll_responses — per-poll counts for the admin view.
-- Returns shape varies by question_type:
--   single_choice / multi_select:
--     { total_responses, question_type, counts: { "<option_key>": <count>, ... } }
--   rating_1_5:
--     { total_responses, question_type, mean, counts: { "1": n, "2": n, ..., "5": n } }
-- ---------------------------------------------------------------------------

create or replace function public.aggregate_feedback_poll_responses(poll uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q_type text;
  total_count bigint;
  counts_obj jsonb;
  mean_val numeric;
begin
  select question_type into q_type
  from public.feedback_polls
  where id = poll;

  if q_type is null then
    return jsonb_build_object('total_responses', 0, 'question_type', null, 'counts', '{}'::jsonb);
  end if;

  select count(*) into total_count
  from public.feedback_poll_responses
  where poll_id = poll;

  if q_type = 'single_choice' then
    select coalesce(jsonb_object_agg(option_key, count), '{}'::jsonb) into counts_obj
    from (
      select response_value->>'option_key' as option_key, count(*) as count
      from public.feedback_poll_responses
      where poll_id = poll
        and response_value ? 'option_key'
      group by response_value->>'option_key'
    ) per_option;

    return jsonb_build_object(
      'total_responses', total_count,
      'question_type', q_type,
      'counts', counts_obj
    );

  elsif q_type = 'multi_select' then
    select coalesce(jsonb_object_agg(option_key, count), '{}'::jsonb) into counts_obj
    from (
      select option_key, count(*) as count
      from public.feedback_poll_responses,
           lateral jsonb_array_elements_text(
             case
               when jsonb_typeof(response_value->'option_keys') = 'array'
                 then response_value->'option_keys'
               else '[]'::jsonb
             end
           ) as option_key
      where poll_id = poll
      group by option_key
    ) per_option;

    return jsonb_build_object(
      'total_responses', total_count,
      'question_type', q_type,
      'counts', counts_obj
    );

  elsif q_type = 'rating_1_5' then
    select coalesce(jsonb_object_agg(value::text, count), '{}'::jsonb) into counts_obj
    from (
      select (response_value->>'value')::int as value, count(*) as count
      from public.feedback_poll_responses
      where poll_id = poll
        and response_value ? 'value'
      group by (response_value->>'value')::int
    ) per_value;

    select avg((response_value->>'value')::int) into mean_val
    from public.feedback_poll_responses
    where poll_id = poll
      and response_value ? 'value';

    return jsonb_build_object(
      'total_responses', total_count,
      'question_type', q_type,
      'mean', mean_val,
      'counts', counts_obj
    );
  end if;

  return jsonb_build_object('total_responses', total_count, 'question_type', q_type, 'counts', '{}'::jsonb);
end;
$$;

grant execute on function public.aggregate_feedback_poll_responses(uuid) to service_role;
