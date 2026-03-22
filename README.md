# Story of a Stock

Story of a Stock is a concall-driven stock research portal built on Next.js and Supabase. It turns earnings-call and management commentary into structured company pages, quarterly and growth scores, rankings, guidance tracking, and lightweight user feedback loops.

This repository is no longer a starter template. The README below reflects the current product and developer setup.

## What the app includes

- Home page with top stocks, recent score updates, and coverage-universe stats
- Company detail pages with:
  - overview card
  - industry context
  - business snapshot
  - quarterly score
  - future growth prospects
  - guidance history
  - community comments
  - watchlist action
  - one-click missing-section requests
- Leaderboards for quarterly sentiment and growth outlook
- Sector overview pages with score aggregates
- "How Scores Work" explainer page
- User request intake flow for stock requests, feedback, and bug reports
- Authenticated watchlists
- Passcode-gated admin dashboard for activity and moderation analytics

## Key product capabilities

- Quarterly score and growth score workflows
- Evidence-backed company research sections
- Guidance tracking with trail-style history
- Community comments, likes, and reports
- Request intake for stock additions, feedback, and bug reports
- One-click `Request this` actions for missing company sections
- Authenticated watchlists backed by Supabase Auth
- Admin analytics around visitors, requests, comments, reports, accounts, and watchlists

## Main routes

- `/` – home / coverage universe
- `/company/[code]` – company detail page
- `/company` – latest quarterly sentiment leaderboard
- `/leaderboards` – sentiment + growth leaderboards
- `/sectors` – sector overview
- `/how-scores-work` – scoring methodology explainer
- `/requests` – request intake form
- `/watchlists` – authenticated watchlist page
- `/admin` – passcode-gated admin dashboard
- `/auth/*` – login, sign-up, forgot password, update password, auth callbacks

## Tech stack

- Next.js 15
- React 19
- Supabase
- Tailwind CSS
- shadcn/ui + Radix UI primitives
- Recharts
- Embla Carousel
- Sonner
- Vaul
- Vercel Analytics
- Vercel Speed Insights

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=
ADMIN_PANEL_PASSCODE=
SUPABASE_SERVICE_ROLE_KEY=
```

What these are used for:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
  - app-wide Supabase client/server auth and data access
- `ADMIN_PANEL_PASSCODE`
  - passcode gate for `/admin`
- `SUPABASE_SERVICE_ROLE_KEY`
  - admin dashboard reads and service-role-backed operations

### 3. Apply the app-owned SQL setup

Run these files in the Supabase SQL editor:

- `lib/supabase/page_view_events.sql`
- `lib/supabase/user_requests.sql`
- `lib/supabase/company_comments.sql`
- `lib/supabase/watchlists.sql`

These files set up the portal's interaction and analytics tables:

- anonymous page-view tracking
- user requests
- company comments / likes / reports
- watchlists and watchlist items

### 4. Make sure the research data tables exist

This repo also expects populated research data tables that are read by the app, including tables such as:

- `company`
- `concall_analysis`
- `growth_outlook`
- `business_snapshot`
- `company_industry_analysis`
- `guidance_tracking`

Those source datasets are not provisioned by the SQL files above.

### 5. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

Other useful commands:

```bash
npm run build
npm run start
npm run lint
```

## Important operational notes

- Watchlists require a signed-in Supabase Auth user.
- The admin dashboard requires both:
  - `ADMIN_PANEL_PASSCODE`
  - `SUPABASE_SERVICE_ROLE_KEY`
- User requests now support an internal `missing_section` type used by one-click company-page requests.
- The public `/requests` form still exposes only:
  - `feedback`
  - `stock_addition`
  - `bug_report`
- The admin dashboard defaults to the `7d` range.
- A floating request CTA and page-view tracking are global app behaviors wired through the root layout.

## Admin dashboard

The `/admin` panel currently tracks:

- unique users
- accounts created
- watchlists created
- company views
- user requests
- total comments
- total reports

It also includes recent-activity and moderation tables such as:

- recent accounts
- recent watchlists
- top companies viewed
- feedback / request intake rows
- recent company comments
- reported comments

## Notes on product behavior

- Company pages are organized around sectioned analysis rather than raw transcript dumps.
- `Industry Context` and `Business Snapshot` are collapsed by default.
- `Guidance History` now uses thread-style guidance trails instead of full comparison cards.
- `Quarterly Score` uses a synced chart + one-card-at-a-time context carousel.
- Missing company sections can be requested inline with a one-click CTA.
