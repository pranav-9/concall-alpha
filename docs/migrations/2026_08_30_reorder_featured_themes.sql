-- 2026-08-30 — Reorder featured Hot Themes by "hotness" + un-feature capital-markets-boom.
--
-- Hotness = blended read of (realized Q1FY27 sector earnings momentum) + (forward re-rating /
-- order visibility / market attention) + (ValuePickr community buzz). See the themes review.
-- capital-markets-boom is hot externally (BFSI +20% Q1) but our coverage is only 2 live
-- discovery-listed members, so it is benched (not deleted) until more names are onboarded.
--
-- Data-only change. Theme lifecycle (is_featured / sort) is intentionally hand-applied in the
-- Supabase SQL editor, not via /themes-refresh (membership-only). No `notify pgrst` needed.
-- /themes and /desk render per-request (no ISR), so a hard reload reflects this immediately.

update theme set is_featured = true,  sort = 1,   updated_at = now() where slug = 'ai-datacentre-fibre';
update theme set is_featured = true,  sort = 2,   updated_at = now() where slug = 'defence-order-inflows';
update theme set is_featured = true,  sort = 3,   updated_at = now() where slug = 'metals-mining-upcycle';
update theme set is_featured = true,  sort = 4,   updated_at = now() where slug = 'transmission-grid-capex';
update theme set is_featured = true,  sort = 5,   updated_at = now() where slug = 'auto-components-premiumisation';
update theme set is_featured = true,  sort = 6,   updated_at = now() where slug = 'cdmo-crams';
update theme set is_featured = true,  sort = 7,   updated_at = now() where slug = 'specialty-chemicals-rebound';
update theme set is_featured = false, sort = 106, updated_at = now() where slug = 'capital-markets-boom';

-- Verify:
--   select slug, is_featured, sort from theme order by sort;
