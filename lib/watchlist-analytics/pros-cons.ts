// "The good and the bad, across the list" — the Overview's pros-cons rules
// (lib/overview-pros-cons) run for every company on a watchlist, then grouped
// by rule so the list reads as "No red flags in the accounts — 7 of 19" with
// the seven names behind it. PURE: the server side feeds in each company's
// candidates; this file only groups and ranks.
//
// Grouping is by rule id AND claim wording. Every claim in overview-pros-cons
// is a fixed phrase per rule (a few rules carry two wordings — a flag vs a
// watch on the same check, "Ambitious targets, well evidenced" vs "Measured
// targets, well evidenced"), so grouping on the wording keeps each row
// truthful: the label IS what every company under it would show.
//
// The input is each company's UNCAPPED candidates (collectProsConsCandidates),
// not its ranked top five: the question here is how many companies a rule
// fires for, and a company's sixth strength still counts as a strength. A row
// may therefore name a company whose own Overview trimmed that item — the
// item still restates that section's verdict, it was only out-ranked there.
//
// Order: most companies first, then the heaviest weight any of them carried,
// then the rule id. Five a side, never padded.

import type { ProsConsItem, ProsConsSide } from "@/lib/overview-pros-cons";

import type { CrossProsCons, CrossProsConsItem } from "./types";

export type CompanyProsConsInput = {
  code: string;
  name: string;
  /** collectProsConsCandidates(inputs) for this company. */
  items: ProsConsItem[];
};

export const CROSS_PROS_CONS_LIMIT = 5;

export function aggregateProsCons(
  companies: CompanyProsConsInput[],
  limit = CROSS_PROS_CONS_LIMIT,
): CrossProsCons {
  const groups = new Map<string, CrossProsConsItem>();
  let readCount = 0;

  for (const company of companies) {
    if (company.items.length > 0) readCount += 1;
    // One company counts once per rule+wording, however many times a rule
    // happened to fire (the forensic checks emit one item per check already).
    const seen = new Set<string>();
    for (const item of company.items) {
      const key = `${item.id}|${item.claim}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(key) ?? {
        key,
        ruleId: item.id,
        side: item.side,
        source: item.source,
        label: item.claim,
        count: 0,
        weight: 0,
        companies: [],
      };
      group.count += 1;
      group.weight = Math.max(group.weight, item.weight);
      group.companies.push({ code: company.code, name: company.name, evidence: item.evidence, weight: item.weight });
      groups.set(key, group);
    }
  }

  const ranked = [...groups.values()]
    .map((group) => ({
      ...group,
      companies: [...group.companies].sort((a, b) => b.weight - a.weight || a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => b.count - a.count || b.weight - a.weight || a.ruleId.localeCompare(b.ruleId) || a.label.localeCompare(b.label));

  const pick = (side: ProsConsSide) => ranked.filter((g) => g.side === side).slice(0, limit);

  return { good: pick("good"), bad: pick("bad"), total: companies.length, readCount };
}
