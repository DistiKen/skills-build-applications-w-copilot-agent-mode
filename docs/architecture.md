# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route components responsible for rendering and state, but route every request through the shared API client and expose accessible loading, empty, success, and error states so the browser stack remains decoupled from API implementation details.
- Logic tier decision: Keep validation, ObjectId checks, and status-code decisions in the Express service layer, while routes remain thin and only translate request/response plumbing.
- Data tier decision: Enforce schema invariants in Mongoose models and preserve seed idempotence through upserts and membership reconciliation instead of clearing user-owned collections.
- Activity tracking approach: Require `user`, `team`, `type`, `minutes`, `points`, and `occurredAt`; convert `userId` and `teamId` payloads into valid ObjectIds, validate that both records exist, and reject malformed or missing data with 4xx responses.
- Team management approach: Require a non-empty team name and mascot, preserve the `members` array as a defaulted array of ObjectIds, and keep member membership consistent with the related user records.
- Leaderboard approach: Aggregate activity points by team, sort descending by total points, and assign a 1-based rank so the ranking is deterministic and easy to render in the UI.
- Workout suggestions approach: Match the seeded user's email to their fitness goal and recent activity history, then recommend the first workout whose focus aligns with that preference and add a reason explaining the match.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — a failure here usually means Mongoose validation, required fields, or seeded data relationships do not match the contract.
- API command: `npm run test:api --prefix octofit-tracker/backend` — a failure here usually means request validation, ObjectId checks, leaderboard aggregation, or workout selection logic is not meeting the HTTP contract.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — a failure here usually means the UI is missing a required loading, empty, success, or error state, or it is bypassing the shared API client.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — a failure here indicates a TypeScript or contract-level type issue in the logic/data layer.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — a failure here indicates the Vite/React app does not compile cleanly after the UI changes.
- Final verification order: run the data tests, then the API tests, then the frontend tests, then both production builds. This order localizes failures to the tier that introduced them and preserves the intended dependency chain: data -> logic -> presentation.
