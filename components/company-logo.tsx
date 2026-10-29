// A company's mark: its logo on a white tile when one is on file, else its
// initials. Logos are self-hosted at public/logos/<CODE>.png (96×96, fetched
// from the company's own site and reviewed by scripts/fetch-company-logos.mjs);
// the white tile is deliberate in both themes — the marks are drawn for a light
// ground. No hooks, so server and client paints share it.

import Image from "next/image";

import { COMPANY_LOGO_CODES } from "@/lib/company-logo-codes";
import { cn } from "@/lib/utils";

// Company initials for the monogram: first letter of the first two words; a
// single-word name takes its first two letters. "&" is not a word.
export function initials(name: string): string {
  const words = name.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const pick = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return pick.toUpperCase();
}

export function companyLogoSrc(code: string | null | undefined): string | null {
  const key = code?.trim().toUpperCase();
  return key && COMPANY_LOGO_CODES.has(key) ? `/logos/${encodeURIComponent(key)}.png` : null;
}

/**
 * `className` sizes and shapes the tile (both paints); `initialsClassName`
 * styles only the fallback (type size, colour, ground). Decorative: the
 * company's name is always printed beside it.
 */
export function CompanyMark({
  code,
  name,
  className,
  initialsClassName,
}: {
  code?: string | null;
  name: string;
  className?: string;
  initialsClassName?: string;
}) {
  const src = companyLogoSrc(code);
  if (src) {
    return (
      <span
        aria-hidden
        className={cn("relative inline-flex shrink-0 overflow-hidden border border-[var(--rule)] bg-white", className)}
      >
        {/* Already 96px: served as-is, no optimiser round trip. */}
        <Image src={src} alt="" fill unoptimized sizes="48px" className="object-contain p-[7%]" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center border border-[var(--rule)]", className, initialsClassName)}
    >
      {initials(name)}
    </span>
  );
}
