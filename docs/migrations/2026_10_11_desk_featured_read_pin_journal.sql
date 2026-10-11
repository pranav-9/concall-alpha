-- Apply by hand in the Supabase SQL editor (concall-alpha PR: desk/featured-read-pin-journal).
-- 1. The section check learns 'journal' (a Journal post featured as a read in its own right).
-- 2. pinned_until: while in the future, the card holds the strip's hero slot.
-- Then reload PostgREST's schema cache.

alter table public.desk_featured_read
  drop constraint if exists desk_featured_read_section_check;
alter table public.desk_featured_read
  add constraint desk_featured_read_section_check check (
    section in (
      'guidance', 'growth', 'quarter', 'valuation',
      'business_snapshot', 'key_variables', 'moat', 'journal'
    )
  );

alter table public.desk_featured_read
  add column if not exists pinned_until timestamptz null;

notify pgrst, 'reload schema';
