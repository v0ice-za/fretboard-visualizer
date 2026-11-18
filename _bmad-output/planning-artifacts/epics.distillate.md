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

### Story 1.5: ControlBar & Tuning Selection — DONE

As a free-tier user, I want a control bar with tuning/key/scale selectors so the fretboard updates immediately.

**Acceptance Criteria:**
- ControlBar shows: logo, TuningSelect, KeySelect, ScaleSelect (shadcn Select), note-name toggle, freeform toggle, library icon button, account menu icon
- TuningSelect shows exactly 5–7 predefined free-tier tunings (Standard, Drop D, Open G, Open E, DADGAD, up to 2 more)
- Selecting any tuning updates fretboard immediately — no Apply button
- Control bar wraps to 2 rows at <768px
- All controls reachable via Tab in logical order
- KeySelect and ScaleSelect populated and update fretboard immediately on selection

### Story 1.6: Scale & Mode Explorer — DONE

As a guitarist, I want to explore scales and modes on the fretboard.

**Acceptance Criteria:**
- Scale selected → full pattern highlighted 24 frets in indigo FretDots; root notes amber FretDots
- ModeChipsRow appears below ControlBar with 7 chips (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian)
- Each chip has Tooltip with plain-language description (e.g. "Dorian — minor with a bright 6th")
- Clicking mode chip overlays characteristic notes in rose FretDots additively — parent scale dots remain
- Only one mode chip active at a time; clicking active chip deactivates overlay
- Arrow keys navigate between mode chips when focus within chip row

### Story 1.7: Capo Support — DONE

As a guitarist who uses a capo, I want to set capo position so I see correct notes relative to the capo.

**Acceptance Criteria:**
- Capo set to fret N (1–12) via capo control in ControlBar → visual nut indicator appears at fret N
- Note name labels shift to reflect capoed pitch (open strings show sounded pitch)
- Active scale highlights recalculate relative to capo position
- Frets below capo visually dimmed
- Capo 0/"None" restores standard display
- Capo stored in fretboardStore; synced to URL as ?capo=N

### Story 1.8: Freeform Marking & Note Names — DONE

As a guitarist, I want to freely mark fret positions and optionally see note names for annotation.

**Acceptance Criteria:**
- Freeform toggle active → click/tap fret position toggles cyan FretDot; clicking again removes
- Freeform dots coexist with scale/chord highlights without overriding
- Freeform marks stored in fretboardStore; sync to URL
- Note-name toggle on → pitch names inside every fret position in 10px JetBrains Mono
- Note names default off on page load
- Note-name toggle state syncs to URL
- All fret positions keyboard-reachable (Tab to fret, Space to toggle freeform mark)

### Story 1.9: Frontend CI/CD & Vercel Deploy — DONE

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

---
## Epic 5: UI/UX Visual Overhaul
Goal: Modernize the chrome (not the fretboard rendering) into the "Aurora glass-first dark" direction — elevation/glass/glow token system, Aurora signature palette (indigo→violet→cyan), richer + labelled controls, more breathing room, and instant affordance. Frontend-only; no backend/API changes. Source of truth: `ux-design-specification.md#Visual Overhaul Direction — 2026-09-08 Revision`.
Reqs: UX-DR (visual execution refresh). Confirmed decisions: depth=glass; affordance=labels-on-desktop + tooltips-on-mobile; signature=Aurora; fretboard dot scope=Option B (retune to harmonize).

### Story 5.1: Elevation, Glass & Aurora Token Foundation
As a developer, I want the elevation/glass/glow token system + Aurora signature installed so every overhaul story builds on one foundation.

**Acceptance Criteria:**
- `--glass-*` (bar/panel/overlay bg, blur, border, highlight), `--shadow-{sm,md,lg}`, `--glow-{primary,accent}`, `--signature-grad` tokens added to `index.css` for both `.dark`/`[data-theme="dark"]` and `:root` (light) blocks
- Aurora signature applied to chrome tokens: `--primary` → electric violet `#8b5cf6`; accent → cyan `#22d3ee`; neutrals → cool blue-slate
- Density variables added/updated: `--top-bar-height` → 3.75rem; comfortable spacing scale documented
- Reusable `.glass-surface` utility (bg + backdrop-filter blur+saturate + luminous border + shadow + inset top-highlight)
- `prefers-reduced-transparency` fallback: `.glass-surface` collapses to nearest solid surface, drops `backdrop-filter`
- Fretboard dot tokens (`--color-dot-*`) are NOT changed here (deferred to 5.5)
- No visual regression to fretboard rendering; existing tests pass

