# Badges redesign — frontend delivery and backend handoff

Date: 19 October 2026. Local implementation; no deployment or APK generated.

## Design and implementation

Inspected Figma file `6QIdjw5pIXDVux5lFPPmKC`, section `288-78` directly, including
the individual badge view (`288-1445`) and Quiz Ace sheet (`288-2399`).
Original artwork was exported from Assets (`288-2520`) and Screens (`288-79`).
The 11 original raster sprite images and Figma crop transforms supply 75 Type 1
tier images plus the two individual activity images. The header shield and empty
state illustration are also original Figma exports. No AI-generated or substitute
badge art was created. `scripts/extract-badge-figma-assets.mjs` reproduces extraction
from those two SVG exports (not committed because they duplicate embedded assets).

Implemented: gradient header, badge total area, tabs, responsive cards and progress
bars, tier color identities, Top Earned carousel, individual section, Other Earned,
individual-only `?view=individual` screen, empty/loading/error states, retry, and
Type 1 detail modal. Modal uses Ionic's focus/backdrop/Escape handling. Individual
cards are non-interactive articles, not buttons. Long names wrap and clamp at two
lines; stored names are not modified. The activity editor's existing name limit
and all activity writes remain unchanged.

The product-specified milestone catalog is presentation-only. It is **not** an
awarding engine. Current API progress/targets are retained. A legacy level number
is not silently converted into a new Starter/Builder/etc. tier. Old category names
are not aliased to new categories with potentially different counting semantics.
Legacy category artwork remains available when the API still supplies old names.

Unknown totals show `—/75`, not a fabricated zero. Missing tier dates are omitted.
Unknown tier earned states are neither declared earned nor declared locked. A note
identifies incomplete backend data. Type 2 absence in a legacy response means
unavailable, not a verified empty collection. API errors have an explicit retry
state, not a misleading zero-badge screen.

## Current API and observed response

Existing `BadgeApi.getBadgeProgress()` continues to call:

`GET http://187.127.142.16:8082/v1/badges/progress`

The configured development fallback token was tried without exposing it. Response:

```json
{
  "success": false,
  "timestamp": "2026-10-19T12:37:54.284834839",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid user token",
  "path": "/v1/badges/progress"
}
```

No successful authenticated response was available. Therefore the following is
the **existing source-declared contract**, not an observed live successful payload:

```typescript
interface CurrentBadgeProgressResponse {
  celebrationCard: {
    title: string; message: string; shareMessage: string;
    earnedBadges: unknown[]; showCelebration: boolean;
  };
  badges: Array<{
    title: string; levelText: string; description: string;
    achievementText: string; icon: string; progress: number; target: number;
    isEarned: boolean; isMaxLevel: boolean; currentLevel: number;
    totalLevels: number; celebrationTitle: string; celebrationMessage: string;
    shareMessage: string; isActive?: boolean;
  }>;
}
```

Only supplied records are rendered; missing categories are not seeded with zero
progress. A legacy earned record appears once; prior awards are never fabricated.
The historical count remains unknown even when the current level is known.

## Expected backend contract — proposed, not confirmed/deployed

The adapter has an explicit `schemaVersion: 2` opt-in for the proposal below.
Backend must approve/implement it (or agree an alternate contract and update the
adapter). It does not automatically interpret arbitrary legacy responses as v2.
This is a type definition, not sample user progress:

```typescript
type Tier = 'Starter' | 'Builder' | 'Achiever' | 'Champion' | 'Legend';
type Category = 'coin-chaser' | 'quiz-ace' | 'speed-reader' | 'habit-flow'
  | 'task-crusher' | 'daily-grit' | 'daily-learner' | 'lesson-sharp'
  | 'journal-flow' | 'crown-collector' | 'squad-builder' | 'streak-peak'
  | 'pet-squad' | 'creator-mode' | 'like-magnet';
interface BadgeProgressV2 {
  schemaVersion: 2;
  tierHistoryComplete: boolean;
  totalEarnedType1: number; // integer 0..75; permanent earned tiers, excluding Type 2
  badges: Array<{
    badgeId: string;
    type: 'TYPE_1';
    category: Category;
    title: string;
    description: string; // complete detail description
    isActive: boolean;
    counterType: 'CUMULATIVE' | 'STREAK';
    currentTier: Tier | null;
    nextTier: Tier | null;
    progress: number;
    target: number | null; // next tier target; null after Legend
    isMaxLevel: boolean;
    icon?: string;
    tiers: Array<{
      tier: Tier;
      target: number;
      earned: boolean;
      earnedDate: string | null; // original ISO 8601 date/instant; never request time
    }>;
  }>;
  individualBadges: Array<{
    badgeId: string; // permanent award identity, stable even after activity deletion
    activityId: string;
    activityType: 'HABIT' | 'TASK';
    activityName: string; // retained award snapshot
    earned: true;
    earnedDate: string;
    icon?: string;
  }>;
}
```

