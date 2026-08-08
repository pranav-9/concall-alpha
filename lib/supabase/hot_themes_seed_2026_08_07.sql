-- Hot Themes seed — Q1 FY27 (source: docs/feature-level/hot-themes-page-copy-2026-08-07.md)
--
-- Paste into the Supabase SQL editor. Idempotent: re-running upserts (no dupes).
-- Scores/Trend are NOT seeded here — they join live from the leaderboard by
-- company_code. This file only sets which themes are featured and who belongs.
--
-- After applying, run the integrity check at the bottom, then:
--   notify pgrst, 'reload schema';
--
-- Order convention: sort 1..8 = heat order from the doc. Defence (sort 5) was
-- benched 2026-08-08, so 7 themes render live (1-4, 6-8). The "on the bench" themes
-- are seeded is_featured=false (staged, not rendered; /themes only queries
-- is_featured=true) so they are ready to flip live later.

begin;

-- ---------------------------------------------------------------------------
-- Themes
-- ---------------------------------------------------------------------------
insert into theme (slug, title, blurb, is_featured, sort) values
  ('ai-datacentre-fibre',
   'AI data-centre & fibre build-out',
   'A ~$700bn global hyperscaler capex wave is re-rating India''s fibre and compute suppliers; optical-fibre and AI-server names are guiding to data-centre-led demand visibility that didn''t exist a year ago.',
   true, 1),
  ('transmission-grid-capex',
   'Transmission & grid capex',
   'India''s grid build-out has become a multi-year order cycle — a ~Rs 9 lakh crore transmission pipeline to 2032; transformer, conductor and T&D-EPC suppliers are converting it into rising, longer-dated order books.',
   true, 2),
  ('metals-mining-upcycle',
   'Metals & mining up-cycle',
   'Metals led every sector in Q1 FY27 with ~53% earnings growth; firm ferro-alloy and base-metal realisations are dropping straight to margin for integrated and recycling players.',
   true, 3),
  ('specialty-chemicals-rebound',
   'Specialty-chemicals rebound',
   'After two lean years the cycle is turning — Chinese supply restraint and customer restocking are lifting volumes and pricing, and a sharp Q1 FY27 profit rebound off a low base is the first hard confirmation.',
   true, 4),
  -- Benched 2026-08-08 (removed from featured for now; members kept, ready to flip live).
  ('defence-order-inflows',
   'Defence order inflows',
   'Record MoD order finalisations this quarter; component and precision-engineering suppliers are guiding to multi-year execution visibility and rising indigenisation content.',
   false, 106),
  ('cdmo-crams',
   'CDMO & CRAMS',
   'Pharma lagged the quarter overall, but the outsourcing names buck it; CDMO/CRAMS players are guiding to fuller pipelines as global clients restock and re-shore supply away from China.',
   true, 6),
  ('capital-markets-boom',
   'Capital-markets boom',
   'BFSI led Q1 FY27, with finance-company profit up ~36%; the market-participation flywheel is lifting wealth managers, AMCs and exchanges on rising volumes, flows and folios.',
   true, 7),
  ('auto-components-premiumisation',
   'Auto components & premiumisation',
   'Autos were a Q1 FY27 revenue leader with sales up ~44%; rising content-per-vehicle and premiumisation are pushing ancillary revenue ahead of the underlying volume cycle.',
   true, 8),
  -- On the bench — staged, not featured (do not render yet).
  ('cables-wires',
   'Cables & wires',
   'Structural wiring and power-cable demand riding construction and grid capex; publish once cut cleanly from themes 1-2.',
   false, 101),
  ('travel-tourism',
   'Travel & tourism up-cycle',
   'Discretionary travel and hospitality demand running hot; thin coverage, RateGain the hero.',
   false, 102),
  ('jewellery-gold-retail',
   'Jewellery & gold retail',
   'Organised jewellery retail taking share as gold demand and formalisation hold up.',
   false, 103),
  ('ev-electrification',
   'EV / electrification',
   'Two-wheeler EV and vehicle-electrification content lifting select ancillaries.',
   false, 104),
  ('ems',
   'Electronics manufacturing (EMS)',
   'EMS bifurcating — order-rich names re-rating while others roll over; publish only once winners split from laggards.',
   false, 105)
on conflict (slug) do update
  set title = excluded.title,
      blurb = excluded.blurb,
      is_featured = excluded.is_featured,
      sort = excluded.sort,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- Memberships (theme_slug, company_code). Ranking is by live Read, so insert
