import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { BREAKPOINT_LG, BREAKPOINT_MD, BREAKPOINT_SM, useMinWidth } from "../hooks/use-min-width";
import { useIsMobile } from "../hooks/use-mobile";

// The hydration-safety contract: on the server the hook MUST return null, so a
// component that renders both of two CSS-toggled layouts in that state ships
// both in the HTML and the client's first render agrees. Seeding the state
// from window.matchMedia would break this (and throw here — no window).
{
  const Probe = () => createElement("span", null, String(useMinWidth(BREAKPOINT_LG)));
  assert.equal(renderToString(createElement(Probe)), "<span>null</span>");
}

// useIsMobile keeps its historical server value (false), now via the same hook.
{
  const Probe = () => createElement("span", null, String(useIsMobile()));
  assert.equal(renderToString(createElement(Probe)), "<span>false</span>");
}

// Breakpoints are Tailwind's defaults; the config sets no custom `screens`.
assert.deepEqual([BREAKPOINT_SM, BREAKPOINT_MD, BREAKPOINT_LG], [640, 768, 1024]);

console.log("use-min-width: all assertions passed");
