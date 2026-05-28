import { formatAbsoluteAmount, isReasoningProse } from "../lib/guidance-tracking/normalize";

const assert = (got: unknown, want: unknown, msg: string) => {
  if (got === want) {
    console.log("ok  ", msg, `(got: ${JSON.stringify(got)})`);
  } else {
    console.error("FAIL", msg, `\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
    process.exit(1);
  }
};

// ===== isReasoningProse =====
assert(isReasoningProse("Not explicitly quantified, operational leverage mentioned"), true, "reasoning: 'Not explicitly quantified'");
assert(isReasoningProse("management indicated future improvement"), true, "reasoning: 'management indicated'");
assert(isReasoningProse("INR 1,500 crores"), false, "value text is not reasoning");
assert(isReasoningProse("20-22%"), false, "percent text is not reasoning");
assert(isReasoningProse(null), false, "null is not reasoning");

// ===== formatAbsoluteAmount =====
// TDPOWERSYS real cases:
assert(formatAbsoluteAmount("over INR 2,000 crores, then upward guidance at INR 2,200-plus crores"), "₹2200cr+", "TDPOWERSYS FY27 revenue revision");
assert(formatAbsoluteAmount("INR 60-70 crores per year for around five years"), "₹60-70cr", "TDPOWERSYS traction motors range");
assert(formatAbsoluteAmount("INR 1,500 crores, then revised to INR 1,800 crores, then upward to cross INR 1,800 crores"), "₹1800cr+", "TDPOWERSYS FY26 revenue multi-revision");
assert(formatAbsoluteAmount("INR 1,200 crores, revised to INR 1,250-1,275 crores, then maintained"), "₹1250-1275cr", "TDPOWERSYS FY25 revenue revision to range");

// CARYSIL real cases:
assert(formatAbsoluteAmount("INR 500 crores within the next less than 5 years"), "₹500cr", "CARYSIL INR 500cr target");
assert(formatAbsoluteAmount("$1 billion kitchen business"), "$1B", "CARYSIL $1 billion kitchen");

// Negative cases:
assert(formatAbsoluteAmount("around 25% gross margin guidance"), null, "no rupee unit → null");
assert(formatAbsoluteAmount("15-20% revenue growth on annual basis"), null, "percent only → null");
assert(formatAbsoluteAmount(null), null, "null input → null");
assert(formatAbsoluteAmount(""), null, "empty input → null");

// Edge cases:
assert(formatAbsoluteAmount("Approximately $500 million ARR"), "$500M", "USD millions");
assert(formatAbsoluteAmount("Rs. 100 cr"), "₹100cr", "Rs. abbreviation");

console.log("\nAll badge helper tests passed.");
