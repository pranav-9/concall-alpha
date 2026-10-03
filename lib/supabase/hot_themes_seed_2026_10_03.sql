-- Hot Themes seed — regenerated from live tables 2026-10-03 by scripts/themes-refresh.mjs.
--
-- Idempotent: re-running upserts (no dupes). Scores/Trend are NOT seeded —
-- they join live from the leaderboard by company_code. This file only sets
-- which themes are featured and who belongs. Mirror of live; apply-by-hand only
-- if rebuilding (the live DB is edited directly via service role).

begin;

insert into theme (slug, title, blurb, is_featured, sort) values
  ('ai-datacentre-fibre', 'AI data-centre & fibre build-out', 'A ~$700bn global hyperscaler capex wave is re-rating India''s fibre and compute suppliers; optical-fibre and AI-server names are guiding to data-centre-led demand visibility that didn''t exist a year ago.', true, 1),
  ('defence-order-inflows', 'Defence order inflows', 'DAC approvals hit a record ~Rs 6.7 lakh crore in FY26, but the big contracts (P-75I, QRSAM, next-gen corvettes) were still unsigned into Q2 FY27 and PSU order inflows fell last year. Watch conversion, not announcements.', true, 2),
  ('metals-mining-upcycle', 'Metals & mining up-cycle', 'Q1 FY27''s ~53% earnings jump was off a low base and the cycle is cooling: steel realisations are guided down ~Rs 1,500/t in Q2 as new capacity lands; only copper and zinc stay firm. Pipe converters in the roster feel dear steel as a squeeze.', true, 3),
  ('transmission-grid-capex', 'Transmission & grid capex', 'CEA''s March 2026 plan maps ~Rs 7.9 lakh crore of transmission spend to FY36 with HVDC rising to ~120 GW; 400 kV-plus transformers and reactors stay capacity-constrained. Q1 FY27 tenders slowed on raw-material inflation and HVDC packages slipped, so watch awards, not the pipeline.', true, 4),
  ('auto-components-premiumisation', 'Auto components & premiumisation', 'Vehicle volumes ran strong through Q1 FY27, but ancillary revenue and margins lagged as commodity inflation landed before price pass-through; Q2 tests the catch-up. The structural driver is content-per-vehicle (electronics, lighting, ABS, alloy wheels), which outgrows the volume cycle.', true, 5),
  ('cdmo-crams', 'CDMO & CRAMS', 'Pharma earnings lagged in Q1 FY27 even as the sector led the year''s rally; CDMO/CRAMS names are the reason, converting innovator deal wins in biologics, peptides, ADCs and GLP-1 intermediates on capacity already built. Risk is execution on fresh capacity.', true, 6),
  ('specialty-chemicals-rebound', 'Specialty-chemicals rebound', 'Q1 FY27 was a chemicals beat, but driven by refrigerant-gas pricing, crude-linked pass-through and new capacity at specific names, not a cycle turn; Chinese oversupply still caps agro and commodity-specialty pricing. Company-by-company, not sector-wide.', true, 7),
  ('cables-wires', 'Cables & wires', 'Structural wiring and power-cable demand riding construction and grid capex; publish once cut cleanly from themes 1-2.', false, 101),
  ('travel-tourism', 'Travel & tourism up-cycle', 'Hotel rates and occupancies are still rising but slowing: FY27 industry revenue growth is tracking 7-9% vs ~11% last year, foreign arrivals fell 14% in April 2026 after the West Asia conflict, and the GST change on rooms squeezes margins. The play is owned-hotel operating leverage; our coverage of it is thin.', false, 102),
  ('jewellery-gold-retail', 'Jewellery & gold retail', 'Organised jewellery retail taking share as gold demand and formalisation hold up.', false, 103),
  ('ev-electrification', 'EV / electrification', 'Two-wheeler EV and vehicle-electrification content lifting select ancillaries.', false, 104),
  ('ems', 'Electronics manufacturing (EMS)', 'EMS bifurcating — order-rich names re-rating while others roll over; publish only once winners split from laggards.', false, 105),
  ('capital-markets-boom', 'Capital-markets boom', 'Flows hold (SIP inflows ~Rs 3.5 lakh crore in FY26, +21%) but the volume leg has turned: derivatives turnover slowed after SEBI''s curbs and the STT increase, and demat additions cooled. The thesis has migrated from brokers and exchanges to AMCs and wealth managers.', false, 106)
