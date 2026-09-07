# Deferred Work

## Deferred from: code review of 4-2-custom-tuning-management (2026-09-07)

- No transaction rollback testing for TuningService — Methods marked `@Transactional` but tests don't cover failure modes (DB constraint violations, timeouts). Add in future test-hardening story.
- Tuning groups display logic scattered across components — ControlBar.tsx and ModeChipsRow.tsx both reference tuning state; tight coupling. Refactoring opportunity; defer to future architecture cleanup.
- No audit logging on PATCH/DELETE operations — No server-side record of who deleted what tuning and when. Compliance/audit gap; add in future logging story (not in 4.2 scope).
- TUNINGS data initialization edge cases — If TUNINGS object empty or Standard E missing, app breaks. Data validation issue; defer to data-integrity hardening story.

## Future feature ideas (not yet storied)

- **Audio playback of notes/chords with guitar samples (premium)** — requested 2026-09-01. Clicking a fret dot, a chord in the Chord Library, or stepping through a Progression should play the corresponding pitch(es) using guitar sounds. Premium-gated like other pro features (reuse `PaywallCard` / `useSubscriptionStore` `isPremium`). Implementation notes for when this is storied: use Web Audio API — either the Tone.js `Sampler` with a small set of guitar samples (map open-string pitch + fret → note name), or synthesized plucked-string (Karplus–Strong) to avoid bundling audio assets. Needs: pitch resolution from `(tuning, stringIdx, fret, capo)` (logic already exists in `fretboardUtils`/`musicTheory.js`), a mute/volume control, respect `prefers-reduced-motion`/user gesture requirement for AudioContext, and a per-chord/progression "play" affordance. The existing `useProgressionPlayback` hook is a natural integration point for the progression case.

## Deferred from: code review of 4-1-custom-tuning-creator (2026-09-04)

- Frontend & backend theme initialization defensibility: `frontend/index.html` and `frontend/src/stores/themeStore.ts` access `document.documentElement` without null checks; broad try/catch masks errors silently. Module-load call to `applyThemeToDom()` happens outside error boundary. Pre-existing infrastructure issue (Critical/High severity) affecting app boot reliability; outside story 4.1 scope but flagged for hardening pass.

## Future feature ideas (not yet storied) — continued

- Google email-link path (`AuthService.loginWithGoogle`, existing-email match) uses an unflushed `save()` with no violation handling, unlike the sibling new-account create path which uses `saveAndFlush` + `DataIntegrityViolationException` → 409. Verified low real risk (no `@Version` on `User`; the realistic concurrent-sign-in race writes an identical `google_id` value to the same row, so it doesn't actually collide) — but tighten for defense-in-depth consistency with the create path when Google OAuth is next touched
- Google-derived `email`/`name` claims aren't length-validated against the 255-char DB column before insert (unlike the email/password path, which has `@Size(max=255)` on its DTOs) — an oversized value would surface as a misleading `409 GOOGLE_ACCOUNT_CONFLICT` instead of a validation error. Requires a validly-signed Google token with an absurd claim value; not achievable with real Google accounts, low priority
- `Subscription.user`'s `LazyInitializationException` trap (see 3-1's 2026-06-15 entry below) is now structurally mitigated by this story's `SubscriptionResponseDto` DTO boundary, but only by omission — `SubscriptionResponseDto.from()` happens not to touch `getUser()`. No compile-time or runtime guard prevents a future field addition from reaching through the relation outside a transaction. Worth a structural guard (e.g. `@Transactional` boundary assertion or explicitly not exposing the entity's `user` accessor) when Story 3.5/3.6 next touches this DTO

## Deferred from: code review of 3-2-email-password-auth (2026-06-25, Pass 2)

