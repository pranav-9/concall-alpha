import { Button } from "concall-alpha";
import { ArrowRight, Download, Plus, Trash2 } from "lucide-react";

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>Add to watchlist</Button>
    <Button variant="secondary">Compare quarters</Button>
    <Button variant="outline">Export CSV</Button>
    <Button variant="ghost">Dismiss</Button>
    <Button variant="destructive">Remove company</Button>
    <Button variant="link">Read the transcript</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>
      <Plus /> Add company
    </Button>
    <Button variant="outline">
      <Download /> Download PDF
    </Button>
    <Button variant="secondary">
      Next quarter <ArrowRight />
    </Button>
  </div>
);

export const IconOnly = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="icon-sm" variant="outline" aria-label="Add">
      <Plus />
    </Button>
    <Button size="icon" variant="outline" aria-label="Download">
      <Download />
    </Button>
    <Button size="icon-lg" variant="destructive" aria-label="Remove">
      <Trash2 />
    </Button>
  </div>
);

export const Disabled = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button disabled>Scoring…</Button>
    <Button variant="outline" disabled>
      No transcript yet
    </Button>
    <Button variant="secondary" disabled>
      Awaiting Q1 FY27
    </Button>
  </div>
);
