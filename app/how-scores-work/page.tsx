import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Scores Are Calculated – Story of a Stock",
  description: "Scoring methodology behind quarterly concall sentiment scores.",
};

const factors = [
  "Financial performance trajectory: revenue/growth, margin trend, FCF, leverage, working capital.",
  "Guidance vs delivery: raises/cuts, beat/miss, visibility signals.",
  "Unit economics and business mix: pricing power, utilization, mix shifts, recurring vs one-off.",
  "Risks/overhangs: concentration, regulatory, supply chain, execution risks.",
  "Capital allocation quality: capex discipline, dilution/buybacks/dividends/raises.",
  "Competitive position: share gains/losses, moat/positioning.",
  "Evidence quality/completeness: reflected in confidence and used to avoid fluff-driven scoring.",
];

const returnedFields = [
  "score",
  "category",
  "rationale",
  "quarter_summary",
  "results_summary",
  "guidance",
  "risks",
  "fy",
  "qtr",
  "confidence",
];

const growthScoreInputs = [
  "Scenario growth rates across Base, Upside, and Downside cases.",
  "Trajectory/quality context such as execution signals and visibility.",
  "Risk-adjusted outlook from guidance, drivers, and overhangs.",
];

const growthReturnedFields = [
  "base_growth_pct",
  "upside_growth_pct",
  "downside_growth_pct",
  "growth_score",
  "growth_score_formula",
  "growth_score_steps",
];

export default function HowScoresWorkPage() {
  return (
    <main className="min-h-screen flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-xl border border-gray-800 bg-gray-950/70 p-6 md:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            How The Quarterly Score Is Calculated
          </h1>
          <p className="text-sm text-gray-300">
            Phase 1 combines financial, operating, and risk signals from concall
            data into a quarterly score.
          </p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Main Factors Used
          </h2>
          <ul className="list-disc pl-5 space-y-2 marker:text-gray-500">
            {factors.map((factor) => (
              <li key={factor} className="text-sm text-gray-300 leading-relaxed">
                {factor}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            Fields Returned With Each Score
          </h2>
          <div className="flex flex-wrap gap-2">
            {returnedFields.map((field) => (
              <span
                key={field}
                className="px-2 py-1 rounded-full text-xs bg-gray-900 border border-gray-800 text-gray-200"
              >
                {field}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
            How The Growth Score Is Calculated
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            Growth leaderboard scores are computed from scenario-based outlook data
            (Base/Upside/Downside) plus quality and visibility context. This is a
            separate model from the quarterly sentiment score.
          </p>
          <ul className="list-disc pl-5 space-y-2 marker:text-gray-500">
            {growthScoreInputs.map((input) => (
              <li key={input} className="text-sm text-gray-300 leading-relaxed">
                {input}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {growthReturnedFields.map((field) => (
              <span
                key={field}
                className="px-2 py-1 rounded-full text-xs bg-gray-900 border border-gray-800 text-gray-200"
              >
                {field}
              </span>
            ))}
          </div>
        </section>

        <div className="pt-2">
          <Link href="/" prefetch={false} className="text-sm text-emerald-300 underline">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
