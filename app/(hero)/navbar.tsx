import { AuthButton } from "@/components/auth-button";
import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import React from "react";

const Navbar = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pass minimal, non-sensitive data
  const userInfo = user
    ? {
        email: user.email ?? null,
        name: user.user_metadata?.full_name ?? null,
        avatar: user.user_metadata?.avatar_url ?? null,
      }
    : null;

  return (
    <nav className=" flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
        <div className="flex gap-5 items-center font-bold">
          <Link href={"/"} prefetch={false}>
            Concall Alpha
          </Link>
          <div className="flex items-center gap-2">
            <DeployButton />
          </div>
        </div>

        {!hasEnvVars ? (
          <EnvVarWarning />
        ) : (
          <AuthButton initialUser={userInfo} />
        )}
      </div>
    </nav>
  );
};

export default Navbar;
