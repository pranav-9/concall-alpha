// Draws the Journal's cover illustrations: one 640×360 SVG per company story,
// written to public/blog/covers/<slug>.svg and named by the post's `cover:`
// frontmatter. Each drawing is hand-made for its post (the company's product
// or the post's picture); the shared helpers only keep line weight, palette
// and backdrop identical across covers.
//
//   node scripts/journal-covers.mjs            # write every cover
//   node scripts/journal-covers.mjs --sheet    # also write a contact sheet to /tmp
//
// New post: add an entry to COVERS (slug → [tone, drawing]), run this, then
// add `cover: "/blog/covers/<slug>.svg"` to the post's frontmatter.

import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "public/blog/covers");

// bg = backdrop tint, d = line + dark fill, m = mid fill, l = light fill, a = the one accent.
const TONES = {
  blue: { bg: "#dcecfb", d: "#12395c", m: "#7cc4f5", l: "#c3e4fb", a: "#c2571a" },
  violet: { bg: "#e7e0fb", d: "#3a1f8a", m: "#7044e6", l: "#d3c7f8", a: "#e07a1f" },
  green: { bg: "#cdf5dd", d: "#0e4a37", m: "#5fd3a0", l: "#aeedcb", a: "#c2571a" },
  amber: { bg: "#fbe8c6", d: "#5f3606", m: "#eda63a", l: "#f8d792", a: "#0f766e" },
  rose: { bg: "#fadcdc", d: "#74202b", m: "#ea7c88", l: "#f6bcc2", a: "#12395c" },
  teal: { bg: "#cdf0ee", d: "#0c484d", m: "#4ec4c0", l: "#a9e6e2", a: "#c2571a" },
  slate: { bg: "#e1e7ee", d: "#1f2a3a", m: "#93a3b8", l: "#cbd5e1", a: "#c2571a" },
};

// --- primitives -------------------------------------------------------------
// `cls` is a space-separated list: s = line, then one fill (w white, l, m, d, a)
// or none; t = thin line, sa = accent line, sm = mid line, dash = dashed.
const R = (x, y, w, h, rx = 0, cls = "s w") =>
  `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
const C = (cx, cy, r, cls = "s w") => `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"/>`;
const E = (cx, cy, rx, ry, cls = "s w") =>
  `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const L = (x1, y1, x2, y2, cls = "s") =>
  `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const P = (d, cls = "s") => `<path class="${cls}" d="${d}"/>`;
const G = (x, y, body, scale = 1) =>
  `<g transform="translate(${x} ${y})${scale === 1 ? "" : ` scale(${scale})`}">${body}</g>`;
const range = (n) => Array.from({ length: n }, (_, i) => i);
const f = (n) => Number(n.toFixed(1));

function gear(cx, cy, r, teeth = 12, cls = "s l") {
  const inner = r * 0.8;
  const step = (Math.PI * 2) / teeth;
  let d = "";
  for (const i of range(teeth)) {
    const a = i * step;
    const pts = [
      [inner, a - step * 0.28],
      [r, a - step * 0.16],
      [r, a + step * 0.16],
      [inner, a + step * 0.28],
    ].map(([rad, ang]) => `${f(cx + rad * Math.cos(ang))} ${f(cy + rad * Math.sin(ang))}`);
    d += `${i ? "L" : "M"}${pts.join(" L")} `;
  }
  return P(`${d}Z`, cls) + C(cx, cy, r * 0.45, "s w") + C(cx, cy, r * 0.16, "s d");
}

function fan(cx, cy, r) {
  const spokes = range(8)
    .map((i) => {
      const a = (i * Math.PI) / 4;
      return L(cx, cy, f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a)), "s t sm");
    })
    .join("");
  return (
    C(cx, cy, r, "s l") +
    C(cx, cy, r * 0.68, "s t sm") +
    C(cx, cy, r * 0.38, "s t sm") +
    spokes +
    C(cx, cy, r, "s") +
    C(cx, cy, 6, "s d")
  );
}

// --- reusable objects (drawn around their own origin) -----------------------
const flask = (liquid = "m") =>
  P("M-18 -90 h36 v58 l50 104 a14 14 0 0 1 -13 20 h-110 a14 14 0 0 1 -13 -20 l50 -104 z", "s w") +
  P(`M-41 16 h82 l27 56 a14 14 0 0 1 -13 20 h-110 a14 14 0 0 1 -13 -20 z`, `s ${liquid}`) +
  L(-26, -90, 26, -90) +
  C(-10, 50, 5, "s w") +
  C(14, 66, 3.5, "s w");

