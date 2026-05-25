---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-05-23'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-personal_projects-2026-05-22/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: architecture
project_name: personal_projects
user_name: Voice.mijalkovic
date: 2026-05-23
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (15 FRs across 6 groups):**

| # | Group | Requirement |
|---|-------|-------------|
| FR1 | Fretboard Visualization | Display 6-string, 24-fret guitar fretboard in standard (headstock-left) orientation |
| FR2 | Fretboard Visualization | Support predefined tunings (14 total; 5–7 free tier, remainder premium) |
| FR3 | Scale & Mode | Highlight scale notes by root note + scale selection (31 scales, interval-based, tuning-agnostic) |
| FR4 | Scale & Mode | Toggle between note names and interval labels on fretboard dots |
| FR5 | Scale & Mode | Mode overlay: additive — parent scale stays (indigo), characteristic mode notes overlay (rose); mode chip row appears when active |
| FR6 | Chord & Freeform | Chord library with shape visualization on fretboard |
| FR7 | Chord & Freeform | Freeform note marking (user marks arbitrary frets/strings, cyan dots) |
| FR8 | Chord & Freeform | Capo placement (shifts fretboard reference point) |
| FR9 | User Interaction | Root note selection picker |
| FR10 | User Interaction | URL query-param state sharing (`?tuning=&key=&scale=`) so sessions are shareable/bookmarkable |
| FR11 | Auth & Accounts | Google OAuth (primary) + email/password signup/login |
| FR12 | Auth & Accounts | Session persistence for premium users (saved state, history) |
| FR13 | Subscription & Billing | Free/premium tier enforcement — server-side, not client-trust |
| FR14 | Subscription & Billing | Payment processing (PayFast ZAR primary; Stripe SA fallback — decision pending) |
| FR15 | Subscription & Billing | Custom tuning creation (premium); comprehensive named tuning dataset with tier split applied on top |

**Non-Functional Requirements:**

- **Performance:** Fretboard must re-render in <100ms on any state change (root, scale, tuning, mode); this is a feel-critical interaction
- **Authorization:** Subscription gating enforced server-side; client-side gating is UX only (PaywallCard component) — backend must not trust client claims
- **Accessibility:** WCAG 2.1 AA target; keyboard navigability for all controls; screen-reader labels on fretboard dots
- **Responsiveness:** Mobile-responsive; layout and fretboard must degrade gracefully to small screens (fretboard scrollable on narrow viewports)
- **Reliability:** Payment webhook handlers must be idempotent (deduplication on event ID); subscription state must survive transient failures
- **State:** URL query params are the primary state mechanism for SPA; no page reload needed for share/bookmark

**Scale & Complexity:**

- **Complexity level:** Medium
- **Primary domain:** Full-stack web (React SPA + Java REST API)
- **Estimated architectural components:** 8
  1. Fretboard Renderer (React component, performance-sensitive)
  2. Music Theory Engine (preserved: `musicTheory.js`, `scales.js`, `tunings.js`)
  3. App Shell & Control UI (React `AppShell`, modular layout config, Tailwind + shadcn/ui)
  4. Frontend State & URL sync (React state + query-param hydration)
  5. Auth Service (Java — Google OAuth token exchange, email/password, JWT issuance)
  6. Subscription & Billing Service (Java — tier enforcement middleware, payment webhook handler)
  7. User Data Service (Java — premium: saved sessions, custom tunings, preferences)
  8. REST API Gateway (Java — CORS, auth middleware, route aggregation)

### Technical Constraints & Dependencies

**Decided (not up for re-evaluation):**

- **Frontend:** React + Vite (existing working app)
- **Backend:** Java + Maven (project decision)
- **Existing files to preserve:** `src/data/tunings.js`, `src/data/scales.js`, `src/utils/musicTheory.js` — these contain the music theory logic and data; must not break or duplicate
- **Design system:** Tailwind CSS + shadcn/ui + CSS custom properties for theming (UX spec decision)
- **Typography:** JetBrains Mono (fretboard) + Inter (UI chrome) — already confirmed

**Open decisions (to resolve during architecture):**

