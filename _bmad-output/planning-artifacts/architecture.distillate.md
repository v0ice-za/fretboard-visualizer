---
type: bmad-distillate
sources:
  - "architecture.md"
downstream_consumer: "dev agent implementing guitar app stories"
created: "2026-05-26"
token_estimate: 1800
parts: 1
---

## Functional Requirements
- FR1: 6-string 24-fret fretboard, standard orientation (headstock-left)
- FR2: 14 tunings total; 5–7 free tier, remainder premium
- FR3: Scale highlighting — 31 scales, interval-based, tuning-agnostic, root note + scale selection
- FR4: Toggle note names vs interval labels on fretboard dots
- FR5: Mode overlay — additive; parent scale stays (indigo), characteristic mode notes overlay (rose); mode chip row appears when active
- FR6: Chord library with shape visualization
- FR7: Freeform note marking — user marks arbitrary frets/strings, cyan dots
- FR8: Capo placement (shifts fretboard reference point)
- FR9: Root note selection picker
- FR10: URL query-param state sharing (`?tuning=&key=&scale=`) — shareable/bookmarkable
- FR11: Google OAuth (primary) + email/password auth
- FR12: Session persistence for premium users (saved state, history)
- FR13: Free/premium tier enforcement — server-side, not client-trust
- FR14: Payment processing — Stripe Billing (DECIDED; PayFast deferred post-v1)
- FR15: Custom tuning creation (premium); comprehensive named tuning dataset with tier split

## Non-Functional Requirements
- Performance: fretboard re-render <100ms on any state change (root, scale, tuning, mode) — feel-critical
- Auth: subscription gating enforced server-side; client-side PaywallCard is UX only — backend must not trust client claims
- Accessibility: WCAG 2.1 AA; keyboard navigability all controls; screen-reader labels on fretboard dots (`aria-label="{note} on fret {n} string {n}"`)
- Responsiveness: mobile-responsive; fretboard scrollable on narrow viewports
- Reliability: payment webhook handlers must be idempotent, deduplicated by event ID
- State: URL query params are primary state mechanism for SPA; no page reload for share/bookmark

## Fixed Constraints (Non-Negotiable)
- Frontend: React + Vite (existing working app — do not replace)
- Backend: Java + Maven
- Preserve untouched: `src/data/tunings.js`, `src/data/scales.js`, `src/utils/musicTheory.js` — must not break, duplicate, modify, rename, or convert to TS
- Design system: Tailwind CSS v4 + shadcn/ui + CSS custom properties
- Typography: JetBrains Mono (fretboard) + Inter (UI chrome)
- `frontend/src/data/` JS files: do NOT convert to TS (`allowJs: true` enables coexistence)

## Technology Stack Decisions
- Frontend: React 18.3.0 + Vite 6.x + TypeScript (`allowJs: true`) + Tailwind v4 via `@tailwindcss/vite` (CSS-first config via `@theme` in `index.css`; no `tailwind.config.js` or postcss)
- Component library: shadcn/ui — copies source into `src/components/ui/`; do not hand-edit generated files
- Import alias: `@/` → `src/` (configured in `vite.config.ts` + `tsconfig.json`)
- State: Zustand (cross-component store); TanStack Query v5 for all server/API state
- Routing: React Router v7
- URL sync: custom `useUrlState` hook — hydrates Zustand from query params on mount; pushes URL on store change
- Backend: Spring Boot 3.4.4 + Java 21 LTS + Maven + Spring Web MVC + Spring Security 6.x + Spring Data JPA + Hibernate + PostgreSQL driver + Flyway + Lombok + DevTools
- JWT: jjwt 0.12.x; Google token verification: `google-auth-library-oauth2-http`
- Database: PostgreSQL 16 on Railway
- Migrations: Flyway — `V1__create_users.sql` through `V4__create_saved_sessions.sql`; auto-run via `spring.flyway.enabled=true`
- Payment: Stripe Billing (subscription management) + Stripe Checkout (payment UI); webhooks to `POST /api/v1/webhooks/stripe`
- Deployment: Frontend → Vercel; Backend → Railway (Dockerfile); DB → Railway PostgreSQL
- CI/CD: GitHub Actions — test on PR, deploy on merge to `main`
- E2E tests: Playwright in `e2e/` at frontend root

## Rejected / Deferred Decisions
- Rejected: GraphQL (REST is right complexity level for this project)
- Rejected: Redis caching v1 (subscription status in JWT claims; 15-min access token expiry makes stale-tier window acceptable)
- Rejected: PayFast as primary (Stripe chosen); PayFast EFT deferred as secondary post-v1
- Deferred: multi-region deployment
- Deferred: React Native mobile app
- Deferred: Playback feature (architecture does not block it — fretboard is a pure renderer)