- `JwtFilter.extractRole` returns null for tokens without a `role` claim; `SimpleGrantedAuthority(null)` throws `IllegalArgumentException` caught by the filter's broad catch block — correct 401 outcome but by coincidence; add an explicit null guard to `extractRole` (similar to `extractTokenVersion`) to make the intent unambiguous
- Bearer token scheme check is case-sensitive (`startsWith("Bearer ")`) — RFC 6750 §2.1 says the scheme name is case-insensitive; low real-world risk since all standard OAuth2 clients send `Bearer` exactly, but worth fixing if the codebase ever needs strict RFC compliance
- `AuthController.refresh()` does not set an expired `Set-Cookie` on failure (e.g., stale version, expired token) — the dead refresh cookie persists in the browser until natural expiry (7 days); align with `logout()`'s cookie-clearing pattern when SameSite is fixed in Story 3.4

## Deferred from: code review of 3-2-email-password-auth (2026-06-17)

- Refresh cookie uses `SameSite=Strict`, faithful to this story's cookie spec, but the frontend calls the API cross-origin (Vercel→Railway). A Strict cookie is not sent cross-site, so `POST /api/v1/auth/refresh` would arrive with no cookie. Change to `SameSite=None; Secure` — Story 3.4
- Concurrent `refresh()` calls with the same valid token both pass the `tokenVersion` check and rotate (last-writer-wins on save) — the just-used token is not reliably single-use under concurrency. Add `@Version` optimistic locking or an atomic conditional update. Acceptable for the v1 single-session model (Q1); revisit if multi-device sessions (a `refresh_tokens` table) are introduced
- `AuthService.login` skips bcrypt work for an unknown email (throws before `passwordEncoder.matches`), leaking user existence via response timing despite the no-enumeration intent. Add a dummy bcrypt comparison on the not-found path — security hardening, low priority
- CSRF is disabled while a cookie-based refresh endpoint exists; `SameSite=Strict` is currently the sole defense. Revisit when SameSite changes for cross-site support — Story 3.4
- Refresh cookie hard-codes `.secure(true)`, so the browser drops it over plain HTTP (local dev), silently breaking refresh/logout locally. Make the `secure` flag profile-aware — Story 3.4
- `V3__unique_subscription_user.sql` adds a UNIQUE constraint with no dedup step; fails if `subscriptions` already holds duplicate `user_id` rows (3.1-review carryover, not Story 3.2) — low value, revisit at a schema-cleanup pass

## Deferred from: code review of 3-1-backend-scaffold-and-database (2026-06-15)

- Security config returns bare 403 outside the mandated `error.code` JSON envelope; permit-list only allows `/api/v1/health`. Add a 401 entry point routing through `GlobalExceptionHandler` and exempt `POST /api/v1/webhooks/stripe` (Stripe-Signature verified, not JWT) — Story 3.2
- `open-in-view: false` (correct) sets a `LazyInitializationException` trap for `Subscription.user` if an entity is serialized outside a transaction; enforce a DTO boundary before returning subscriptions from controllers — Story 3.2
- Redundant `idx_users_email` and `idx_users_google_id` duplicate the indexes PostgreSQL auto-creates for the `UNIQUE` constraints on those columns; spec-prescribed, so dropping requires a new migration — low value, revisit at a schema-cleanup pass

## Deferred from: code review of 2-4-chord-library-and-shape-highlight (2026-06-01)

- Locked chord externally activated renders as `active` and can be deselected without triggering paywall — only reachable once subscription enforcement exists (Story 3.6); free-tier users have no code path to activate a locked chord via the current UI
- `capoPosition > 0` skips open strings (fret 0) in `calculateChordDots` — pre-existing behavior carried from `calculateFretboardDots`; open strings over capo are a musicological edge case; consistent design
- AC7 deselect path not tested for a formerly-locked chord that was externally set as `chordName` — currently unreachable in this story's UI; add a test in Story 3.6 alongside subscription state
- SVG `aria-label` not updated when `chordName` is active — `generateAriaLabel` always emits a scale-based label even when chord dots are showing; out of scope for this story; address in a dedicated a11y hardening story

## Deferred from: code review of 2-2-paywallcard-and-subscription-store-stub (2026-05-31)

- Desktop aside + mobile Sheet carry independent `paywallAnchor` state; viewport resize mid-session while paywall is open loses state silently — edge case out of scope; address if responsive breakpoint-crossing becomes a user complaint

