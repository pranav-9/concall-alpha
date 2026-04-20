export type RecentScoreUpdateLike = {
  companyCode?: string | null;
};

const normalizeCompanyCode = (value: string | null | undefined) =>
  value?.trim().toUpperCase() ?? null;

export function collapseConsecutiveSameCompanyUpdates<
  T extends RecentScoreUpdateLike,
>(updates: T[]): T[] {
  const collapsed: T[] = [];
  let previousCompanyCode: string | null = null;

  updates.forEach((item) => {
    const currentCompanyCode = normalizeCompanyCode(item.companyCode);

    if (currentCompanyCode) {
      if (currentCompanyCode === previousCompanyCode) {
        return;
      }
      previousCompanyCode = currentCompanyCode;
    } else {
      previousCompanyCode = null;
    }

    collapsed.push(item);
  });

  return collapsed;
}
