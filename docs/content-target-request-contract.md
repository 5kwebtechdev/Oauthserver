# Non-admin content request context (frontend, 2026-10-23)

Production base URL is `https://api.supermeapp.com/v1`. Examples below use a
parent account ID `100`, selected child IDs `301` (age 11) and `302` (age 15),
course ID `44`, and article ID `55`; these are illustrative IDs, not test data.
All authenticated requests use `Authorization: Bearer <parent-token>` when the
parent is signed in. The child's ID in `forUserId` never replaces that token.
The app supplies `Content-Type: application/json` on these service requests.

| Screen/action | Actual request while child 301 is selected | Body | Account/context |
| --- | --- | --- | --- |
| Academy home/feed | `GET /v1/courses/academy-feed?age=41` | none | Parent account only; **not a child-targeted feed** |
| Academy category grid (legacy Academy Home and Learning Master Class) | `GET /v1/category?age=11&forUserId=301` | none | Parent token, child target |
| Challenge category grid | `GET /v1/challenges/categories/summary?challengeType=QUIZ&age=11&userId=301&forUserId=301` | none | Parent token, child target; `PUZZLE` for puzzle tab |
| Article category grid | `GET /v1/articles/categories?age=11&userId=301&forUserId=301` | none | Parent token, child target |
| Academy category detail | `GET /v1/courses/by-category?category=MANAGING_MONEY&age=11&forUserId=301` | none | Parent token, child target |
| Challenge category detail | `GET /v1/challenges?category=EXAMPLE&age=11&forUserId=301` | none | Parent token, child target; `EXAMPLE` stands for the clicked backend category name |
| Article category detail | `GET /v1/articles?category=EXAMPLE&age=11&forUserId=301` | none | Parent token, child target |
| Parent-only article rail/list | `GET /v1/articles?age=41&forUserId=100&specificForParent=true` | none | Parent token, parent target; age omitted if unavailable from saved parent profile |
| Parent-only quiz rail/list | `GET /v1/challenges/quizzes?age=41&forUserId=100&specificForParent=true` | none | Parent token, parent target; age omitted if unavailable |
| Course detail and progress | `GET /v1/courses/44?forUserId=301&age=11` | none | Parent token; selected-child context is currently added by the global profile interceptor, but backend support for this endpoint's query fields is **not established** |
| Lesson detail | `GET /v1/courses/lessons/66?forUserId=301&age=11` | none | Same interceptor behavior and unconfirmed backend support |
| Start lesson | `POST /v1/courses/lessons/66/start` | `{"forUserId":"301"}` | Parent token; global interceptor adds this body field; backend support is **not established**; no `age` sent |
| Complete lesson | `POST /v1/courses/lessons/66/complete` | `{"forUserId":"301"}` | Same caveat; no `age` sent |
| Challenge assignment | `POST /v1/challenges/assign` | `{"challengeId":77,"childIds":[301],"extraCoinsByParent":0}` | Parent token; no `forUserId` |
| Article assignment | `POST /v1/articles/assign` | `{"articleId":55,"childIds":[301],"extraCoinsByParent":0}` | Parent token; no `forUserId` |
| Course assignment | `POST /v1/courses/assign` | `{"courseId":44,"childIds":[301],"extraCoinsByParent":0}` | Parent token; no `forUserId` |

`childIds` is a JSON number array, not comma-separated query text. Category
names are passed as a single URL-encoded `category` value. No `PARENT` value
is sent in an `age` field; app feeds use numeric ages. No audience-role query
parameter is sent by these non-admin service methods.

When the parent switches to child `302`, Academy category and detail requests
reload with `forUserId=302&age=15`. The Learning screen, legacy Academy Home,
legacy Academy subject, and course detail cancel/ignore their prior child
requests before accepting the new response. The parent-only rails continue
to target account `100`, not child `302`. If a child's age is unavailable,
the app omits `age` instead of substituting the parent's age.

## Backend coordination needed

`GET /v1/courses/academy-feed` currently accepts only numeric `age` from this
client. A parent token plus a child's age cannot identify the CHILD audience
or which child owns progress. Until the backend explicitly supports target
identity, Academy feed stays account-scoped (parent age, no `forUserId`), even
when a child is selected. Please confirm whether the backend will add
`forUserId=<selectedChildId>` to this endpoint, resolve the target's CHILD
audience and numeric age server-side, and scope course/lesson progress to that
target. Then frontend can send both the selected child ID and age together.

Please also confirm whether course detail, lesson detail, and lesson
start/complete endpoints support the child context currently added by the
global profile interceptor. In particular, lesson POST requests do not send
numeric age today. We have not invented fields or changed their APIs pending
that contract. Authentication remains the parent's bearer token throughout.
