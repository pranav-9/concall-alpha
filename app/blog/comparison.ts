// A comparison post ("head to head") is tagged in frontmatter, never detected
// from its slug:
//
//   comparison:
//     industry: Optical fibre
//     a: { name: Sterlite Technologies, code: STLTECH }
//     b: { name: HFCL, code: HFCL }
//
// `a` is the post's primary company (the one `companyCode` names). A partial
// block throws, so a malformed post fails the build instead of silently
// landing in the wrong lane. Node-dep-free so tests can import it.

export type ComparisonSide = { name: string; code: string };

export type Comparison = {
  industry: string;
  a: ComparisonSide;
  b: ComparisonSide;
};

/** YAML reads an unquoted BSE scrip code (`code: 543210`) as a number — accept it. */
function str(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

/**
 * `undefined` when the post has no `comparison` block; the parsed block when
 * it is complete; throws naming the file and the problem otherwise. Only a
 * company write-up (`category: companies`) may carry one, so both paints agree
 * on which lane every other post is in.
 */
export function parseComparison(
  value: unknown,
  file: string,
  post: { companyCode?: string; category?: string },
): Comparison | undefined {
  if (value === undefined || value === null) return undefined;
  const fail = (why: string): never => {
    throw new Error(`${file}: frontmatter \`comparison\` ${why}`);
  };
  if (typeof value !== "object" || Array.isArray(value)) fail("must be a mapping");
  if (post.category !== "companies") fail("is only allowed on a `category: companies` post");
  const raw = value as Record<string, unknown>;
  const side = (key: "a" | "b") => {
    const s = raw[key];
    const o = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
    return { name: str(o.name), code: str(o.code).toUpperCase() };
  };
  const c: Comparison = { industry: str(raw.industry), a: side("a"), b: side("b") };

  const missing = [
    ["industry", c.industry],
    ["a.name", c.a.name],
    ["a.code", c.a.code],
    ["b.name", c.b.name],
    ["b.code", c.b.code],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) fail(`is missing ${missing.join(", ")}`);
  if (c.a.code === c.b.code) fail(`compares ${c.a.code} with itself`);
  if (post.companyCode && c.a.code !== post.companyCode) {
    fail(`a.code (${c.a.code}) must be the post's companyCode (${post.companyCode})`);
  }
  return c;
}

export function isComparison<T extends { comparison?: Comparison }>(
  p: T,
): p is T & { comparison: Comparison } {
  return !!p.comparison;
}

/**
 * A comparison's card headline. House titles read "CCL Products: It has the
 * kitchen. …" — the card already names both companies, so the prefix goes, and
 * a leading "It" (which pointed at the prefix) becomes the company's name:
 * "CCL Products has the kitchen. …". A title that doesn't open with
 * `aName:` is left exactly as written.
 */
export function comparisonTitle(title: string, aName: string): string {
  const prefix = `${aName}:`;
  if (!title.startsWith(prefix)) return title;
  const rest = title.slice(prefix.length).trimStart();
  if (!rest) return title;
  return /^It\s/.test(rest) ? `${aName}${rest.slice(2)}` : rest;
}
