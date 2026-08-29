# Story 3.6: Subscription Enforcement

Status: in-progress (Tasks 1–9 done + green; Task 10 manual Stripe gate pending — see Dev Agent Record)

## Dev Context

- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`
- Previous story: `_bmad-output/implementation-artifacts/3-5-stripe-checkout-and-webhook.md` (writes the `subscriptions` row this story reads for the tier; `?checkout=success` refetch of `/subscriptions/me` is the "immediate unlock" path)
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md`

**Uncommitted working-tree state (read before you start):** the working tree currently carries **two prior stories' worth of uncommitted changes** — the 3.4 code-review patches *and* the entire 3.5 implementation (Stripe checkout/webhook, still `in-progress` pending its manual Task 13 gate). None of it is committed; `git log`'s HEAD (`be1c2d9`) predates all of it. This story builds directly on 3.5's code (the `subscriptions` row writers, `SubscriptionService`, `SubscriptionResponseDto`). Do not revert or "clean up" those changes — they are the substrate this story enforces on.

## Story

As a **premium user**,
I want **my active subscription to unlock premium content (and a lapsed one to lock it back)**,
so that **paying gets me the premium tier immediately in the UI and the server actually enforces the gate rather than trusting the client**.

## Acceptance Criteria

**AC1 — Server-authoritative ACTIVE status.** `GET /api/v1/subscriptions/me` returns `{"status":"ACTIVE","currentPeriodEnd":"<ISO-8601>"}` for a user whose `subscriptions` row is `ACTIVE` **and** whose `current_period_end` is in the future. This is the single source of truth the frontend maps to `isPremium`.

**AC2 — Frontend unlock on premium.** When `useSubscriptionStore.isPremium` is `true`, **every** `LibraryItem` in both the Scale and Chord libraries renders selectable (no `locked`, no `preview` variant, no lock badge) — the free-tier `slice(0,5)` split is bypassed. When `isPremium` is `false`, the existing free/preview/locked split is unchanged.

**AC3 — Server-side premium gate.** A premium-gated endpoint annotated `@PreAuthorize("hasRole('PREMIUM')")` returns **403 with the standard error envelope** (`{"error":{"code":"FORBIDDEN","status":403}}`) for an authenticated non-premium user, and proceeds normally for a premium user. Method security must be enabled and a JSON `AccessDeniedHandler` wired (today there is none → a 403 would render Spring's default HTML page). The user's tier is carried in the JWT `role` claim (`ROLE_PREMIUM` / `ROLE_FREE`), derived from their real subscription status at token-issue time — **not** hardcoded as it is today.

**AC4 — Lapse reverts to free.** A user whose subscription is `EXPIRED` (Stripe-cancelled per 3.5) **or** whose `current_period_end` has passed → `GET /api/v1/subscriptions/me` returns `{"status":"EXPIRED",...}`; the frontend sets `isPremium:false`; locked/preview LibraryItems reappear. The same expiry evaluation drives the JWT tier on the next token refresh.

**AC5 — Upgrade CTA initiates checkout (verification).** The `PaywallCard` "Upgrade" CTA correctly initiates Stripe Checkout — this was implemented in Story 3.5; here it is only re-verified end-to-end (no new wiring), confirming the paywall→checkout→webhook→unlock loop closes.

## Tasks / Subtasks

- [x] **Task 1: Effective subscription status — single source of truth (AC: 1, 3, 4)**
  - [x] In `service/SubscriptionService.java` add `String resolveEffectiveStatus(Long userId)` returning `"ACTIVE"` / `"EXPIRED"` / `"NONE"`. Rules: no row → `"NONE"`; row with `status == "ACTIVE"` **and** (`currentPeriodEnd == null` **or** `currentPeriodEnd` is after `OffsetDateTime.now()`) → `"ACTIVE"`; row with `status == "ACTIVE"` but `currentPeriodEnd` in the past → `"EXPIRED"` (time-based lapse — defends against a missed Stripe webhook); any other stored status (`"EXPIRED"`, the V2 default `"FREE"`, etc.) → `"EXPIRED"`. Keep the `@Transactional(readOnly = true)` boundary.
  - [x] Refactor the existing `getForUser(Long userId)` to build its `SubscriptionResponseDto` from `resolveEffectiveStatus(...)` (status) plus the row's `currentPeriodEnd` when a row exists — so `/subscriptions/me` and the JWT tier can never disagree. Preserve the existing `SubscriptionResponseDto` shape/factories; `currentPeriodEnd` stays populated even when status is `EXPIRED` (it's informative). The 3.5 tests assert `status:"ACTIVE"` (active row) and `status:"NONE"` (no row) — those must still pass; add the new `EXPIRED` behavior without breaking them.
  - [x] Add a convenience `boolean isPremiumActive(Long userId)` (= `resolveEffectiveStatus(userId).equals("ACTIVE")`) for `AuthService` to consume in Task 2.