-- order is informational only. as_of_quarter = 'Q1FY27' for the whole batch.
-- ---------------------------------------------------------------------------
insert into theme_membership (theme_slug, company_code, as_of_quarter) values
  -- 1 · AI data-centre & fibre build-out
  ('ai-datacentre-fibre', 'HFCL',       'Q1FY27'),
  ('ai-datacentre-fibre', 'STLTECH',    'Q1FY27'),
  ('ai-datacentre-fibre', 'NETWEB',     'Q1FY27'),
  -- 2 · Transmission & grid capex
  ('transmission-grid-capex', 'TRANSRAILL', 'Q1FY27'),
  ('transmission-grid-capex', 'TDPOWERSYS', 'Q1FY27'),
  ('transmission-grid-capex', 'BHAGYANGR',  'Q1FY27'),
  ('transmission-grid-capex', 'QPOWER',     'Q1FY27'),
  ('transmission-grid-capex', 'TARIL',      'Q1FY27'),
  ('transmission-grid-capex', 'APARINDS',   'Q1FY27'),
  ('transmission-grid-capex', 'SCHNEIDER',  'Q1FY27'),
  -- 3 · Metals & mining up-cycle
  ('metals-mining-upcycle', 'LLOYDSME', 'Q1FY27'),
  ('metals-mining-upcycle', 'IMFA',     'Q1FY27'),
  ('metals-mining-upcycle', 'POCL',     'Q1FY27'),
  ('metals-mining-upcycle', 'GPIL',     'Q1FY27'),
  ('metals-mining-upcycle', 'WELCORP',  'Q1FY27'),
  ('metals-mining-upcycle', 'GRAVITA',  'Q1FY27'),
  -- 4 · Specialty-chemicals rebound
  ('specialty-chemicals-rebound', 'YASHO',      'Q1FY27'),
  ('specialty-chemicals-rebound', 'FCL',        'Q1FY27'),
  ('specialty-chemicals-rebound', 'ACUTAAS',    'Q1FY27'),
  ('specialty-chemicals-rebound', 'NAVINFLUOR', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'AETHER',     'Q1FY27'),
  ('specialty-chemicals-rebound', 'AARTIDRUGS', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'PRIVISCL',   'Q1FY27'),
  ('specialty-chemicals-rebound', 'VISHNU',     'Q1FY27'),
  -- 5 · Defence order inflows
  ('defence-order-inflows', 'MTARTECH',   'Q1FY27'),
  ('defence-order-inflows', 'GRSE',       'Q1FY27'),
  ('defence-order-inflows', 'ASTRAMICRO', 'Q1FY27'),
  -- 6 · CDMO & CRAMS
  ('cdmo-crams', 'SENORES',    'Q1FY27'),
  ('cdmo-crams', 'SAILIFE',    'Q1FY27'),
  ('cdmo-crams', 'LAURUSLABS', 'Q1FY27'),
  ('cdmo-crams', 'WINDLAS',    'Q1FY27'),
  ('cdmo-crams', 'INNOVACAP',  'Q1FY27'),
  ('cdmo-crams', 'GLAND',      'Q1FY27'),
  ('cdmo-crams', 'NEULANDLAB', 'Q1FY27'),
  -- 7 · Capital-markets boom
  ('capital-markets-boom', 'NUVAMA',    'Q1FY27'),
  ('capital-markets-boom', 'MCX',       'Q1FY27'),
  ('capital-markets-boom', 'ABSLAMC',   'Q1FY27'),
  ('capital-markets-boom', 'NAM_INDIA', 'Q1FY27'),  -- verify: folder is NAM_INDIA, NSE symbol is NAM-INDIA
  ('capital-markets-boom', 'CDSL',      'Q1FY27'),
  -- 8 · Auto components & premiumisation (all 11 in coverage; UI caps display)
  ('auto-components-premiumisation', 'LUMAXIND',   'Q1FY27'),
  ('auto-components-premiumisation', 'SJS',        'Q1FY27'),
  ('auto-components-premiumisation', 'ENDURANCE',  'Q1FY27'),
  ('auto-components-premiumisation', 'GALAPREC',   'Q1FY27'),
  ('auto-components-premiumisation', 'SANSERA',    'Q1FY27'),
  ('auto-components-premiumisation', 'FIEMIND',    'Q1FY27'),
  ('auto-components-premiumisation', 'HAPPYFORGE', 'Q1FY27'),
  ('auto-components-premiumisation', 'LUMAXTECH',  'Q1FY27'),
  ('auto-components-premiumisation', 'UNOMINDA',   'Q1FY27'),
  ('auto-components-premiumisation', 'SHRIPISTON', 'Q1FY27'),
  ('auto-components-premiumisation', 'PRICOLLTD',  'Q1FY27'),
  -- On the bench (staged, non-featured)
  ('cables-wires', 'KSHINTL', 'Q1FY27'),
  ('cables-wires', 'KEI',     'Q1FY27'),
  ('cables-wires', 'RRKABEL', 'Q1FY27'),
  ('travel-tourism', 'RATEGAIN', 'Q1FY27'),
  ('travel-tourism', 'SAMHI',    'Q1FY27'),
  ('travel-tourism', 'YATRA',    'Q1FY27'),
  ('jewellery-gold-retail', 'KDDL',       'Q1FY27'),
  ('jewellery-gold-retail', 'KALYANKJIL', 'Q1FY27'),
  ('jewellery-gold-retail', 'GOLDIAM',    'Q1FY27'),
  ('jewellery-gold-retail', 'SENCO',      'Q1FY27'),
  ('ev-electrification', 'ATHERENERG', 'Q1FY27'),
  ('ev-electrification', 'FIEMIND',    'Q1FY27'),
  ('ev-electrification', 'UNOMINDA',   'Q1FY27'),
  ('ems', 'NETWEB',  'Q1FY27'),
  ('ems', 'AIMTRON', 'Q1FY27'),
  ('ems', 'VINYAS',  'Q1FY27'),
  ('ems', 'DIXON',   'Q1FY27'),
  ('ems', 'KAYNES',  'Q1FY27'),
  ('ems', 'PGEL',    'Q1FY27')
on conflict (theme_slug, company_code) do update
  set as_of_quarter = excluded.as_of_quarter,
      last_reviewed_at = now(),
      updated_at = now();

commit;

-- ---------------------------------------------------------------------------
-- Integrity check — run this AFTER the inserts. Any row returned is a code the
-- data layer will silently drop at render (esp. NAM_INDIA vs NAM-INDIA). Fix or
-- delete those before considering the seed done.
-- ---------------------------------------------------------------------------
-- select tm.theme_slug, tm.company_code
-- from theme_membership tm
-- left join company c on upper(c.code) = upper(tm.company_code)
-- where c.code is null
-- order by tm.theme_slug;

-- Then reload PostgREST's schema cache:
-- notify pgrst, 'reload schema';