All 5 tier entries must be supplied for each active category. A missing tier entry
is unknown, not unearned. The frontend currently uses product-approved milestone
requirements in the detail catalog; backend targets must agree with that catalog.
Dates are displayed as `MMM dd, yyyy` (sheet: `MMM dd,yyyy`) in UTC, preventing a
date-only award from moving to the previous day. If awards use a user-local day,
return that authoritative date-only value or agree a timezone contract first.

### Backend API required

- Stable Type 1 category/award IDs, approved five-tier migration and current/next tier.
- Permanent earned history and original date for every earned tier.
- Authoritative Type 1 total out of 75; current level is not sufficient.
- Lifetime counters versus streak counters, including streak resets without revocation.
- All-activity day, learning-day, quiz perfection, referral and leaderboard counting.
- Feature activation flags for Pets/Reels categories; do not infer activation from absence.
- Type 2 awards for >=3-day activities only, all scheduled days completed, zero misses.
- Stable Type 2 activity references and award snapshots that survive post-award deletion.
- Editing retains run identity; a new same-name activity has a separate identity.
- New-award event identity, badge type, tier, earned date and authoritative queue order.

The frontend deliberately does not compute duration eligibility, award badges,
reset counters, delete awards or create Type 2 progress. All such integration
tests need the backend and an authenticated test account.

## Sorting and totals

- Progress: explicitly identified target tier descending, then raw percentage
  descending, then title A–Z. Unknown legacy tiers sort after known tiers.
- Top Earned: at most four genuine awards, tier descending then date descending.
  No placeholders are added if fewer than four exist.
- Other Earned: remaining awards, newest first. Missing dates sort last.
- Individuals: newest first, initial four, separate View All screen.
- Confirmed Legend disappears from progress; its earned history remains.
- `totalEarnedType1` is accepted only with v2 and an integer 0..75. Type 2 never
  contributes to it. A missing count remains unknown.

## Achievement behavior preserved

The application-level `BadgeSocketService`, `BadgePopupService`, and AppComponent
celebration queue/acknowledgements were not modified. Existing endpoints remain:
`GET /badges/popup/pending`, `GET /badges/pending-popup`, and
`POST /badges/popup/{badgeId}/ack`. Quiz score behavior is unchanged.
The badge screen retains sharing of the actual server-provided celebration message
through its existing Copy Link / WhatsApp popup. Tapping a card opens details only.

The new global celebration layout, per-tier dates, new-event dedupe semantics and
Type 1-before-Type 2 queue ordering are **not claimed implemented**. They require
an agreed new event contract; the working global flow was preserved. Dynamic
Type 2 celebration wording remains a product requirement gap, as requested.

## Validation

- Production Angular build: passed (existing unrelated SCSS budget warnings).
- Focused suite: 29 passing tests, including adapter rules and rendered layout checks
  at 360, 375, 390, 414 and 768px; long-name wrapping and no page/card overflow.
- Test fixtures are synthetic and confined to `.spec.ts`; no sample user progress,
  dates, IDs or earned states are shipped in the app.
- Live authenticated badge data, actual awards, native Android presentation, and
  end-to-end completion/deletion/streak/notification flows: not verifiable without
  backend/test access. No live deployment performed.

Commands:

```sh
npx ng test --karma-config karma.badges.conf.js --ts-config tsconfig.badges-spec.json --include='src/app/core/components/badge-section/*.spec.ts' --watch=false --browsers=ChromeHeadless
npm run build -- --configuration production
```

This delivers the redesigned frontend and compatibility integration, not a claim
that the complete new backend badge system is operational. Unknown-data notices
intentionally differ from populated Figma mockups. A pixel-perfect end-to-end
claim requires the missing API contract and authenticated device verification.

## Files changed for this task

- `src/app/core/components/badge-section/badge-section.component.ts/.html/.scss`: redesigned screen and existing API integration.
- `src/app/core/components/badge-section/badge-section.component.spec.ts`: component, error, interaction and responsive tests (replaces stale placeholder tests).
- `src/app/core/components/badge-section/badge-view-model.ts/.spec.ts`: null-safe adapter and sorting tests.
- `src/app/core/components/badge-section/badge-catalog.ts`: approved display requirements.
- `src/app/core/components/badge-section/badge-art.component.ts`: original image crop rendering.
- `src/app/core/components/badge-section/badge-art.generated.ts`: 77 original Figma crop definitions.
- `src/assets/figma/badges/`: original Figma raster images, header/empty art and back icon.
- `scripts/extract-badge-figma-assets.mjs`: reproducible export extraction.
- `tsconfig.badges-spec.json`, `karma.badges.conf.js`: isolated test configuration.
- `docs/badges-redesign.md`: this handoff.

Pre-existing unrelated working-tree edits were preserved. No authentication,
activity APIs, backend award logic, global popup service, or notification route was
changed by this task.