const cup = (fill = "l") =>
  P("M-52 -30 h104 v34 a52 52 0 0 1 -104 0 z", `s ${fill}`) +
  P("M52 -18 h14 a18 18 0 0 1 0 36 h-20", "s") +
  L(-66, 66, 66, 66) +
  P("M-22 -48 q-10 -14 0 -28 q10 -14 0 -28", "s t") +
  P("M12 -48 q-10 -14 0 -28 q10 -14 0 -28", "s t");

const reel = (fill = "l") =>
  C(0, 0, 78, `s ${fill}`) +
  C(0, 0, 54, "s w") +
  range(6)
    .map((i) => {
      const a = (i * Math.PI) / 3;
      return C(f(34 * Math.cos(a)), f(34 * Math.sin(a)), 8, "s l");
    })
    .join("") +
  C(0, 0, 13, "s d");

const serverUnit = (y) =>
  R(-102, y, 204, 36, 4, "s l") +
  range(5)
    .map((i) => R(-92 + i * 22, y + 9, 15, 18, 2, "s t w"))
    .join("") +
  C(36, y + 12, 3, "d") +
  C(36, y + 25, 3, "a") +
  L(54, y + 11, 90, y + 11, "s t") +
  L(54, y + 18, 90, y + 18, "s t") +
  L(54, y + 25, 90, y + 25, "s t");

const rack = (units = 4) =>
  R(-120, -125, 240, units * 52 + 42, 8, "s w") + range(units).map((i) => serverUnit(-107 + i * 52)).join("");

const chip = () =>
  range(4)
    .map((i) => L(-18 + i * 12, -38, -18 + i * 12, 38, "s t"))
    .join("") +
  range(4)
    .map((i) => L(-38, -18 + i * 12, 38, -18 + i * 12, "s t"))
    .join("") +
  R(-28, -28, 56, 56, 6, "s w") +
  R(-13, -13, 26, 26, 3, "s m");

const cnc = () =>
  R(-110, -80, 220, 150, 10, "s w") +
  R(-92, -62, 120, 96, 6, "s l") +
  R(-44, -62, 24, 34, 2, "s d") +
  P("M-32 -28 v16", "s") +
  R(-62, 8, 60, 14, 2, "s w") +
  R(44, -62, 50, 62, 4, "s w") +
  R(52, -54, 34, 22, 2, "s m") +
  C(58, -16, 4, "d") +
  C(72, -16, 4, "a") +
  C(86, -16, 4, "d") +
  L(-110, 46, 110, 46) +
  R(-96, 70, 30, 10, 2, "s d") +
  R(66, 70, 30, 10, 2, "s d");

const pipeEnd = (cx, cy, r, fill = "l") => C(cx, cy, r, `s ${fill}`) + C(cx, cy, r * 0.62, "s w");

const vat = (level) =>
  P("M-34 -70 h68 v112 a34 20 0 0 1 -68 0 z", "s w") +
  P(`M-34 ${42 - level} h68 v${level} a34 20 0 0 1 -68 0 z`, "s m") +
  E(0, -70, 34, 10, "s l") +
  L(-46, 70, -30, 54) +
  L(46, 70, 30, 54);