### Story 5.2: ControlBar Glass + Labelled Controls + Tooltips
As a user, I want a modern, legible control bar so I can tell what everything does at a glance.

**Acceptance Criteria:**
- ControlBar uses `.glass-surface`, floats over the board with `--shadow-md`; 60px min height; logical groups (brand · selectors · capo · actions) separated by `Separator`
- Shared `IconButton` component: 40px container, 18–20px glyph, hover-lift + `--shadow-sm`, active = `--primary` fill + `--glow-primary`; 44px min touch target
- Action cluster (Note names, Freeform, Library, Account) shows icon + text label at `md`+; collapses to icon-only + styled shadcn `Tooltip` (150ms) below `md` — native `title` removed
- Selectors (Tuning/Key/Scale) restyled: taller trigger, glass rest state, `[Category]`/`[Value]` layout, `--glow-primary` focus ring; dropdown content on `--glass-overlay-bg` + `--shadow-lg`
- Refreshed logo mark (~24–26px) with subtle accent glow
- Capo slider track/thumb given glass+glow treatment; live label kept
- Control bar still wraps gracefully <768px; keyboard tab order preserved

### Story 5.3: Library, Mode Chips & Paywall Glass Polish
As a user, I want the library and premium prompts to feel part of the same polished system.

**Acceptance Criteria:**
- `LibraryPanel` aside uses glass + `--shadow-lg` with a clear elevation step from the board; tab row gets a sliding active indicator
- `LibraryItem`: more vertical padding, hover elevation, refined active (violet tint + `--glow`) and locked (lock badge + dimmed `--glass-border`) states
- `ModeChipsRow` chips get pill glass treatment; active chip filled + glow; larger tap size
- `PaywallCard`: glass overlay, `--shadow-lg`, luminous border, `--glow-primary` on Subscribe CTA; remains non-blocking / never covers fretboard
- Mobile bottom-sheet variants inherit the same glass treatment
- No change to gating logic or subscription behavior — visual only

### Story 5.4: Overlays Unified + Legacy Nav Reconciliation
As a user, I want auth and all sheets/dialogs to share one glass language and the app to have a single navigation system.

**Acceptance Criteria:**
- `LoginModal` / `EmailAuthForm` / `GoogleAuthButton` restyled to the new control language on `--glass-overlay-bg` + `--glass-blur-strong`; generous spacing
- Rename/delete/account sheets and `CustomTuningCreator` share a unified glass overlay + shadow + header/spacing rhythm
- `NavTabs.jsx` (parallel/legacy nav with its own icons + "Upgrade to Pro") is either folded into the unified control language or removed — no duplicate navigation systems remain
- All overlays respect `prefers-reduced-transparency` fallback
- No change to auth/checkout flows — visual + consolidation only

### Story 5.5: Fretboard Dot Retune + Contrast & Motion Audit
As a user, I want the fretboard to share the Aurora palette while staying perfectly readable and accessible.

**Acceptance Criteria:**
- `--color-dot-*` retuned (Option B): root `#fbbf24` gold, scale `#8b5cf6` violet, mode `#22d3ee` cyan, freeform `#f0abfc` pink — layout/rendering/3-colour logic unchanged
- Retuned dots verified WCAG 2.1 AA over the glass-composited board in BOTH dark and light themes
- Deuteranopia + protanopia separation verified for the root/scale/mode trio; note names remain the non-colour fallback
- Motion: hover-lift/glow/dropdown transitions land at documented durations; all gated behind `prefers-reduced-motion`; fretboard 80ms dot transition unchanged
- Cross-browser `backdrop-filter` check (Chrome, Firefox, Safari/WebKit, Edge) with acceptable fallback where unsupported
- Full regression: frontend suite + type-check + lint green

