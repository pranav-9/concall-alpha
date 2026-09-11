-- Sample Featured Reads for local build / QA before the concallyser producers
-- start writing rows. Mirrors the reference mockup. Safe to re-run (upsert).
-- Apply AFTER desk_featured_read.sql, in the Supabase SQL editor. Delete these
-- rows once real producer output exists (they are hand-written placeholders).

insert into public.desk_featured_read
  (id, company_code, company_name, sector, section, tag_label, change_kind,
   headline, summary, section_href, feature_weight, published_at, status)
values
  (
    'guidance-SUZLON-2026Q1', 'SUZLON', 'Suzlon Energy', 'Capital Goods',
    'guidance', 'Guidance re-read', 'new_coverage',
    'From turbine-maker to full-stack renewable developer',
    'The desk''s first read on Suzlon''s reset guidance. Management comes across as credible and the ambition is real — an asset-heavy turbine supplier trying to become the developer that owns the project end to end. The read digs into the one thing that decides it: whether execution can keep pace with the promise.',
    '/company/SUZLON#guidance-history', 72,
    now() - interval '18 hours', 'eligible'
  ),
  (
    'growth-COFORGE-2026Q1', 'COFORGE', 'Coforge', 'IT services',
    'growth', 'Growth update', 'upgraded',
    'Coforge rides the AI deal cycle',
    'Fresh deal wins and an upgraded outlook. Why the read calls it the board''s momentum name — and where the risk still sits.',
    '/company/COFORGE#growth-outlook', 58,
    now() - interval '7 days', 'eligible'
  ),
  (
    'guidance-GOLDIAM-2026Q1', 'GOLDIAM', 'Goldiam International', 'Consumer Durables',
    'guidance', 'Strategy', 'upgraded',
    'Funding a retail brand off the export engine',
    'A B2B jeweller quietly building an owned India brand, self-funded from export cash flow. Measured guidance — and what to watch as the capital gets deployed.',
    '/company/GOLDIAM#guidance-history', 55,
    now() - interval '1 day', 'eligible'
  )
on conflict (id) do update set
  company_name = excluded.company_name,
  sector = excluded.sector,
  section = excluded.section,
  tag_label = excluded.tag_label,
  change_kind = excluded.change_kind,
  headline = excluded.headline,
  summary = excluded.summary,
  section_href = excluded.section_href,
  feature_weight = excluded.feature_weight,
  published_at = excluded.published_at,
  status = excluded.status,
  updated_at = now();