## Deferred from: code review of 1-9-frontend-ci-cd-and-vercel-deploy (2026-05-28)

- Playwright `webServer` missing `timeout` — default 60 s timeout may not be enough on cold CI runners with oxide/lightningcss first-run compilation; add `timeout: 120_000` to `playwright.config.ts` `webServer` block when E2E tests are introduced
- `VITE_API_URL=` empty in `.env.example` — Vercel builds with no API URL configured will silently produce broken API calls; acceptable until Story 3.x deploys the backend and sets the env var in Vercel project settings
- `npm run type-check` only covers `src/` — `playwright.config.ts` and `vitest.config.ts` are governed by `tsconfig.node.json` and never type-checked in CI; extend the `type-check` script or add a second CI step when config type safety becomes important
- Node.js pinned to major `22` only — native binaries (rolldown, lightningcss, oxide) could be affected by minor version drift on ubuntu-latest; pin `node-version` to a specific LTS patch (e.g. `22.13.0`) for fully reproducible builds

## Deferred from: code review of 1-9-frontend-ci-cd-and-vercel-deploy (2026-05-27)

- `vercel.json` missing SPA catch-all rewrite (`"rewrites": [{"source":"/(.*)", "destination":"/index.html"}]`) — app currently uses only search-param routing at `/` so this is not a live bug, but must be added before Epic 2 introduces path-based routes (e.g. `/library`, `/auth`)

## Deferred from: code review of 1-8-freeform-marking-and-note-names (2026-05-27)

- `modeIndex` not round-tripped in URL — pre-existing gap; `useUrlState` serializes tuning/key/scale/capo/notes/marks but not modeIndex; user loses active mode chip on page reload; address in a future URL-state hardening story
- Hit-target fret 0 width (`NUT_X`) may overlap fret 1 — spec specifies `NUT_X` as the fret-0 hit-target width; `cx=getDotCx(0)=NUT_X` centered on a `NUT_X`-wide rect extends 20px past the nut line into fret 1's column; verify geometry and adjust if click-target misfire is observed in E2E tests (Story 1.9)

## Deferred from: code review of 1-7-capo-support (2026-05-26)

- URL hydration: `parseInt('12.5', 10)` = 12 — decimal capo params are silently accepted as integers; not harmful (12 is valid) but malformed input passes without rejection; use `Number.isInteger(Number(urlCapo))` if stricter validation is desired

## Deferred from: code review of 1-6-scale-and-mode-explorer (2026-05-26)

- Mode chips active on non-diatonic base scales (e.g. Pentatonic Minor + Dorian) produce musically ambiguous overlays — no validation in spec scope; define chip visibility rules or a guard when scale categories are introduced
- `getScaleNotes` returns empty `Set` for unknown/stale `scaleName` — all mode notes render as `mode` state with no scale context; add validation at URL hydration boundary when `useUrlState` is hardened

## Deferred from: code review of 1-5-controlbar-and-tuning-selection (2026-05-26)

- `useUrlState.ts` implementation unreviewed — story 1.4 deliverable; file exists (untracked) but was not in this diff; review when 1.4 is committed or in story 1.6 prep
- Library/Account stub buttons not `aria-disabled` — intentional scaffolding; stories 2.1 and 3.4 wire onClick; add `disabled` or `aria-disabled` at that point
- JS data file type casts suppress TypeScript safety — `SCALES as Record<string, { category: string }>` and `SCALE_NAMES as string[]` bypass TypeScript because data files are `.js`; address when data files are migrated to `.ts`
- AC4 responsive wrap at 768px not unit-tested — Tailwind `flex-wrap` is present; viewport resize testing requires Playwright (Story 1.9)
- AC5 tab order not tested — source order matches spec; keyboard nav testing requires E2E/a11y tooling (Story 1.9)

## Deferred from: code review of 1-4-core-state-and-url-sharing (2026-05-25)

