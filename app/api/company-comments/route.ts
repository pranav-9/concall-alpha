import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyVisitorIdCookie, getOrCreateVisitorId } from "@/lib/visitor-id";

type CommentRow = {
  id: string;
  company_code: string;
  comment_text: string;
  likes_count: number;
  reports_count: number;
  created_at: string;
};

type CommentDTO = {
  id: string;
  companyCode: string;
  commentText: string;
  likesCount: number;
  reportsCount: number;
  createdAt: string;
  likedByMe: boolean;
  reportedByMe: boolean;
};

type CreatePayload = {
  companyCode?: string;
  commentText?: string;
};

const COMPANY_CODE_REGEX = /^[A-Za-z0-9._-]{1,24}$/;
const COMMENT_MIN = 3;
const COMMENT_MAX = 1500;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function toCommentDTO(
  row: CommentRow,
  likedSet: Set<string>,
  reportedSet: Set<string>,
): CommentDTO {
  return {
    id: row.id,
    companyCode: row.company_code,
    commentText: row.comment_text,
    likesCount: Number(row.likes_count ?? 0),
    reportsCount: Number(row.reports_count ?? 0),
    createdAt: row.created_at,
    likedByMe: likedSet.has(row.id),
    reportedByMe: reportedSet.has(row.id),
  };
}

function parseLimit(raw: string | null) {
  const parsed = Number(raw ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(parsed));
}

function parseCursor(raw: string | null) {
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyCode = (searchParams.get("companyCode") ?? "").trim();
  if (!COMPANY_CODE_REGEX.test(companyCode)) {
    return NextResponse.json(
      { ok: false, error: "Invalid companyCode." },
      { status: 400 },
    );
  }

  const limit = parseLimit(searchParams.get("limit"));
  const cursor = parseCursor(searchParams.get("cursor"));
  const { visitorId, isNew } = await getOrCreateVisitorId();
  const supabase = await createClient();

  let commentsQuery = supabase
    .from("company_comments")
    .select("id, company_code, comment_text, likes_count, reports_count, created_at")
    .eq("company_code", companyCode)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    commentsQuery = commentsQuery.lt("created_at", cursor);
  }

  const { data, error } = await commentsQuery;
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to fetch comments." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as CommentRow[];
  const hasNext = rows.length > limit;
  const pageRows = hasNext ? rows.slice(0, limit) : rows;
  const ids = pageRows.map((row) => row.id);

  let likedSet = new Set<string>();
  let reportedSet = new Set<string>();

  if (ids.length > 0) {
    const [likesResult, reportsResult] = await Promise.all([
      supabase
        .from("company_comment_likes")
        .select("comment_id")
        .eq("visitor_id", visitorId)
        .in("comment_id", ids),
      supabase
        .from("company_comment_reports")
        .select("comment_id")
        .eq("visitor_id", visitorId)
        .in("comment_id", ids),
    ]);

    likedSet = new Set((likesResult.data ?? []).map((row) => String(row.comment_id)));
    reportedSet = new Set((reportsResult.data ?? []).map((row) => String(row.comment_id)));
  }

  const comments = pageRows.map((row) => toCommentDTO(row, likedSet, reportedSet));
  const nextCursor = hasNext ? pageRows[pageRows.length - 1]?.created_at ?? null : null;

  const response = NextResponse.json({
    ok: true,
    comments,
    nextCursor,
  });

  if (isNew) {
    applyVisitorIdCookie(response, visitorId);
  }

  return response;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePayload;
    const companyCode = (body.companyCode ?? "").trim();
    const commentText = (body.commentText ?? "").trim();

    if (!COMPANY_CODE_REGEX.test(companyCode)) {
      return NextResponse.json(
        { ok: false, error: "Invalid companyCode." },
        { status: 400 },
      );
    }

    if (commentText.length < COMMENT_MIN || commentText.length > COMMENT_MAX) {
      return NextResponse.json(
        { ok: false, error: `commentText must be ${COMMENT_MIN}-${COMMENT_MAX} characters.` },
        { status: 400 },
      );
    }

    const { visitorId, isNew } = await getOrCreateVisitorId();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("company_comments")
      .insert({
        company_code: companyCode,
        comment_text: commentText,
        visitor_id: visitorId,
        status: "visible",
      })
      .select("id, company_code, comment_text, likes_count, reports_count, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Unable to post comment." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      comment: toCommentDTO(data as CommentRow, new Set(), new Set()),
    });

    if (isNew) {
      applyVisitorIdCookie(response, visitorId);
    }

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }
}