// --- the covers --------------------------------------------------------------
const COVERS = {
  // Neuland — the mix shift: a flask beside bars that step up.
  "product-mix-shift-neuland": [
    "teal",
    G(250, 150, flask()) +
      R(370, 176, 30, 66, 3, "s l") +
      R(412, 132, 30, 110, 3, "s m") +
      R(454, 76, 30, 166, 3, "s d") +
      L(356, 242, 500, 242),
  ],
  // CarTrade — a car with a price tag on it.
  "cartrade-more-from-each-user": [
    "rose",
    P("M170 200 v-34 a12 12 0 0 1 10 -12 l44 -8 l40 -44 a12 12 0 0 1 9 -4 h92 a12 12 0 0 1 9 4 l44 46 l38 8 a12 12 0 0 1 10 12 v32 z", "s l") +
      P("M246 144 l30 -32 h44 v32 z", "s w") +
      P("M336 112 h34 l30 32 h-64 z", "s w") +
      L(160, 200, 480, 200) +
      C(232, 200, 28, "s w") +
      C(232, 200, 11, "s d") +
      C(404, 200, 28, "s w") +
      C(404, 200, 11, "s d") +
      G(470, 80, P("M0 0 h44 l22 22 l-22 22 h-44 a6 6 0 0 1 -6 -6 v-32 a6 6 0 0 1 6 -6 z", "s w") + C(42, 22, 5, "s a") + L(8, 16, 24, 16, "s t") + L(8, 28, 24, 28, "s t")),
  ],
  // Aeroflex — the skid: a frame carrying a tank, a pump and pipe runs.
  "aeroflex-skid-capacity": [
    "slate",
    R(170, 222, 300, 16, 3, "s d") +
      L(190, 238, 190, 256) +
      L(450, 238, 450, 256) +
      P("M190 222 v-150 h260 v150", "s") +
      R(212, 110, 84, 112, 14, "s l") +
      L(212, 142, 296, 142, "s t") +
      C(360, 190, 30, "s w") +
      C(360, 190, 10, "s d") +
      P("M296 160 h34 v6", "s") +
      P("M390 190 h34 v-92 h-170 v12", "s sa") +
      C(424, 130, 12, "s w") +
      L(424, 130, 430, 122, "s t"),
  ],
  // Neuland — the peptide bet: a chain of beads, and the vial it ends in.
  "neuland-peptide-bet": [
    "teal",
    P("M150 190 L200 120 L250 190 L300 120 L350 190 L400 120", "s") +
      [150, 250, 350].map((x) => C(x, 190, 20, "s m")).join("") +
      [200, 300].map((x) => C(x, 120, 20, "s l")).join("") +
      C(400, 120, 20, "s a") +
      G(476, 150, R(-24, -60, 48, 126, 10, "s w") + R(-24, 4, 48, 62, 10, "s l") + R(-28, -78, 56, 20, 4, "s d")),
  ],
  // Venus Pipes — a stack of tubes and the gauge that rates them.
  "venuspipes-pressure-rating-leaks": [
    "blue",
    [190, 254, 318].map((x) => pipeEnd(x, 222, 30)).join("") +
      [222, 286].map((x) => pipeEnd(x, 167, 30)).join("") +
      pipeEnd(254, 112, 30) +
      G(440, 130, C(0, 0, 58, "s w") + P("M-40 16 a43 43 0 1 1 80 0", "s t sm") + L(0, 0, 26, -28, "s sa") + C(0, 0, 7, "s d") + R(-10, 58, 20, 22, 2, "s l")),
  ],
  // Vintage Coffee — the instant-coffee jar and the cup it fills.
  "vincofe-ghost-kitchen": [
    "amber",
    G(250, 150, R(-50, -50, 100, 140, 16, "s w") + R(-50, 0, 100, 90, 16, "s m") + R(-36, 14, 72, 44, 4, "s w") + R(-42, -78, 84, 30, 6, "s d")) +
      G(410, 176, cup()),
  ],
  // Coforge — the speed dial it stopped quoting, over a line of code.
  "coforge-speed-fuel": [
    "violet",
    G(320, 190, P("M-120 0 a120 120 0 0 1 240 0 z", "s w") +
      P("M-92 0 a92 92 0 0 1 184 0", "s t sm") +
      range(7).map((i) => { const a = Math.PI + (i * Math.PI) / 6; return L(f(104 * Math.cos(a)), f(104 * Math.sin(a)), f(118 * Math.cos(a)), f(118 * Math.sin(a)), "s t"); }).join("") +
      L(0, 0, 62, -66, "s sa") +
      C(0, 0, 12, "s d")) +
      R(232, 212, 176, 40, 8, "s l") +
      L(250, 232, 290, 232, "s t") +
      L(302, 232, 362, 232, "s t") +
      C(388, 232, 4, "a"),
  ],
  // Shilpa Medicare — the vial, the syringe and the date that keeps moving.
  "shilpamed-guest-list-late": [
    "rose",
    G(230, 160, R(-34, -40, 68, 120, 10, "s w") + R(-34, 20, 68, 60, 10, "s l") + R(-22, -62, 44, 22, 3, "s w") + R(-28, -78, 56, 18, 4, "s d") + R(-22, -18, 44, 26, 2, "s t w")) +
      G(420, 150, R(-70, -64, 140, 132, 10, "s w") + R(-70, -64, 140, 34, 10, "s m") + L(-40, -78, -40, -52) + L(40, -78, 40, -52) +
        range(8).map((i) => R(-52 + (i % 4) * 28, -16 + Math.floor(i / 4) * 32, 18, 18, 3, i === 6 ? "s a" : "s t w")).join("")),
  ],
  // CCL — the road it built and the toll boom across it.
  "ccl-toll-road": [
    "amber",
    P("M150 262 L262 110 h116 L490 262 z", "s l") +
      L(320, 122, 320, 150, "s w") +
      L(320, 176, 320, 208, "s w") +
      L(320, 234, 320, 262, "s w") +
      R(196, 130, 26, 74, 4, "s d") +
      P("M214 146 L440 112", "s sa") +
      P("M214 146 L440 112", "s w dash") +
      G(450, 76, R(-28, -28, 56, 56, 8, "s w") + C(0, 0, 13, "s m") + P("M-5 -9 q10 9 0 18", "s t")),
  ],
  // CCL vs Vintage — two cups, one large and one small, on one counter.
  "ccl-vs-vintage": [
    "amber",
    G(236, 170, cup("m"), 1.15) + G(430, 190, cup("l"), 0.8) + L(150, 246, 500, 246),
  ],
  // HFCL — the cable drum, and the fibre it now draws itself.
  "hfcl-bricklayer-brickworks": [
    "blue",
    G(270, 150, reel()) +
      P("M270 228 h110 q40 0 40 -40 v-60", "s sa") +
      G(420, 96, range(5).map((i) => L(0, 0, -24 + i * 12, -44, "s t")).join("") + range(5).map((i) => C(-24 + i * 12, -48, 4, i === 2 ? "a" : "m")).join("")) +
      L(170, 238, 400, 238),
  ],
  // Laurus Labs — the reactor it now runs for other people's molecules.
  "lauruslabs-one-dish-other-chefs": [
    "green",
    G(280, 160, P("M-60 -60 h120 v90 a60 44 0 0 1 -120 0 z", "s w") + P("M-60 0 h120 v30 a60 44 0 0 1 -120 0 z", "s m") + E(0, -60, 60, 14, "s l") + L(0, -100, 0, 30) + R(-12, -116, 24, 18, 3, "s d") + P("M-26 30 h52", "s") + L(-74, 96, -48, 62) + L(74, 96, 48, 62)) +
      G(440, 120, P("M-34 0 a22 22 0 0 1 22 -22 h24 a22 22 0 0 1 0 44 h-24 a22 22 0 0 1 -22 -22 z", "s w") + P("M0 -22 h12 a22 22 0 0 1 0 44 h-12 z", "s a")) +
      G(440, 200, C(0, 0, 22, "s l") + L(-22, 0, 22, 0, "s t")),
  ],
  // Sterlite Tech — a fibre cable seen end-on, wired into a data hall.
  "stltech-signed-lease-rent": [
    "violet",
    G(240, 150, C(0, 0, 80, "s l") + C(0, 0, 60, "s w") + range(6).map((i) => { const a = (i * Math.PI) / 3; return C(f(36 * Math.cos(a)), f(36 * Math.sin(a)), 14, i % 2 ? "s m" : "s l"); }).join("") + C(0, 0, 12, "s d")) +
      P("M320 150 h46", "s sa") +
      G(450, 150, R(-72, -84, 144, 168, 6, "s w") + range(3).map((i) => R(-56, -68 + i * 48, 112, 34, 3, "s l") + C(38, -51 + i * 48, 4, i === 1 ? "a" : "d") + L(-44, -51 + i * 48, 10, -51 + i * 48, "s t")).join("")),
  ],
  // TD Power — the generator: a finned barrel on its bed, shaft out one end.
  "tdpowersys-booked-kitchen": [
    "slate",
    R(200, 86, 210, 136, 22, "s l") +
      range(7).map((i) => L(232 + i * 24, 86, 232 + i * 24, 222, "s t")).join("") +
      R(410, 126, 26, 56, 4, "s w") +
      R(436, 144, 60, 20, 3, "s d") +
      R(254, 54, 66, 32, 4, "s w") +
      C(287, 70, 6, "a") +
      R(176, 222, 258, 16, 3, "s d") +
      L(200, 238, 200, 256) +
      L(410, 238, 410, 256) +
      P("M164 110 q-18 20 0 40", "s t") +
      P("M150 98 q-28 32 0 64", "s t"),
  ],
  // Netweb — the server it builds, and the keys it hands over.
  "netweb-keeps-quoting-a-year": [
    "blue",
    G(260, 160, R(-70, -110, 140, 210, 8, "s w") + range(3).map((i) => R(-54, -94 + i * 40, 108, 28, 3, "s l") + C(38, -80 + i * 40, 3.5, "d") + L(-42, -80 + i * 40, 10, -80 + i * 40, "s t")).join("") + R(-54, 34, 108, 50, 3, "s t w") + range(5).map((i) => L(-42 + i * 21, 42, -42 + i * 21, 76, "s t sm")).join("")) +
      G(440, 150, C(0, -30, 30, "s w") + C(0, -38, 9, "s a") + P("M-8 0 h16 v86 h-16 z", "s l") + P("M8 44 h18 M8 64 h24", "s")),
  ],
  // Sterlite vs HFCL — two cable drums, side by side.
  "stltech-vs-hfcl": [
    "violet",
    G(232, 156, reel("m")) + G(424, 176, reel("l"), 0.74) + L(140, 236, 500, 236),
  ],
  // Aarti Pharmalabs — three vats; only the first is full.
  "aartipharm-fill-the-vats": [
    "teal",
    G(210, 160, vat(96)) + G(320, 160, vat(52)) + G(430, 160, vat(16)) + P("M210 66 v-22 h220 v22 M320 44 v22", "s sa"),
  ],
  // MTAR — a machined precision part, with a clock running beside it.
  "mtartech-order-book-clock": [
    "slate",
    G(240, 160, gear(0, 0, 80, 10, "s l")) +
      G(440, 150, C(0, 0, 62, "s w") + range(12).map((i) => { const a = (i * Math.PI) / 6; return L(f(50 * Math.cos(a)), f(50 * Math.sin(a)), f(56 * Math.cos(a)), f(56 * Math.sin(a)), "s t"); }).join("") + L(0, 0, 0, -38) + L(0, 0, 26, 14, "s sa") + C(0, 0, 6, "s d") + R(-8, -78, 16, 16, 2, "s d")),
  ],
  // E2E — the rack, and the GPU that fills it.
  "e2e-hotel-new-wing": ["violet", G(300, 165, rack(4)) + G(476, 96, chip())],
  // Sansera — the connecting rod it is known for, and the gear it is betting on.
  "sansera-parts-that-never-see-an-engine": [
    "green",
    P("M196 98 L246 216 L286 200 L228 86 z", "s w") +
      L(214, 104, 258, 198, "s t sm") +
      C(208, 82, 28, "s w") +
      C(208, 82, 13, "s l") +
      C(272, 226, 44, "s w") +
      C(272, 226, 26, "s l") +
      gear(440, 124, 62, 12, "s m") +
      R(352, 232, 150, 16, 8, "s w") +
      R(376, 212, 30, 56, 6, "s w") +
      R(450, 212, 30, 56, 6, "s w") +
      C(391, 240, 5, "s l") +
      C(465, 240, 5, "s l"),
  ],
  // Aimtron — a populated board; one trace still has a gap in it.
  "aimtron-bridge-one-span": [
    "green",
    R(170, 60, 300, 190, 10, "s l") +
      [[186, 76], [454, 76], [186, 234], [454, 234]].map(([x, y]) => C(x, y, 5, "s w")).join("") +
      G(300, 150, chip()) +
      P("M338 138 h50 v-42 h34", "s") +
      P("M338 162 h30 M392 162 h30", "s sa") +
      P("M262 150 h-40 v60 h60", "s") +
      R(408, 82, 34, 26, 3, "s w") +
      R(422, 150, 28, 24, 3, "s w") +
      C(292, 210, 9, "s w") +
      range(4).map((i) => R(208 + i * 16, 84, 9, 30, 2, "s d")).join(""),
  ],
  // DEE Development — a piping spool: flanges, an elbow, a wider run.
  "deedev-wider-pipe-line-fill": [
    "slate",
    P("M150 196 h170 a60 60 0 0 0 60 -60 v-76 h60 v76 a120 120 0 0 1 -120 120 h-170 z", "s l") +
      R(196, 184, 18, 84, 3, "s d") +
      R(280, 184, 18, 84, 3, "s d") +
      R(368, 96, 84, 18, 3, "s d") +
      R(360, 44, 100, 18, 3, "s w") +
      P("M150 226 h100", "s t dash") +
      C(470, 220, 30, "s w") +
      C(470, 220, 17, "s m") +
      L(470, 190, 470, 172, "s sa"),
  ],
  // E2E vs Netweb — the rack that is rented out, and the box that is sold.
  "e2e-vs-netweb": [
    "violet",
    G(240, 176, rack(3), 0.92) +
      G(450, 170, R(-60, -90, 120, 180, 8, "s w") + range(3).map((i) => R(-46, -74 + i * 36, 92, 24, 3, "s l") + C(32, -62 + i * 36, 3.5, i ? "d" : "a")).join("") + range(4).map((i) => L(-36 + i * 24, 44, -36 + i * 24, 74, "s t sm")).join("")),
  ],
  // Shree Refrigerations — the marine chiller: two fans and a coil.
  "shreeref-stores-resupply": [
    "blue",
    R(170, 60, 300, 180, 12, "s w") +
      L(196, 80, 444, 80, "s t sm dash") +
      fan(250, 160, 50) +
      fan(390, 160, 50) +
      range(4).map((i) => P(`M470 ${84 + i * 36} a14 14 0 0 1 0 28`, "s sa")).join("") +
      R(196, 240, 34, 12, 2, "s d") +
      R(410, 240, 34, 12, 2, "s d") +
      P("M312 228 l16 0 M320 220 l0 16 M314 222 l12 12 M326 222 l-12 12", "s t sm"),
  ],
  // Gravita — the scrap battery that goes in and the ingots that come out.
  "gravita-toll-and-traffic": [
    "teal",
    G(230, 160, R(-70, -40, 140, 110, 8, "s w") + R(-70, -40, 140, 30, 8, "s l") + R(-50, -60, 26, 20, 3, "s d") + R(24, -60, 26, 20, 3, "s d") + P("M-14 14 h28 M0 0 v28", "s") + P("M-46 44 h28", "s")) +
      P("M316 150 h36 m-12 -12 l12 12 l-12 12", "s sa") +
      [[372, 208], [436, 208], [404, 164]].map(([x, y]) => P(`M${x} ${y + 40} l12 -40 h64 l12 40 z`, "s m") + P(`M${x + 12} ${y} h64`, "s")).join(""),
  ],
  // Shivalik Bimetal — the strip of two bonded metals, and the part cut from it.
  "sbcl-flour-to-bread": [
    "amber",
    P("M150 226 q150 -150 300 -112 l-6 26 q-134 -30 -274 106 z", "s m") +
      P("M170 246 q140 -136 274 -106 l-6 26 q-124 -22 -248 100 z", "s w") +
      G(440, 214, R(-56, -18, 112, 36, 4, "s l") + R(-56, -18, 30, 36, 4, "s d") + R(26, -18, 30, 36, 4, "s d") + L(-14, -18, -14, 18, "s t") + L(14, -18, 14, 18, "s t")) +
      C(206, 96, 28, "s w") +
      L(206, 96, 222, 82, "s sa") +
      C(206, 96, 5, "d"),
  ],
  // Azad — the turbine wheel: a hub ringed with aerofoil blades.
  "azad-workshop-for-every-client": [
    "blue",
    G(320, 150, range(14).map((i) => `<g transform="rotate(${f((i * 360) / 14)})">${P("M-9 -52 q-8 -34 10 -56 q14 26 8 56 z", "s l")}</g>`).join("") + C(0, 0, 54, "s w") + C(0, 0, 34, "s t sm") + range(6).map((i) => { const a = (i * Math.PI) / 3; return C(f(44 * Math.cos(a)), f(44 * Math.sin(a)), 3.5, "d"); }).join("") + C(0, 0, 16, "s a")),
  ],
  // Jyoti CNC — the machining centre.
  "jyoticnc-machines-hold-tolerance": ["slate", G(320, 150, cnc(), 1.15)],
  // Jyoti vs Macpower — two machines on one floor, one much the larger.
  "jyoticnc-vs-macpower": ["slate", G(244, 146, cnc(), 1.05) + G(458, 186, cnc(), 0.6) + L(110, 242, 540, 242)],
  // Macpower — the lathe chuck, three jaws on a bar.
  "macpower-every-table-booked": [
    "rose",
    G(270, 150, C(0, 0, 88, "s l") + C(0, 0, 66, "s t sm") + range(3).map((i) => `<g transform="rotate(${i * 120})">${R(-13, -82, 26, 50, 3, "s w")}${L(-13, -62, 13, -62, "s t")}${L(-13, -48, 13, -48, "s t")}</g>`).join("") + C(0, 0, 24, "s w") + C(0, 0, 10, "s d")) +
      R(294, 136, 150, 28, 3, "s w") +
      P("M444 136 l34 14 l-34 14 z", "s d") +
      G(470, 214, R(-30, -18, 60, 36, 4, "s w") + P("M-30 -18 l-20 -22", "s sa")),
  ],
  // Bondada — the tower it builds for others, and the panels it wants to own.
  "bondada-builder-to-landlord": [
    "amber",
    P("M232 258 L262 50 h16 L308 258", "s") +
      P("M256 96 h28 M250 140 h40 M244 184 h52 M238 228 h64 M256 96 l34 44 M284 96 l-34 44 M250 140 l46 44 M290 140 l-46 44 M244 184 l58 44 M296 184 l-58 44", "s t") +
      R(254, 34, 32, 16, 3, "s d") +
      P("M226 62 q-14 14 0 28 M314 62 q14 14 0 28", "s t sa") +
      G(430, 196, P("M-70 34 l24 -76 h112 l24 76 z", "s l") + P("M-58 -4 h136 M-10 -42 l-12 76 M30 -42 l12 76", "s t") + L(10, 34, 10, 62) + L(-16, 62, 36, 62)) +
      C(470, 76, 22, "s m"),
  ],
  // KSH — the spool of winding wire, sold by weight.
  "kshintl-charges-by-the-gram": [
    "amber",
    G(260, 150, R(-70, -96, 140, 20, 6, "s d") + R(-70, 76, 140, 20, 6, "s d") + R(-52, -76, 104, 152, 4, "s m") + range(9).map((i) => L(-52, -60 + i * 17, 52, -68 + i * 17, "s t")).join("") + P("M52 40 q60 10 70 60", "s")) +
      G(450, 170, P("M-60 30 h120 l-14 26 h-92 z", "s w") + L(0, 30, 0, -50) + L(-50, -50, 50, -50) + P("M-70 -6 a20 12 0 0 0 40 0 z", "s l") + P("M30 -6 a20 12 0 0 0 40 0 z", "s l") + P("M-50 -50 l-20 44 M-50 -50 l20 44 M50 -50 l-20 44 M50 -50 l20 44", "s t") + C(0, -50, 6, "s a")),
  ],
  // Welspun Corp — line pipe: big bore, spiral seam.
  "welcorp-stitching-promise-holds": [
    "slate",
    P("M196 96 h250 v120 h-250 z", "s l") +
      range(5).map((i) => P(`M${236 + i * 46} 96 q26 60 0 120`, "s t")).join("") +
      E(446, 156, 26, 60, "s l") +
      E(196, 156, 26, 60, "s w") +
      E(196, 156, 15, 42, "s m") +
      P("M300 60 l10 22 l10 -22", "s sa") +
      L(310, 40, 310, 60, "s sa") +
      L(150, 240, 500, 240),
  ],
  // Entero — the chemist's shop it keeps buying.
  "entero-bought-the-shops": [
    "green",
    R(190, 110, 260, 140, 4, "s w") +
      P("M176 110 l24 -50 h240 l24 50 z", "s l") +
      range(5).map((i) => P(`M${176 + i * 57.6} 110 a28.8 22 0 0 0 57.6 0`, i % 2 ? "s w" : "s m")).join("") +
      R(214, 160, 110, 62, 3, "s l") +
      L(269, 160, 269, 222, "s t") +
      R(356, 160, 62, 90, 3, "s w") +
      C(406, 208, 4, "d") +
      G(320, 84, C(0, 0, 20, "s w") + P("M-10 0 h20 M0 -10 v20", "s sa")) +
      L(160, 250, 480, 250),
  ],
  // Laurus vs Neuland — two flasks, one filling up to the other's line.
  "lauruslabs-vs-neuland": ["green", G(236, 160, flask("l")) + G(420, 160, flask("m")) + L(140, 256, 500, 256)],
  // Acutaas — the molecule that paid for the rest.
  "acutaas-crop-paid-for-fields": [
    "violet",
    G(260, 150, P("M0 -70 L60.6 -35 V35 L0 70 L-60.6 35 V-35 Z", "s w") + P("M0 -50 L43 -25 M43 25 L0 50 M-43 25 V-25", "s t sm") + L(60.6, -35, 112, -65) + L(60.6, 35, 112, 65) + L(-60.6, 35, -108, 62) + C(112, -65, 15, "s m") + C(112, 65, 15, "s a") + C(-108, 62, 15, "s l")) +
      G(456, 170, flask(), 0.72),
  ],
  // Aeroflex — the corrugated hose, a fitting on each end, on a cooling loop.
  "aeroflex-pipe-fitter-contractor": [
    "blue",
    range(11).map((i) => R(204 + i * 22, 120, 16, 60, 8, i % 2 ? "s l" : "s w")).join("") +
      R(160, 126, 40, 48, 4, "s d") +
      R(140, 136, 22, 28, 3, "s w") +
      R(448, 126, 40, 48, 4, "s d") +
      R(486, 136, 22, 28, 3, "s w") +
      P("M150 196 v34 h348 v-34", "s sa") +
      P("M300 222 l14 8 l-14 8", "s sa") +
      P("M240 86 q10 -14 0 -28 M320 86 q10 -14 0 -28 M400 86 q10 -14 0 -28", "s t sm"),
  ],
  // KRN — the fin-and-tube coil.
  "krn-hall-six-times": [
    "teal",
    R(190, 60, 260, 190, 6, "s w") +
      range(15).map((i) => L(204 + i * 16.6, 60, 204 + i * 16.6, 250, "s t sm")).join("") +
      P("M170 88 h280 a16 16 0 0 1 0 32 h-260 a16 16 0 0 0 0 32 h260 a16 16 0 0 1 0 32 h-260 a16 16 0 0 0 0 32 h280", "s sa") +
      R(150, 78, 22, 20, 3, "s d") +
      R(468, 206, 22, 20, 3, "s d"),
  ],
  // ideaForge — the surveillance quadcopter: four rotors, a body, legs and the camera under it.
  "ideaforge-farms-on-armys-rain": [
    "rose",
    E(236, 92, 40, 7, "s t w") +
      E(404, 92, 40, 7, "s t w") +
      L(282, 128, 236, 96) +
      L(358, 128, 404, 96) +
      R(226, 90, 20, 10, 3, "s d") +
      R(394, 90, 20, 10, 3, "s d") +
      L(274, 142, 190, 118) +
      L(366, 142, 450, 118) +
      R(178, 110, 24, 14, 3, "s d") +
      R(438, 110, 24, 14, 3, "s d") +
      E(190, 104, 50, 9, "s l") +
      E(450, 104, 50, 9, "s l") +
      L(190, 95, 190, 104, "s t") +
      L(450, 95, 450, 104, "s t") +
      R(268, 126, 104, 44, 14, "s m") +
      P("M288 126 a32 20 0 0 1 64 0", "s w") +
      C(320, 148, 4, "a") +
      P("M290 170 l-24 52 M350 170 l24 52", "s") +
      L(244, 222, 290, 222) +
      L(350, 222, 396, 222) +
      L(320, 170, 320, 180) +
      C(320, 194, 15, "s w") +
      C(320, 194, 6, "s a") +
      P("M220 252 q100 -26 200 0", "s t sm dash"),
  ],
  // Unimech — what it makes: a jet engine held in an engine-handling stand, clamped by a ring.
  "unimech-hangar-twice-its-fleet": [
    "amber",
    P("M230 78 L430 100 Q458 104 458 130 L458 150 Q458 176 430 180 L230 202 Z", "s l") +
      P("M458 124 L500 140 L458 156", "s w") +
      E(230, 140, 30, 62, "s w") +
      E(230, 140, 20, 44, "s m") +
      range(6)
        .map((i) => {
          const a = (i * Math.PI) / 3;
          return L(230, 140, f(230 + 18 * Math.cos(a)), f(140 + 40 * Math.sin(a)), "s t");
        })
        .join("") +
      C(230, 140, 8, "s d") +
      P("M340 89 Q354 140 340 191", "s sa") +
      L(300, 196, 300, 236) +
      L(404, 184, 404, 236) +
      R(282, 190, 36, 10, 3, "s d") +
      R(386, 178, 36, 10, 3, "s d") +
      R(180, 236, 300, 14, 4, "s w") +
      C(206, 260, 9, "s d") +
      C(454, 260, 9, "s d"),
  ],
};