- **Payment processor:** PayFast (SA-native, ZAR, no Stripe-style international fees) vs Stripe SA (broader ecosystem, higher local fees) — must decide before designing billing service
- **Database:** Not yet decided — relational (PostgreSQL) likely given user/subscription model, but to confirm
- **Deployment target:** Not yet decided — cloud provider, containerization strategy

### Cross-Cutting Concerns Identified

| Concern | Scope | Implication |
|---------|-------|-------------|
| Authentication | All premium endpoints | Every API call from logged-in users must carry a verified JWT; backend validates on every request |
| Subscription gating | Frontend + Backend | Client shows PaywallCard for UX; backend middleware independently enforces tier on data/feature endpoints — no client trust |
| URL state hydration | Frontend SPA | On page load, query params must hydrate React state before first render to avoid flash of wrong state |
| CORS | API boundary | Java backend must whitelist frontend origin(s); dev + prod origins differ |
| Data model | Auth + Billing + User Data | User identity, subscription status, and saved data are inter-linked; schema must handle free→premium upgrades cleanly |
| Payment webhook reliability | Billing Service | Webhooks from PayFast/Stripe may retry on failure; handler must deduplicate by event ID and be idempotent |
| Theme tokens | Frontend | CSS custom properties on `data-theme` attribute; premium themes must not be bundled into free JS (or at minimum must be gated server-side) |

---

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web — React SPA (existing) + Java REST API (new). Two-project monorepo.

### Frontend: Augmentation of Existing Vite Project

No new scaffold required. Existing stack: React 18.3.0 + Vite 5.4.0 + JavaScript.

**Packages to add:**

```bash
# Tailwind CSS v4 (Vite-native plugin, no postcss config needed)
npm install tailwindcss @tailwindcss/vite

# shadcn/ui + Radix primitives
npx shadcn@latest init

# Path alias support (required by shadcn for @/ imports)
npm install -D @types/node
```

**TypeScript adoption:** Add TypeScript support using `allowJs: true` so existing music theory engine files (`.js`) remain untouched. All new files use `.tsx`/`.ts`.

```bash
npm install -D typescript @types/react @types/react-dom
```

**Vite upgrade (recommended):** Bump from 5.4.0 → 6.x for improved DX.

```bash
npm install -D vite@latest @vitejs/plugin-react@latest
```

**Architectural decisions established:**

- **Styling:** Tailwind v4 via `@tailwindcss/vite` — CSS-first config via `@theme` directive in `index.css`; no `tailwind.config.js` or postcss required
- **Component library:** shadcn/ui — copies component source into `src/components/ui/`; components are owned code, not a black-box dependency
- **Import aliases:** `@/` → `src/` (configured in `vite.config.ts` + `tsconfig.json`)
- **Language:** TypeScript for all new code; existing JS files work untouched via `allowJs: true`
- **Build tooling:** Vite 6.x with Rollup, HMR in dev

### Backend: New Spring Boot Project (Spring Initializr)

**Initialization command:**

```bash
curl -G https://start.spring.io/starter.zip \
  --data-urlencode "type=maven-project" \
  --data-urlencode "language=java" \
  --data-urlencode "bootVersion=3.4.4" \
  --data-urlencode "groupId=com.guitarapp" \
  --data-urlencode "artifactId=guitar-api" \
  --data-urlencode "packageName=com.guitarapp" \
  --data-urlencode "javaVersion=21" \
  --data-urlencode "dependencies=web,security,data-jpa,postgresql,validation,lombok,devtools" \
  -o guitar-api.zip
unzip guitar-api.zip -d guitar-api
```

**Architectural decisions established:**

- **Language & Runtime:** Java 21 LTS (Project Loom virtual threads available)
- **Build:** Maven with Spring Boot Maven Plugin (fat JAR packaging)
- **Web layer:** Spring Web MVC — servlet-based REST controllers
- **Security:** Spring Security 6.x — base for JWT filter chain + OAuth2 resource server
- **Data:** Spring Data JPA + Hibernate ORM; PostgreSQL driver included
- **Validation:** Bean Validation via `jakarta.validation` annotations
- **DX:** Lombok (boilerplate reduction) + DevTools (live reload in dev)

**Additional dependencies to add manually post-init:**

