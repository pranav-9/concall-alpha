-- Supports activity-feed quarter delta lookup by company history.
create index if not exists idx_concall_analysis_company_fy_qtr_desc
  on public.concall_analysis (company_code, fy desc, qtr desc);

-- Supports the initial newest-first quarter activity window.
create index if not exists idx_concall_analysis_updated_at_created_at_desc
  on public.concall_analysis (updated_at desc, created_at desc);
