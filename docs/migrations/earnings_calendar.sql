-- earnings_calendar: NSE board-meeting / financial-results events,
-- ingested by /api/admin/sync-earnings-calendar.
--
-- Run this migration in the Supabase SQL editor before exercising the
-- sync route. It's safe to run multiple times.

create table if not exists public.earnings_calendar (
  id              bigserial primary key,
  nse_symbol      text not null,
  company_name    text,
  company_code    text,                       -- soft-FK to public.company.code (best-effort match)
  event_date      date not null,
  purpose         text,                       -- e.g. "Financial Results"
  description     text,                       -- bm_desc verbatim
  inferred_fy     smallint,                   -- 26 for FY26, derived from event_date month rule
  inferred_qtr    smallint,                   -- 1..4
  source          text not null default 'nse',
  raw             jsonb,                      -- original NSE payload for debugging
  fetched_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (nse_symbol, event_date)
);

create index if not exists earnings_calendar_event_date_idx
  on public.earnings_calendar (event_date);
create index if not exists earnings_calendar_company_code_idx
  on public.earnings_calendar (company_code);
create index if not exists earnings_calendar_fy_qtr_idx
  on public.earnings_calendar (inferred_fy, inferred_qtr);

alter table public.earnings_calendar enable row level security;

-- Read-only for anonymous + authenticated; writes only via service-role key.
drop policy if exists earnings_calendar_read on public.earnings_calendar;
create policy earnings_calendar_read on public.earnings_calendar
  for select using (true);