```xml
<!-- JWT signing/verification -->
<dependency>
  <groupId>io.jsonwebtoken</groupId>
  <artifactId>jjwt-api</artifactId>
  <version>0.12.x</version>
</dependency>
<!-- Google ID token verification -->
<dependency>
  <groupId>com.google.auth</groupId>
  <artifactId>google-auth-library-oauth2-http</artifactId>
</dependency>
```

**Note:** Frontend and backend live in separate subdirectories (`/frontend`, `/backend`) of the monorepo. Project initialization for each is the first implementation story.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**
- Database: PostgreSQL 16 on Railway
- Auth: Access + refresh JWT pair, Google Identity Services flow
- Payment: Stripe (subscription billing via Stripe Billing)
- State management: Zustand (frontend)

**Important (shape architecture):**
- Migrations: Flyway
- Routing: React Router v7
- Server state: TanStack Query v5
- API error format: JSON envelope with machine-readable `code` field

**Deferred (post-MVP):**
- Redis caching layer — revisit when DB becomes a bottleneck
- Multi-region deployment
- PayFast EFT as secondary payment option

---

### Data Architecture

**Database:** PostgreSQL 16 — relational model fits user/subscription/tunings data with clean foreign key relationships.

**Hosting:** Railway PostgreSQL (collocated with backend; $5/month credit included).

**Migrations:** Flyway — versioned SQL files (`V1__init.sql`, `V2__add_custom_tunings.sql` etc.), auto-run on Spring Boot startup via `spring.flyway.enabled=true`.

**Caching:** None for v1. Subscription status encoded in JWT claims; 15-minute access token expiry keeps stale-tier window acceptable without a cache layer.

**Core schema entities:** `users`, `subscriptions`, `custom_tunings`, `saved_sessions`

---

### Authentication & Security

**JWT strategy:** Access + refresh token pair.
- Access token: 15-minute expiry, stateless validation (no DB lookup per request), signed with HS256
- Refresh token: 7-day expiry, stored in `httpOnly` + `Secure` cookie, rotated on every use
- Subscription tier (`ROLE_FREE` / `ROLE_PREMIUM`) encoded in access token claims

**Google OAuth flow:**
1. Frontend loads Google Identity Services SDK (`accounts.google.com/gsi/client`)
2. User clicks "Sign in with Google" → Google returns a credential (ID token)
3. Frontend POSTs ID token to `POST /api/v1/auth/google`
4. Backend verifies ID token against Google's JWKS endpoint
5. Backend issues our JWT pair (access + refresh)

**Subscription enforcement:** Spring Security `@PreAuthorize("hasRole('PREMIUM')")` on gated endpoints — fully server-side, no client trust.

---

### API & Communication Patterns

**Versioning:** All endpoints under `/api/v1/`

**Success response:** Direct data object (no wrapper for single resources); array for collections.

**Error envelope:**
```json
{
  "error": {
    "code": "SUBSCRIPTION_REQUIRED",
    "message": "This feature requires a premium subscription",
    "status": 403
  }
}
```

**Rate limiting:** Auth endpoints only — Bucket4j (token bucket, 10 req/min per IP). Fretboard/scale endpoints are stateless, hit no DB — no rate limiting needed.

**No GraphQL** — REST is the right complexity level for this project.

---

### Frontend Architecture

**State management:** Zustand — cross-component state (root note, scale, tuning, mode overlay, auth status, subscription tier, capo, freeform marks) needs a shared store. React `useState` + prop drilling breaks down at this component count.

**Routing:** React Router v7.

**URL state sync:** Custom `useUrlState` hook — hydrates Zustand store from query params on mount; subscribes to store changes and pushes to URL. URL remains the shareable source of truth.

**Server state:** TanStack Query v5 (React Query) for all auth-gated data (user profile, subscription status, saved sessions, custom tunings). Handles caching, loading states, and background refetch.

---

### Infrastructure & Deployment

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Vercel | Best Vite/React support; global CDN; instant PR preview deployments |
| Backend | Railway | Auto-detects Spring Boot; per-minute billing (cheap at low traffic); easy PostgreSQL provisioning |
| Database | Railway PostgreSQL | Collocated with backend; no cold-start issues |
| Containers | Dockerfile (backend) | Enables local `docker compose up`; Railway deploys from Dockerfile |
| CI/CD | GitHub Actions | Run tests on PR; deploy to Railway + Vercel on merge to `main` |
| Environments | `dev` (local) → `staging` → `prod` | |

