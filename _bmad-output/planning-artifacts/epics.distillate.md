---
type: bmad-distillate
sources:
  - "epics.md"
downstream_consumer: "dev agent implementing guitar app stories"
created: "2026-05-26"
token_estimate: 2100
parts: 1
---

## Epic 1: Core Fretboard Experience
Goal: Free-tier fully usable fretboard — tuning, scale/mode overlay, capo, freeform marking, note names, URL sharing, deployed to Vercel.
Reqs: FR-1,2,3,4,5,9; NFR-1,2,6(partial); UX-DR1(dark),2,3,4,5,10,11,12,13,14,15,17,18

### Story 1.1: Monorepo Setup & Dev Environment — DONE
Moved repo root to /frontend; Vite 6 + Tailwind v4 + shadcn/ui + TypeScript (allowJs:true) + @/ alias; docker-compose.yml with backend+postgres services; npm run dev functional.

### Story 1.2: AppShell & Design Token System — DONE
AppShell CSS Grid (zones: top-bar,mode-row,fretboard,library-panel,bottom-bar); dark theme CSS tokens; JetBrains Mono + Inter fonts; skip link; 80ms dot transitions; prefers-reduced-motion suppression; data-theme="dark" on root.

### Story 1.3: Interactive SVG Fretboard — DONE
FretboardCanvas SVG 24frets×6strings proportional columns; FretDot 4 states (root amber #f59e0b 20px/100%, scale indigo #6366f1 18px/85%, mode rose #fb7185 18px/90%+glow, freeform cyan #22d3ee 18px/80%+dashed); role="img" + dynamic aria-label; horizontal scroll <768px; <100ms updates; legible at 375px.

### Story 1.4: Core State & URL Sharing — DONE
Zustand fretboardStore (tuning,key,scale,mode index,capo,freeform marks,note-names-visible) + layoutStore (panel open/closed,layout mode); React Router v7 single route; ?tuning=&key=&scale= URL sync; hydrates before first render; back/forward navigation restores state.

### Story 1.5: ControlBar & Tuning Selection
Status: in-review

As a free-tier user, I want a control bar with tuning/key/scale selectors so the fretboard updates immediately.

**Acceptance Criteria:**
- ControlBar shows: logo, TuningSelect, KeySelect, ScaleSelect (shadcn Select), note-name toggle, freeform toggle, library icon button, account menu icon
- TuningSelect shows exactly 5–7 predefined free-tier tunings (Standard, Drop D, Open G, Open E, DADGAD, up to 2 more)
- Selecting any tuning updates fretboard immediately — no Apply button
- Control bar wraps to 2 rows at <768px
- All controls reachable via Tab in logical order
- KeySelect and ScaleSelect populated and update fretboard immediately on selection

### Story 1.6: Scale & Mode Explorer
Status: not-started

As a guitarist, I want to explore scales and modes on the fretboard.

**Acceptance Criteria:**
- Scale selected → full pattern highlighted 24 frets in indigo FretDots; root notes amber FretDots
- ModeChipsRow appears below ControlBar with 7 chips (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian)
- Each chip has Tooltip with plain-language description (e.g. "Dorian — minor with a bright 6th")
- Clicking mode chip overlays characteristic notes in rose FretDots additively — parent scale dots remain
- Only one mode chip active at a time; clicking active chip deactivates overlay
- Arrow keys navigate between mode chips when focus within chip row

### Story 1.7: Capo Support
Status: not-started

As a guitarist who uses a capo, I want to set capo position so I see correct notes relative to the capo.

**Acceptance Criteria:**
- Capo set to fret N (1–12) via capo control in ControlBar → visual nut indicator appears at fret N
- Note name labels shift to reflect capoed pitch (open strings show sounded pitch)
- Active scale highlights recalculate relative to capo position
- Frets below capo visually dimmed
- Capo 0/"None" restores standard display
- Capo stored in fretboardStore; synced to URL as ?capo=N

### Story 1.8: Freeform Marking & Note Names
Status: not-started

As a guitarist, I want to freely mark fret positions and optionally see note names for annotation.

**Acceptance Criteria:**
- Freeform toggle active → click/tap fret position toggles cyan FretDot; clicking again removes
- Freeform dots coexist with scale/chord highlights without overriding
- Freeform marks stored in fretboardStore; sync to URL
- Note-name toggle on → pitch names inside every fret position in 10px JetBrains Mono
- Note names default off on page load
- Note-name toggle state syncs to URL
- All fret positions keyboard-reachable (Tab to fret, Space to toggle freeform mark)

### Story 1.9: Frontend CI/CD & Vercel Deploy
Status: not-started

As a developer, I want the frontend to auto-deploy on merge to main.

**Acceptance Criteria:**
- PR → frontend-ci.yml runs: tsc --noEmit, lint, build — fails PR check if any step fails
- Merge to main → Vercel auto-deploys /frontend build output
- App accessible at configured Vercel URL
- Env vars (VITE_API_URL, etc.) in Vercel project settings; not committed to repo
- Workflow file at .github/workflows/frontend-ci.yml

---
## Epic 2: Library & Freemium Experience
Goal: Chord + scale library panels with free/premium split; PaywallCard gating; free=5 previews, premium=all; uses stub useSubscriptionStore (no real auth yet).
Reqs: FR-6,7,8; UX-DR6,7,8

### Story 2.1: LibraryPanel Shell
As a user, I want a library panel (drawer desktop / bottom sheet mobile) so the fretboard stays visible.

**Acceptance Criteria:**
- Desktop (≥768px): LibraryPanel opens as right-side drawer; fretboard remains fully visible; tab switcher for Scale Library / Chord Library; icon click or close button dismisses
- Mobile (<768px): LibraryPanel opens as bottom sheet; dismissible by tap-outside or swipe-down
- Sidebar render mode available via AppShell layout config object
- Panel open/closed state stored in useLayoutStore

### Story 2.2: PaywallCard & Subscription Store Stub
As a free-tier user, I want a compact upgrade prompt when accessing premium content.

**Acceptance Criteria:**
- Clicking locked LibraryItem → PaywallCard anchored to triggering element via Floating UI; does not cover fretboard
- Max 280px wide
- Shows brief premium tier description
- "Upgrade" CTA visible but navigates to placeholder (Stripe wiring in Epic 3)
- Dismisses on click-outside or Escape key
- Stub useSubscriptionStore (Zustand) with isPremium: boolean defaulting false; LibraryItem + PaywallCard read this
- Mobile: PaywallCard content renders within bottom sheet (fretboard never covered)

### Story 2.3: Scale Library Browse
As a user, I want to browse scales in the library panel to discover and select them.

**Acceptance Criteria:**
- Scale tab open → first 5 scales as `preview` LibraryItems (selectable, labelled "Preview")
- Remaining scales as `locked` LibraryItems (muted + lock Badge, not selectable)
- Selecting preview scale → activates (indigo tint + checkmark) + highlights pattern on fretboard
- Active scale from ControlBar reflected as `active` in panel list
- LibraryItem all 4 states: default, active (indigo tint + checkmark), locked (muted + lock Badge), preview (selectable + labelled)
- Clicking locked scale → triggers PaywallCard anchored to item

### Story 2.4: Chord Library & Shape Highlight
As a guitarist, I want to browse chords and see shapes highlighted on the fretboard in any tuning.

**Acceptance Criteria:**
- Chord tab open → first 5 chords as `preview` LibraryItems (selectable)
- Remaining chords as `locked` LibraryItems (visible, not selectable)
- Selecting preview chord → highlights shape on fretboard in active tuning using FretDot states
- Chord shape recalculates when active tuning changes (tuning-aware)
- Selected chord shown as `active` in list
- Clicking locked chord → triggers PaywallCard
- Deselecting active chord (click again) → clears fretboard chord highlight

---
## Epic 3: Auth & Subscription
Goal: Real accounts (Google OAuth + email/password), Stripe billing ($12/yr annual), server-side enforcement; PaywallCard wired to real gate; full backend on Railway.
Reqs: FR-2b,13,14,15; NFR-3,4,5

### Story 3.1: Backend Scaffold & Database
As a developer, I want Spring Boot backend scaffolded and connected to PostgreSQL locally.

**Acceptance Criteria:**
- /backend dir: Spring Boot 3.4.4 + Java 21 + Maven (deps: Web, Security, Data JPA, PostgreSQL, Validation, Lombok, DevTools)
- docker-compose.yml updated: `docker compose up` starts backend + PostgreSQL 16
- Flyway: V1__create_users.sql (id, email, password_hash, google_id, name, created_at); V2__create_subscriptions.sql (id, user_id FK, stripe_customer_id, stripe_subscription_id, status, current_period_end, created_at)
- ./mvnw spring-boot:run from /backend starts on port 8080; migrations apply cleanly
- GET /api/v1/health returns 200 OK

### Story 3.2: Email/Password Auth
As a user, I want to register and log in with email/password.

**Acceptance Criteria:**
- POST /api/v1/auth/register with valid email+password → user created with bcrypt hash; JWT access token (HS256, 15-min) + 7-day refresh token (httpOnly+Secure cookie) returned
- POST /api/v1/auth/login valid → same token pair; invalid → 401 `{"error":{"code":"INVALID_CREDENTIALS","status":401}}`
- POST /api/v1/auth/refresh → reads httpOnly cookie, validates, rotates (old invalidated), returns new access token
- POST /api/v1/auth/logout → clears refresh token cookie
- Spring Security JwtFilter validates Bearer token on every authenticated request
- Bucket4j rate limiting on all /api/v1/auth/* endpoints

### Story 3.3: Google OAuth
As a user, I want to sign in with Google without managing a separate password.

**Acceptance Criteria:**
- Frontend: Google Identity Services SDK loaded; user clicks "Sign in with Google" → completes consent flow
- Frontend sends Google ID token to POST /api/v1/auth/google
- Backend verifies ID token against Google JWKS endpoint
- New Google account → user record created (no password_hash); existing google_id → logs in that user
- Response: same JWT access token + refresh token cookie pair as email/password auth
- Same email for Google + email/password accounts → treated as same user (linked by email)

### Story 3.4: Frontend Auth Integration
As a user, I want to log in and see my account status reflected in the app.

**Acceptance Criteria:**
- Unauthenticated → account menu icon shows "Sign In" prompt; clicking opens login/register modal (shadcn Dialog) with email/password fields + Google sign-in button
- useAuthStore (Zustand): accessToken, user profile (id,name,email), isAuthenticated
- apiClient.ts is sole HTTP boundary → injects Authorization: Bearer <token> on every request
- Any 401 → apiClient.ts auto-calls POST /api/v1/auth/refresh, retries original request once before surfacing error
- Successful login → useAuthStore populated + useSubscriptionStore fetches GET /api/v1/subscriptions/me
- Logout → clears useAuthStore, calls POST /api/v1/auth/logout, resets useSubscriptionStore to isPremium:false

### Story 3.5: Stripe Checkout & Webhook
As a user, I want to subscribe via secure checkout and unlock premium immediately after payment.

**Acceptance Criteria:**
- Authenticated user clicks "Upgrade" CTA in PaywallCard → frontend calls POST /api/v1/checkout/session
- Backend creates Stripe Checkout session for $12/yr annual plan; returns session URL
- Frontend redirects to Stripe-hosted Checkout — no card data touches backend
- Successful payment → Stripe calls POST /api/v1/webhooks/stripe with checkout.session.completed
- Webhook verifies Stripe-Signature header before processing
- Handler idempotent — same Stripe event ID processed twice has no side effect
- Success → subscription record updated: status=ACTIVE, stripe_customer_id, stripe_subscription_id, current_period_end set
- customer.subscription.updated / customer.subscription.deleted → status=EXPIRED, user reverts to free tier immediately

### Story 3.6: Subscription Enforcement
As a premium user, I want my subscription to unlock premium content immediately.

**Acceptance Criteria:**
- Active subscription → GET /api/v1/subscriptions/me returns `{"status":"ACTIVE","currentPeriodEnd":"..."}`
- useSubscriptionStore sets isPremium:true → all LibraryItems render unlocked
- Premium-gated endpoints: `@PreAuthorize("hasRole('PREMIUM')")` → 403 with error envelope for non-premium
- Expired subscription → GET /api/v1/subscriptions/me returns `{"status":"EXPIRED"}`; isPremium:false; locked LibraryItems revert immediately
- PaywallCard "Upgrade" CTA correctly initiates Stripe Checkout from 3.5

### Story 3.7: Backend CI/CD & Railway Deploy
As a developer, I want the backend to auto-deploy on merge to main.

**Acceptance Criteria:**
- PR → backend-ci.yml runs: compile, test, package — fails PR check if any step fails
- Merge to main → Railway auto-deploys from /backend Dockerfile
- Flyway migrations run automatically on startup against Railway PostgreSQL
- Secrets (JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DATABASE_URL) in Railway env vars; not committed to repo
- Workflow file at .github/workflows/backend-ci.yml
- Deployed backend URL set as VITE_API_URL in Vercel

---
## Epic 4: Premium Features
Goal: Custom tuning creator, chord progression builder, session persistence, premium themes — complete premium product.
Reqs: FR-5b,10,11,12; NFR-6(premium audit); UX-DR1(neon/mono/vibrant/minimal),9,16

### Story 4.1: Custom Tuning Creator
As a premium user, I want to create custom tunings by defining each string's pitch.

**Acceptance Criteria:**
- isPremium:true → "Create Custom Tuning" in TuningSelect dropdown → CustomTuningCreator opens as shadcn Sheet
- Sheet: 6 per-string note+octave inputs (strings 1–6)
- Any string input change → live FretboardCanvas preview updates per keystroke
- Name input for the tuning
- Save → POST /api/v1/tunings (requires ROLE_PREMIUM); new tuning appears immediately in TuningSelect
- Discard → closes sheet without saving
- V3__create_custom_tunings.sql migration applied (id, user_id FK, name, strings JSON, created_at)

### Story 4.2: Custom Tuning Management
As a premium user, I want to rename/delete saved tunings and access all predefined tunings.

**Acceptance Criteria:**
- Premium → TuningSelect shows full list of all predefined tunings (not just 5–7 free-tier)
- Saved custom tunings appear alongside predefined tunings
- Each custom tuning has rename + delete option (inline actions or context menu)
- Rename → PATCH /api/v1/tunings/{id}; list updates immediately
- Delete → DELETE /api/v1/tunings/{id}; backend enforces ownership (own tunings only)
- If active tuning deleted → app falls back to Standard tuning

### Story 4.3: Chord Progression Builder
As a premium guitarist, I want to build chord progressions and step through them on the fretboard.

**Acceptance Criteria:**
- Premium + Library panel open → Chord Progression Builder accessible
- Add chords from full chord library to ordered sequence
- Reorder via drag or up/down controls
- Remove individual chords from sequence
- Step through progression (next/prev buttons or left/right arrow keys) → fretboard shows current chord shape
- Active chord in sequence visually highlighted in progression UI
- Progression held in useProgressionStore Zustand store (in-session memory; no server persistence required)

### Story 4.4: Session Persistence
As a premium user, I want the app to remember my fretboard setup between sessions.

**Acceptance Criteria:**
- Authenticated + premium → close + return → last saved tuning, capo, freeform marks restored on load
- GET /api/v1/sessions (ROLE_PREMIUM) returns most recent saved session
- POST /api/v1/sessions (ROLE_PREMIUM) saves current state (tuning, capo, freeform marks as JSON)
- Auto-saved on fretboard changes, debounced to avoid saving per keystroke
- V4__create_saved_sessions.sql migration applied (id, user_id FK, state JSON, updated_at)
- URL query params from Epic 1 take precedence over saved session on load — ?tuning=, ?key=, ?scale= present → those values win

### Story 4.5: Premium Themes & Contrast Audit
As a premium user, I want to choose from premium visual themes.

**Acceptance Criteria:**
- Premium → theme selector (in account menu) → 5 themes: dark (free default), neon, mono, vibrant, minimal
- Selecting theme → sets data-theme="<theme-name>" on root element; all CSS tokens update
- Theme preference persisted in localStorage
- Non-premium users see other 4 themes with lock indicator → clicking triggers PaywallCard
- All 5 themes audited + confirmed WCAG 2.1 AA contrast for dot colors, note names, UI chrome
- Neon, mono, vibrant, minimal token sets defined as CSS custom property blocks alongside dark theme
