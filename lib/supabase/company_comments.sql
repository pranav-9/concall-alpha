-- Company community comments + likes + reports
create table if not exists public.company_comments (
  id uuid primary key default gen_random_uuid(),
  company_code text not null,
  comment_text text not null,
  visitor_id text not null,
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  likes_count int not null default 0,
  reports_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_comments_comment_text_len check (length(btrim(comment_text)) between 3 and 1500),
  constraint company_comments_company_code_format check (company_code ~ '^[A-Za-z0-9._-]{1,24}$')
);

create index if not exists idx_company_comments_company_created_desc
  on public.company_comments (company_code, created_at desc);

create index if not exists idx_company_comments_status_created_desc
  on public.company_comments (status, created_at desc);

create index if not exists idx_company_comments_visitor_id
  on public.company_comments (visitor_id);

create table if not exists public.company_comment_likes (
  comment_id uuid not null references public.company_comments(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, visitor_id)
);

create index if not exists idx_company_comment_likes_visitor_created_desc
  on public.company_comment_likes (visitor_id, created_at desc);

create table if not exists public.company_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.company_comments(id) on delete cascade,
  visitor_id text not null,
  reason text null,
  created_at timestamptz not null default now(),
  constraint company_comment_reports_reason_len check (reason is null or length(btrim(reason)) <= 500),
  constraint company_comment_reports_unique unique (comment_id, visitor_id)
);

create index if not exists idx_company_comment_reports_created_desc
  on public.company_comment_reports (created_at desc);

create index if not exists idx_company_comment_reports_comment_id
  on public.company_comment_reports (comment_id);

create or replace function public.set_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_company_comments_updated_at on public.company_comments;
create trigger set_company_comments_updated_at
before update on public.company_comments
for each row execute function public.set_timestamp_updated_at();

alter table public.company_comments enable row level security;
alter table public.company_comment_likes enable row level security;
alter table public.company_comment_reports enable row level security;

-- Public read of visible comments for app consumption.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comments'
      and policyname = 'select_visible_company_comments'
  ) then
    create policy select_visible_company_comments
      on public.company_comments
      for select
      to anon, authenticated
      using (status = 'visible');
  end if;
end $$;

-- Allow anonymous/authenticated writes via route handlers.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comments'
      and policyname = 'insert_company_comments'
  ) then
    create policy insert_company_comments
      on public.company_comments
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comments'
      and policyname = 'update_company_comments'
  ) then
    create policy update_company_comments
      on public.company_comments
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comment_likes'
      and policyname = 'select_company_comment_likes'
  ) then
    create policy select_company_comment_likes
      on public.company_comment_likes
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comment_likes'
      and policyname = 'insert_company_comment_likes'
  ) then
    create policy insert_company_comment_likes
      on public.company_comment_likes
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comment_likes'
      and policyname = 'delete_company_comment_likes'
  ) then
    create policy delete_company_comment_likes
      on public.company_comment_likes
      for delete
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comment_reports'
      and policyname = 'select_company_comment_reports'
  ) then
    create policy select_company_comment_reports
      on public.company_comment_reports
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'company_comment_reports'
      and policyname = 'insert_company_comment_reports'
  ) then
    create policy insert_company_comment_reports
      on public.company_comment_reports
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

-- Atomic like toggle. Returns the new state and authoritative counter.
-- Single statement per branch so the update happens inside the same
-- transaction as the insert/delete against company_comment_likes.
create or replace function public.toggle_company_comment_like(
  p_comment_id uuid,
  p_visitor_id text
)
returns table(liked boolean, likes_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
  v_count int;
begin
  if not exists (
    select 1 from public.company_comments
    where id = p_comment_id and status = 'visible'
  ) then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;

  delete from public.company_comment_likes
  where comment_id = p_comment_id and visitor_id = p_visitor_id;
  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    update public.company_comments
    set likes_count = greatest(likes_count - 1, 0)
    where id = p_comment_id
    returning public.company_comments.likes_count into v_count;
    return query select false, v_count;
  else
    insert into public.company_comment_likes(comment_id, visitor_id)
    values (p_comment_id, p_visitor_id)
    on conflict (comment_id, visitor_id) do nothing;

    update public.company_comments
    set likes_count = likes_count + 1
    where id = p_comment_id
    returning public.company_comments.likes_count into v_count;
    return query select true, v_count;
  end if;
end;
$$;

-- Atomic report insert + counter bump; idempotent per (comment, visitor).
create or replace function public.report_company_comment(
  p_comment_id uuid,
  p_visitor_id text,
  p_reason text
)
returns table(reports_count integer, already_reported boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
  v_count int;
begin
  if not exists (
    select 1 from public.company_comments
    where id = p_comment_id and status = 'visible'
  ) then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;

  insert into public.company_comment_reports(comment_id, visitor_id, reason)
  values (p_comment_id, p_visitor_id, p_reason)
  on conflict (comment_id, visitor_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.company_comments
    set reports_count = reports_count + 1
    where id = p_comment_id
    returning public.company_comments.reports_count into v_count;
    return query select v_count, false;
  else
    select c.reports_count into v_count
    from public.company_comments c
    where c.id = p_comment_id;
    return query select v_count, true;
  end if;
end;
$$;

grant execute on function public.toggle_company_comment_like(uuid, text) to anon, authenticated;
grant execute on function public.report_company_comment(uuid, text, text) to anon, authenticated;
