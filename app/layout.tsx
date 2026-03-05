import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "./(hero)/navbar";
import { createClient } from "@/lib/supabase/server";
import { RequestIntakeFab } from "@/components/request-intake-fab";
import { PageViewTracker } from "@/components/page-view-tracker";
import { SiteFooter } from "@/components/site-footer";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "[beta] Story of a Stock",
  description: "extracting the best signals from concalls",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <Navbar
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
            <div className="border-b border-amber-300/60 bg-amber-50/80 px-3 py-2 text-center text-xs text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
              Growth score formula has changed. All companies are currently under revision for the updated formula after March 3, 2026.
            </div>
            <Suspense fallback={null}>
              <PageViewTracker />
            </Suspense>
            <div className="flex-1">
              {children}
            </div>
            <SiteFooter />
            <RequestIntakeFab />
          </div>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
