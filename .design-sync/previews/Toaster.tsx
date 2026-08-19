import { Toaster } from "concall-alpha";

// Toaster is a PORTAL TARGET, not a widget. app/layout.tsx mounts exactly one
// (`<Toaster richColors />`, beside the footer) and every toast afterwards is
// fired imperatively from anywhere in the tree. It takes no children, and with
// no live toasts sonner renders an empty aria-live <section> — so there is
// nothing to photograph.
//
// A live toast CANNOT be produced in a preview: `toast` is not on the package
// barrel, and importing it from "sonner" compiles a SECOND copy of sonner into
// the preview bundle with its own module-level ToastState, which the shipped
// Toaster never subscribes to. Verified — the toasts fire into the void.
// Faking one with hand-written markup would teach the design agent a toast
// shape that is not the component's. So each cell mounts the REAL Toaster and
// captions what it is. See .design-sync/learnings/B-overlay-nav.md: this
// component is the one honest candidate for cfg.overrides.Toaster.skip.

const CARD_CLASS = "relative rounded-lg border border-border p-4";
const LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const BODY_CLASS = "mt-2 max-w-md text-sm leading-relaxed text-muted-foreground";

export const AppMount = () => (
  <div className={CARD_CLASS}>
    <p className={LABEL_CLASS}>Mounted once, at the shell</p>
    <p className={BODY_CLASS}>
      This is the whole integration: one Toaster in the root layout, next to the
      footer, with richColors on. It paints nothing until something calls
      toast() — a score promoted, a watchlist saved, a valuation refresh that
      failed.
    </p>
    <p className="mt-3 text-[12px] text-muted-foreground">
      The real component is mounted below this line and is deliberately
      invisible.
    </p>
    <Toaster richColors />
  </div>
);

export const ConfiguredForTheDesk = () => (
  <div className={CARD_CLASS}>
    <p className={LABEL_CLASS}>Configured mount</p>
    <p className={BODY_CLASS}>
      The props are all placement and behaviour — there is no visual variant
      axis to sweep. The Desk mounts it bottom-right, expanded, with a close
      button so a stack of filing notifications can be dismissed one at a time.
    </p>
    <dl className="mt-3 max-w-md divide-y divide-border text-[12px]">
      {[
        ["position", "bottom-right — clear of the company-page tab bar"],
        ["richColors", "success / warning / error get their own surface"],
        ["expand", "the stack stays open instead of collapsing to one"],
        ["closeButton", "each toast is individually dismissible"],
      ].map(([prop, why]) => (
        <div key={prop} className="flex gap-4 py-1.5">
          <dt className="w-24 shrink-0 font-medium text-foreground">{prop}</dt>
          <dd className="text-muted-foreground">{why}</dd>
        </div>
      ))}
    </dl>
    <Toaster richColors position="bottom-right" expand closeButton />
  </div>
);
