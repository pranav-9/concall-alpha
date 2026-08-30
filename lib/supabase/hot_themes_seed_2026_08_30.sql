-- Hot Themes seed — regenerated from live tables 2026-08-30 by scripts/themes-refresh.mjs.
--
-- Idempotent: re-running upserts (no dupes). Scores/Trend are NOT seeded —
-- they join live from the leaderboard by company_code. This file only sets
-- which themes are featured and who belongs. Mirror of live; apply-by-hand only
-- if rebuilding (the live DB is edited directly via service role).

begin;

insert into theme (slug, title, blurb, is_featured, sort) values
  ('ai-datacentre-fibre', 'AI data-centre & fibre build-out', 'A ~$700bn global hyperscaler capex wave is re-rating India''s fibre and compute suppliers; optical-fibre and AI-server names are guiding to data-centre-led demand visibility that didn''t exist a year ago.', true, 1),
  ('transmission-grid-capex', 'Transmission & grid capex', 'India''s grid build-out has become a multi-year order cycle — a ~Rs 9 lakh crore transmission pipeline to 2032; transformer, conductor and T&D-EPC suppliers are converting it into rising, longer-dated order books.', true, 2),
  ('metals-mining-upcycle', 'Metals & mining up-cycle', 'Metals led every sector in Q1 FY27 with ~53% earnings growth; firm ferro-alloy and base-metal realisations are dropping straight to margin for integrated and recycling players.', true, 3),
  ('specialty-chemicals-rebound', 'Specialty-chemicals rebound', 'After two lean years the cycle is turning — Chinese supply restraint and customer restocking are lifting volumes and pricing, and a sharp Q1 FY27 profit rebound off a low base is the first hard confirmation.', true, 4),
  ('defence-order-inflows', 'Defence order inflows', 'Record MoD order finalisations this quarter; component and precision-engineering suppliers are guiding to multi-year execution visibility and rising indigenisation content.', true, 5),
  ('cdmo-crams', 'CDMO & CRAMS', 'Pharma lagged the quarter overall, but the outsourcing names buck it; CDMO/CRAMS players are guiding to fuller pipelines as global clients restock and re-shore supply away from China.', true, 6),
  ('capital-markets-boom', 'Capital-markets boom', 'BFSI led Q1 FY27, with finance-company profit up ~36%; the market-participation flywheel is lifting wealth managers, AMCs and exchanges on rising volumes, flows and folios.', true, 7),
  ('auto-components-premiumisation', 'Auto components & premiumisation', 'Autos were a Q1 FY27 revenue leader with sales up ~44%; rising content-per-vehicle and premiumisation are pushing ancillary revenue ahead of the underlying volume cycle.', true, 8),
  ('cables-wires', 'Cables & wires', 'Structural wiring and power-cable demand riding construction and grid capex; publish once cut cleanly from themes 1-2.', false, 101),
  ('travel-tourism', 'Travel & tourism up-cycle', 'Discretionary travel and hospitality demand running hot; thin coverage, RateGain the hero.', false, 102),
  ('jewellery-gold-retail', 'Jewellery & gold retail', 'Organised jewellery retail taking share as gold demand and formalisation hold up.', false, 103),
  ('ev-electrification', 'EV / electrification', 'Two-wheeler EV and vehicle-electrification content lifting select ancillaries.', false, 104),
  ('ems', 'Electronics manufacturing (EMS)', 'EMS bifurcating — order-rich names re-rating while others roll over; publish only once winners split from laggards.', false, 105)
on conflict (slug) do update
  set title = excluded.title,
      blurb = excluded.blurb,
      is_featured = excluded.is_featured,
      sort = excluded.sort,
      updated_at = now();

