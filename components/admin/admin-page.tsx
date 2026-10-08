import type { ReactElement } from "react";
import { cookies } from "next/headers";

import { ADMIN_ACCESS_COOKIE, hasAdminAccess } from "@/lib/admin-auth";

import { AdminLoginForm } from "./admin-login-form";

/**
 * Every /admin page's default export is wrapped in this, and the gate MUST
 * live here, inside the page — never only in app/admin/layout.tsx.
 *
 * Next renders a page in parallel with its layout and serialises the page's
 * output into the response's RSC payload even when the layout never places
 * `children`. A layout-only gate therefore shows the login form while shipping
 * the page's data (account emails, requests) in the page source. That shipped
 * 2026-10-07 and was fixed 2026-10-08; tests/admin-page-gate.test.ts fails the
 * build's test run if a page skips this wrapper.
 *
 * The check runs before the wrapped page is called, so no query runs for a
 * visitor without a valid signed cookie (lib/admin-auth.ts).
 */
export function adminPage<P>(Page: (props: P) => Promise<ReactElement> | ReactElement) {
  return async function GatedAdminPage(props: P): Promise<ReactElement> {
    const cookieStore = await cookies();
    if (!hasAdminAccess(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value)) {
      return <AdminLoginForm />;
    }
    return await Page(props);
  };
}
