create table if not exists public.watchlists (
  id bigserial primary key,
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlist_items (
  id bigserial primary key,
  watchlist_id bigint not null references public.watchlists(id) on delete cascade,
  company_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_watchlists_user_created_at
  on public.watchlists (user_id, created_at);

create unique index if not exists watchlist_items_watchlist_company_key
  on public.watchlist_items (watchlist_id, company_code);

create index if not exists idx_watchlist_items_company_code
  on public.watchlist_items (company_code);

alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'watchlists'
      and policyname = 'watchlists_select_own'
  ) then
    create policy watchlists_select_own
      on public.watchlists
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'watchlists'
      and policyname = 'watchlists_insert_own'
  ) then
    create policy watchlists_insert_own
      on public.watchlists
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'watchlists'
      and policyname = 'watchlists_update_own'
  ) then
    create policy watchlists_update_own
      on public.watchlists
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'watchlists'
      and policyname = 'watchlists_delete_own'
  ) then
    create policy watchlists_delete_own
      on public.watchlists
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'watchlist_items'
      and policyname = 'watchlist_items_select_own'
  ) then
    create policy watchlist_items_select_own
      on public.watchlist_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.watchlists
          where watchlists.id = watchlist_items.watchlist_id
            and watchlists.user_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'watchlist_items'
      and policyname = 'watchlist_items_insert_own'
  ) then
    create policy watchlist_items_insert_own
      on public.watchlist_items
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.watchlists
          where watchlists.id = watchlist_items.watchlist_id
            and watchlists.user_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'watchlist_items'
      and policyname = 'watchlist_items_delete_own'
  ) then
    create policy watchlist_items_delete_own
      on public.watchlist_items
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.watchlists
          where watchlists.id = watchlist_items.watchlist_id
            and watchlists.user_id = auth.uid()
        )
      );
  end if;
end
$$;
