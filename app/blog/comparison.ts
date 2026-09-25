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

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * `undefined` when the post has no `comparison` block; the parsed block when
 * it is complete; throws naming every missing field otherwise.
 */
export function parseComparison(
  value: unknown,
  file: string,
  companyCode?: string,
): Comparison | undefined {
  if (value === undefined || value === null) return undefined;
  const fail = (why: string): never => {
    throw new Error(`${file}: frontmatter \`comparison\` ${why}`);
  };
  if (typeof value !== "object" || Array.isArray(value)) fail("must be a mapping");
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
  if (companyCode && c.a.code !== companyCode) {
    fail(`a.code (${c.a.code}) must be the post's companyCode (${companyCode})`);
  }
  return c;
}

export function isComparison<T extends { comparison?: Comparison }>(p: T): boolean {
  return !!p.comparison;
}