**Payment:** Stripe Billing for subscription management; Stripe Checkout for payment UI; webhooks delivered to `POST /api/v1/webhooks/stripe` (idempotent, deduplicated by Stripe `event.id`).

---

### Decision Impact Analysis

**Implementation sequence:**
1. DB schema + Flyway migrations (`users`, `subscriptions`)
2. Auth service — Google OAuth + email/password + JWT issuance
3. Stripe integration + webhook handler + subscription state sync
4. Subscription enforcement middleware (`@PreAuthorize`)
5. Frontend auth flow + Zustand store + TanStack Query setup
6. Feature gating — `PaywallCard` (UX) + server-side enforcement

**Cross-component dependencies:**
- JWT claims must include subscription tier → Auth Service drives frontend gating behaviour
- Stripe webhook must update `subscriptions` table → Billing Service writes, Auth Service reads on token refresh
- URL state hook depends on Zustand store being initialized before first render

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (PostgreSQL):**
- Tables: lowercase plural snake_case → `users`, `subscriptions`, `custom_tunings`, `saved_sessions`
- Columns: lowercase snake_case → `user_id`, `created_at`, `subscription_tier`
- Foreign keys: `{table_singular}_id` → `user_id`, not `fk_user` or `userId`
- Indexes: `idx_{table}_{column(s)}` → `idx_users_email`
- Boolean columns: `is_` prefix → `is_active`, `is_verified`

**API endpoints (REST):**
- Resource names: plural nouns → `/api/v1/users`, `/api/v1/tunings`
- Path params: camelCase in Spring `@PathVariable`, kebab-case in URL → `/api/v1/custom-tunings/{tuningId}`
- Query params: camelCase → `?subscriptionTier=PREMIUM`
- Webhook path: `/api/v1/webhooks/{provider}` → `/api/v1/webhooks/stripe`

**JSON fields (all API request/response bodies):**
- camelCase always → `userId`, `createdAt`, `subscriptionTier`
- Jackson uses default camelCase; no `@JsonProperty` snake_case override
- Frontend TypeScript interfaces mirror API field names exactly

**Frontend code:**
- Components: PascalCase filename + export → `FretboardDot.tsx`, `export function FretboardDot`
- Hooks: camelCase with `use` prefix → `useUrlState.ts`, `useFretboardStore.ts`
- Stores: camelCase with `use` prefix + `Store` suffix → `useAuthStore`, `useFretboardStore`
- Constants: SCREAMING_SNAKE_CASE → `FREE_TUNING_LIMIT`, `ACCESS_TOKEN_EXPIRY_MS`
- TypeScript interfaces: PascalCase, no `I` prefix → `User`, `Subscription`, `FretboardState`
- Utilities: camelCase → `formatNote.ts` (new files); existing `musicTheory.js` preserved as-is

**Backend (Java):**
- Class suffix convention: `Controller`, `Service`, `Repository`, `Config`, `Filter`, `Exception`
- DTOs: `{Entity}RequestDto` / `{Entity}ResponseDto` → `UserResponseDto`, `LoginRequestDto`
- Exceptions: `{Domain}Exception` → `SubscriptionException`, `AuthException`

---

### Structure Patterns

**Frontend — feature-based organisation:**
```
src/
  components/ui/       ← shadcn/ui generated (do not hand-edit)
  components/shared/   ← PaywallCard, AppShell, ThemeWrapper
  features/
    fretboard/         ← Fretboard, FretboardDot, ModeChipsRow, FretboardControls
    auth/              ← LoginModal, GoogleAuthButton, EmailAuthForm
    library/           ← ScaleLibrary, ChordLibrary, LibraryPanel
    settings/          ← ThemePicker, TuningManager, CustomTuningForm
  hooks/               ← useUrlState, useSubscription, useCapo
  stores/              ← fretboardStore, authStore, subscriptionStore, layoutStore
  data/                ← preserved JS files: tunings.js, scales.js, musicTheory.js
  utils/               ← pure utility functions (formatNote, fretboardLayout)
  types/               ← music.ts, user.ts, api.ts
  lib/                 ← queryClient.ts, apiClient.ts, stripe.ts
```

