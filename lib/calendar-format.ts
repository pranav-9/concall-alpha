// Calendar-date formatting shared by the results tracker and the company
// page's quarter card. All inputs are YYYY-MM-DD strings from quarter_calendar:
// calendar dates, not instants, so they are formatted in UTC and no timezone
// can shift them a day. "Today" is the IST date, the day Indian results and
// calls are scheduled in.

const DAY_MS = 86_400_000;

export const istToday = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export const formatDay = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/** "16:00" | "16:00:00" → "4:00 PM". */
export const formatTime = (hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export const relativeDay = (days: number): string =>
  days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 0 ? `${-days} days ago` : `In ${days} days`;
