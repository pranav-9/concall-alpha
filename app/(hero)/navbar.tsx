import { DeployButton } from "@/components/deploy-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import React from "react";

const Navbar = async () => {
  return (
    <nav className="flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-5xl flex justify-between items-center p-3 px-3 sm:px-5 text-sm">
        <div className="flex gap-2 sm:gap-5 items-center font-bold min-w-0">
          <Link href={"/"} className="truncate">
            Concall Alpha
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <DeployButton />
            <Link
              href="/how-scores-work"
              className="inline-flex text-[11px] sm:text-xs font-medium text-gray-300 hover:text-white underline underline-offset-4"
            >
              How Scores Work
            </Link>
          </div>
        </div>

        {!hasEnvVars ? <EnvVarWarning /> : null}
      </div>
    </nav>
  );
};

export default Navbar;