**Test placement (frontend):** Co-located `*.test.tsx` files beside component.
E2E tests in `e2e/` at frontend root (Playwright).

**Backend — layered architecture (Maven standard):**
```
src/main/java/com/guitarapp/
  controller/    ← REST controllers (@RestController)
  service/       ← business logic (@Service)
  repository/    ← JPA interfaces
  model/         ← JPA entities (@Entity)
  dto/           ← request/response DTOs
  security/      ← JwtFilter, JwtService, SecurityConfig, GoogleTokenVerifier
  exception/     ← GuitarAppException base + GlobalExceptionHandler (@ControllerAdvice)
  config/        ← CorsConfig, FlywayConfig
  webhook/       ← StripeWebhookHandler
src/main/resources/db/migration/   ← Flyway SQL files (V1__*.sql)
src/test/java/com/guitarapp/       ← mirrors main package structure
```

---

### Format Patterns

**API success — single resource:** Direct object (no `{ data: {...} }` wrapper).

**API success — collection:** Direct array (no wrapper; no pagination in v1).

**API error (all non-2xx):**
```json
{ "error": { "code": "SUBSCRIPTION_REQUIRED", "message": "...", "status": 403 } }
```
`code` is SCREAMING_SNAKE_CASE; frontend switches on `code`, not `status`.

**Dates:** ISO 8601 UTC strings → `"2026-05-23T10:30:00Z"`. Never Unix timestamps.

**Booleans:** `true`/`false` only. Never `1`/`0` or `"true"`/`"false"`.

---

### State Management Patterns

**Zustand — one store per domain:**

| Store | Owns |
|-------|------|
| `useFretboardStore` | rootNote, scale, tuning, mode, capo, freeformMarks |
| `useAuthStore` | user identity, isAuthenticated, JWT state |
| `useSubscriptionStore` | tier, expiresAt, PaywallCard trigger logic |
| `useLayoutStore` | activeLayout config object |

**State updates:** Zustand `set` with direct mutation (Immer-style) — no manual `{...spread}` copies.

**Server state rule:** TanStack Query for ALL API-fetched data. No `useState + useEffect + fetch` in components.

---

### Error Handling Patterns

**Backend:** All exceptions route through `GlobalExceptionHandler` (`@ControllerAdvice`). Domain exceptions extend `GuitarAppException(code, message, httpStatus)`. Stack traces never exposed in API responses.

**Frontend:** TanStack Query `onError` maps `error.code` to user-facing copy (defined in constants). React Error Boundaries wrap `<Fretboard>` and `<LibraryPanel>` — fallback shows minimal reload prompt, not a blank screen.

---

### Loading State Patterns

**Server data:** Use TanStack Query `isLoading`/`isPending`. Show skeleton screens for content areas. Never full-page spinner for partial loads.

**User actions:** Button spinner from mutation's `isPending`. Disable trigger button while pending to prevent double-submit.

**Fretboard:** Never shows a loading state — renders from synchronous local Zustand state. Loading states apply only to API-fetched data.

---

### Enforcement Guidelines