// --- frame --------------------------------------------------------------------
function frame(tone, body, label) {
  const t = TONES[tone];
  const grid =
    range(15).map((i) => `<line x1="${(i + 1) * 40}" y1="0" x2="${(i + 1) * 40}" y2="360"/>`).join("") +
    range(8).map((i) => `<line x1="0" y1="${(i + 1) * 40}" x2="640" y2="${(i + 1) * 40}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="${label}">
<style>.s{fill:none;stroke:${t.d};stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.t{stroke-width:2}.sa{stroke:${t.a}}.sm{stroke:${t.m}}.dash{stroke-dasharray:14 12}.w{fill:#fff}.l{fill:${t.l}}.m{fill:${t.m}}.d{fill:${t.d}}.a{fill:${t.a}}</style>
<rect width="640" height="360" fill="${t.bg}"/>
<g stroke="${t.d}" stroke-opacity=".07" stroke-width="1">${grid}</g>
<g transform="translate(320 150) scale(1.12) translate(-320 -150)">${body}</g>
</svg>
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [slug, [tone, body]] of Object.entries(COVERS)) {
  fs.writeFileSync(path.join(OUT_DIR, `${slug}.svg`), frame(tone, body, `Cover illustration for ${slug}`));
}
console.log(`wrote ${Object.keys(COVERS).length} covers to ${path.relative(process.cwd(), OUT_DIR)}`);

if (process.argv.includes("--sheet")) {
  const cells = Object.keys(COVERS)
    .map((slug) => `<figure><img src="file://${path.join(OUT_DIR, `${slug}.svg`)}"><figcaption>${slug}</figcaption></figure>`)
    .join("");
  const sheet = `<!doctype html><meta charset="utf-8"><style>body{margin:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;font:11px monospace}figure{margin:0}img{width:100%;display:block;border:1px solid #ccc}</style>${cells}`;
  fs.writeFileSync("/tmp/journal-covers-sheet.html", sheet);
  console.log("contact sheet: /tmp/journal-covers-sheet.html");
}