on conflict (slug) do update
  set title = excluded.title,
      blurb = excluded.blurb,
      is_featured = excluded.is_featured,
      sort = excluded.sort,
      updated_at = now();

insert into theme_membership (theme_slug, company_code, as_of_quarter) values
  ('ai-datacentre-fibre', 'E2E', 'Q1FY27'),
  ('ai-datacentre-fibre', 'HFCL', 'Q1FY27'),
  ('ai-datacentre-fibre', 'KRN', 'Q2FY27'),
  ('ai-datacentre-fibre', 'MTARTECH', 'Q1FY27'),
  ('ai-datacentre-fibre', 'NETWEB', 'Q1FY27'),
  ('ai-datacentre-fibre', 'STLTECH', 'Q1FY27'),
  ('ai-datacentre-fibre', 'TDPOWERSYS', 'Q1FY27'),
  ('defence-order-inflows', 'ASTRAMICRO', 'Q1FY27'),
  ('defence-order-inflows', 'AXISCADES', 'Q1FY27'),
  ('defence-order-inflows', 'GRSE', 'Q1FY27'),
  ('defence-order-inflows', 'MTARTECH', 'Q1FY27'),
  ('defence-order-inflows', 'SANSERA', 'Q1FY27'),
  ('defence-order-inflows', 'SHREEREF', 'Q1FY27'),
  ('defence-order-inflows', 'VINYAS', 'Q1FY27'),
  ('metals-mining-upcycle', 'APLAPOLLO', 'Q1FY27'),
  ('metals-mining-upcycle', 'GPIL', 'Q1FY27'),
  ('metals-mining-upcycle', 'GRAVITA', 'Q1FY27'),
  ('metals-mining-upcycle', 'IMFA', 'Q1FY27'),
  ('metals-mining-upcycle', 'LLOYDSME', 'Q1FY27'),
  ('metals-mining-upcycle', 'POCL', 'Q1FY27'),
  ('metals-mining-upcycle', 'SAMBHV', 'Q1FY27'),
  ('metals-mining-upcycle', 'WELCORP', 'Q1FY27'),
  ('transmission-grid-capex', 'ADVAIT', 'Q1FY27'),
  ('transmission-grid-capex', 'APARINDS', 'Q1FY27'),
  ('transmission-grid-capex', 'BHAGYANGR', 'Q1FY27'),
  ('transmission-grid-capex', 'KSHINTL', 'Q1FY27'),
  ('transmission-grid-capex', 'QPOWER', 'Q1FY27'),
  ('transmission-grid-capex', 'SCHNEIDER', 'Q1FY27'),
  ('transmission-grid-capex', 'TARIL', 'Q1FY27'),
  ('transmission-grid-capex', 'TRANSRAILL', 'Q1FY27'),
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
  ('cdmo-crams', 'ACUTAAS', 'Q1FY27'),
  ('cdmo-crams', 'GLAND', 'Q1FY27'),
  ('cdmo-crams', 'INNOVACAP', 'Q1FY27'),
  ('cdmo-crams', 'LAURUSLABS', 'Q1FY27'),
  ('cdmo-crams', 'NEULANDLAB', 'Q1FY27'),
  ('cdmo-crams', 'SAILIFE', 'Q1FY27'),
  ('cdmo-crams', 'SENORES', 'Q1FY27'),
  ('cdmo-crams', 'SHILPAMED', 'Q1FY27'),
  ('cdmo-crams', 'WINDLAS', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'AARTIDRUGS', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'AETHER', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'FCL', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'NAVINFLUOR', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'PRIVISCL', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'VISHNU', 'Q1FY27'),
  ('specialty-chemicals-rebound', 'YASHO', 'Q1FY27'),
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
  ('ems', 'VINYAS', 'Q1FY27'),
  ('capital-markets-boom', 'ABSLAMC', 'Q1FY27'),
  ('capital-markets-boom', 'CDSL', 'Q1FY27'),
  ('capital-markets-boom', 'JMFINANCIL', 'Q1FY27'),
  ('capital-markets-boom', 'MCX', 'Q1FY27'),
  ('capital-markets-boom', 'NAM_INDIA', 'Q1FY27'),
  ('capital-markets-boom', 'NUVAMA', 'Q1FY27')
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
