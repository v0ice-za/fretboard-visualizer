---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-personal_projects-2026-05-22/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# Guitar App - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Guitar App, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1:  Render interactive Fretboard reflecting active Tuning + Capo (<100ms on any change)
FR-2:  Free Tuning selection — 5–7 predefined tunings, no account required
FR-2b: Premium Tuning selection — all predefined tunings + saved Custom Tunings (auth + premium)
FR-3:  Capo support — set at any fret 1–12, shifts fretboard display + note names + highlights
FR-4:  Freeform Marking — click/tap any fret position to toggle a highlight on/off
FR-5:  Note Name Toggle — show/hide pitch names on all fret positions (off by default)
FR-5b: Fretboard state persistence — save/restore tuning, capo, freeform marks per account (auth)
FR-6:  Chord Library Browse — free: 5 preview chords; premium: full library
FR-7:  Chord Shape Highlight — selecting a chord highlights its shape in the active Tuning
FR-8:  Scale Library Browse — free: 5 preview scales; premium: full library
FR-9:  Scale Pattern Highlight — selecting scale + root highlights full pattern across 24 frets
FR-10: Custom Tuning Creator — premium: define per-string pitches, save to account
FR-11: Custom Tuning Management — premium: rename/delete saved custom tunings
FR-12: Chord Progression Builder — premium: create ordered chord sequences, step through them
FR-13: User Registration & Login — Google OAuth (primary) + email + password
FR-14: Subscription Purchase — Stripe, $12/yr annual, unlocks immediately on success
FR-15: Subscription Enforcement — server-side gate; expired subs revert to Free Tier immediately

### NonFunctional Requirements

NFR-1: Fretboard renders legibly at 375px minimum viewport width
NFR-2: All fretboard highlights + layout updates complete in <100ms
NFR-3: Passwords hashed with bcrypt
NFR-4: Subscription status validated server-side on every authenticated request
NFR-5: No card data touches the backend — payment entirely via Stripe
NFR-6: WCAG 2.1 AA color contrast for highlights and note names

### Additional Requirements

ARCH-1:  Monorepo setup — move existing frontend to /frontend, scaffold /backend via Spring Initializr
ARCH-2:  Frontend tooling — Vite 6, Tailwind v4 (@tailwindcss/vite), shadcn/ui init, TypeScript (allowJs: true), @/ path aliases
ARCH-3:  Backend scaffold — Spring Boot 3.4.4, Java 21, Maven, Spring Web/Security/Data JPA/PostgreSQL/Validation/Lombok/DevTools
ARCH-4:  Database migrations — Flyway V1–V4: users, subscriptions, custom_tunings, saved_sessions tables
ARCH-5:  JWT implementation — 15-min access token (HS256) + 7-day refresh token (httpOnly Secure cookie, rotated on use)
ARCH-6:  Google OAuth integration — frontend Google Identity Services SDK + backend JWKS verification
ARCH-7:  Stripe Billing integration — Stripe Checkout session creation (POST /api/v1/checkout/session) + webhook handler (POST /api/v1/webhooks/stripe, idempotent)
ARCH-8:  Spring Security filter chain — JwtFilter + @PreAuthorize("hasRole('PREMIUM')") on gated endpoints
ARCH-9:  Frontend state — Zustand stores (fretboardStore, authStore, subscriptionStore, layoutStore) + TanStack Query v5 for server state
ARCH-10: React Router v7 setup + useUrlState hook (?tuning=&key=&scale= URL sync)
ARCH-11: CI/CD — GitHub Actions (frontend-ci.yml + backend-ci.yml); deploy to Vercel (frontend) + Railway (backend + PostgreSQL)
ARCH-12: Docker Compose for local dev (backend + postgres services)

### UX Design Requirements

