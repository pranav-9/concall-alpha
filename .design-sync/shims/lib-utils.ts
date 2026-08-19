// Build-time shim for @/lib/utils.
//
// `cn` is reproduced exactly — it is the class-merging helper nearly every
// component in this design system calls, so it has to behave identically.
// `hasEnvVars` is the reason the shim exists: the real module reads
// `process.env.*` at module scope, and `process` does not exist in a browser
// IIFE, so importing it threw a ReferenceError before any component mounted.
// A design system has no Supabase environment, so the honest value is false.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasEnvVars = false;