- [x] **Task 2: Real JWT tier claim (AC: 3, 4)**
  - [x] `security/JwtService.java` currently **hardcodes** `.claim(CLAIM_ROLE, "ROLE_FREE")` in `generateAccessToken(User)`. Change the signature to `generateAccessToken(User user, String role)` and set the claim from the parameter. Add role constants: `public static final String ROLE_PREMIUM = "ROLE_PREMIUM"; public static final String ROLE_FREE = "ROLE_FREE";`. **Do not** add a `ROLE_` prefix anywhere else — the claim value already includes it, and `JwtFilter` wraps it directly in a `SimpleGrantedAuthority`, so `hasRole('PREMIUM')` (which Spring expands to authority `ROLE_PREMIUM`) matches correctly.
  - [x] `service/AuthService.java` — inject `SubscriptionService` (new constructor dependency; no cycle: `SubscriptionService` depends only on `SubscriptionRepository`). In `issueTokens(User user)`, compute `String role = subscriptionService.isPremiumActive(user.getId()) ? JwtService.ROLE_PREMIUM : JwtService.ROLE_FREE;` and pass it to `generateAccessToken`. This is the one chokepoint all four flows (register/login/google/refresh) route through, so every issued access token gets the correct tier.
  - [x] **Update every `generateAccessToken` call site** — the signature change is a compile break across tests: `SubscriptionControllerTest`, `CheckoutControllerTest`, `RateLimitFilterTest`, `JwtServiceTest`, `JwtFilterTest`, and any other `tokenForUser`/token-minting helper. Where tier is irrelevant to the test, pass `JwtService.ROLE_FREE`; where the test needs a premium token (Task 7), pass `JwtService.ROLE_PREMIUM`.
  - [x] Staleness note (by design, document in Completion Notes, do not "fix"): a user who pays mid-session keeps their `ROLE_FREE` access token until the next `/auth/refresh` (≤15 min TTL — the architecture explicitly accepts this window; see "JWT claim on refresh"). The **frontend** unlocks immediately via the `/subscriptions/me` refetch (3.5's `?checkout=success` handler), so the UX AC ("immediately") is met on the client; backend hard-enforcement catches up within one refresh cycle. See Open Question Q2 for the optional immediate-refresh enhancement.

- [x] **Task 3: Enable method security + JSON 403 handler (AC: 3)**
  - [x] Add `@EnableMethodSecurity` to `security/SecurityConfig.java` (class-level, alongside `@EnableWebSecurity`). Without it `@PreAuthorize` is silently ignored — endpoints would be reachable by anyone authenticated.
  - [x] Create `security/RestAccessDeniedHandler.java` implementing `org.springframework.security.web.access.AccessDeniedHandler`, mirroring `RestAuthenticationEntryPoint` exactly: `@Component`, constructor-inject `ErrorResponseWriter`, and in `handle(...)` write `errorResponseWriter.write(response, "FORBIDDEN", "You do not have access to this resource.", HttpStatus.FORBIDDEN)`. This resolves the deferred item ("No `AccessDeniedHandler` registered … authenticated-but-unauthorized requests receive Spring's default HTML 403 instead of the JSON envelope — wire alongside the premium gating work").
  - [x] Wire it in `SecurityConfig.filterChain`: extend the existing `.exceptionHandling(e -> e.authenticationEntryPoint(authenticationEntryPoint))` to also `.accessDeniedHandler(restAccessDeniedHandler)`. Inject the new handler via the constructor (same pattern as `authenticationEntryPoint`). Do not otherwise rewrite `SecurityConfig` — extend it.

- [x] **Task 4: Prove the gate with a test-only premium endpoint (AC: 3)**
  - [x] No **production** premium endpoint exists yet — the gated routes (`POST /tunings`, `/sessions`, …) are Epic 4. So the enforcement *mechanism* is proven here with a test fixture, and real `@PreAuthorize` annotations land on real endpoints in Epic 4. Do **not** add a fake premium endpoint to `src/main`.
  - [x] In the backend test sources, define a tiny `@RestController` fixture (e.g. a nested `@TestConfiguration` class or a dedicated test controller) exposing `GET /api/v1/test-only/premium` annotated `@PreAuthorize("hasRole('PREMIUM')")` returning 200/any body. `@Import` it into the enforcement test (a `@SpringBootTest`/`WebMockTestBase` subclass won't component-scan `src/test` controllers unless imported). Use this to assert the three outcomes in Task 7.
  - [x] Document in Dev Notes → "Enforcement scope" that Epic 4 stories (4.1 `POST /tunings`, 4.4 `/sessions`) annotate their real endpoints with `@PreAuthorize("hasRole('PREMIUM')")`; 3.6 delivers the enabling infrastructure + proof, not production gated routes.

- [x] **Task 5: Frontend — `isPremium` unlocks all library items (AC: 2, 4)**
  - [x] `features/library/ScaleLibrary.tsx` and `features/library/ChordLibrary.tsx`: read `const isPremium = useSubscriptionStore((s) => s.isPremium)`. In the variant computation, when `isPremium` is `true`, an item is `'active'` if it's the selected one, else `'default'` — **never** `'preview'` or `'locked'`. When `isPremium` is `false`, keep the exact current logic (`FREE_*_NAMES` slice(0,5) → `preview`, rest → `locked`). This resolves the deferred 2-2 item ("`useSubscriptionStore.isPremium` never consulted in ScaleLibrary or LibraryItem — real enforcement in Story 3.6").
  - [x] `LibraryItem.tsx` needs **no change** — variant is computed by the parent; a `'default'`/`'active'` item is already selectable with no lock/preview badge. Confirm the `'default'` variant renders cleanly (it's in the `LibraryItemVariant` union and the className ternary falls through to the hover style).
  - [x] Do not touch `subscriptionStore.ts` or `useSubscription.ts` — `isPremium` is already driven correctly (3.4/3.5): `isPremium = status === 'ACTIVE'`, refetched after checkout, reset on logout. This story only makes the library *consume* it.

- [x] **Task 6: Verify AC5 (PaywallCard → checkout, no new code)**
  - [x] Confirm 3.5's `PaywallCard` Upgrade CTA still initiates checkout for an authenticated user (mutation → `POST /checkout/session` → redirect) and opens the login modal for an unauthenticated user. This is covered by 3.5's `PaywallCard.test.tsx`; ensure those tests remain green after this story's changes (the library now renders unlocked items when premium, but the paywall path is only reached for locked items when free — unchanged). No new implementation.

- [x] **Task 7: Backend tests (AC: 1, 3, 4)**
  - [x] `SubscriptionServiceTest` (new, or extend if present) — pure unit test, mock `SubscriptionRepository`: `resolveEffectiveStatus` → `NONE` (no row), `ACTIVE` (ACTIVE + future period-end), `EXPIRED` (ACTIVE + past period-end), `EXPIRED` (stored EXPIRED). `isPremiumActive` true only for the effective-ACTIVE case.
  - [x] `SubscriptionControllerTest` (extend) — add an expired case: ACTIVE row with a past `currentPeriodEnd` → response `status:"EXPIRED"`. Keep the existing ACTIVE (future period-end) and NONE cases green (they may need a `currentPeriodEnd` set now that expiry is evaluated — an ACTIVE row with no/`future` period-end stays ACTIVE).
  - [x] `JwtServiceTest` (extend) — `generateAccessToken(user, ROLE_PREMIUM)` produces a token whose parsed `role` claim is `ROLE_PREMIUM`; same for `ROLE_FREE`.
  - [x] `AuthServiceTest` (extend if present, else cover via an auth controller test) — a login/refresh for a user with an effective-ACTIVE subscription mints an access token carrying `ROLE_PREMIUM`; a free/no-subscription user gets `ROLE_FREE`. Mock `SubscriptionService`/`SubscriptionRepository` accordingly (interfaces — Java 25 mock-safe).
  - [x] Enforcement test (new, extends `WebMockTestBase`, imports the Task 4 fixture controller): premium token → `GET /api/v1/test-only/premium` 200; free token → **403** with `$.error.code == "FORBIDDEN"`; no token → **401** with `$.error.code == "UNAUTHORIZED"` (entry point, unchanged).
  - [x] Update the broken `generateAccessToken` call sites (Task 2) so the **whole** suite compiles and the existing 68 backend tests stay green. `./mvnw test` all green.

- [x] **Task 8: Frontend tests (AC: 2, 4)**
  - [x] `ScaleLibrary.test.tsx` / `ChordLibrary.test.tsx` (extend): set `useSubscriptionStore.setState({ isPremium: true })` in a `beforeEach`/per-test and assert **no** element has `aria-disabled="true"` and **no** "Preview" badge renders (all items selectable); with `isPremium:false` the existing assertions (5 previews, 6th locked) still hold. Reset the store in `beforeEach` (mirror the existing `useFretboardStore` reset pattern in those files).
  - [x] Confirm clicking a formerly-locked item when premium selects it (updates `fretboardStore`) rather than firing `onPaywallTrigger`.
  - [x] Keep the full frontend suite green (202 tests baseline); `tsc --noEmit` + `eslint .` clean.

- [x] **Task 9 (optional cleanup — do only if low-risk): consolidate the principal cast**
  - [x] `UserController.me`, `SubscriptionController.me`, and `CheckoutController.session` now all repeat `Long userId = (Long) authentication.getPrincipal();` (the deferred item flagged this becomes worth extracting "once a third authenticated controller needs the same pattern" — 3.5's `CheckoutController` was the third). Optionally extract a tiny static helper (e.g. `AuthenticatedUser.id(Authentication)`) or a `@AuthenticationPrincipal` argument resolver and use it in all three. Skip if it adds meaningful regression risk to this enforcement-critical story — it is not required by any AC. If skipped, leave the deferred entry in place.

- [ ] **Task 10: Runtime validation (manual gate — AC: 1–5)**
  - [ ] Depends on 3.5's Task 13 being runnable (real Stripe test-mode keys + Stripe CLI). With the local stack up: (a) log in as a free user → library shows the 5-preview / rest-locked split, a `@PreAuthorize` probe (or the Epic-4 endpoint once it exists) returns the 403 JSON envelope; (b) complete a test-mode checkout → webhook sets the row ACTIVE → `/subscriptions/me` returns `ACTIVE` → library unlocks with no reload (frontend), and after a `/auth/refresh` the new access token carries `ROLE_PREMIUM` (backend); (c) `stripe trigger customer.subscription.deleted` (or cancel in dashboard) → `/subscriptions/me` returns `EXPIRED` → library re-locks. User-run gate — same pattern as 3.4/3.5; PENDING until Voice runs it. If 3.5's Stripe credentials still aren't available, this stays pending alongside 3.5 Task 13.

## Dev Notes

### The core problem this story solves (read first)

Everything for tier is already *plumbed* but not *connected*:
- `JwtService.generateAccessToken` **hardcodes** `"ROLE_FREE"` — no user can ever be premium server-side today.
- `@PreAuthorize` is **not enabled** (`@EnableMethodSecurity` absent) — annotations would be silently ignored.
- There is **no `AccessDeniedHandler`** — a 403 would break the `error.code` contract by returning Spring's HTML page.
- `ScaleLibrary`/`ChordLibrary` gate **statically** on `slice(0,5)` and never read `isPremium` — a premium user still sees locked items.
- `/subscriptions/me` returns the **raw** stored status with **no expiry evaluation** — a lapsed-but-not-yet-webhooked row would still read ACTIVE.

This story connects all five to the real subscription state that Story 3.5's webhook now writes.

### Effective status is the single source of truth

`SubscriptionService.resolveEffectiveStatus(userId)` is consumed by **both** `/subscriptions/me` (→ frontend `isPremium`) **and** `AuthService` (→ JWT `role` claim). Never compute tier in two places — they must agree. Time-based expiry (`currentPeriodEnd` in the past ⇒ EXPIRED even if the row says ACTIVE) is the defense-in-depth layer for a missed/late Stripe webhook.

### Two clocks: immediate UX vs. ≤15-min backend enforcement (do not "fix" this)

- **Frontend `isPremium`** flips the instant `/subscriptions/me` is refetched — which 3.5 already triggers on `?checkout=success`. So the library unlocks with no reload. This satisfies the epic's "immediately".
- **Backend JWT `role`** only flips when a *new* access token is minted (next `/auth/refresh`, ≤15 min). The architecture explicitly accepts this stale window ("subscription status in JWT claims; 15-min access token expiry makes the stale-tier window acceptable" / "JWT claim on refresh"). Do not add per-request DB tier lookups — that defeats the stateless-JWT design. See Q2 for the optional immediate-refresh nicety.

### `hasRole` vs. the role claim (avoid the double-prefix trap)

The JWT `role` claim already carries the full authority string `ROLE_PREMIUM` (JwtFilter: `new SimpleGrantedAuthority(extractRole(claims))`). Spring's `hasRole('PREMIUM')` expands to require authority `ROLE_PREMIUM`. These line up — write `@PreAuthorize("hasRole('PREMIUM')")` (no `ROLE_` in the annotation) and keep the claim value as `ROLE_PREMIUM`. Using `hasAuthority('ROLE_PREMIUM')` would also work but stay consistent with the epic's wording.

### What already exists — extend, do not recreate

- `RestAuthenticationEntryPoint` (401 envelope) — the exact pattern `RestAccessDeniedHandler` (403) mirrors; both delegate to `ErrorResponseWriter`.
- `ErrorResponseWriter.write(response, code, message, status)` — reuse verbatim for the 403.
- `SubscriptionService` / `SubscriptionResponseDto` (3.4/3.5) — extend the service with effective-status logic; keep the DTO shape (3.5's `from`/`none` factories) so no caller breaks.
- `subscriptionStore` (`isPremium`, `setIsPremium`) + `useSubscription` (`isPremium = status === 'ACTIVE'`, refetch on login/checkout, reset on logout) — already correct; the library just needs to *consume* `isPremium`.
- `LibraryItem` — already supports a `'default'` (plain selectable) variant; no change needed.
- `AuthService.issueTokens` — the single token-issuance chokepoint; the only place that needs to learn the tier.

### Enforcement scope (why no production gated endpoint here)

The API surface's premium routes (`POST /tunings`, `DELETE /tunings/{id}`, `GET/POST/DELETE /sessions`) are Epic 4 features that don't exist yet. 3.6 builds and proves the enforcement *mechanism* (method security + role claim + 403 handler) with a test-only fixture endpoint; Epic 4 stories annotate their real endpoints with `@PreAuthorize("hasRole('PREMIUM')")`. `POST /checkout/session` stays authenticated-but-not-premium (a free user must reach checkout to upgrade). Do not gate checkout.

### Testing standards

- Backend: extend `WebMockTestBase` for web-layer tests; **Java 25 test JVM — mock interfaces only** (`SubscriptionRepository`, `SubscriptionService` is a concrete class → do **not** `@MockitoBean` it; where a test needs the real service, let the context wire it against the mocked repo, mirroring how 3.5's `StripeWebhookHandlerTest` used the real `StripeWebhookService`). The Task 4 fixture controller must be `@Import`ed, not relied upon via component scan.
- Frontend: Vitest + Testing Library, colocated `*.test.tsx`, 202-test baseline. Reset `useSubscriptionStore` in `beforeEach` (it persists across tests otherwise).

### Project Structure Notes

- No changes to `frontend/src/data/*.js`, `components/ui/`, or any Hard Constraint path.
- No new API routes — this story enforces on existing/Epic-4 routes; `/subscriptions/me` is extended in behavior only (same shape).
- New backend file: `security/RestAccessDeniedHandler.java` (matches the `security/` package holding `RestAuthenticationEntryPoint`).

### References

- [Source: epics.distillate.md#Story 3.6: Subscription Enforcement] — AC source
- [Source: architecture.distillate.md#Auth & Security Architecture] — `ROLE_FREE`/`ROLE_PREMIUM` in claims; `@PreAuthorize("hasRole('PREMIUM')")`; 15-min stale-tier window accepted
- [Source: architecture.distillate.md#Component Boundaries] — "Subscription state flow: Stripe → webhook → subscriptions table → JWT claim on refresh → useSubscriptionStore"
- [Source: architecture.distillate.md#Error Handling] — all errors via the `error.code` envelope; the 403 must not be an exception
- [Source: 3-5-stripe-checkout-and-webhook.md] — writes the row this story reads; `?checkout=success` refetch = immediate frontend unlock; effective-status/expiry deferred from 3.5 to here
- [Source: deferred-work.md] — "No `AccessDeniedHandler` … wire alongside premium gating (3.5/3.6)"; "`useSubscriptionStore.isPremium` never consulted in ScaleLibrary/LibraryItem … Story 3.6"; principal-cast duplication (now 3 controllers)

## Open Questions (resolve at dev kickoff)

- **Q1 (expired-status vocabulary):** `resolveEffectiveStatus` maps any non-effective-ACTIVE state (stored `EXPIRED`, the V2 default `FREE`, or a lapsed period-end) to `"EXPIRED"`, reserving `"NONE"` for a genuinely absent row. The frontend only distinguishes `ACTIVE` vs. not, so this is behaviourally safe — but confirm you're happy collapsing `FREE`/`EXPIRED`/lapsed into one `"EXPIRED"` bucket rather than surfacing them distinctly (no current consumer needs the distinction).
- **Q2 (immediate backend enforcement):** Default is the architecture-sanctioned ≤15-min stale window — backend `role` catches up on the next `/auth/refresh`. Optionally, the frontend could fire a `POST /auth/refresh` right after a successful `?checkout=success` to mint a `ROLE_PREMIUM` token immediately (closing the backend window too). Small add; **not** included by default. Want it?
- **Q3 (Task 9 principal-cast cleanup):** Include the shared-helper refactor now (3 duplicated casts, security-sensitive), or leave it deferred to avoid any regression risk in an enforcement story? Default: include only if trivially low-risk, else skip and keep the deferred entry.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story)

### Debug Log References

- **`@PreAuthorize` denials return 500, not 403, via the filter-chain `AccessDeniedHandler`.** Wiring `RestAccessDeniedHandler` into `SecurityConfig.exceptionHandling()` was not enough — `PremiumGateEnforcementTest#freeUser_gets403Envelope` got 500. Method-security (`@PreAuthorize`) denials are thrown at the *method* interceptor level **inside** the DispatcherServlet, so they never reach the security filter chain's `ExceptionTranslationFilter`/`accessDeniedHandler` (that only catches request-level `.requestMatchers(...).hasRole(...)` denials). Fix: added an `@ExceptionHandler(AccessDeniedException.class)` to `GlobalExceptionHandler` rendering the `FORBIDDEN`/403 envelope. Kept the filter-chain `RestAccessDeniedHandler` too — it covers the request-level path (none today, future-proof) and literally satisfies the deferred "register an AccessDeniedHandler in filterChain" item; both paths now emit the identical envelope.
- **`generateAccessToken` signature change is a compile break across 6 test files** (10 call sites). All are token-minting helpers where tier is irrelevant → updated to pass `JwtService.ROLE_FREE`. The enforcement test mints `ROLE_PREMIUM`/`ROLE_FREE` explicitly.
- **Pre-existing test fragility surfaced by expiry evaluation:** `SubscriptionControllerTest#me_activeSubscription` hardcoded `current_period_end = 2026-09-01`, only ~3 days ahead of the system date — now that expiry is evaluated it would flip to EXPIRED after that date and fail. Re-dated to `2030-09-01` (clearly future) and added the lapsed-ACTIVE→EXPIRED case.
- Local Maven's corporate Nexus mirror 401s on uncached artifacts (unrelated to this repo); ran the backend suite with a scratch `-s` settings file pointing at Maven Central, same as 3.5. (`com.stripe:stripe-java:33.4.0` from 3.5 still needs caching in the corporate Nexus before plain `./mvnw` works on this machine.)

### Completion Notes List

Kickoff decisions (Open Questions): **Q1 → confirmed** (collapse `FREE`/`EXPIRED`/lapsed into `"EXPIRED"`, reserve `"NONE"` for an absent row — no consumer needs finer distinction). **Q2 → default taken** (architecture-sanctioned ≤15-min stale window; no immediate post-checkout `/auth/refresh` added — frontend unlocks immediately regardless). **Q3 → included** (the principal-cast shared helper — trivially low-risk, fully covered by existing controller tests, and it resolves a tracked deferred item that this story's Dev Notes flagged).

Delivered (Tasks 1–9, all automatable work):
- **Effective status (single source of truth):** `SubscriptionService.resolveEffectiveStatus`/`isPremiumActive` with time-based expiry (`ACTIVE` requires stored ACTIVE **and** a non-past `current_period_end`); `getForUser` + `SubscriptionResponseDto.of` now surface the effective status. Consumed by **both** `/subscriptions/me` and the JWT role claim so they can never disagree.
- **Real JWT tier:** `JwtService.generateAccessToken(user, role)` (+ `ROLE_PREMIUM`/`ROLE_FREE` constants); `AuthService.issueTokens` derives the role from `SubscriptionService.isPremiumActive` at the single token-issuance chokepoint (register/login/google/refresh all inherit it). The old hardcoded `ROLE_FREE` is gone.
- **Server-side gate:** `@EnableMethodSecurity`; `RestAccessDeniedHandler` (filter-chain 403 envelope) **and** `GlobalExceptionHandler`'s `AccessDeniedException` handler (method-security 403 envelope — the path `@PreAuthorize` actually uses); proven by a test-only `@PreAuthorize("hasRole('PREMIUM')")` fixture (premium 200 / free 403 / anon 401). No production premium endpoint added — those are Epic 4.
- **Frontend unlock:** `ScaleLibrary`/`ChordLibrary` consult `useSubscriptionStore.isPremium` — premium renders every item selectable (no locked/preview), free keeps the `slice(0,5)` split. `LibraryItem` unchanged.
- **AC5:** verified — 3.5's `PaywallCard` Upgrade CTA path is unchanged and its tests stay green.
- **Cleanup (Q3):** extracted `AuthenticatedUser.id(Authentication)`, applied in `UserController`/`SubscriptionController`/`CheckoutController`; removed the now-resolved deferred entries (principal-cast duplication, `AccessDeniedHandler`, `isPremium`-not-consulted) from `deferred-work.md`.

The two-clocks behaviour (immediate frontend unlock via `/subscriptions/me` refetch; backend `role` catches up on the next refresh, ≤ access-token TTL) is by design per the architecture — **not** a bug; documented rather than "fixed".

Validation (automated): backend `./mvnw test` → **83 tests green** (68 prior + 15 new: `SubscriptionServiceTest` ×8, `PremiumGateEnforcementTest` ×3, plus JWT-role/tier + lapsed-subscription cases); frontend `pnpm vitest run` → **206 tests green** (202 prior + 4 new); `tsc --noEmit` clean; `eslint .` clean; `pnpm run build` clean. No new Flyway migration (schema unchanged).

**Task 10 (manual runtime gate) is PENDING** — it exercises the full paywall→checkout→webhook→unlock→cancel loop and so depends on 3.5's Task 13 (real Stripe test-mode keys + Stripe CLI), which are not available in this environment. Per the dev-story Step 9 gate ("if any task is incomplete → HALT"), story Status is left **in-progress** (not review), consistent with 3.5. Everything programmatically verifiable is green.

### File List

**Backend — new**
- `backend/src/main/java/com/guitarapp/security/RestAccessDeniedHandler.java`
- `backend/src/main/java/com/guitarapp/security/AuthenticatedUser.java`
- `backend/src/test/java/com/guitarapp/service/SubscriptionServiceTest.java`
- `backend/src/test/java/com/guitarapp/security/PremiumGateEnforcementTest.java`

**Backend — modified**
- `backend/src/main/java/com/guitarapp/service/SubscriptionService.java` (effective-status/expiry logic + `resolveEffectiveStatus`/`isPremiumActive`)
- `backend/src/main/java/com/guitarapp/dto/SubscriptionResponseDto.java` (added `of(status, periodEnd)`; `from` delegates)
- `backend/src/main/java/com/guitarapp/security/JwtService.java` (`generateAccessToken(user, role)` + `ROLE_PREMIUM`/`ROLE_FREE`)
- `backend/src/main/java/com/guitarapp/service/AuthService.java` (inject `SubscriptionService`; derive tier in `issueTokens`)
- `backend/src/main/java/com/guitarapp/security/SecurityConfig.java` (`@EnableMethodSecurity`; wire `accessDeniedHandler`)
- `backend/src/main/java/com/guitarapp/exception/GlobalExceptionHandler.java` (`AccessDeniedException` → 403 envelope)
- `backend/src/main/java/com/guitarapp/controller/UserController.java` (`AuthenticatedUser.id`)
- `backend/src/main/java/com/guitarapp/controller/SubscriptionController.java` (`AuthenticatedUser.id`)
- `backend/src/main/java/com/guitarapp/controller/CheckoutController.java` (`AuthenticatedUser.id`)
- `backend/src/test/java/com/guitarapp/controller/AuthControllerTest.java` (premium/free role-claim tests; call-site fix)
- `backend/src/test/java/com/guitarapp/controller/SubscriptionControllerTest.java` (lapsed→EXPIRED case; future-dated active case; call-site fix)
- `backend/src/test/java/com/guitarapp/security/JwtServiceTest.java` (premium role round-trip; call-site fixes)
- `backend/src/test/java/com/guitarapp/security/JwtFilterTest.java` (call-site fix)
- `backend/src/test/java/com/guitarapp/controller/CheckoutControllerTest.java` (call-site fix)

**Frontend — modified**
- `frontend/src/features/library/ScaleLibrary.tsx` (consume `isPremium`)
- `frontend/src/features/library/ChordLibrary.tsx` (consume `isPremium`)
- `frontend/src/features/library/ScaleLibrary.test.tsx` (premium-unlock tests + store reset)
- `frontend/src/features/library/ChordLibrary.test.tsx` (premium-unlock tests + store reset)

**Other**
- `_bmad-output/implementation-artifacts/deferred-work.md` (removed 3 resolved entries)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (3-6 → in-progress)

### Change Log

- 2026-08-29 — Story 3.6 implemented (Tasks 1–9): effective subscription status with expiry evaluation as the single source of truth for both `/subscriptions/me` and the JWT `role` claim; real `ROLE_PREMIUM`/`ROLE_FREE` tier (was hardcoded `ROLE_FREE`); `@EnableMethodSecurity` + dual-path 403 JSON handling; frontend library unlock driven by `isPremium`; principal-cast helper cleanup (Q3). 83 backend + 206 frontend tests green, type-check/lint/build clean. Task 10 (manual Stripe runtime gate) pending real credentials, story remains in-progress.