**All AI agents MUST:**
- Use snake_case for all PostgreSQL identifiers; camelCase for all JSON fields
- Use TanStack Query for all API fetching — no raw `fetch`/`axios` in components
- Route all backend exceptions through `GlobalExceptionHandler`
- Never read subscription tier from frontend state to gate backend logic — verify JWT claims server-side
- Use `error.code` (not `error.status`) to branch frontend error handling
- Place new React components in the correct `features/` subdirectory

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
guitar-app/                          ← repo root
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml          ← lint + test + Vercel preview deploy
│       └── backend-ci.yml           ← Maven test + Railway deploy
├── docker-compose.yml               ← local dev: backend + postgres
├── .gitignore
├── README.md
│
├── frontend/                        ← Vite + React SPA (moved from root)
│   ├── package.json
│   ├── vite.config.ts               ← @tailwindcss/vite + @/ path alias
│   ├── tsconfig.json                ← allowJs: true, paths: { "@/*": ["src/*"] }
│   ├── tsconfig.node.json
│   ├── index.html
│   ├── playwright.config.ts
│   ├── .env.example
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css                ← @theme directive (Tailwind v4 design tokens)
│   │   ├── components/
│   │   │   ├── ui/                  ← shadcn/ui generated (auto-managed, do not hand-edit)
│   │   │   └── shared/
│   │   │       ├── AppShell.tsx
│   │   │       ├── PaywallCard.tsx
│   │   │       └── ThemeWrapper.tsx
│   │   ├── features/
│   │   │   ├── fretboard/
│   │   │   │   ├── Fretboard.tsx
│   │   │   │   ├── FretboardDot.tsx
│   │   │   │   ├── FretboardNut.tsx
│   │   │   │   ├── ModeChipsRow.tsx
│   │   │   │   ├── FretboardControls.tsx
│   │   │   │   └── Fretboard.test.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginModal.tsx
│   │   │   │   ├── GoogleAuthButton.tsx
│   │   │   │   ├── EmailAuthForm.tsx
│   │   │   │   └── auth.test.tsx
│   │   │   ├── library/
│   │   │   │   ├── ScaleLibrary.tsx
│   │   │   │   ├── ChordLibrary.tsx
│   │   │   │   ├── LibraryPanel.tsx
│   │   │   │   ├── FreeformToolbar.tsx
│   │   │   │   ├── CapoControl.tsx
│   │   │   │   └── LibraryPanel.test.tsx
│   │   │   └── settings/
│   │   │       ├── ThemePicker.tsx
│   │   │       ├── TuningManager.tsx
│   │   │       └── CustomTuningForm.tsx
│   │   ├── hooks/
│   │   │   ├── useUrlState.ts
│   │   │   ├── useSubscription.ts
│   │   │   └── useCapo.ts
│   │   ├── stores/
│   │   │   ├── fretboardStore.ts
│   │   │   ├── authStore.ts
│   │   │   ├── subscriptionStore.ts
│   │   │   └── layoutStore.ts
│   │   ├── data/                    ← preserved JS files — do NOT convert to TS
│   │   │   ├── tunings.js
│   │   │   ├── scales.js
│   │   │   └── musicTheory.js
│   │   ├── utils/
│   │   │   ├── formatNote.ts
│   │   │   └── fretboardLayout.ts
│   │   ├── types/
│   │   │   ├── music.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts
│   │   └── lib/
│   │       ├── queryClient.ts
│   │       ├── apiClient.ts         ← injects Authorization header from authStore; parses error envelope
│   │       └── stripe.ts
│   └── e2e/
│       ├── fretboard.spec.ts
│       └── auth.spec.ts
│
└── backend/
    ├── pom.xml
    ├── Dockerfile
    ├── .env.example
    └── src/
        ├── main/
        │   ├── java/com/guitarapp/
        │   │   ├── GuitarApiApplication.java
        │   │   ├── controller/
        │   │   │   ├── AuthController.java
        │   │   │   ├── UserController.java
        │   │   │   ├── TuningController.java
        │   │   │   ├── SessionController.java
        │   │   │   └── SubscriptionController.java
        │   │   ├── service/
        │   │   │   ├── AuthService.java
        │   │   │   ├── UserService.java
        │   │   │   ├── TuningService.java
        │   │   │   ├── SubscriptionService.java
        │   │   │   └── SessionService.java
        │   │   ├── repository/
        │   │   │   ├── UserRepository.java
        │   │   │   ├── SubscriptionRepository.java
        │   │   │   ├── CustomTuningRepository.java
        │   │   │   └── SavedSessionRepository.java
        │   │   ├── model/
        │   │   │   ├── User.java
        │   │   │   ├── Subscription.java
        │   │   │   ├── CustomTuning.java
        │   │   │   └── SavedSession.java
        │   │   ├── dto/
        │   │   │   ├── LoginRequestDto.java
        │   │   │   ├── GoogleAuthRequestDto.java
        │   │   │   ├── AuthResponseDto.java
        │   │   │   ├── UserResponseDto.java
        │   │   │   ├── TuningRequestDto.java
        │   │   │   └── TuningResponseDto.java
        │   │   ├── security/
        │   │   │   ├── SecurityConfig.java
        │   │   │   ├── JwtFilter.java
        │   │   │   ├── JwtService.java
        │   │   │   └── GoogleTokenVerifier.java
        │   │   ├── exception/
        │   │   │   ├── GuitarAppException.java
        │   │   │   ├── AuthException.java
        │   │   │   ├── SubscriptionException.java
        │   │   │   └── GlobalExceptionHandler.java
        │   │   ├── config/
        │   │   │   └── CorsConfig.java
        │   │   └── webhook/
        │   │       └── StripeWebhookHandler.java
        │   └── resources/
        │       ├── application.yml
        │       ├── application-dev.yml
        │       ├── application-prod.yml
        │       └── db/migration/
        │           ├── V1__create_users.sql
        │           ├── V2__create_subscriptions.sql
        │           ├── V3__create_custom_tunings.sql
        │           └── V4__create_saved_sessions.sql
        └── test/
            └── java/com/guitarapp/
                ├── controller/
                │   ├── AuthControllerTest.java
                │   └── TuningControllerTest.java
                └── service/
                    ├── AuthServiceTest.java
                    └── SubscriptionServiceTest.java
