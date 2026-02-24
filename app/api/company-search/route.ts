import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Result = {
  code: string;
  name: string | null;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function scoreResult(row: Result, query: string) {
  const q = query.toLowerCase();
  const code = normalize(row.code);
  const name = normalize(row.name);

  if (code === q) return 0;
  if (code.startsWith(q)) return 1;
  if (name.startsWith(q)) return 2;
  if (code.includes(q)) return 3;
  if (name.includes(q)) return 4;
  return 5;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q || q.length > 80) {
    return NextResponse.json({ ok: true, results: [] as Result[] });
  }

  const supabase = await createClient();
  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;

  const { data, error } = await supabase
    .from("company")
    .select("code,name")
    .or(`code.ilike.${pattern},name.ilike.${pattern}`)
    .limit(30);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Unable to fetch company search results.", results: [] as Result[] },
      { status: 500 },
    );
  }

  const rows = ((data ?? []) as Result[])
    .filter((row) => row.code)
    .sort((a, b) => {
      const rank = scoreResult(a, q) - scoreResult(b, q);
      if (rank !== 0) return rank;

      const aName = normalize(a.name || a.code);
      const bName = normalize(b.name || b.code);
      return aName.localeCompare(bName);
    })
    .slice(0, 8);

  return NextResponse.json({ ok: true, results: rows });
}
