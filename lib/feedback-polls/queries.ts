import { unstable_cache } from "next/cache";
import { createPublicReadClient } from "@/lib/supabase/public-read";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { normalizePoll } from "./normalize";
import type {
  FeedbackPollRow,
  NormalizedPoll,
  PollAggregate,
  PollStatus,
  QuestionType,
} from "./types";

export const FEEDBACK_POLLS_CACHE_TAG = "feedback-polls:active";
const ACTIVE_POLL_REVALIDATE_SECONDS = 60;

// ---------------------------------------------------------------------------
// getActivePoll — hot read path used by the root layout banner fetcher.
//
// Cached via unstable_cache (60s) to keep the per-request DB load near zero.
// Always returns null on any error so the layout never bubbles an exception
// from the banner non-critical path.
// ---------------------------------------------------------------------------

async function fetchActivePollUncached(): Promise<NormalizedPoll | null> {
  try {
    // Cookie-free client: unstable_cache forbids calls to cookies() inside the
    // cached function. get_active_feedback_poll() is anon-callable and doesn't
    // need session context.
    const supabase = createPublicReadClient();
    const { data, error } = await supabase
      .rpc("get_active_feedback_poll")
      .maybeSingle();

    if (error) {
      logger.error("feedback-polls: get_active_feedback_poll RPC error", { error });
      return null;
    }

    return normalizePoll(data as FeedbackPollRow | null);
  } catch (err) {
    logger.error("feedback-polls: getActivePoll threw", { error: err });
    return null;
  }
}

const cachedActivePoll = unstable_cache(
  fetchActivePollUncached,
  ["feedback-polls:active"],
  {
    revalidate: ACTIVE_POLL_REVALIDATE_SECONDS,
    tags: [FEEDBACK_POLLS_CACHE_TAG],
  },
);

export async function getActivePoll(): Promise<NormalizedPoll | null> {
  return cachedActivePoll();
}

// ---------------------------------------------------------------------------
// Admin queries — service-role; do NOT broaden to user-facing routes.
// ---------------------------------------------------------------------------

export type AdminPollRow = {
  id: string;
  slug: string;
  question_text: string;
  question_type: QuestionType;
  options: unknown;
  starts_at: string;
  ends_at: string | null;
  status: PollStatus;
  created_at: string;
};

export async function listAllPolls(): Promise<AdminPollRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback_polls")
    .select(
      "id, slug, question_text, question_type, options, starts_at, ends_at, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    logger.error("feedback-polls: listAllPolls failed", { error });
    throw error;
  }

  return (data ?? []) as AdminPollRow[];
}

export async function aggregateResponses(pollId: string): Promise<PollAggregate> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "aggregate_feedback_poll_responses",
    { poll: pollId },
  );

  if (error) {
    logger.error("feedback-polls: aggregateResponses failed", { error, pollId });
    throw error;
  }

  return (data ?? {
    total_responses: 0,
    question_type: null,
    counts: {},
  }) as PollAggregate;
}
