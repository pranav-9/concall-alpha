import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, IBM_Plex_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "./(hero)/navbar";
import { createClient } from "@/lib/supabase/server";
import { FeedbackPollBanner } from "@/components/feedback-poll-banner";
import { PageViewTracker } from "@/components/page-view-tracker";
import { IdentityBridge } from "@/components/identity-bridge";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { getCachedCompanySearchRows } from "@/lib/company-search-cache";
import { getSiteUrl } from "@/lib/site-url";
import { getActivePoll } from "@/lib/feedback-polls/queries";
import { getAllPostMeta } from "@/app/blog/posts";
import { currentReportingQuarter } from "@/lib/current-quarter";

// Search Console verifies a URL-prefix property off this meta tag. The token is
// public by design (it ships in the HTML); it's an env var only so a new property
// — e.g. the custom domain — can be verified without a code change.
const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Story of a Stock — concall research on Indian mid & small caps",
  description:
    "source-document research on India's mid- and small-cap companies",
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

// viewport-fit=cover lets env(safe-area-inset-*) resolve on notched devices so
// fixed bottom UI (FAB, bottom sheets) can clear the home indicator.
export const viewport: Viewport = {
  viewportFit: "cover",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

// House style (see globals.css → `.house`). Two roles only: a variable
// grotesque that carries the voice, and a mono that carries every number and
// label. Geist stays the body face, so the landing page reads as a development
// of the portal rather than a different product.
const houseDisplay = Bricolage_Grotesque({
  variable: "--font-display",
  display: "swap",
  subsets: ["latin"],
});

const houseData = IBM_Plex_Mono({
  variable: "--font-data",
  display: "swap",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  // next/font's automatic fallback is Arial with size-adjust ~134%: a
  // proportional face standing in for a mono one, so every label and number
  // set in --font-data rewraps when Plex Mono arrives. On the homepage that
  // reflow was the whole CLS (0.20 desktop / 0.40 mobile, Lighthouse 2026-08-21).
  // System monos share Plex Mono's 0.6em advance, so lines hold their breaks.
  adjustFontFallback: false,
  fallback: ["ui-monospace", "Menlo", "Cascadia Mono", "Consolas", "Liberation Mono", "monospace"],
});

async function NavbarWithUser() {
  const supabase = await createClient();
  const [userResult, initialCompanies] = await Promise.all([
    supabase.auth.getUser(),
    getCachedCompanySearchRows().catch(() => []),
  ]);
  const user = userResult.data.user;
  const latestJournalDate = getAllPostMeta()[0]?.date ?? null;

  return (
    <>
      <IdentityBridge userId={user?.id ?? null} email={user?.email ?? null} />
      <Navbar
        initialCompanies={initialCompanies}
        latestJournalDate={latestJournalDate}
        quarterLabel={currentReportingQuarter().label}
        initialUser={
          user
            ? {
                email: user.email ?? null,
                name: user.user_metadata?.full_name ?? null,
                avatar: user.user_metadata?.avatar_url ?? null,
              }
            : null
        }
      />
    </>
  );
}

async function ActivePollSlot() {
  const poll = await getActivePoll();
  if (!poll) return null;
  return <FeedbackPollBanner poll={poll} />;
}

function NavbarFallback() {
  return (
    <nav
      aria-hidden
      className="sticky top-0 z-50 flex justify-center bg-background/38 backdrop-blur-lg"
    >
      <div className="relative w-full max-w-[1440px] px-3 py-2 sm:px-6 lg:px-10">
        <div className="min-h-[4.25rem] rounded-[1.5rem] border border-border/60 bg-background/82 px-3 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)] sm:px-4" />
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${houseDisplay.variable} ${houseData.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Suspense fallback={<NavbarFallback />}>
              <NavbarWithUser />
            </Suspense>
            <Suspense fallback={null}>
              <ActivePollSlot />
            </Suspense>
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>
            <div className="flex-1">
              {children}
            </div>
            <SiteFooter />
            <Toaster richColors />
          </div>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
