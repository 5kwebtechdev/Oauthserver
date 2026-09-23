# Daily app entry and login streaks

The client now checks `GET /pet-message/home/overlay` from the app root on cold start,
authenticated navigation, foreground resume, and local-day rollover. It does not
repeat the login request or retain credentials for that purpose.

`firstLoggedForTheDay` from login is a fallback only for that user and that login
date. It cannot tell the app about a subsequent day in a restored session.

## Backend requirements to verify

- The authenticated app-entry flow must register today's visit, grant the daily
  5 coins, advance the login streak, and grant any milestone bonus exactly once
  per user/day. If the backend currently does this only in login, backend work is
  required. The frontend cannot award coins or advance the server's streak.
- The existing `GET /pet-message/home/overlay` must return pending daily rewards
  and mood prompts for retained sessions, not only for newly issued login tokens.
  It must only describe rewards that have actually been credited. If visit
  registration requires a separate POST endpoint, supply its contract and wire it
  before this GET; no unconfirmed endpoint is called by this implementation.
- `POST /pet-message/home/overlay/dismiss?type=...` must persist consumption for
  that authenticated user and reward date, including across devices. Daily login
  and milestone are combined into one reward sheet and must not grant twice.
- `GET /login-streak/status?userId=...` must return the current streak after visit
  registration. `POST /mood/vibes/set` must persist today's mood and clear its
  pending prompt after success.
- Use one documented reward timezone/day boundary across login, visit registration,
  streak status, overlay consumption, and mood. The client currently uses local
  calendar dates for its supplementary duplicate guard; a server reward date would
  allow this guard to follow the backend timezone exactly.

## Milestone bonuses (in addition to daily 5 coins)

| Days | Coins |
| --- | --- |
| 3 | 25 |
| 7 | 40 |
| 14 | 90 |
| 30 | 200 |
| 60 | 410 |
| 100 | 750 |
| 180 | 1200 |
| 365 | 2600 |

The client displays “You completed N days!” and the milestone bonus only on the
exact milestone day. On intervening days it displays the current streak and daily
reward. Local presentation receipts supplement server consumption and do not
replace server-side crediting, idempotency, or cross-device deduplication.
