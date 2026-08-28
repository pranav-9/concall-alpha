import { MissingSectionRequestButton } from "./missing-section-request-button";
import { AnalyticsBeacon } from "@/components/analytics-beacon";

type MissingSectionStateProps = {
  companyCode: string;
  companyName: string | null;
  sectionId: string;
  sectionTitle: string;
  description: string;
  /** Reason tag for the empty_section_view beacon. */
  reason?: string;
  /** Off when the caller already fires its own empty_section beacon (e.g.
   *  Valuation Check tags no_valuation / unrated / stale itself) — avoids
   *  double-counting the view. */
  emitEmptyView?: boolean;
};

export function MissingSectionState({
  companyCode,
  companyName,
  sectionId,
  sectionTitle,
  description,
  reason = "not_ready",
  emitEmptyView = true,
}: MissingSectionStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border/50 bg-muted/35 p-5 shadow-md shadow-black/15">
      {emitEmptyView ? (
        <AnalyticsBeacon
          event="empty_section"
          sectionId={sectionId}
          companyCode={companyCode}
          reason={reason}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {sectionTitle} is not ready yet for this company.
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <MissingSectionRequestButton
          companyCode={companyCode}
          companyName={companyName}
          sectionId={sectionId}
          sectionTitle={sectionTitle}
          className="w-full sm:w-auto"
        />
      </div>
    </div>
  );
}