```

### Architectural Boundaries

**API surface:**
```
POST   /api/v1/auth/google
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/users/me
GET    /api/v1/tunings
POST   /api/v1/tunings              (ROLE_PREMIUM)
DELETE /api/v1/tunings/{id}         (ROLE_PREMIUM, own only)
GET    /api/v1/sessions             (ROLE_PREMIUM)
POST   /api/v1/sessions             (ROLE_PREMIUM)
DELETE /api/v1/sessions/{id}        (ROLE_PREMIUM)
GET    /api/v1/subscriptions/me
POST   /api/v1/webhooks/stripe      (no auth; Stripe-Signature header verified)
```

**Component boundaries:**
- `AppShell` owns layout switching — reads `useLayoutStore`, renders named slots
- `Fretboard` is a pure render component — reads `useFretboardStore`, no async side effects
- `PaywallCard` anchors via Floating UI to any premium-gated element — reads `useSubscriptionStore`
- `apiClient.ts` is the sole HTTP boundary — injects `Authorization: Bearer {accessToken}` from `authStore`

**Data boundaries:**
- Music theory computation runs entirely in frontend (`musicTheory.js`) — fretboard renders with zero API calls
- Predefined tunings/scales are bundled in `frontend/src/data/` — backend only serves custom tunings
- Subscription state flow: Stripe → webhook → `subscriptions` table → JWT claim on refresh → `useSubscriptionStore`

### Integration Points

**Data flow:**
```
URL query params → useUrlState (on mount) → useFretboardStore → Fretboard (<100ms render)
                                                               ↓ URL update on change

Auth action → AuthController → JWT pair issued → authStore → GET /subscriptions/me
                                                            → subscriptionStore → PaywallCard