---
## Epic 6: Harmony & Chord Discovery
Goal: Turn the app from a chord *viewer* into a chord *discovery* tool for songwriters — show the diatonic chords for the current key/scale, expand the chord vocabulary substantially, and surface shared-note substitutions / "jazzify" suggestions. Frontend-only, pure music-theory computation; NO backend, NO new API routes (same shape as Story 4.3 progression builder). Provisional decisions (pending user confirmation): sequencing = after Epic 5; gating = Chords-in-Key free, expanded library + jazzify premium; `chords.js` treated as editable app-data (musicTheory.js/tunings.js/scales.js stay frozen).

### Story 6.1: Chords in Key (Diatonic Chords)
As a songwriter, I want to see the chords that belong to the selected key + scale so I know what fits.
**Acceptance Criteria:**
- For the active key + scale, compute diatonic chords by stacking scale thirds on each degree (triads by default; optional 7ths toggle)
- A "Chords in Key" strip shows each degree with correct Roman-numeral quality (I ii iii IV V vi vii for major; computed, not hardcoded) and the concrete chord name (e.g. C major -> C Dm Em F G Am Bdim)
- Clicking a degree highlights that chord's shape on the fretboard in the active tuning (reuses existing chord-highlight rendering + chordName/root state)
- Heptatonic scales harmonize fully; non-heptatonic (e.g. pentatonic) degrade gracefully (only buildable chords, or a "needs a 7-note scale" note)
- Free tier
- Pure frontend; harmonization in a NEW util (e.g. lib/harmony.ts) reading scales.js + chords.js; frozen files untouched; no new API routes

