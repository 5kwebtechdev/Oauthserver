# Google login rollback — 9 October 2026

## Confirmed production cause

Production backend logs show mobile OAuth failures at 10:35:38, 10:35:47,
10:36:16 and 10:36:58 IST. Immediately before the rollback, MySQL reports:

`SQL Error: 1265, SQLState: 01000 — Data truncated for column 'ageGroup' at row 1`

`User.@PreUpdate` recalculates the age group. Updating the user during login
attempted to persist a value unsupported by the then-existing MySQL ENUM.
Badge progress queries flushed the pending user update. BadgeService caught
database exceptions and continued, but the shared transaction was already
rollback-only. The outer transaction consequently raised
`UnexpectedRollbackException`, which the controller wrapped in the message
shown in the screenshot. This is not evidence of duplicate frontend requests.

The badge error logger records only the message, so the precise original Java
SQL exception subclass is not retained in that portion of the logs. The SQL
error and failing column are directly confirmed; do not invent a subclass.

## Existing backend repair verified

Backend revision `08c34d3f0e102a4dec1e70e964caa634244922ca` contains a repeatable
age-group ENUM migration run before primary Hibernate initialization. Its
production deployment succeeded; the service restarted at 15:57:52 IST.
A read-only production schema query confirmed `User.ageGroup` now includes
all current Java storage values, including `AGE_18_TO_24` and `PARENTS`.
No production data, schema, services or deployments were modified by this
investigation. No duplicate migration is needed from the frontend.

## Frontend verification

The Google request-sequencing suite passes 19 tests, including two added cases:

- Ignore another Google authorization tap while login is in progress.
- Surface a rollback response without establishing a session, navigating or
  automatically retrying; allow a subsequent manual retry to succeed once.

Existing cases cover email lookup, new-user onboarding before mobile-login,
existing-user login, duplicate Continue submission, async referral validation,
timeouts, failed submission/retry and parent onboarding.

Run:

```sh
npx ng test --ts-config tsconfig.google-signup-spec.json --include=src/app/core/components/social-media/google-signup-flow.spec.ts --watch=false --browsers=ChromeHeadless
```

No frontend runtime code, auth contract, rewards, OTP or password login changed.
These are mocked HTTP tests, not proof of concurrent database uniqueness or
production rollback atomicity. A fresh real Google login after the migration
still requires user verification. Do not submit fabricated Google credentials
or create test accounts on production to claim end-to-end success.
