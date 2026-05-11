export type PeriodDelta =
  | { kind: "growth"; percent: number }
  | { kind: "sign-cross"; toPositive: boolean }
  | null;

const GROWTH_DISPLAY_CAP = 999;

const integerPercentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

export function getPeriodOverPeriodDelta(
  periods: string[],
  valuesByPeriod: Record<string, number | null>,
  period: string,
): PeriodDelta {
  const periodIndex = periods.indexOf(period);
  if (periodIndex <= 0) return null;

  const currentValue = valuesByPeriod[periods[periodIndex]];
  const previousValue = valuesByPeriod[periods[periodIndex - 1]];

  if (
    typeof currentValue !== "number" ||
    !Number.isFinite(currentValue) ||
    typeof previousValue !== "number" ||
    !Number.isFinite(previousValue) ||
    previousValue === 0
  ) {
    return null;
  }

  const prevSign = Math.sign(previousValue);
  const currSign = Math.sign(currentValue);

  if (currSign !== 0 && prevSign !== currSign) {
    return { kind: "sign-cross", toPositive: currentValue > 0 };
  }

  const percent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  return { kind: "growth", percent };
}

export function formatPeriodDelta(
  delta: PeriodDelta,
): { label: string; toneValue: number } | null {
  if (delta == null) return null;

  if (delta.kind === "sign-cross") {
    return {
      label: delta.toPositive ? "→ +ve" : "→ −ve",
      toneValue: delta.toPositive ? 1 : -1,
    };
  }

  const { percent } = delta;
  const sign = percent > 0 ? "+" : percent < 0 ? "−" : "";
  const magnitude = Math.abs(percent);

  if (magnitude > GROWTH_DISPLAY_CAP) {
    return {
      label: `${sign}${GROWTH_DISPLAY_CAP}%+`,
      toneValue: percent,
    };
  }

  return {
    label: `${sign}${integerPercentFormatter.format(magnitude)}%`,
    toneValue: percent,
  };
}