### Story 6.2: Expanded Chord Library
As a guitarist, I want a much larger chord vocabulary.
**Acceptance Criteria:**
- Add ~15-20 chord types to chords.js with correct intervals (6, m6, m7b5/half-dim, add9, 9, m9, maj9, 11, 13, 7b5, 7#5, 7sus4, aug7, 6/9, ...)
- CHORD_NAMES order keeps common chords first so the free preview stays the useful basics
- Existing fretboard chord-highlight renders 5+ note / extended chords gracefully
- Expanded set follows existing free-preview / premium-lock pattern (gating per decision)
- No regression to existing chord selection/highlight or the progression builder

### Story 6.3: Chord Relationships / "Jazzify"
As a songwriter, I want to find chords that share notes and jazzier substitutions.
**Acceptance Criteria:**
- For the active chord (root + type) compute its pitch-class set and surface: (a) shares notes — other library chords at any root sharing >= N common tones, ranked; (b) jazzify — extension upgrades (triad->7th/9th/...) + common subs (relative, tritone-sub for dominants, ii-V framing)
- Each suggestion is clickable -> highlights on the fretboard
- Premium-gated
- Pure frontend; reuses the 6.1/6.2 harmony util; no new API routes
- UI lives in the Library panel (new tab or contextual sub-panel), consistent with the Epic 5 glass styling

---
## Epic 7: Usability & Clarity
Goal: Close the real-use gaps surfaced after Epic 6 — keep key context visible when chords are shown, explain the fretboard's colours, make sound strictly opt-in per action, make shared links lossless, and support left-handed players. Frontend-only; NO backend, NO new API routes. Source: sprint-change-proposal-2026-09-29.md.
Reqs: FR-1, FR-5b (URL precedence), FR-7, FR-12; NFR Accessibility (WCAG 2.1 AA); PRD §5 amendment (2026-09-29).
Out of scope: layout density / visual-style changes — pending the live UX session (retro 2026-09-28 item 6); its outcome will be added via a later correct-course.
Order: 7.1 → 7.2 → 7.3 → 7.4 (7.1 fixes the progression key-overwrite that 7.2's progression Play button builds on).

### Story 7.1: Key-Root Marker & Fretboard Colour Legend
As a guitarist viewing a chord inside a key, I want to still see where the key centre sits and know what every dot colour means, so I never lose harmonic context.

**Acceptance Criteria:**
- New DotState `key-root`, rendered only while a chord is displayed (chordName set) AND chordRoot ≠ key rootNote.
- key-root is a HOLLOW RING marker (stroke, no fill) at every key-root position within the visible frets — shape, not just colour, distinguishes it from chord tones.
  - If the key-root pitch is also a chord tone (e.g. C in Am), the chord-tone dot renders as normal PLUS the key-root ring around it.
  - If chordRoot === rootNote, no ring (root dot already marks it).
- Applies everywhere a chord can be shown: Chord Library, Diatonic (Chords in Key), Jazzify, Progression Builder stepping.
- **Progression stepping sets `chordRoot` (not `rootNote`) so the key stays fixed; call order `setChordName` → `setChordRoot` (setChordName resets chordRoot — 6.3 GOTCHA). Snapshot/restore logic in `useProgressionPlayback` updated accordingly.**
- Ring colour via new `--color-dot-key-root` token defined in ALL 6 theme blocks; WCAG 2.1 AA (≥3:1 non-text contrast) verified against the composited board background in every theme — computed, not eyeballed.
- Fretboard legend below the board lists ONLY the dot states present in the current render (swatch + label: Key root / Chord root / Chord tone / Scale / Mode / Mode root / Freeform mark); swatches read the same CSS tokens as FretDot. Hidden when the board has no dots.
- Legend is text-labelled (not colour-only), responsive at 375px, exposed as a list; FretboardCanvas aria-label mentions the key when a chord is shown ("…showing D minor chord in key of C").
- Scale-mode rendering (no chord) unchanged; <100ms re-render NFR holds.
- Frontend-only.

### Story 7.2: Explicit Play Controls (remove auto-play)
As a guitarist, I want sound only when I deliberately ask for it, so browsing chords is silent and never surprising.

**Acceptance Criteria:**
- Selecting/browsing a chord NEVER plays audio. Remove the playChord call on select in ChordLibrary, ChordsInKey, ChordRelationships, and on step in useProgressionPlayback (←/→ and Prev/Next stay silent).
- Each chord row in Chord Library / Diatonic / Jazzify gets a small Play IconButton (aria-label "Play <chord>"); clicking plays that chord WITHOUT changing selection (stopPropagation).
- Progression Builder gets a "Play current chord" button beside Prev/Next.
- Premium gate unchanged and enforced inside playChord; free users see Play buttons with a lock badge → click raises the shared PaywallCard.
- ControlBar "Sound" toggle REMOVED; `audioStore.enabled` retired (persisted state migrated safely — old key ignored). Volume stays at stored value.
- Play buttons Tab-reachable, Enter/Space activate, don't hijack ←/→ stepping.
- Tests: selection/stepping produce ZERO playChord calls; Play button exactly one; free-user click opens PaywallCard.
- Metronome and tuner unaffected.
- Real-browser audible check performed (closes the open backlog item).

### Story 7.3: URL-State Hardening
As a guitarist sharing a link, I want the recipient to see exactly what I see — and nothing they aren't entitled to.

**Acceptance Criteria:**
- `?mode=<index>` written when a mode is active, omitted otherwise; hydrated only if valid for the hydrated scale.
- `?chord=<type>&croot=<note>` written while a chord is shown; hydrated only if type ∈ CHORDS and croot matches ROOT_NOTE_RE; call order setChordName → setChordRoot.
- Entitlement guard: a premium-only tuning or locked chord (beyond FREE_TIER_CHORD_COUNT) in the URL is applied only once subscription status resolves as premium; otherwise falls back to Standard E / no chord. No premium flash; no discarding a valid link for a premium user on slow load (reuse useThemeGuard sequencing).
- Custom (user-saved) tuning names in `?tuning=` fall back to Standard E (private data).
- Strict numeric parsing: `capo=3abc` ignored; duplicate freeform marks de-duplicated.
- Precedence unchanged: URL beats saved session (FR-5b / 4.4).
- Tests: table-driven valid/invalid per param; free vs premium hydration; full round-trip for every param.
- useUrlState stays the single URL↔store boundary; no new routes.

### Story 7.4: Left-Handed Mode
As a left-handed guitarist, I want the fretboard mirrored so it matches how I hold my guitar.

**Acceptance Criteria:**
- "Left-handed" toggle (free) in the settings area alongside the theme control; persisted in localStorage (not a URL param).
- On: fretboard mirrors horizontally — nut on the RIGHT, frets ascend leftward; string order unchanged.
- Implemented as a coordinate mapping in FretboardCanvas (x → width − x), NOT a CSS/SVG scale(-1) — text, fret numbers, inlays, capo indicator, glow filters render upright and correct.
- Hit-targets mirror with the dots (click on fret N marks fret N — tested in both modes).
- Keyboard fret navigation follows VISUAL direction in both modes; Tab order logical.
- Mobile (<768px): initial scroll puts the nut in view.
- Proportional fret widths preserved.
- 7.1 rings/legend, chord highlights, capo dimming correct when mirrored; <100ms NFR holds.
- Toggle has aria-pressed.
- Live browser check at desktop + 375px in both modes.

---
## Epic 8: Obsidian Visual Refresh
Goal: Reskin app chrome and fretboard to "Obsidian Audio Lab" aesthetic — deeper dark palette, Plus Jakarta Sans headings, tighter radii, recessed fretboard with metallic frets, glow-based elevation. Visual-only; no new features, no backend. Obsidian becomes the new default dark theme. Dot colour semantics unchanged (owner decision). Source: stitch_fretwise_interactive_guitar_fretboard/ DESIGN.md + sprint-change-proposal-2026-11-18.md.
Reqs: UX-DR (visual refresh round 2). Applies to all 6 themes.

### Story 8.1: Obsidian Token Foundation & Typography
As a developer, I want the new surface palette, typography, radii, and glow tokens installed as one foundation.
**Acceptance Criteria:**
- 4-tier obsidian surface tokens (floor #0B0D13, surface-1 #12151F, surface-2 #181C2A, interactive overlay)
- Plus Jakarta Sans loaded via Google Fonts; applied to headings
- Corner radii tightened: 4px controls, 8px panels, full-round pills
- Updated glass tokens for deeper translucency; glow-first shadow tokens; gold root halo token
- All 6 themes updated; light theme gets white-tinted depth, not obsidian
- Existing tests pass; no visual regression

### Story 8.2: Chrome Reskin — ControlBar, Selectors & Mode Chips
As a user, I want controls that feel like precision studio equipment.
**Acceptance Criteria:**
- ControlBar uses new surface tokens, compact height (~48-52px)
- Selectors: recessed slot container, active segment with surface-2 fill + indigo underglow
- Segmented pill mode chips; hardware-inspired icon buttons
- Action buttons: subtle indigo gradient, frosted top highlight, 4px radius
- Mobile wraps cleanly; bottom-sheet pattern for tools
- All themes styled

### Story 8.3: Fretboard Visual Upgrade
As a guitarist, I want the fretboard to look like a real instrument.
**Acceptance Criteria:**
- Recessed ebony board (inner shadow, dark gradient); nickel-silver fret wire (specular+shadow)
- Wound bronze/steel string rendering refined; pearl iridescent inlays
- Root dots: gold phosphor halo (28px); scale/chord/mode dots updated with glow (24px)
- Dot colour semantics unchanged; rendering logic/states unchanged
- <100ms re-render NFR; WCAG AA contrast verified in dark theme

### Story 8.4: Library, Panels & Overlay Reskin
As a user, I want all panels/overlays to share the studio-grade glass language.
**Acceptance Criteria:**
- LibraryPanel: deeper glass, sliding tab indicator, hover-elevation with glow
- PaywallCard: obsidian glass, gold shimmer lock badges
- Auth/sheets/CustomTuningCreator: unified obsidian glass
- Directional border highlights; mobile bottom-sheet obsidian surface
- prefers-reduced-transparency fallback maintained

### Story 8.5: Contrast & Accessibility Audit + Theme Harmonization
As a user, I want every theme to remain accessible with the new aesthetic.
**Acceptance Criteria:**
- All 6 themes WCAG 2.1 AA verified (>=3:1 non-text, >=4.5:1 text) for every dot state — computed
- Deuteranopia + protanopia separation verified per theme
- Plus Jakarta Sans fallback chain verified
- prefers-reduced-motion gates all new transitions; prefers-reduced-transparency fallback
- Cross-browser backdrop-filter check
- Full regression: vitest + tsc + lint + build green; live browser check desktop + 375px all themes
