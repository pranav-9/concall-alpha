# Telegram group — visibility push (2026-09-13)

Companion to the launch runbook (`docs/telegram-community-2026-09-13.md`, kept
untracked in the main checkout). That runbook placed the join link on the
Journal and in the footer only, "until click data says so". This note records
why that was widened the same day, where every placement lives, and how to
read the result.

## The data that forced the change

PostHog, 30 days to 2026-09-13, `$pageview` by surface:

| Surface | Views | Visitors | Returning (2+ days) |
|---|---|---|---|
| Company pages | 1092 | 365 | 33 |
| Desk | 425 | 77 | 15 |
| Home | 375 | 150 | 22 |
| Leaderboards | 335 | 86 | 21 |
| Themes | 144 | 70 | 11 |
| Journal | 21 | 15 | 5 |

- Mobile is 70% of visitors (339 of 484); on company pages 277 mobile vs 90 desktop.
- Journal + footer reach ~3% of visits. The footer is below every board and
  every company page's tabbed workspace, so on a phone it is effectively unseen.
- Depth exists: 246 people fired `section_dwell` (2681 events). Those are the
  readers the group is for.
- The live site rendered **no** link at all: `NEXT_PUBLIC_TELEGRAM_URL` was
  never set on Vercel (`curl storyofastock.in/blog | grep t.me` → empty).

## Placements (all env-gated on `NEXT_PUBLIC_TELEGRAM_URL`)

Every link goes through `TelegramJoinLink` and fires `community_join_click`
with its own `surface`, so weak placements can be identified and cut.

| Surface value | Where | File |
|---|---|---|
| `navbar` | Desktop nav pill after Journal; mobile menu row above Sign in | `app/(hero)/navbar.tsx` (prop `telegramUrl` from `app/layout.tsx`) |
| `company_page` | One-line strip under the overview signal board, names the company | `app/company/[code]/page.tsx` → `TelegramJoinCard variant="inline"` |
| `desk` | House-skin strip between the ranking table and Featured Reads (main flow, so visible below `sm` where the rail is hidden) | `app/desk/desk-telegram-strip.tsx` |
| `leaderboards` | One line under the hero copy | `app/leaderboards/page.tsx` |
| `nudge` | Site-wide engagement pill, lower edge | `components/community-nudge.tsx`, rules in `lib/community-nudge.ts` |
| `footer` | "Connect" column (was "Learn") | `components/site-footer.tsx` |
| `journal_index`, `journal_post` | Unchanged from launch | `app/blog/…` |

### The nudge

Never on a cold first pageview. It appears when either rule fires:

- `second_page` — the second pageview of the browser session (sessionStorage counter).
- `company_dwell` — 25 s on a company page.

Excluded paths: `/` (the homepage's own sticky CTA owns that slot), `/blog*`
(has its own card), `/auth*`, `/admin*`. Dismiss snoozes it 14 days
(localStorage `community-nudge:v1`); a click-through retires it. Events:
`community_nudge_shown` and `community_nudge_dismiss`, both with `trigger` and
`pathname`. The click is the ordinary `community_join_click` with
`surface=nudge`.

## Reading it

Impression → click for the nudge:

```sql
SELECT
  countIf(event = 'community_nudge_shown') AS shown,
  countIf(event = 'community_nudge_dismiss') AS dismissed,
  countIf(event = 'community_join_click' AND properties.surface = 'nudge') AS clicked
FROM events
WHERE timestamp >= now() - INTERVAL 14 DAY
  AND event IN ('community_nudge_shown', 'community_nudge_dismiss', 'community_join_click')
```

Clicks by surface:

```sql
SELECT properties.surface AS surface, count() AS clicks, uniq(person_id) AS people
FROM events
WHERE event = 'community_join_click' AND timestamp >= now() - INTERVAL 14 DAY
GROUP BY surface ORDER BY clicks DESC
```

Actual joins are still read off Telegram's member count by hand. The
6-week falsifier from the runbook stands: <25 members or <3 real exchanges →
stop investing beyond automated posts. Cut rule for placements: a surface with
impressions and zero clicks after two weeks comes out; the nudge comes out if
its dismiss rate is above ~80% with no lift in joins.

## Still user actions

1. Set `NEXT_PUBLIC_TELEGRAM_URL` on Vercel (Production + Preview) to the
   value in `concall-alpha/.env`, then redeploy. Nothing renders until then.
2. After two weeks, run the two queries above and cut what does not convert.
