import "server-only";

import { unstable_cache } from "next/cache";

import {
  getUnifiedUpdates,
  type UnifiedUpdate,
  type UpdateType,
} from "@/lib/activity-feed";
import { logger } from "@/lib/logger";
import { createPublicReadClient } from "@/lib/supabase/public-read";

export const HOMEPAGE_ACTIVITY_FEED_TAG = "homepage-activity-feed";

export type HomepageActivityFeedRecord = {
  id: string;
  event_type: UpdateType;
  company_code: string | null;
  company_name: string;
  company_is_new: boolean;
  source_label: string;
  detail: string | null;
  context_label: string | null;
  score: number | null;
  prior_score: number | null;
  artifact_href: string | null;
  event_at: string | null;
  sort_at: string;
};

export type HomepageActivityFeedUpsert = HomepageActivityFeedRecord & {
  updated_at: string;
};

const eventTimeMs = (value: string | null | undefined) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isUpdateType = (value: unknown): value is UpdateType =>
  value === "quarter" ||
  value === "growth" ||
  value === "business_snapshot" ||
  value === "key_variables" ||
  value === "guidance_monitor";

export function toHomepageActivityFeedUpsert(
  update: UnifiedUpdate,
  refreshedAt: string,
): HomepageActivityFeedUpsert {
  const sortAt =
    update.atRaw && !Number.isNaN(Date.parse(update.atRaw)) ? update.atRaw : refreshedAt;

  return {
    id: update.id,
    event_type: update.type,
    company_code: update.companyCode,
    company_name: update.companyName,
    company_is_new: update.companyIsNew,
    source_label: update.sourceLabel,
    detail: update.detail || null,
    context_label: update.contextLabel,
    score: update.score,
    prior_score: update.priorScore,
    artifact_href: update.artifactHref,
    event_at: update.atRaw,
    sort_at: sortAt,
    updated_at: refreshedAt,
  };
}

function toUnifiedUpdate(row: HomepageActivityFeedRecord): UnifiedUpdate | null {
  if (!isUpdateType(row.event_type)) return null;

  return {
    id: row.id,
    type: row.event_type,
    companyName: row.company_name,
    companyCode: row.company_code,
    companyIsNew: row.company_is_new,
    score: row.score,
    priorScore: row.prior_score,
    detail: row.detail ?? "",
    sourceLabel: row.source_label,
    contextLabel: row.context_label,
    atRaw: row.event_at,
    atMs: eventTimeMs(row.event_at ?? row.sort_at),
    artifactHref: row.artifact_href,
  };
}

const readHomepageActivityFeed = async (limit: number): Promise<UnifiedUpdate[]> => {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 50);

  try {
    const supabase = createPublicReadClient();
    const { data, error } = await supabase
      .from("homepage_activity_feed")
      .select(
        "id,event_type,company_code,company_name,company_is_new,source_label,detail,context_label,score,prior_score,artifact_href,event_at,sort_at",
      )
      .order("sort_at", { ascending: false })
      .limit(safeLimit);

    if (error) throw error;

    const updates = ((data ?? []) as HomepageActivityFeedRecord[])
      .map(toUnifiedUpdate)
      .filter((item): item is UnifiedUpdate => Boolean(item));

    if (updates.length > 0) return updates;
  } catch (error) {
    logger.warn("homepage-activity-feed: cached read failed; falling back to live feed", {
      error,
    });
  }

  const supabase = createPublicReadClient();
  return getUnifiedUpdates({ limit: safeLimit, supabaseClient: supabase });
};

export const getCachedHomepageActivityFeed = unstable_cache(
  readHomepageActivityFeed,
  [HOMEPAGE_ACTIVITY_FEED_TAG],
  {
    revalidate: 300,
    tags: [HOMEPAGE_ACTIVITY_FEED_TAG],
  },
);