```

**External integrations:**

| Service | Integration point | Direction |
|---------|-------------------|-----------|
| Google Identity Services | `GoogleAuthButton.tsx` | Frontend → Google |
| Google JWKS | `GoogleTokenVerifier.java` | Backend → Google |
| Stripe Checkout | `stripe.ts` (hosted checkout redirect) | Frontend → Stripe |
| Stripe Webhooks | `StripeWebhookHandler.java` | Stripe → Backend |
| Vercel | `frontend/` auto-deploy on `main` | CI → Vercel |
| Railway | `backend/` Dockerfile deploy on `main` | CI → Railway |

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:** React 18 + Vite 6 + TypeScript + Tailwind v4 + shadcn/ui + Zustand + TanStack Query — no version conflicts. Spring Boot 3.4.4 + Java 21 + Spring Security 6 + Spring Data JPA + PostgreSQL + Flyway — standard compatible stack. JWT (jjwt 0.12.x), Google Identity Services, and Stripe are independent integrations with no shared dependencies.

**Pattern consistency:** Jackson camelCase maps directly to TypeScript camelCase — zero conversion at the API boundary. Zustand (local state) and TanStack Query (server state) responsibilities are cleanly separated. Spring Security filter chain is the correct architecture for stateless JWT validation.

**Coherence note:** Refresh token stored as `httpOnly` + `Secure` cookie (XSS-safe, inaccessible to JS); access token returned in response body and held in `authStore` (short-lived, 15 min). This hybrid is intentional and coherent.

### Requirements Coverage Validation ✅

| FR | Coverage |
|----|----------|
| FR1 Fretboard display | `Fretboard.tsx`, `fretboardStore.ts` |
| FR2 Tunings (free/premium split) | `tunings.js` + `GET /api/v1/tunings` (server filters by tier) |
| FR3 Scale highlighting | `musicTheory.js`, `scales.js`, `fretboardStore.ts` |
| FR4 Notes/Intervals toggle | `fretboardStore.ts` flag + `FretboardDot.tsx` |
| FR5 Mode overlay | `ModeChipsRow.tsx`, `fretboardStore.ts` |
| FR6 Chord library | `ChordLibrary.tsx`, `LibraryPanel.tsx` |
| FR7 Freeform marking | `FreeformToolbar.tsx`, `fretboardStore.ts` (freeformMarks) |
| FR8 Capo | `CapoControl.tsx`, `useCapo.ts` |
| FR9 Root note picker | `FretboardControls.tsx`, `fretboardStore.ts` |
| FR10 URL state sharing | `useUrlState.ts` |
| FR11 Auth | `AuthController.java`, `security/`, `features/auth/` |
| FR12 Session persistence | `SessionController.java`, `saved_sessions` table |
| FR13 Free/premium gating | `PaywallCard.tsx` (UX) + `@PreAuthorize` (server) + JWT claims |
| FR14 Payment (Stripe) | `StripeWebhookHandler.java`, `SubscriptionService.java`, Stripe Checkout |
| FR15 Custom tunings | `TuningController.java`, `custom_tunings` table, `TuningManager.tsx` |

**NFR coverage:** `<100ms fretboard render` — synchronous Zustand state, no async in render path ✅. Server-side enforcement via `@PreAuthorize` ✅. WCAG 2.1 AA via shadcn/ui (Radix UI) ✅. Mobile responsive via Tailwind ✅. Webhook idempotency via Stripe event ID deduplication ✅. URL state via `useUrlState.ts` ✅.

### Implementation Readiness Validation ✅

**Architecture Completeness Checklist:**

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Gap Analysis Results

**Critical gaps:** None.

**Minor gaps (implementation-level, not blockers):**

1. **Fretboard ARIA labels** — No pattern specifies `aria-label` format for fretboard dots. Implementors should use `aria-label="{note} on fret {n} string {n}"`.
2. **`docker-compose.yml`** — Referenced but not defined. Needs: `postgres` service (5432), `backend` service (builds from `./backend/Dockerfile`).
3. **`apiClient.ts` auth injection** — Read `accessToken` from Zustand outside React via `useAuthStore.getState().accessToken`, not via hook.
4. **Stripe Checkout session endpoint missing from API surface** — Add `POST /api/v1/checkout/session` → creates Stripe Checkout session, returns `{ url }`, frontend redirects.

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level:** High — all 15 FRs have explicit architectural support, all NFRs addressed, no technology conflicts, patterns comprehensive.

**Key strengths:**
- Music theory engine fully decoupled from the network — fretboard always renders fast regardless of auth/network state
- Subscription enforcement is belt-and-suspenders: JWT claims (fast, stateless) + `@PreAuthorize` (authoritative, server-side)
- Modular layout system (`AppShell` + `useLayoutStore`) enables layout experiments without touching feature code
- Stripe Billing handles subscription lifecycle (retries, upgrades, cancellations) without custom state machine code

**Areas for future enhancement (post-v1):**
- Redis caching for subscription status at scale
- React Native mobile app reusing the music theory engine
- Playback feature (architecture explicitly avoids blocking this — fretboard is a pure renderer)
- PayFast EFT as secondary payment method for SA users who prefer bank transfer

### Implementation Handoff

**First implementation stories:**
1. Repo reorganisation — move existing frontend to `frontend/`, scaffold `backend/` via Spring Initializr
2. Frontend setup — Tailwind v4, shadcn/ui init, TypeScript with `allowJs: true`, path aliases
3. Backend DB schema — Flyway migrations V1–V4
4. Auth service — Google OAuth + email/password + JWT issuance

**AI Agent guidelines:**
- Follow all architectural decisions exactly as documented
- Check Step 5 naming/structure/format rules before creating any file
- `frontend/src/data/` JS files are preserved — do not modify, rename, or convert
- Any endpoint not listed in the API surface does not exist — do not invent routes
- Refer to this document as the single source of truth for all technical decisions