insert into theme_membership (theme_slug, company_code, as_of_quarter) values
  ('ai-datacentre-fibre', 'E2E', 'Q1FY27'),
  ('ai-datacentre-fibre', 'HFCL', 'Q1FY27'),
  ('ai-datacentre-fibre', 'MTARTECH', 'Q1FY27'),
  ('ai-datacentre-fibre', 'NETWEB', 'Q1FY27'),
  ('ai-datacentre-fibre', 'STLTECH', 'Q1FY27'),
  ('ai-datacentre-fibre', 'TDPOWERSYS', 'Q1FY27'),
  ('transmission-grid-capex', 'ADVAIT', 'Q1FY27'),
  ('transmission-grid-capex', 'APARINDS', 'Q1FY27'),
  ('transmission-grid-capex', 'BHAGYANGR', 'Q1FY27'),
  ('transmission-grid-capex', 'KSHINTL', 'Q1FY27'),
  ('transmission-grid-capex', 'QPOWER', 'Q1FY27'),
  ('transmission-grid-capex', 'SCHNEIDER', 'Q1FY27'),
  ('transmission-grid-capex', 'TARIL', 'Q1FY27'),
  ('transmission-grid-capex', 'TRANSRAILL', 'Q1FY27'),
  ('metals-mining-upcycle', 'APLAPOLLO', 'Q1FY27'),
  ('metals-mining-upcycle', 'GPIL', 'Q1FY27'),
  ('metals-mining-upcycle', 'GRAVITA', 'Q1FY27'),
  ('metals-mining-upcycle', 'IMFA', 'Q1FY27'),
  ('metals-mining-upcycle', 'LLOYDSME', 'Q1FY27'),
  ('metals-mining-upcycle', 'POCL', 'Q1FY27'),
  ('metals-mining-upcycle', 'SAMBHV', 'Q1FY27'),
  ('metals-mining-upcycle', 'WELCORP', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'AARTIDRUGS', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'AETHER', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'FCL', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'NAVINFLUOR', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'PRIVISCL', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'VISHNU', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'YASHO', 'Q1FY27'),
  ('defence-order-inflows', 'ASTRAMICRO', 'Q1FY27'),
  ('defence-order-inflows', 'AXISCADES', 'Q1FY27'),
  ('defence-order-inflows', 'GRSE', 'Q1FY27'),
  ('defence-order-inflows', 'MTARTECH', 'Q1FY27'),
  ('defence-order-inflows', 'SANSERA', 'Q1FY27'),
  ('defence-order-inflows', 'SHREEREF', 'Q1FY27'),
  ('defence-order-inflows', 'VINYAS', 'Q1FY27'),
  ('cdmo-crams', 'ACUTAAS', 'Q1FY27'),
  ('cdmo-crams', 'GLAND', 'Q1FY27'),
  ('cdmo-crams', 'INNOVACAP', 'Q1FY27'),
  ('cdmo-crams', 'LAURUSLABS', 'Q1FY27'),
  ('cdmo-crams', 'NEULANDLAB', 'Q1FY27'),
  ('cdmo-crams', 'SAILIFE', 'Q1FY27'),
  ('cdmo-crams', 'SENORES', 'Q1FY27'),
  ('cdmo-crams', 'SHILPAMED', 'Q1FY27'),
  ('cdmo-crams', 'WINDLAS', 'Q1FY27'),
  ('capital-markets-boom', 'ABSLAMC', 'Q1FY27'),
  ('capital-markets-boom', 'CDSL', 'Q1FY27'),
  ('capital-markets-boom', 'JMFINANCIL', 'Q1FY27'),
  ('capital-markets-boom', 'MCX', 'Q1FY27'),
  ('capital-markets-boom', 'NAM_INDIA', 'Q1FY27'),
  ('capital-markets-boom', 'NUVAMA', 'Q1FY27'),
  ('auto-components-premiumisation', 'ENDURANCE', 'Q1FY27'),
  ('auto-components-premiumisation', 'FIEMIND', 'Q1FY27'),
  ('auto-components-premiumisation', 'GALAPREC', 'Q1FY27'),
  ('auto-components-premiumisation', 'HAPPYFORGE', 'Q1FY27'),
  ('auto-components-premiumisation', 'LUMAXIND', 'Q1FY27'),
  ('auto-components-premiumisation', 'LUMAXTECH', 'Q1FY27'),
  ('auto-components-premiumisation', 'PRICOLLTD', 'Q1FY27'),
  ('auto-components-premiumisation', 'SANSERA', 'Q1FY27'),
  ('auto-components-premiumisation', 'SHRIPISTON', 'Q1FY27'),
  ('auto-components-premiumisation', 'SJS', 'Q1FY27'),
  ('auto-components-premiumisation', 'SONACOMS', 'Q1FY27'),
  ('auto-components-premiumisation', 'UNOMINDA', 'Q1FY27'),
  ('cables-wires', 'KEI', 'Q1FY27'),
  ('cables-wires', 'RRKABEL', 'Q1FY27'),
  ('travel-tourism', 'RATEGAIN', 'Q1FY27'),
  ('travel-tourism', 'SAMHI', 'Q1FY27'),
  ('travel-tourism', 'WTICAB', 'Q1FY27'),
  ('travel-tourism', 'YATRA', 'Q1FY27'),
  ('jewellery-gold-retail', 'GOLDIAM', 'Q1FY27'),
  ('jewellery-gold-retail', 'KALYANKJIL', 'Q1FY27'),
  ('jewellery-gold-retail', 'KDDL', 'Q1FY27'),
  ('jewellery-gold-retail', 'SENCO', 'Q1FY27'),
  ('jewellery-gold-retail', 'SKYGOLD', 'Q1FY27'),
  ('ev-electrification', 'ATHERENERG', 'Q1FY27'),
  ('ev-electrification', 'FIEMIND', 'Q1FY27'),
  ('ev-electrification', 'SONACOMS', 'Q1FY27'),
  ('ev-electrification', 'UNOMINDA', 'Q1FY27'),
  ('ems', 'AIMTRON', 'Q1FY27'),
  ('ems', 'DIXON', 'Q1FY27'),
  ('ems', 'KAYNES', 'Q1FY27'),
  ('ems', 'NETWEB', 'Q1FY27'),
  ('ems', 'PGEL', 'Q1FY27'),
  ('ems', 'VINYAS', 'Q1FY27')
on conflict (theme_slug, company_code) do update
  set as_of_quarter = excluded.as_of_quarter,
      last_reviewed_at = now(),
      updated_at = now();

commit;

-- Integrity check — any row returned is a code the data layer drops at render:
-- select tm.theme_slug, tm.company_code from theme_membership tm
--   left join company c on upper(c.code) = upper(tm.company_code)
--   where c.code is null order by tm.theme_slug;
-- notify pgrst, 'reload schema';
