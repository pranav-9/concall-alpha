import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin – Story of a Stock",
  description: "Internal admin panel.",
  robots: { index: false, follow: false },
};

// Skin only. The passcode gate is NOT here: Next renders a page alongside its
// layout and ships the page's output even when the layout withholds
// `children`, so a gate in this file would hide the page on screen while
// leaking its data in the payload. Each page gates itself through
// adminPage() (components/admin/admin-page.tsx) before running any query.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="house min-h-screen">{children}</div>;
}