- `DEFAULT_FRETBOARD_STATE` uses `as` type casts — minor type-safety gap; use `satisfies FretboardDataState` or typed picks if interface changes significantly
- `noteIndex` -1 for unrecognised notes in musicTheory.js — pre-existing (also tracked from Story 1.3); add validation fence in musicTheory.js
- `useLayoutStore` library panel state naming ambiguity — `sidePanel: boolean` in LayoutConfig may not map clearly to "panel open/closed"; clarify when LibraryPanel is implemented in Story 2.1

## Deferred from: code review of 1-3-interactive-svg-fretboard (2026-05-25)

- GLOW_FILTER_ID duplicate across FretboardCanvas instances — `url(#fret-dot-mode-glow)` resolves first DOM match; breaks if multiple fretboards on one page; single fretboard per page in v1, revisit if comparison view added
- Duplicate TUNINGS['Standard E'] fallback — applied independently in `calculateFretboardDots` and `FretboardCanvas`; can diverge if tunings data is renamed; consolidate into one lookup point
- getDotCy no bounds check — exported function returns undefined for out-of-range stringIdx; add guard when function surface area grows (Story 1.8 mitigated for freeform marks via bounds filter in calculateFreeformDots; raw getDotCy still unguarded for callers outside that path)
- noteIndex -1 for unrecognized notes — pre-existing musicTheory.js gap; corrupts note lookups silently; add validation in musicTheory.js or at API boundary
- Flat root notes not in ENHARMONIC_MAP — double-flats and non-standard enharmonics not normalised; Story 1.4 rootNote selector should restrict to normalised note names
- Tuning arrays with wrong string count — `STRING_COUNT` loop assumes 6 strings; Story 4.1 (custom tuning creator) must validate string count on save
- capoPosition >= 25 and negative capoPosition — no clamping; Story 1.7 capo slider should clamp input to [0, FRET_COUNT]
- scaleNotes sharp-only invariant — `scaleNotes.has(note)` breaks if musicTheory.js ever returns flat spellings; add comment to musicTheory.js marking this contract
- FRET_MARKERS dual import path — FretboardCanvas imports directly from musicTheory.js despite fretboardUtils re-exporting; consolidate to fretboardUtils import
- midY hardcoded to 6-string middle pair — `(STRING_Y[2] + STRING_Y[3]) / 2`; compute from STRING_Y.length when 7-string support is added
- Celtic and DADGAD tunings identical in tunings.js — both `['D','A','D','G','A','D']`; audit and deduplicate tunings data in a future data-cleanup story

## Deferred from: code review of 1-2-appshell-and-design-token-system (2026-05-25)

- `layoutStore` lacks reset mechanism — store accumulates state mutations but has no reset() method to return to DEFAULT_LAYOUT; consider adding for testing/lifecycle use cases in future layout enhancement story

## Deferred from: code review of 1-1-monorepo-setup-and-dev-environment (2026-05-24)

- `main.jsx` imports `App.css` alongside `index.css` — hardcoded body styles bypass shadcn CSS variable system; Story 1.2 owns CSS architecture overhaul
- ESLint only lints `.ts/.tsx`, all `.jsx`/`.js` source files skipped — by design for Story 1.1; Story 1.2 migrates components to `.tsx`
- Playwright config has no `webServer` block; CI tests will hang — stub only; add when real E2E tests are written (Story 1.9)
- `createRoot(document.getElementById('root'))` has no null guard — pre-existing `.jsx` code; address when `main.jsx` is migrated to `.tsx`
- Vite v8.0.14 installed vs architecture spec v6 — v8 is functional; update architecture spec in Story 1.9
- Geist Variable set as `--font-sans` in `@theme` block — conflicts with Story 1.2 font plan (Inter + JetBrains Mono); Story 1.2 replaces all design tokens
- shadcn generated light-mode as `:root` default — project is dark-by-default; Story 1.2 implements dark mode system
- `noUnusedLocals: false` and `noUnusedParameters: false` in tsconfig — deliberate for JS/TS mixed transition period; revisit after Story 1.2 migrates components
- `.gitignore` excludes `.vscode/` entirely — shared editor config cannot be committed; refine when team grows
