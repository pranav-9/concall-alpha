"use client";

import Link from "next/link";
import { Button } from "./ui/button";
// import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserInfo = {
  email: string | null;
  name: string | null;
  avatar: string | null;
} | null;

export function AuthButton({ initialUser }: { initialUser: UserInfo }) {
  const supabase = createClient();

  // // You can also use getUser() which will be slower.
  // const { data } = await supabase.auth.getClaims();

  // // const user = data?.claims;
  // console.log(data?.claims);

  // const router = useRouter();
  const [user, setUser] = useState<UserInfo>(initialUser);

  // Listen for login/logout/token refresh and update UI without full reload
  useEffect(
    () => {
      const { data: sub } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          console.log("auth state change");

          const u = session?.user
            ? {
                // email: uEmail(session),
                email: "hard codede emial for now",
                name: session.user.user_metadata?.full_name ?? null,
                avatar: session.user.user_metadata?.avatar_url ?? null,
              }
            : null;
          setUser(u);
          // Trigger an RSC refresh so server components (like this navbar's server wrapper) get fresh cookies next navigation
          // router.refresh();
        }
      );

      return () => {
        sub.subscription.unsubscribe();
      };
    },
    [
      // router
    ]
  );

  // function uEmail(session: Session | null
  //   // {
  //   // user: {
  //   //   email: string;
  //   // };
  //   }
  // ) {
  //   return session?.user?.email ?? null;
  // }

  return user ? (
    <div className="flex items-center gap-4">
      {/* Hey<p className="line-clamp-0.5">{user.email}</p> */}
      {/* UHey, {user.email}! */}
      <LogoutButton />
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
