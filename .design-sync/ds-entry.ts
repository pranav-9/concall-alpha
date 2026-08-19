// Design-system entry barrel for /design-sync — build input only, never imported by the app.
// Curated to the portal's presentational surface: shadcn/ui primitives, brand + score
// components, and the company-page section components. Excluded on purpose: anything that
// reads Supabase, needs server context, is an async Server Component, or only orchestrates
// data fetching.

// -- Primitives (components/ui) --
export * from "../components/ui/avatar";
export * from "../components/ui/badge";
export * from "../components/ui/breadcrumb";
export * from "../components/ui/button";
export * from "../components/ui/card";
export * from "../components/ui/carousel";
export * from "../components/ui/chart";
export * from "../components/ui/checkbox";
export * from "../components/ui/drawer";
export * from "../components/ui/dropdown-menu";
export * from "../components/ui/input";
export * from "../components/ui/label";
export * from "../components/ui/popover";
export * from "../components/ui/select";
export * from "../components/ui/separator";
export * from "../components/ui/sheet";
export * from "../components/ui/sidebar";
export * from "../components/ui/skeleton";
export * from "../components/ui/sonner";
export * from "../components/ui/table";
export * from "../components/ui/tabs";
export * from "../components/ui/toggle-group";
export * from "../components/ui/toggle";
export * from "../components/ui/tooltip";

// -- Brand --
export * from "../components/brand/logo";

// -- Score & read --
export * from "../components/concall-score";
export * from "../components/score-delta";
export * from "../components/score-provenance-chips";
export * from "../components/band-summary-line";
export * from "../components/read-distribution-curve";
export * from "../components/theme-switcher";
export { default as ConcallScore } from "../components/concall-score";

// -- Company page sections --
export * from "../app/company/components/business-segment-mix-bar";
export * from "../app/company/components/business-segments-mosaic";
export * from "../app/company/components/business-snapshot-section";
export * from "../app/company/components/column-info";
export * from "../app/company/components/competitive-strategy-display";
export * from "../app/company/components/concall-score-section";
export * from "../app/company/components/expandable-text";
export * from "../app/company/components/future-growth-section";
export * from "../app/company/components/guidance-history-section";
export * from "../app/company/components/historical-economics-data-pack";
export * from "../app/company/components/key-variables-section";
export * from "../app/company/components/kpi-sparkline";
export * from "../app/company/components/missing-section-state";
export * from "../app/company/components/moat-analysis-section";
export * from "../app/company/components/next-quarter-watch";
export * from "../app/company/components/overview-card";
export * from "../app/company/components/overview-the-read";
export * from "../app/company/components/quarterly-v4-section";
export * from "../app/company/components/score-band-pill";
export * from "../app/company/components/section-card";
export * from "../app/company/components/section-loading";
export * from "../app/company/components/segment-history-panel";
export * from "../app/company/components/segment-revenue-display";
export * from "../app/company/components/sidebar-navigation";
export * from "../app/company/components/stance-badge";
export * from "../app/company/components/sub-sector-tabs";
export * from "../app/company/components/top-section-tabs";
export * from "../app/company/components/top-strategies-display";
export * from "../app/company/components/trend-badge";
export * from "../app/company/components/valuation-check-section";
export * from "../app/company/components/walk-the-talk-section";

// -- Design tokens (class-string constants, not components) --
// These carry the portal's visual language: the L1-L4 research card levels, the
// atmospheric surface recipes, the score-band colour ramp and the chip tones.
// docs/portal-design-system.md is the prose that governs them. They export no
// components, so they produce no preview cards -- they exist so anything built
// with this design system can reach for the real class strings instead of
// re-deriving them.
export * from "../app/company/components/surface-tokens";
export * from "../lib/design/shell";
export * from "../lib/score-band";
export * from "../app/company/[code]/display-tokens";
export * from "../app/company/components/chip-tone";
export * from "../app/company/components/delta-tone";
export * from "../lib/portfolio-stance";
export * from "../lib/score-trajectory";

// sonner's imperative `toast()` — the shipped Toaster subscribes to this exact
// module instance, so exporting it here is the only way anything built with
// this design system (or a preview card) can raise a real toast.
export { toast } from "sonner";

// Model builders. Several components take a fully-computed model rather than
// literal props (a KDE distribution, a normalized section payload, a board
// read). Authoring previews proved these are not optional: hand-rolling the
// derived fields produces output that contradicts itself. Exporting the real
// builders lets anything built with this system produce a faithful payload.
export * from "../lib/growth-band";
export * from "../lib/read-distribution";
export * from "../lib/board-read";
export * from "../lib/score-freshness";
