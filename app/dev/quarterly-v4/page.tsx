import { notFound } from "next/navigation";
import { ConcallScoreSection } from "@/app/company/components/concall-score-section";
import { transformToChartData } from "@/app/company/utils";
import { QUARTERLY_V4_FIXTURE } from "./fixture";
import { FINANCIALS_FIXTURE, HIGHLIGHTS_FIXTURE } from "./fixture-extras";

// Dev-only preview harness for the ConcallScore section's category cards. The
// fixture mixes both key_point shapes: the latest quarter is structured
// (heading + metric + quote + watch + tones, incl. a "minor" aside), the older
// three are plain strings — pick a quarter in the section to see each, and the
// lean-streak caption on the chip (Guidance: "In line · 2nd quarter running").
// fixture-extras.ts adds CCL's quarterly_financials rows (read 2026-10-27) and
// a hand-slimmed highlights set so the Results card and Top highlights draw too.
export default function QuarterlyV4Preview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const chartData = transformToChartData(QUARTERLY_V4_FIXTURE, 24);
  return (
    <main className="mx-auto max-w-5xl px-3 py-8 sm:px-6">
      <div className="mb-5 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          ConcallScore category cards · preview (dev only)
        </p>
        <h1 className="text-2xl font-semibold text-foreground">CCL Products (India) · fixture</h1>
        <p className="text-sm text-muted-foreground">
          Latest quarter = structured key points (sandbox); older quarters = stored plain strings.
        </p>
      </div>
      <ConcallScoreSection
        chartData={chartData}
        detailQuarters={QUARTERLY_V4_FIXTURE}
        financials={FINANCIALS_FIXTURE}
        highlights={HIGHLIGHTS_FIXTURE}
      />
    </main>
  );
}
