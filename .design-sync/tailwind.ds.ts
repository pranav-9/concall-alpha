// Tailwind config for the /design-sync export only — the app keeps using
// ../tailwind.config.ts untouched.
//
// Why this exists: the uploaded styles.css is STATIC. Whatever utility classes
// it does not contain simply do not exist for any design built with this system.
// Scanning the repo alone yields only the classes the portal happens to use
// today, so a design agent writing ordinary layout glue would hit unstyled
// elements. The safelist below widens the palette and spacing scale to the
// families this design system actually speaks in (see lib/score-band.ts for the
// teal<->red diverging ramp and lib/design/shell.ts for the sky-tinted surfaces).
import base from "../tailwind.config";

// The families the portal's visual language is built from. Deliberately not the
// full Tailwind palette — an agent should reach for these, not invent a new hue.
const HUES = [
  "slate", "gray", "zinc", "red", "orange", "amber", "yellow",
  "lime", "green", "emerald", "teal", "cyan", "sky", "blue",
  "indigo", "violet", "purple", "rose",
].join("|");
const SHADES = "50|100|200|300|400|500|600|700|800|900|950";

// The theme's own semantic colours. These are the design system's real
// vocabulary (they resolve to the hsl(var(--*)) tokens in globals.css), but
// Tailwind only emits the ones the portal happens to use today — `bg-primary`
// appears, bare `text-destructive` almost never does. A design agent reaching
// for `bg-card` or `text-muted-foreground` must not hit a missing class.
const SEMANTIC = [
  "background", "foreground", "border", "input", "ring",
  "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground",
  "muted", "muted-foreground", "accent", "accent-foreground",
  "destructive", "destructive-foreground",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
].join("|");

export default {
  ...base,
  // Previews are NOT a content source for the app's own Tailwind build, so a
  // class an authored preview card invents compiles to nothing — and because
  // `cn()` runs tailwind-merge, an invented class that CONFLICTS with a base
  // class silently deletes it (`<Avatar className="size-12">` stripped the
  // component's own `size-8` and left the avatar unsized). Scanning the preview
  // sources closes that gap.
  content: [...(base.content as string[]), "./.design-sync/previews/**/*.tsx"],
  theme: {
    ...base.theme,
    extend: {
      ...base.theme?.extend,
      // Tailwind 3.4's built-in aria variants are busy/checked/disabled/
      // expanded/hidden/pressed/readonly/required/selected -- `invalid` is NOT
      // among them. The components/ui primitives are the v4-era shadcn
      // generation and their cva base strings carry `aria-invalid:*`, so every
      // field-error affordance on Input, Checkbox, Select, Toggle, ToggleGroup
      // and Badge was being dropped at build time. Declaring it here makes the
      // shipped stylesheet match the shipped components.
      // NOTE: ../tailwind.config.ts has the same gap, so the app itself renders
      // no error state either. That is a real bug in the portal, not just here.
      aria: { ...(base.theme?.extend as { aria?: object })?.aria, invalid: 'invalid="true"' },
      // Same class of problem as aria-invalid. components/ui/sidebar.tsx is a
      // v4-era shadcn file: globals.css declares the sidebar palette inside an
      // `@theme inline` block, which is v4 syntax that Tailwind 3 ignores
      // entirely, and ../tailwind.config.ts has no `sidebar` colour. So
      // bg-sidebar / text-sidebar-foreground / border-sidebar-border resolved
      // to nothing and the rail rendered with no background at all. The custom
      // properties themselves DO exist (globals.css :root and .dark), and they
      // hold full colours -- `hsl(0 0% 98%)`, not bare triplets -- so these map
      // through var() directly, NOT through hsl(var()).
      colors: {
        ...(base.theme?.extend as { colors?: object })?.colors,
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
    },
  },
  safelist: [
    {
      pattern: new RegExp(`^(bg|text|border|ring|fill|stroke|divide|outline)-(${SEMANTIC})$`),
      variants: ["hover", "focus", "focus-visible", "dark", "aria-invalid", "disabled"],
    },
    {
      pattern: new RegExp(`^(bg|text|border|ring|fill|stroke)-(${HUES})-(${SHADES})$`),
      variants: ["hover", "focus", "dark", "dark:hover"],
    },
    {
      pattern: new RegExp(`^(from|via|to)-(${HUES})-(${SHADES})$`),
      variants: ["dark"],
    },
    {
      pattern: /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24)$/,
      variants: ["sm", "md", "lg"],
    },
    {
      pattern: /^(w|h|min-w|min-h|max-w|max-h)-(0|px|1|2|3|4|5|6|8|10|12|16|20|24|32|40|48|56|64|full|screen|min|max|fit|auto)$/,
      variants: ["sm", "md", "lg"],
    },
    {
      pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)$/,
      variants: ["sm", "md", "lg"],
    },
    {
      pattern: /^(grid-cols|col-span)-(1|2|3|4|5|6|7|8|9|10|11|12)$/,
      variants: ["sm", "md", "lg"],
    },
    {
      pattern: /^(rounded|rounded-t|rounded-b|rounded-l|rounded-r)-(none|sm|md|lg|xl|2xl|3xl|full)$/,
    },
    {
      pattern: /^(items|justify|self|content|place-items)-(start|end|center|between|around|evenly|stretch|baseline)$/,
      variants: ["sm", "md", "lg"],
    },
    {
      pattern: /^(flex|grid|block|inline-block|inline-flex|hidden|table|contents)$/,
      variants: ["sm", "md", "lg", "dark"],
    },
    {
      pattern: /^(font)-(thin|light|normal|medium|semibold|bold|extrabold)$/,
    },
    {
      pattern: /^(shadow)-(none|sm|md|lg|xl|2xl|inner)$/,
    },
    {
      pattern: /^opacity-(0|5|10|20|25|30|40|50|60|70|75|80|90|95|100)$/,
      variants: ["hover", "dark"],
    },
  ],
} satisfies typeof base;
