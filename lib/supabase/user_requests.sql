-- User request intake table for feedback, stock additions, and bug reports
create table if not exists public.user_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('feedback', 'stock_addition', 'bug_report')),
  subject_target text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'reviewed', 'in_progress', 'resolved', 'closed')),
  source_path text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_requests_created_at_desc
  on public.user_requests (created_at desc);

create index if not exists idx_user_requests_status
  on public.user_requests (status);

create index if not exists idx_user_requests_request_type
  on public.user_requests (request_type);

-- Keep inserts server-mediated via API route.
alter table public.user_requests enable row level security;

-- Allow inserts from anon/authenticated clients (the app uses server route inserts).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_requests'
      and policyname = 'allow_insert_user_requests'
  ) then
    create policy allow_insert_user_requests
      on public.user_requests
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