## Auth & Security Architecture
- JWT pair: access token (15-min expiry, HS256, stateless, no DB lookup per request) + refresh token (7-day expiry, `httpOnly` + `Secure` cookie, rotated every use)
- Subscription tier encoded in access token claims: `ROLE_FREE` / `ROLE_PREMIUM`
- Google OAuth flow: frontend loads Google Identity Services SDK → user clicks → Google returns ID token → frontend POSTs to `POST /api/v1/auth/google` → backend verifies against Google JWKS → backend issues JWT pair
- Server enforcement: `@PreAuthorize("hasRole('PREMIUM')")` on gated endpoints
- Rate limiting: auth endpoints only via Bucket4j (token bucket, 10 req/min per IP); fretboard/scale endpoints are stateless, hit no DB — no rate limiting
- `apiClient.ts` is sole HTTP boundary; reads `accessToken` via `useAuthStore.getState().accessToken` (Zustand outside React, not via hook)

## API Design
- All endpoints under `/api/v1/`
- Success single resource: direct object (no `{ data: {...} }` wrapper)
- Success collection: direct array (no wrapper; no pagination v1)
- Error envelope: `{ "error": { "code": "SUBSCRIPTION_REQUIRED", "message": "...", "status": 403 } }` — `code` is SCREAMING_SNAKE_CASE; frontend switches on `code` not `status`
- Dates: ISO 8601 UTC strings (`"2026-05-23T10:30:00Z"`) — never Unix timestamps
- Booleans: `true`/`false` only — never `1`/`0` or `"true"`/`"false"`
- API surface (complete — do not invent routes outside this list):
  - `POST /api/v1/auth/google`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/users/me`
  - `GET /api/v1/tunings`
  - `POST /api/v1/tunings` (ROLE_PREMIUM)
  - `DELETE /api/v1/tunings/{id}` (ROLE_PREMIUM, own only)
  - `GET /api/v1/sessions` (ROLE_PREMIUM)
  - `POST /api/v1/sessions` (ROLE_PREMIUM)
  - `DELETE /api/v1/sessions/{id}` (ROLE_PREMIUM)
  - `GET /api/v1/subscriptions/me`
  - `POST /api/v1/webhooks/stripe` (no auth; Stripe-Signature header verified)
  - `POST /api/v1/checkout/session` (creates Stripe Checkout session, returns `{ url }`, frontend redirects)

## Database Schema
- Core entities: `users`, `subscriptions`, `custom_tunings`, `saved_sessions`
- Tables: lowercase plural snake_case; columns: lowercase snake_case (`user_id`, `created_at`, `subscription_tier`)
- Foreign keys: `{table_singular}_id`; indexes: `idx_{table}_{column(s)}`
- Boolean columns: `is_` prefix (`is_active`, `is_verified`)
- Flyway files: `V1__create_users.sql`, `V2__create_subscriptions.sql`, `V3__create_custom_tunings.sql`, `V4__create_saved_sessions.sql`

## State Management
- Zustand stores: `useFretboardStore` (rootNote, scale, tuning, mode, capo, freeformMarks); `useAuthStore` (identity, isAuthenticated, JWT); `useSubscriptionStore` (tier, expiresAt, PaywallCard trigger); `useLayoutStore` (activeLayout config)
- Zustand `set` with direct mutation (Immer-style) — no manual spread copies
- TanStack Query for ALL API-fetched data — no `useState + useEffect + fetch` in components
- Fretboard renders from synchronous Zustand state only — never shows a loading state
- Loading: skeleton screens for content areas; button spinner from mutation `isPending`; disable trigger while pending

## Naming Conventions
- JSON fields: camelCase always (`userId`, `createdAt`); Jackson default camelCase, no `@JsonProperty` override; TypeScript interfaces mirror API field names exactly
- API URLs: plural nouns (`/api/v1/users`); path params kebab-case (`/api/v1/custom-tunings/{tuningId}`); query params camelCase
- Frontend: PascalCase components (`FretboardDot.tsx`); `use` prefix hooks (`useUrlState.ts`); `use` prefix + `Store` suffix stores (`useAuthStore`); SCREAMING_SNAKE_CASE constants
- TypeScript interfaces: PascalCase, no `I` prefix (`User`, `Subscription`, `FretboardState`)
- Backend suffixes: `Controller`, `Service`, `Repository`, `Config`, `Filter`, `Exception`
- DTOs: `{Entity}RequestDto` / `{Entity}ResponseDto`; Exceptions: `{Domain}Exception`

## Frontend Directory Structure
```
frontend/src/
  components/ui/           ← shadcn/ui generated — do not hand-edit
  components/shared/       ← PaywallCard, AppShell, ThemeWrapper
  features/
    fretboard/             ← Fretboard.tsx, FretboardDot.tsx, FretboardNut.tsx, ModeChipsRow.tsx, FretboardControls.tsx, Fretboard.test.tsx
    auth/                  ← LoginModal.tsx, GoogleAuthButton.tsx, EmailAuthForm.tsx, auth.test.tsx
    library/               ← ScaleLibrary.tsx, ChordLibrary.tsx, LibraryPanel.tsx, FreeformToolbar.tsx, CapoControl.tsx, LibraryPanel.test.tsx
    settings/              ← ThemePicker.tsx, TuningManager.tsx, CustomTuningForm.tsx
  hooks/                   ← useUrlState.ts, useSubscription.ts, useCapo.ts
  stores/                  ← fretboardStore.ts, authStore.ts, subscriptionStore.ts, layoutStore.ts
  data/                    ← tunings.js, scales.js, musicTheory.js (preserved JS — do NOT touch)
  utils/                   ← formatNote.ts, fretboardLayout.ts
  types/                   ← music.ts, user.ts, api.ts
  lib/                     ← queryClient.ts, apiClient.ts, stripe.ts
