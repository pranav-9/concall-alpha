import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin – Story of a Stock",
  description: "Internal admin panel.",
  robots: { index: false, follow: false },
};

// The gate for every /admin/* route: no cookie, no section — the login form
// renders in the children's place, so a section page never runs its queries
// for a visitor who cannot see them. The whole panel wears the house skin.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const hasAccess = hasAdminAccess(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);

  return <div className="house min-h-screen">{hasAccess ? children : <AdminLoginForm />}</div>;
}