UX-DR1:  CSS custom property design token system — 5 themes (dark free, neon/mono/vibrant/minimal premium), switchable via data-theme attribute
UX-DR2:  AppShell — CSS Grid named zones (top-bar, mode-row, fretboard, library-panel, bottom-bar) + layout config object prop
UX-DR3:  FretboardCanvas — SVG renderer with proportional fret columns, 24 frets, 6 strings, scrollable on mobile, role="img" + dynamic aria-label
UX-DR4:  FretDot — 4 visual states: root (amber #f59e0b, 20px, 100%), scale (indigo #6366f1, 18px, 85%), mode (rose #fb7185, 18px, 90%, glow), freeform (cyan #22d3ee, 18px, 80%, dashed ring)
UX-DR5:  ModeChipsRow — conditional row of 7 mode chips (only when scale active), each with Tooltip showing plain-language interval description
UX-DR6:  PaywallCard — compact inline prompt anchored via Floating UI to triggering element, max 280px width, fretboard never covered
UX-DR7:  LibraryPanel — 3 render modes: drawer (desktop default), sidebar (alt layouts), bottom Sheet (mobile)
UX-DR8:  LibraryItem — 4 states: default, active (indigo tint + checkmark), locked (muted + lock Badge → triggers PaywallCard), preview (selectable + labelled)
UX-DR9:  CustomTuningCreator — shadcn Sheet with 6 per-string note+octave inputs, live FretboardCanvas preview updating per keystroke, name input, Save/Discard
UX-DR10: Typography — JetBrains Mono (all fretboard text: note names 10px/500, nut labels 14px/600, fret numbers 11px/400) + Inter (all UI chrome)
UX-DR11: Responsive — control bar wraps to 2 rows at <768px; fretboard horizontal scroll at <768px; Library + PaywallCard → bottom Sheet on mobile
UX-DR12: Keyboard navigation — Tab order through all controls; arrow keys within mode chip row; Space/Enter to toggle; fretboard freeform via keyboard
UX-DR13: URL state sync — ?tuning=&key=&scale= kept in sync via useUrlState hook; state hydrates on load before first render
UX-DR14: Skip link — <a href="#fretboard" className="sr-only focus:not-sr-only"> at top of AppShell
UX-DR15: Reduced motion — dot fade transitions (80ms) disabled when prefers-reduced-motion is set
UX-DR16: Contrast audit — verify all 5 theme color combinations meet WCAG AA before shipping
UX-DR17: ControlBar — logo, TuningSelect, KeySelect, ScaleSelect (shadcn), note-name toggle, freeform toggle, library icon, account menu icon
UX-DR18: Selector pattern — immediate selection (no Apply), locked items visible + non-selectable with PaywallCard on click, keyboard accessible

### FR Coverage Map

| Requirement | Epic 1 | Epic 2 | Epic 3 | Epic 4 |
|-------------|--------|--------|--------|--------|
| FR-1        | ✅     |        |        |        |
| FR-2        | ✅     |        |        |        |
| FR-2b       |        |        | ✅     |        |
| FR-3        | ✅     |        |        |        |
| FR-4        | ✅     |        |        |        |
| FR-5        | ✅     |        |        |        |
| FR-5b       |        |        |        | ✅     |
| FR-6        |        | ✅     |        |        |
| FR-7        |        | ✅     |        |        |
| FR-8        |        | ✅     |        |        |
| FR-9        | ✅     |        |        |        |
| FR-10       |        |        |        | ✅     |
| FR-11       |        |        |        | ✅     |
| FR-12       |        |        |        | ✅     |
| FR-13       |        |        | ✅     |        |
| FR-14       |        |        | ✅     |        |
| FR-15       |        |        | ✅     |        |
| NFR-1       | ✅     |        |        |        |
| NFR-2       | ✅     |        |        |        |
| NFR-3       |        |        | ✅     |        |
| NFR-4       |        |        | ✅     |        |
| NFR-5       |        |        | ✅     |        |
| NFR-6       | ✅     |        |        | ✅     |
| ARCH-1      | ✅     |        |        |        |
| ARCH-2      | ✅     |        |        |        |
| ARCH-3      |        |        | ✅     |        |
| ARCH-4      |        |        | ✅     | ✅     |
| ARCH-5      |        |        | ✅     |        |
| ARCH-6      |        |        | ✅     |        |
| ARCH-7      |        |        | ✅     |        |
| ARCH-8      |        |        | ✅     |        |
| ARCH-9      | ✅     |        | ✅     |        |
| ARCH-10     | ✅     |        |        |        |
| ARCH-11     | ✅     |        | ✅     |        |
| ARCH-12     | ✅     |        |        |        |
| UX-DR1      | ✅     |        |        | ✅     |
| UX-DR2      | ✅     |        |        |        |
| UX-DR3      | ✅     |        |        |        |
| UX-DR4      | ✅     |        |        |        |
| UX-DR5      | ✅     |        |        |        |
| UX-DR6      |        | ✅     |        |        |
| UX-DR7      |        | ✅     |        |        |
| UX-DR8      |        | ✅     |        |        |
| UX-DR9      |        |        |        | ✅     |
| UX-DR10     | ✅     |        |        |        |
| UX-DR11     | ✅     |        |        |        |
| UX-DR12     | ✅     |        |        |        |
| UX-DR13     | ✅     |        |        |        |
| UX-DR14     | ✅     |        |        |        |
| UX-DR15     | ✅     |        |        |        |
| UX-DR16     |        |        |        | ✅     |
| UX-DR17     | ✅     |        |        |        |
| UX-DR18     | ✅     |        |        |        |

## Epic List

### Epic 1: Core Fretboard Experience

**Goal:** Deployed, redesigned fretboard with complete core interaction loop — tuning selection, scale + mode overlay, capo, freeform marking, note names toggle, URL sharing. The app in its free-tier fully usable state.

**Requirements:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-9, NFR-1, NFR-2, NFR-6 (partial), ARCH-1, ARCH-2, ARCH-9 (fretboardStore + layoutStore), ARCH-10, ARCH-11 (frontend CI/CD + Vercel), ARCH-12, UX-DR1 (dark theme), UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR10, UX-DR11, UX-DR12, UX-DR13, UX-DR14, UX-DR15, UX-DR17, UX-DR18

---

### Story 1.1: Monorepo Setup & Dev Environment

As a **developer**,
I want the project restructured as a monorepo with modern frontend tooling,
So that I have a clean, configured workspace to build the redesigned app.

**Acceptance Criteria:**

**Given** the existing frontend code is at the repo root
**When** the monorepo setup is complete
**Then** all existing frontend code is moved to `/frontend` with no functionality regressions
**And** Vite 6 is configured with `@tailwindcss/vite` plugin and `@/` path alias resolving to `frontend/src/`
**And** TypeScript is configured with `allowJs: true` so existing `.js` files work without rewriting
**And** shadcn/ui is initialized with the project's color conventions
**And** `docker-compose.yml` at repo root defines `backend` and `postgres` services (backend image can be a placeholder at this stage)
**And** `npm run dev` from `/frontend` starts the app on localhost with the existing fretboard functional

---

### Story 1.2: AppShell & Design Token System

As a **user**,
I want the app to have a consistent visual shell and design foundation,
So that the layout feels polished and all subsequent features integrate cleanly.

**Acceptance Criteria:**

**Given** the app loads in a browser
**When** the page renders
**Then** an `AppShell` component wraps the entire UI using CSS Grid with named zones: `top-bar`, `mode-row`, `fretboard`, `library-panel`, `bottom-bar`
**And** a CSS custom property design token system is in place for the `dark` theme (bg `#080810`, foreground, accent colors matching dot palette)
**And** JetBrains Mono is loaded and applied to all fretboard text (note names 10px/500, nut labels 14px/600, fret numbers 11px/400)
**And** Inter is loaded and applied to all UI chrome
**And** a skip link `<a href="#fretboard" className="sr-only focus:not-sr-only">` is the first focusable element in the DOM
**And** dot fade transitions are defined at 80ms but suppressed when `prefers-reduced-motion` is set
**And** `data-theme="dark"` on the root element controls all theme tokens

---

### Story 1.3: Interactive SVG Fretboard

As a **guitarist**,
I want to see a high-quality interactive fretboard,
So that I can visually understand note positions and patterns.

**Acceptance Criteria:**

**Given** the app is open
**When** the fretboard renders
**Then** a `FretboardCanvas` SVG component renders 24 frets × 6 strings with proportional fret column widths (narrowing toward the body)
**And** the SVG has `role="img"` and a dynamic `aria-label` describing the current tuning and active scale
**And** the fretboard scrolls horizontally on viewports narrower than 768px rather than compressing
**And** `FretDot` renders in 4 distinct states: root (amber `#f59e0b`, 20px, 100%), scale (indigo `#6366f1`, 18px, 85%), mode (rose `#fb7185`, 18px, 90%, glow), freeform (cyan `#22d3ee`, 18px, 80%, dashed ring)
**And** all highlight updates complete in under 100ms after any state change
**And** the fretboard is legible at 375px viewport width with no text overflow or dot clipping

---

### Story 1.4: Core State & URL Sharing

As a **user**,
I want my fretboard configuration to persist across page refreshes and be shareable via URL,
So that I can return to my setup or send a link to a specific view.

**Acceptance Criteria:**

**Given** a user selects a tuning, key, and scale
**When** the URL is copied and opened in a new tab
**Then** the fretboard loads with the same tuning, key, and scale active — state hydrates before first render (no flash of default state)
**And** the URL contains `?tuning=&key=&scale=` query params reflecting the current selection
**And** `useFretboardStore` (Zustand) holds: active tuning, active key, active scale, active mode index, capo position, freeform marks, note-names-visible flag
**And** `useLayoutStore` (Zustand) holds: library panel open/closed state and current layout mode
**And** React Router v7 is configured with a single route for the main app view
**And** browser back/forward navigation restores the previous URL state correctly

---

### Story 1.5: ControlBar & Tuning Selection

As a **free-tier user**,
I want a clean control bar with a tuning selector,
So that I can choose from the available tunings and see the fretboard update immediately.

**Acceptance Criteria:**

**Given** the app is open without an account
**When** the ControlBar renders
**Then** it shows: logo, TuningSelect, KeySelect, ScaleSelect (shadcn Select), note-name toggle, freeform toggle, library icon button, account menu icon
**And** TuningSelect shows exactly 5–7 predefined free-tier tunings (Standard, Drop D, Open G, Open E, DADGAD, and up to 2 more)
**And** selecting any tuning updates the fretboard immediately — no Apply button required
**And** the control bar wraps to 2 rows at viewports narrower than 768px
**And** all controls are reachable via Tab key in logical order
**And** KeySelect and ScaleSelect are populated and update the fretboard immediately on selection

---

### Story 1.6: Scale & Mode Explorer

As a **guitarist**,
I want to explore scales and their modes on the fretboard,
So that I can understand how scale patterns and modal shapes relate.

**Acceptance Criteria:**

**Given** a scale is selected in ScaleSelect
**When** the fretboard renders
**Then** the full scale pattern is highlighted across all 24 frets using indigo FretDots
**And** root notes of the selected key are highlighted in amber FretDots
**And** a `ModeChipsRow` appears below the ControlBar showing 7 mode chips (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian)
**And** each chip has a Tooltip with a plain-language description (e.g. "Dorian — minor with a bright 6th")
**And** clicking a mode chip overlays characteristic notes in rose FretDots additively — parent scale dots remain visible
**And** only one mode chip is active at a time; clicking the active chip deactivates the overlay
**And** arrow keys navigate between mode chips when focus is within the chip row

---

### Story 1.7: Capo Support

As a **guitarist who uses a capo**,
I want to set a capo position on the fretboard,
So that I see correct note names and scale positions relative to the capo.

**Acceptance Criteria:**

**Given** the fretboard is visible
**When** the user sets capo to fret N (1–12) via the capo control in the ControlBar
**Then** a visual nut indicator appears at fret N
**And** all note name labels shift to reflect the capoed pitch (open strings show the pitch they sound at with capo applied)
**And** all active scale highlights recalculate relative to the capo position
**And** frets below the capo are visually dimmed to indicate they are inactive
**And** setting capo to 0 / "None" restores standard open-string display
**And** capo value is stored in `useFretboardStore` and synced to the URL as `?capo=N`

---

### Story 1.8: Freeform Marking & Note Names

As a **guitarist**,
I want to freely mark fret positions and optionally see note names,
So that I can annotate the fretboard for practice and reference.

**Acceptance Criteria:**

**Given** the freeform toggle is active in the ControlBar
**When** the user clicks or taps any fret position
**Then** a cyan freeform FretDot appears at that position; clicking/tapping again removes it
**And** freeform dots coexist alongside active scale/chord highlights without overriding them
**And** freeform marks are stored in `useFretboardStore` and sync to the URL
**Given** the note-name toggle is turned on
**When** the fretboard renders
**Then** pitch names appear inside every fret position in 10px JetBrains Mono
**And** note names default to off on page load
**And** note-name toggle state syncs to the URL
**And** all fret positions are keyboard-reachable (Tab to fret, Space to toggle a freeform mark)

---

### Story 1.9: Frontend CI/CD & Vercel Deploy

As a **developer**,
I want the frontend to deploy automatically on every merge to main,
So that the live app always reflects the latest code without manual steps.

**Acceptance Criteria:**

**Given** a pull request is opened against `main`
**When** the GitHub Actions `frontend-ci.yml` workflow runs
**Then** it executes: type-check (`tsc --noEmit`), lint, and build — failing the PR check if any step fails
**And** on merge to `main`, Vercel auto-deploys the `/frontend` build output
**And** the deployed app is accessible at the configured Vercel URL
**And** environment variables (`VITE_API_URL`, etc.) are configured in Vercel project settings and not committed to the repo
**And** the workflow file lives at `.github/workflows/frontend-ci.yml`

---

### Epic 2: Library & Freemium Experience

**Goal:** Chord and scale library panels live, with free/premium split enforced via PaywallCard gating. Free users see 5 previews; premium users see everything. Paywall UX is polished before auth exists — uses a stub `useSubscriptionStore`.

**Requirements:** FR-6, FR-7, FR-8, UX-DR6, UX-DR7, UX-DR8

---

### Story 2.1: LibraryPanel Shell

As a **user**,
I want a library panel that opens as a drawer on desktop and a bottom sheet on mobile,
So that I can browse chords and scales without the fretboard being obscured.

**Acceptance Criteria:**

**Given** the app is open on desktop (≥768px)
**When** the user clicks the library icon in the ControlBar
**Then** a `LibraryPanel` opens as a drawer from the right side of the screen
**And** the fretboard remains fully visible alongside the open panel
**And** the panel contains a tab switcher to navigate between Scale Library and Chord Library
**And** clicking the library icon again (or an explicit close button) closes the panel
**Given** the app is open on mobile (<768px)
**When** the user clicks the library icon
**Then** the `LibraryPanel` opens as a bottom sheet
**And** it can be dismissed by tapping outside or swiping down
**And** a sidebar render mode is available via the `AppShell` layout config object (for future alternative layouts)
**And** the panel's open/closed state is stored in `useLayoutStore`

---

### Story 2.2: PaywallCard & Subscription Store Stub

As a **free-tier user**,
I want to see a compact upgrade prompt when I try to access premium content,
So that I understand what's available in the premium tier and can easily subscribe.

**Acceptance Criteria:**

**Given** a user clicks a locked `LibraryItem`
**When** the `PaywallCard` renders
**Then** it appears anchored to the triggering element via Floating UI — not covering the fretboard
**And** it is a maximum of 280px wide
**And** it shows a brief description of what the premium tier unlocks
**And** it has an "Upgrade" CTA button (at this stage the button is visible but navigates to a placeholder — Stripe wiring comes in Epic 3)
**And** it dismisses on click-outside or Escape key
**And** a stub `useSubscriptionStore` (Zustand) is in place with an `isPremium: boolean` field defaulting to `false`, which `LibraryItem` and `PaywallCard` read to determine locked/unlocked state
**And** on mobile, the `PaywallCard` content renders within the bottom sheet rather than as a floating card (fretboard is never covered)

---

### Story 2.3: Scale Library Browse

As a **user**,
I want to browse scales in the library panel,
So that I can discover and select scales to visualize on the fretboard.

**Acceptance Criteria:**

**Given** the Library panel is open on the Scale tab
**When** the scale list renders
**Then** the first 5 scales are shown as `preview` `LibraryItem`s — selectable and labelled "Preview"
**And** all remaining scales are shown as `locked` `LibraryItem`s — visible but muted with a lock Badge, not selectable
**And** selecting a preview scale activates it (indigo tint + checkmark) and highlights the pattern on the fretboard
**And** the currently active scale (from ControlBar ScaleSelect) is reflected as `active` in the panel list
**And** `LibraryItem` renders correctly in all 4 states: `default`, `active` (indigo tint + checkmark), `locked` (muted + lock Badge), `preview` (selectable + labelled)
**And** clicking a locked scale item triggers the `PaywallCard` anchored to that item

---

### Story 2.4: Chord Library & Shape Highlight

As a **guitarist**,
I want to browse chords and see their shapes highlighted on the fretboard,
So that I can learn and reference chord fingerings in any tuning.

**Acceptance Criteria:**

**Given** the Library panel is open on the Chord tab
**When** the chord list renders
**Then** the first 5 chords are shown as `preview` `LibraryItem`s — selectable
**And** all remaining chords are shown as `locked` `LibraryItem`s — visible but not selectable
**And** selecting a preview chord highlights its shape on the fretboard in the active tuning using the appropriate FretDot states
**And** the chord shape recalculates correctly when the active tuning changes (chord shapes are tuning-aware)
**And** the selected chord is shown as `active` (indigo tint + checkmark) in the list
**And** clicking a locked chord item triggers the `PaywallCard`
**And** deselecting the active chord (clicking it again) clears the fretboard chord highlight

---

### Epic 3: Auth & Subscription

**Goal:** Real user accounts (Google OAuth + email/password), Stripe billing ($12/yr annual), server-side subscription enforcement. PaywallCard from Epic 2 wires to real gate. Full backend live on Railway.

**Requirements:** FR-2b, FR-13, FR-14, FR-15, NFR-3, NFR-4, NFR-5, ARCH-3, ARCH-4 (V1–V2 migrations), ARCH-5, ARCH-6, ARCH-7, ARCH-8, ARCH-9 (authStore + subscriptionStore), ARCH-11 (backend CI/CD + Railway)

---

### Story 3.1: Backend Scaffold & Database

As a **developer**,
I want the Spring Boot backend scaffolded and connected to PostgreSQL locally,
So that I have a working backend foundation to build auth and subscription features on.

**Acceptance Criteria:**

**Given** the monorepo exists with a `/frontend` directory
**When** the backend scaffold is complete
**Then** a `/backend` directory exists with a Spring Boot 3.4.4 + Java 21 + Maven project (dependencies: Web, Security, Data JPA, PostgreSQL, Validation, Lombok, DevTools)
**And** `docker-compose.yml` at repo root is updated so `docker compose up` starts both the backend and a PostgreSQL 16 container
**And** Flyway is configured with `V1__create_users.sql` (id, email, password_hash, google_id, name, created_at) and `V2__create_subscriptions.sql` (id, user_id FK, stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at)
**And** `./mvnw spring-boot:run` from `/backend` starts the server on port 8080 and applies all migrations cleanly
**And** `GET /api/v1/health` returns `200 OK` (health endpoint for Railway deploy readiness)

---

### Story 3.2: Email/Password Auth

As a **user**,
I want to register and log in with an email address and password,
So that I can create an account and access my data across sessions.

**Acceptance Criteria:**

**Given** `POST /api/v1/auth/register` with a valid email and password
**When** the request is processed
**Then** a user record is created with the password hashed via bcrypt (NFR-3)
**And** a JWT access token (HS256, 15-min expiry) and a 7-day refresh token (httpOnly + Secure cookie) are returned
**And** `POST /api/v1/auth/login` with valid credentials returns the same token pair
**And** `POST /api/v1/auth/login` with invalid credentials returns 401 with error envelope `{ "error": { "code": "INVALID_CREDENTIALS", "status": 401 } }`
**And** `POST /api/v1/auth/refresh` reads the refresh token from the httpOnly cookie, validates it, rotates it (old token invalidated), and returns a new access token
**And** `POST /api/v1/auth/logout` clears the refresh token cookie
**And** the Spring Security filter chain includes a `JwtFilter` that validates the Bearer token on every authenticated request
**And** Bucket4j rate limiting is applied to all `/api/v1/auth/*` endpoints

---

### Story 3.3: Google OAuth

As a **user**,
I want to sign in with my Google account,
So that I can authenticate quickly without managing a separate password.

**Acceptance Criteria:**

**Given** the frontend has the Google Identity Services SDK loaded
**When** the user clicks "Sign in with Google" and completes the Google consent flow
**Then** the frontend receives a Google ID token and sends it to `POST /api/v1/auth/google`
**And** the backend verifies the ID token against Google's JWKS endpoint
**And** if the Google account is new, a user record is created (no `password_hash`)
**And** if the `google_id` matches an existing user, that user is logged in
**And** the response is the same JWT access token + refresh token cookie pair as email/password auth
**And** a Google account and an email/password account sharing the same email address are treated as the same user (linked by email)

---

### Story 3.4: Frontend Auth Integration

As a **user**,
I want to log in and see my account status reflected in the app,
So that the app knows who I am and shows me the right content.

**Acceptance Criteria:**

**Given** the app loads and the user is not authenticated
**When** the ControlBar renders
**Then** the account menu icon shows a "Sign In" prompt
**And** clicking it opens a login/register modal (shadcn Dialog) with email/password fields and a Google sign-in button
**And** `useAuthStore` (Zustand) holds: `accessToken`, user profile (id, name, email), `isAuthenticated`
**And** `apiClient.ts` is the sole HTTP boundary — it reads `useAuthStore.getState().accessToken` and injects `Authorization: Bearer <token>` on every request
**And** when any request returns 401, `apiClient.ts` automatically calls `POST /api/v1/auth/refresh` and retries the original request once before surfacing the error
**And** on successful login, `useAuthStore` is populated and `useSubscriptionStore` immediately fetches `GET /api/v1/subscriptions/me`
**And** logging out clears `useAuthStore`, calls `POST /api/v1/auth/logout`, and resets `useSubscriptionStore` to `isPremium: false`

---

### Story 3.5: Stripe Checkout & Webhook

As a **user**,
I want to subscribe to the premium tier via a secure checkout,
So that I can unlock premium features immediately after payment.

**Acceptance Criteria:**

**Given** an authenticated user clicks the "Upgrade" CTA in the `PaywallCard`
**When** the frontend calls `POST /api/v1/checkout/session`
**Then** the backend creates a Stripe Checkout session for the $12/yr annual plan and returns the session URL
**And** the frontend redirects the user to the Stripe-hosted Checkout page — no card data touches the backend (NFR-5)
**And** on successful payment, Stripe calls `POST /api/v1/webhooks/stripe` with a `checkout.session.completed` event
**And** the webhook handler verifies the `Stripe-Signature` header before processing
**And** the handler is idempotent — processing the same Stripe event ID twice has no side effect
**And** on success, the user's subscription record is updated: `status=ACTIVE`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end` set
**And** `customer.subscription.updated` / `customer.subscription.deleted` events set `status=EXPIRED`, reverting the user to free tier immediately (FR-15)

---

### Story 3.6: Subscription Enforcement

As a **premium user**,
I want my subscription status to unlock premium content immediately after payment,
So that I can access the full library without any extra steps.

**Acceptance Criteria:**

**Given** a user has an active subscription
**When** `GET /api/v1/subscriptions/me` is called with a valid Bearer token
**Then** it returns `{ "status": "ACTIVE", "currentPeriodEnd": "..." }`
**And** `useSubscriptionStore` sets `isPremium: true`, causing all `LibraryItem`s to render as unlocked
**And** premium-gated endpoints are protected with `@PreAuthorize("hasRole('PREMIUM')")` — returning 403 with error envelope for non-premium users (NFR-4)
**And** when a subscription has expired, `GET /api/v1/subscriptions/me` returns `{ "status": "EXPIRED" }`, `useSubscriptionStore` sets `isPremium: false`, and locked `LibraryItem`s revert immediately
**And** the `PaywallCard` "Upgrade" CTA now correctly initiates the Stripe Checkout flow from Story 3.5

---

### Story 3.7: Backend CI/CD & Railway Deploy

As a **developer**,
I want the backend to deploy automatically on every merge to main,
So that the live API always reflects the latest code without manual steps.

**Acceptance Criteria:**

**Given** a pull request is opened against `main`
**When** the GitHub Actions `backend-ci.yml` workflow runs
**Then** it executes: compile, run tests, and package — failing the PR check if any step fails
**And** on merge to `main`, Railway auto-deploys the backend from the `Dockerfile` in `/backend`
**And** Flyway migrations run automatically on startup against the Railway PostgreSQL instance
**And** all secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`) are configured in Railway environment variables and not committed to the repo
**And** the workflow file lives at `.github/workflows/backend-ci.yml`
**And** the deployed backend URL is set as `VITE_API_URL` in Vercel so the frontend points to it

---

### Epic 4: Premium Features

**Goal:** Custom tuning creator, chord progression builder, fretboard session persistence, and premium themes — the complete premium product.

**Requirements:** FR-5b, FR-10, FR-11, FR-12, NFR-6 (premium themes audit), ARCH-4 (V3–V4 migrations), UX-DR1 (neon/mono/vibrant/minimal themes), UX-DR9, UX-DR16

---

### Story 4.1: Custom Tuning Creator

As a **premium user**,
I want to create custom guitar tunings by defining each string's pitch,
So that I can visualize scales and chords in any tuning I play.

**Acceptance Criteria:**

**Given** the user is premium (`isPremium: true`)
**When** they click "Create Custom Tuning" in the TuningSelect dropdown
**Then** a `CustomTuningCreator` opens as a shadcn Sheet
**And** it shows 6 per-string note + octave inputs for strings 1–6
**And** changing any string input updates a live `FretboardCanvas` preview within the sheet on every keystroke
**And** the user can enter a name for the tuning
**And** clicking Save calls `POST /api/v1/tunings` (requires `ROLE_PREMIUM`) and the new tuning appears immediately in TuningSelect
**And** clicking Discard closes the sheet without saving
**And** `V3__create_custom_tunings.sql` Flyway migration is applied (id, user_id FK, name, strings JSON, created_at)

---

### Story 4.2: Custom Tuning Management

As a **premium user**,
I want to rename and delete my saved custom tunings and access all predefined tunings,
So that I can keep my tuning list organised and use any tuning I need.

**Acceptance Criteria:**

**Given** the user is premium
**When** they open TuningSelect
**Then** the full list of all predefined tunings is available (not just the 5–7 free-tier ones)
**And** their saved custom tunings appear in the list alongside predefined tunings
**And** each custom tuning has a rename and delete option (inline actions or context menu)
**And** renaming calls `PATCH /api/v1/tunings/{id}` and updates the list immediately
**And** deleting calls `DELETE /api/v1/tunings/{id}` — backend enforces ownership (own tunings only)
**And** if the currently active tuning is deleted, the app falls back to Standard tuning

---

### Story 4.3: Chord Progression Builder

As a **premium guitarist**,
I want to build chord progressions and step through them on the fretboard,
So that I can practise and visualize sequences of chords.

**Acceptance Criteria:**

**Given** the user is premium and the Library panel is open
**When** they open the Chord Progression Builder
**Then** they can add chords from the full chord library to an ordered sequence
**And** they can reorder chords via drag or up/down controls
**And** they can remove individual chords from the sequence
**And** stepping through the progression (next/previous buttons or left/right arrow keys) updates the fretboard to show the current chord's shape
**And** the active chord in the sequence is visually highlighted in the progression UI
**And** the progression is held in a `useProgressionStore` Zustand store (in-session memory, no server persistence required at this stage)

---

### Story 4.4: Session Persistence

As a **premium user**,
I want the app to remember my fretboard setup between sessions,
So that I can pick up exactly where I left off.

**Acceptance Criteria:**

**Given** the user is authenticated and premium
**When** they close the app and return later
**Then** their last saved tuning, capo position, and freeform marks are restored on load
**And** `GET /api/v1/sessions` (`ROLE_PREMIUM`) returns the most recent saved session
**And** `POST /api/v1/sessions` (`ROLE_PREMIUM`) saves the current fretboard state (tuning, capo, freeform marks as JSON)
**And** state is auto-saved on fretboard changes, debounced to avoid saving on every keystroke
**And** `V4__create_saved_sessions.sql` Flyway migration is applied (id, user_id FK, state JSON, updated_at)
**And** URL query params from Epic 1 take precedence over the saved session on load — if `?tuning=`, `?key=`, or `?scale=` are present in the URL, those values win

---

### Story 4.5: Premium Themes & Contrast Audit

As a **premium user**,
I want to choose from premium visual themes,
So that I can personalise the app's appearance.

**Acceptance Criteria:**

**Given** the user is premium
**When** they open the theme selector (in the account menu)
**Then** they can choose from 5 themes: dark (free default), neon, mono, vibrant, minimal
**And** selecting a theme sets `data-theme="<theme-name>"` on the root element, updating all CSS custom property tokens
**And** the theme preference is persisted in `localStorage`
**And** non-premium users see the other 4 themes with a lock indicator — clicking them triggers the `PaywallCard`
**And** all 5 theme color combinations have been audited and confirmed to meet WCAG 2.1 AA contrast ratios for dot colors, note names, and UI chrome (NFR-6, UX-DR16)
**And** the neon, mono, vibrant, and minimal token sets are defined as CSS custom property blocks alongside the existing dark theme
