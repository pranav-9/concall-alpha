"use client";

import { useEffect } from "react";
import { identifyUser } from "@/lib/analytics";

/**
 * Ties the PostHog session to the signed-in user on every authenticated page
 * load — not only at the instant a login form submits. Fed by the server-known
 * user in the root layout, so it also covers the two login paths that finish in
 * a server route and therefore have no client identify point of their own
 * (Google OAuth callback, email-confirmation), and re-identifies returning
 * sessions so a logged-in visitor stops reading as an anonymous one.
 *
 * Distinct id is the immutable Supabase user id (not email — email can change,
 * and the existing identified persons are already keyed on the id); email rides
 * along as a person property. posthog-js dedupes a repeat identify with the same
 * id, so mounting this on each load is cheap. Reset-on-logout stays in
 * logout-button.tsx — resetting here for anonymous loads would churn the
 * anonymous distinct id and fragment anonymous sessions. Renders nothing.
 */
export function IdentityBridge({
  userId,
  email,
}: {
  userId: string | null;
  email: string | null;
}) {
  useEffect(() => {
    if (!userId) return;
    identifyUser(userId, email ? { email } : undefined);
  }, [userId, email]);
  return null;
}
