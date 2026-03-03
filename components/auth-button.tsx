"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export type UserInfo = {
  email: string | null;
  name: string | null;
  avatar: string | null;
} | null;

export function AuthButton({
  initialUser = null,
  compact = false,
}: {
  initialUser?: UserInfo;
  compact?: boolean;
}) {
  const supabaseRef = useRef(createClient());
  const [user, setUser] = useState<UserInfo>(initialUser);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    void supabaseRef.current.auth.getUser().then(({ data, error }) => {
      if (!isMounted || error) return;
      const currentUser = data.user
        ? {
            email: data.user.email ?? null,
            name: data.user.user_metadata?.full_name ?? null,
            avatar: data.user.user_metadata?.avatar_url ?? null,
          }
        : null;
      setUser(currentUser);
    });

    const { data: sub } = supabaseRef.current.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user
          ? {
              email: session.user.email ?? null,
              name: session.user.user_metadata?.full_name ?? null,
              avatar: session.user.user_metadata?.avatar_url ?? null,
            }
          : null;
        setUser(u);
        router.refresh();
      }
    );

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return user ? (
    <div className="flex items-center gap-3">
      <LogoutButton compact={compact} />
    </div>
  ) : compact ? (
    <div className="flex items-center gap-3">
      <Link
        href="/auth/login"
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign in
      </Link>
      <Link
        href="/auth/sign-up"
        className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sign up
      </Link>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
