import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Navbar from "./(hero)/navbar";
import { createClient } from "@/lib/supabase/server";
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

async function NavbarWithUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
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
  );
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
      <body className={`${geistSans.className} min-h-screen bg-background text-foreground antialiased`}>
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
              <PageViewTracker />
            </Suspense>
            <div className="flex-1">
              {children}
            </div>
            <SiteFooter />
          </div>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
