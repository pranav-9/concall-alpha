const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function isCompanyNew(
  createdAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const nowMs = now.getTime();
  const createdMs = created.getTime();
  if (Number.isNaN(createdMs) || Number.isNaN(nowMs)) return false;
  return createdMs >= nowMs - ONE_WEEK_MS;
}

export function buildNewCompanySet(
  rows: Array<{ code: string; created_at?: string | null }>,
  now = new Date(),
): Set<string> {
  const result = new Set<string>();
  rows.forEach((row) => {
    if (!row.code) return;
    if (isCompanyNew(row.created_at ?? null, now)) {
      result.add(row.code.toUpperCase());
    }
  });
  return result;
}
