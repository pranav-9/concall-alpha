import assert from "node:assert/strict";

import { normalizeBusinessProfile } from "../lib/business-snapshot/profile";
import neuland from "../data/business-profile-drafts/NEULANDLAB.json";
import cartrade from "../data/business-profile-drafts/CARTRADE.json";
import aeroflex from "../data/business-profile-drafts/AEROFLEX.json";
import vinyas from "../data/business-profile-drafts/VINYAS.json";
import astramicro from "../data/business-profile-drafts/ASTRAMICRO.json";

// normalizeBusinessProfile drops an invalid field silently (hasInvalidProfile flips
// true, the field falls back to null/[]) rather than throwing, so a future hand-edit
// to a draft that exceeds a schema limit would otherwise ship unnoticed.
for (const draft of [neuland, cartrade, aeroflex, vinyas, astramicro] as Array<{
  company: string;
  about_company: Record<string, unknown>;
}>) {
  const profile = normalizeBusinessProfile(draft.about_company);
  assert.equal(
    profile.hasInvalidProfile,
    false,
    `${draft.company}: about_company has a field that fails businessProfileSchema and would be silently dropped`,
  );
}

console.log("business-profile-drafts: all files satisfy businessProfileSchema");