frontend/e2e/              ← fretboard.spec.ts, auth.spec.ts (Playwright)
```

## Backend Directory Structure
```
backend/src/main/java/com/guitarapp/
  controller/    ← AuthController, UserController, TuningController, SessionController, SubscriptionController
  service/       ← AuthService, UserService, TuningService, SubscriptionService, SessionService
  repository/    ← UserRepository, SubscriptionRepository, CustomTuningRepository, SavedSessionRepository
  model/         ← User, Subscription, CustomTuning, SavedSession
  dto/           ← LoginRequestDto, GoogleAuthRequestDto, AuthResponseDto, UserResponseDto, TuningRequestDto, TuningResponseDto
  security/      ← SecurityConfig, JwtFilter, JwtService, GoogleTokenVerifier
  exception/     ← GuitarAppException (base), AuthException, SubscriptionException, GlobalExceptionHandler (@ControllerAdvice)
  config/        ← CorsConfig
  webhook/       ← StripeWebhookHandler
backend/src/main/resources/db/migration/  ← V1–V4 Flyway SQL files
```

## Error Handling
- Backend: all exceptions route through `GlobalExceptionHandler` (`@ControllerAdvice`); domain exceptions extend `GuitarAppException(code, message, httpStatus)`; stack traces never in API responses
- Frontend: TanStack Query `onError` maps `error.code` to user-facing copy; React Error Boundaries wrap `<Fretboard>` and `<LibraryPanel>` — fallback shows minimal reload prompt

## Component Boundaries
- `AppShell`: owns layout switching — reads `useLayoutStore`, renders named slots
- `Fretboard`: pure render component — reads `useFretboardStore`, no async side effects
- `PaywallCard`: anchors via Floating UI to any premium-gated element — reads `useSubscriptionStore`
- `apiClient.ts`: sole HTTP boundary — injects `Authorization: Bearer {accessToken}` from `authStore`
- Music theory computation runs entirely in frontend (`musicTheory.js`) — zero API calls for fretboard render
- Predefined tunings/scales bundled in `frontend/src/data/` — backend only serves custom tunings
- Subscription state flow: Stripe → webhook → `subscriptions` table → JWT claim on refresh → `useSubscriptionStore`

## Data Flow
- URL query params → `useUrlState` (on mount) → `useFretboardStore` → `Fretboard` (<100ms render); store changes → URL update
- Auth: AuthController → JWT pair issued → `authStore` → `GET /subscriptions/me` → `subscriptionStore` → `PaywallCard`

## Implementation Sequence
1. DB schema + Flyway migrations (`users`, `subscriptions`)
2. Auth service — Google OAuth + email/password + JWT issuance
3. Stripe integration + webhook handler + subscription state sync
4. Subscription enforcement middleware (`@PreAuthorize`)
5. Frontend auth flow + Zustand store + TanStack Query setup
6. Feature gating — `PaywallCard` (UX) + server-side enforcement

## Known Gaps
- `docker-compose.yml` referenced but not defined; needs: `postgres` service (port 5432) + `backend` service (builds from `./backend/Dockerfile`)
- `POST /api/v1/checkout/session` was missing from original API surface — now added above
- Fretboard ARIA pattern: `aria-label="{note} on fret {n} string {n}"`
- `apiClient.ts` reads auth token via `useAuthStore.getState().accessToken` (outside React, not hook)

## Enforcement Rules (All Dev Agents Must Follow)
- snake_case for all PostgreSQL identifiers; camelCase for all JSON fields
- TanStack Query for all API fetching — no raw `fetch`/`axios` in components
- All backend exceptions through `GlobalExceptionHandler`
- Never read subscription tier from frontend state to gate backend logic — verify JWT claims server-side
- Use `error.code` (not `error.status`) for frontend error branching
- New React components go in correct `features/` subdirectory
- Any endpoint not listed in API surface does not exist — do not invent routes
