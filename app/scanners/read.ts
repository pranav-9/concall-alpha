import "server-only";

// Read the rows for just the scans a page shows. A scan that is not asked for
// stays null (never read); a read that fails stays null too, and that scan
// renders as unavailable.

import { logger } from "@/lib/logger";
import {
  getGarpRows,
  getGuidanceUpgradeRows,
  getOrderBookRows,
  getPegRows,
  getRedFlagRows,
  getTrendRows,
} from "@/lib/scanners/data";
import type { ScanInputs } from "@/lib/scanners/scope";

import type { ScanId } from "./href";

async function settle<T>(label: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    logger.warn(`scanners: ${label} read failed; that scan renders unavailable`, { error });
    return null;
  }
}

export async function readScanInputs(ids: readonly ScanId[]): Promise<ScanInputs> {
  const want = new Set(ids);
  const [redFlagRows, pegRows, guidance, trendRows, garpRows, orderBookRows] = await Promise.all([
    want.has("red-flags") ? settle("red flags", getRedFlagRows) : null,
    want.has("peg") ? settle("peg", getPegRows) : null,
    want.has("guidance") ? settle("guidance upgrades", getGuidanceUpgradeRows) : null,
    want.has("trend") ? settle("price trend", getTrendRows) : null,
    want.has("garp") ? settle("garp", getGarpRows) : null,
    want.has("order-book") ? settle("order book", getOrderBookRows) : null,
  ]);
  return { redFlagRows, pegRows, guidance, trendRows, garpRows, orderBookRows };
}
