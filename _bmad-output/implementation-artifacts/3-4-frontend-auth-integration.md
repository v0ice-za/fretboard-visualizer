# Story 3.4: Frontend Auth Integration

Status: done

## Dev Context

- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`
- Previous story: `_bmad-output/implementation-artifacts/3-3-google-oauth.md` (backend auth surface + `GoogleAuthButton` this story wires into a modal)
- Deferred (3.4-tagged items get resolved here): `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **user**,
I want to **log in (email/password or Google) and see my account status reflected in the app**,
so that **I have a real identity and my premium tier is driven by the server, not client guesses**.

## Acceptance Criteria

**AC1 — Login/register entry point.** Unauthenticated: the account button in `ControlBar` presents a "Sign In" affordance; clicking it opens a login/register overlay containing email + password fields **and** the existing `GoogleAuthButton`. The overlay toggles between Login and Register (Register maps to `POST /api/v1/auth/register`, Login to `POST /api/v1/auth/login`). Dismissible by close button / click-outside / Escape. Backend validation errors surface inline via `error.code` (not `error.status`) — e.g. `INVALID_CREDENTIALS` → "Email or password is incorrect."

**AC2 — `useAuthStore` (Zustand).** New store at `stores/authStore.ts` holding `accessToken: string | null`, `user: UserResponseDto | null`, `isAuthenticated: boolean`, with `setAuth(AuthResponseDto)` and `clearAuth()`. `isAuthenticated` is derived from a non-null `accessToken`. The access token lives in memory only (not localStorage) — the httpOnly refresh cookie is the persistence mechanism.

**AC3 — `apiClient.ts` is the sole HTTP boundary.** New `lib/apiClient.ts` wraps `fetch`. Every request: prefixes base URL from `import.meta.env.VITE_API_URL` (empty → same-origin via dev proxy), sends `credentials: 'include'`, and injects `Authorization: Bearer <token>` read via `useAuthStore.getState().accessToken` (Zustand outside React — **not** a hook). Non-2xx responses reject with an `Error` carrying the backend envelope's `code` (fallback code when body is absent). All app API calls (including `GoogleAuthButton`) route through it — no raw `fetch`/`axios` elsewhere.

**AC4 — Transparent 401 refresh + single retry.** On any `401`, `apiClient` calls `POST /api/v1/auth/refresh` **once**, and on success updates `useAuthStore.accessToken` and replays the original request exactly once. Concurrent 401s share a single in-flight refresh (no refresh stampede). If refresh fails → `clearAuth()` and the original `401` surfaces. The refresh call itself is never retried/looped.

**AC5 — Post-login subscription fetch.** A successful login/register/Google auth populates `useAuthStore`, then a TanStack Query hook (`hooks/useSubscription.ts`) fetches `GET /api/v1/subscriptions/me` (enabled only when authenticated) and writes `isPremium` into `useSubscriptionStore` (`isPremium = status === 'ACTIVE'`). Fetch goes through `apiClient` (TanStack Query for API state — no `useState`+`useEffect`+`fetch`).

**AC6 — Logout.** From the authenticated account menu, Logout: calls `POST /api/v1/auth/logout` (clears the refresh cookie server-side), clears `useAuthStore`, resets `useSubscriptionStore` to `isPremium: false`, and invalidates/clears the subscription query. UI returns to the unauthenticated "Sign In" state.

**AC7 — Backend enablement (integration-critical).** The above cannot work end-to-end without: (a) `GET /api/v1/subscriptions/me` existing; (b) CORS allowing the credentialed cross-origin call; (c) the refresh cookie being deliverable both in local dev (http) and cross-origin prod (https). These are delivered here — see Tasks 9–11.

## Tasks / Subtasks

> Frontend tasks 1–8, backend tasks 9–11, tests 12, manual gate 13. Backend tasks are **integration-critical**, not optional — the frontend flow is unverifiable without them (see Dev Notes → "Why this story has a backend slice").

- [x] **Task 1: `apiClient.ts` — sole HTTP boundary (AC: 3, 4)**
  - [x] Create `frontend/src/lib/apiClient.ts`. Base URL: `const BASE = import.meta.env.VITE_API_URL ?? ''` → request URL is `` `${BASE}/api/v1${path}` `` (callers pass paths like `'/auth/login'`, `'/subscriptions/me'`).
  - [x] Core `request(path, { method, body })`: sets `credentials: 'include'`, `Content-Type: application/json` when a body is present, and `Authorization: Bearer ${useAuthStore.getState().accessToken}` when a token exists. Import the store module and call `.getState()` — do **not** use the hook (module is outside React).
  - [x] Export thin helpers: `get`, `post`, `del` (or a default object). Parse JSON; on non-2xx, read the envelope and `throw new Error(body?.error?.code ?? 'REQUEST_FAILED')` (attach `status` on the error for debugging, but frontend branches on `code`).
  - [x] 401 handling (AC4): if response is `401` **and** the path is not `/auth/refresh`, await a module-level `ensureRefreshed()` that (i) reuses a single in-flight `Promise` if a refresh is already running, (ii) POSTs `/auth/refresh`, (iii) on success calls `useAuthStore.getState().setAuth(...)` with the new `accessToken`+`user` and resolves, (iv) on failure calls `clearAuth()` and rejects. After a successful refresh, replay the original request **once** (guard with a `retried` flag so a second 401 does not loop).
  - [x] Do not add localStorage token persistence. Do not read subscription state here.

- [x] **Task 2: TanStack Query client + provider (AC: 5)**
  - [x] Create `frontend/src/lib/queryClient.ts` exporting a configured `QueryClient` (sensible defaults: `retry: false` for auth-sensitive queries, `staleTime` modest). Keep it minimal.
  - [x] Wrap the app tree in `main.jsx` with `<QueryClientProvider client={queryClient}>` — inside `GoogleOAuthProvider`, around `BrowserRouter`/`App`. Preserve the existing provider nesting.

- [x] **Task 3: `useAuthStore` (AC: 2)**
  - [x] Create `frontend/src/stores/authStore.ts`. Shape: `accessToken: string | null`, `user: UserResponseDto | null`, `isAuthenticated: boolean`, `setAuth(res: AuthResponseDto)` (sets token+user, `isAuthenticated: true`), `clearAuth()` (nulls token+user, `isAuthenticated: false`). Import `AuthResponseDto`/`UserResponseDto` from `@/types/api`. Zustand `set` with direct assignment (project convention).
  - [x] Follow the existing store style in `stores/subscriptionStore.ts` / `stores/fretboardStore.ts` (named export `useAuthStore`, an exported `DEFAULT_AUTH` constant for reset/tests).

- [x] **Task 4: `useSubscription` hook wiring the store (AC: 5, 6)**
  - [x] Create `frontend/src/hooks/useSubscription.ts`: `useQuery({ queryKey: ['subscription','me'], queryFn: () => apiClient.get('/subscriptions/me'), enabled: useAuthStore((s) => s.isAuthenticated), retry: false })`. In an effect (or `select`/`onSuccess` equivalent for TanStack Query v5), push `isPremium = data.status === 'ACTIVE'` into `useSubscriptionStore.setIsPremium`. When not authenticated, ensure `isPremium` is `false`.
  - [x] Mount the hook once high in the tree (e.g. in `App.jsx` alongside `useUrlState()`), so login state changes trigger the fetch and logout resets it.
  - [x] Export the `queryKey` (or a helper) so logout can `queryClient.removeQueries`.

- [x] **Task 5: `input` primitive (AC: 1) — Q1 resolved to Sheet**
  - [x] Added `frontend/src/components/ui/input.tsx` mirroring the base-ui wrapper pattern (tokens only). **`dialog.tsx` was NOT created** — Q1 was resolved to **Sheet** (UX spec), so the auth overlay + account menu reuse the existing `components/ui/sheet.tsx`.
  - [x] Q1 (Dialog vs Sheet) resolved at kickoff → **Sheet**.

- [x] **Task 6: `EmailAuthForm.tsx` (AC: 1)**
  - [x] Create `frontend/src/features/auth/EmailAuthForm.tsx`. Controlled email + password inputs; a mode toggle (Login ⇄ Register). Submit calls `apiClient.post('/auth/login' | '/auth/register', { email, password })` via a TanStack Query `useMutation`; disable the submit button while `isPending` (button spinner, per UX loading rules).
  - [x] On success: `useAuthStore.getState().setAuth(res)`; close the overlay; the mounted `useSubscription` refetches. On error: map `error.message` (the `code`) to inline copy — `INVALID_CREDENTIALS` → "Email or password is incorrect"; `EMAIL_ALREADY_EXISTS` (register) → "That email is already registered"; `VALIDATION_ERROR` → field-level message. Inline error style: rose/coral 12px Inter within the field (UX spec).
  - [x] Reuse existing backend contracts — do not invent error codes; confirm the register conflict code from `AuthService`/`AuthException` before wiring copy.

- [x] **Task 7: `LoginModal.tsx` — compose the overlay (AC: 1)**
  - [x] Create `frontend/src/features/auth/LoginModal.tsx`: renders `EmailAuthForm` + a divider + `GoogleAuthButton`. Controlled `open`/`onOpenChange`. Escape / click-outside / close button all dismiss (handled by the Dialog primitive).
  - [x] Wire `GoogleAuthButton`'s `onSuccess(res)` → `setAuth(res)` + close; `onError(err)` → inline error using `err.message` (the code).

- [x] **Task 8: Refactor `GoogleAuthButton` onto `apiClient` + wire `ControlBar` account menu (AC: 1, 3, 6)**
  - [x] `features/auth/GoogleAuthButton.tsx`: replace the raw `fetch('/api/v1/auth/google', …)` with `apiClient.post('/auth/google', { idToken })`. Keep the `credential` null-guard and the `onSuccess`/`onError` contract intact (the review-hardened behaviour from 3.3). Remove the now-stale "Story 3.4 will refactor" comment.
  - [x] `components/ControlBar.tsx` (account button at line ~145): when **unauthenticated**, `onClick` opens `LoginModal` and `aria-label="Sign in"`; when **authenticated**, the button opens an account menu (shadcn menu/popover — reuse an existing primitive; if none fits, a small Dialog/Sheet) showing `user.name ?? user.email` and a **Logout** action. Manage `open` state locally or via a tiny piece of `layoutStore` — do not add a new global store for it.
  - [x] Logout action (AC6): `await apiClient.post('/auth/logout')` (ignore/tolerate its result), then `useAuthStore.getState().clearAuth()`, `useSubscriptionStore.getState().setIsPremium(false)`, and `queryClient.removeQueries({ queryKey: ['subscription'] })`.

- [x] **Task 9: Backend — minimal `GET /api/v1/subscriptions/me` (AC: 5, 7)**
  - [x] Create `model/Subscription.java` (JPA entity for the existing `subscriptions` table from `V2`: `id`, `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`, `created_at`). **Enforce a DTO boundary** — never serialize the entity (`open-in-view: false`; carried deferred item). Map the `user` relation as `LAZY` or store `userId` directly.
  - [x] Create `repository/SubscriptionRepository.java` with `Optional<Subscription> findByUserId(Long userId)`.
  - [x] Create `dto/SubscriptionResponseDto.java` — `record SubscriptionResponseDto(String status, String currentPeriodEnd)` (ISO-8601 UTC string or `null`). Provide a `from(Subscription)` and a `none()` factory returning `status = "NONE"`, `currentPeriodEnd = null`.
  - [x] Create `service/SubscriptionService.java` + `controller/SubscriptionController.java` (`@GetMapping("/api/v1/subscriptions/me")`). Principal is the user id (`Long`) — read via `Authentication#getPrincipal()`, mirroring `UserController.me`. No row → return `none()`. Endpoint is **authenticated** (not in the permitAll list) so an unauthenticated call yields the `RestAuthenticationEntryPoint` 401 envelope.
  - [x] Scope boundary: this is a **read-only** status endpoint. `@PreAuthorize("hasRole('PREMIUM')")` enforcement, `current_period_end` expiry evaluation, and Stripe-driven status transitions are **Story 3.5/3.6** — do not build them here.

- [x] **Task 10: Backend — CORS for credentialed cross-origin calls (AC: 7)**
  - [x] Create `config/CorsConfig.java` — a `CorsConfigurationSource` bean. `allowedOrigins` from a new `app.cors.allowed-origins` property (comma-separated; local default `http://localhost:5173`); `allowCredentials(true)`; allow `GET,POST,DELETE,OPTIONS`; allow `Authorization`, `Content-Type` headers. **`allowCredentials(true)` forbids `*` origins** — must be an explicit list.
  - [x] Enable CORS in `SecurityConfig.filterChain` via `.cors(Customizer.withDefaults())` (picks up the bean). Do not otherwise rewrite `SecurityConfig` — extend it (same discipline as 3.3).
  - [x] Add `app.cors.allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}` to `application.yml`. Prod value set in Railway (Story 3.7).

- [x] **Task 11: Backend — profile-aware refresh cookie + local dev reachability (AC: 7)**
  - [x] `AuthController` cookie (`baseCookie`, currently `SameSite=Strict; Secure=true; path=/api/v1/auth`): make `SameSite` and `Secure` **profile/property-driven**. Dev: `SameSite=Lax; Secure=false` (works over http localhost, same-origin via Vite proxy). Prod: `SameSite=None; Secure=true` (required for cross-origin Vercel→Railway). Drive via an `app.cookie.*` property or the active profile — do not hardcode.
  - [x] Also apply the 3.4-tagged deferred item: `AuthController.refresh()` should emit an **expired** `Set-Cookie` on failure paths, aligning with `logout()` (kills a dead refresh cookie instead of leaving it 7 days). Keep this small.
  - [x] Frontend dev reachability: add a Vite dev proxy so relative `/api` calls hit the backend same-origin in dev. In `vite.config.ts` add `server.proxy = { '/api': 'http://localhost:8080' }`. This makes `VITE_API_URL` empty in dev (same-origin, cookie works with `Lax`) and set to the Railway URL in prod (Story 3.7). Update `.env.example` comment to reflect the dev-proxy behaviour.
  - [x] Cross-check the CSRF note (deferred): CSRF stays disabled; with `SameSite=None` in prod, the credentialed cross-origin design is CORS-gated. Note this in Completion Notes; do not add CSRF tokens in this story.

- [x] **Task 12: Tests (AC: 1–7)**
  - [x] Frontend (Vitest): `apiClient` 401→refresh→retry-once (mock `fetch`; assert single refresh under concurrent calls, no loop on repeated 401, `clearAuth` on refresh failure); `authStore` set/clear + `isAuthenticated` derivation; `LoginModal`/`EmailAuthForm` (login success sets store + closes; `INVALID_CREDENTIALS` renders inline error; register path); logout resets both stores and removes the subscription query; `useSubscription` maps `status==='ACTIVE'`→`isPremium`. Keep the existing 174 frontend tests green; `tsc --noEmit` + eslint clean.
  - [x] Backend (JUnit, extend `WebMockTestBase` — remember the **Java 25 / Mockito** constraint: mock interfaces/`@MockitoBean` repositories, never concrete classes): `SubscriptionController` — authed user with an `ACTIVE` row → `{status:"ACTIVE", currentPeriodEnd:...}`; authed user with no row → `{status:"NONE", currentPeriodEnd:null}`; unauthenticated → 401 envelope. A CORS smoke test (preflight `OPTIONS` returns the `Access-Control-Allow-*` headers) is a plus. `./mvnw test` all green.

- [x] **Task 13: Runtime validation (manual gate — AC: 1–7) — ACCEPTED**
  - [x] Ran a live local stack (Dockerized Postgres 16 → backend :8080, Flyway V1–V4 applied, no new migration → `pnpm dev` :5173). **HTTP contracts validated via curl against the real backend**: register 200 + `SameSite=Lax; HttpOnly` (no Secure) cookie; `/subscriptions/me` → `NONE` authed and `UNAUTHORIZED` 401 unauthed; refresh rotates; login 200; bad login `INVALID_CREDENTIALS`; duplicate register `EMAIL_ALREADY_EXISTS`; logout 204 + expired cookie; **refresh-after-logout 401 + expired cookie** (Task 11 deferred item); Vite dev proxy forwards `/api` :5173→:8080 with the cookie riding along (same-origin dev). **UI click-through validated by Voice** (Sign-in Sheet, form submit, account menu identity, logout, bootstrap refresh on reload) — functionality confirmed working. **Gate accepted.**
  - [x] Google OAuth real sign-in remains the one deferred piece (booted with a dummy `GOOGLE_CLIENT_ID`; real login needs Voice's client ID + Google account — carries the still-open **3.3 Task 9** OAuth runtime check).

### Review Findings

_Multi-layer adversarial review (Blind Hunter + Edge Case Hunter + Acceptance Auditor) of the bundled 3.2/3.3/3.4 diff on `feat/epic-3-auth`, run 2026-08-29 on Sonnet 5. Findings below are cross-verified against the actual code (not taken from raw subagent output) — a dramatic CORS-preflight claim from the Blind Hunter layer was checked and disproven (live curl + the existing `SubscriptionControllerTest#preflight_returnsCorsAllowHeaders` both confirm `OPTIONS` preflight returns 200 with correct `Access-Control-Allow-*` headers; Spring Security's `CorsFilter` short-circuits before the authorization chain, which is standard behavior)._

**Decision needed:** _resolved by Voice — see below, both now patch items (plus one deferred piece)._

- [x] [Review][Decision] Rate limiter trusts the first `X-Forwarded-For` hop unconditionally, and its bucket map never evicts — **resolved: bound the map now (eviction), defer the trusted-proxy XFF-trust fix to Story 3.7** (needs real Railway topology)
- [x] [Review][Decision] Silent bootstrap refresh (Q3) shares the same 10-req/min auth rate-limit bucket as login/register — **resolved: give `/auth/refresh` its own, separate, more generous rate-limit bucket**

**Patch (unambiguous fixes):**

- [x] [Review][Patch] `RateLimitFilter.buckets` never evicts — bound it with an expiring/bounded cache [backend/src/main/java/com/guitarapp/security/RateLimitFilter.java:32] — fixed: opportunistic idle-eviction sweep, no new dependency
- [x] [Review][Patch] `/auth/refresh` shares the login/register rate-limit bucket — give it a separate, more generous bucket [backend/src/main/java/com/guitarapp/security/RateLimitFilter.java] — fixed: refresh now keyed into its own 30/min bucket vs. 10/min for login/register/google

- [x] [Review][Patch] Failed login/register/Google attempt can silently authenticate as a stale session's user [frontend/src/lib/apiClient.ts:90] — fixed: `/auth/login`, `/auth/register`, `/auth/google` excluded from the 401 refresh-and-retry path
- [x] [Review][Patch] `AuthController.refresh()` clears the refresh cookie on any `RuntimeException`, not just an invalid refresh token [backend/src/main/java/com/guitarapp/controller/AuthController.java:60-66] — fixed: catch narrowed to `AuthException`
- [x] [Review][Patch] `apiClient`'s raw `fetch()` calls aren't wrapped in try/catch, so network failures bypass the structured `ApiError` flow and a comment is misleading [frontend/src/lib/apiClient.ts:61-64,82-87,94] — fixed: `rawFetch()` normalizes to a `NETWORK_ERROR` code; comment corrected
- [x] [Review][Patch] `CorsConfig` doesn't trim whitespace in comma-separated allowed-origins [backend/src/main/java/com/guitarapp/config/CorsConfig.java] — fixed: `.map(String::trim)`
- [x] [Review][Patch] No cross-validation between `CookieProperties.sameSite` and `.secure` — `SameSite=None` without `Secure` silently breaks the prod refresh cookie [backend/src/main/java/com/guitarapp/config/CookieProperties.java] — fixed: compact constructor fails fast
- [x] [Review][Patch] `useSubscription` doesn't handle a fetch error while authenticated — `isPremium` can go stale instead of a defined fallback [frontend/src/hooks/useSubscription.ts:31-37] — fixed: `query.isError` now falls back to `false`
- [x] [Review][Patch] `EmailAuthForm` has no `isPending` guard in `onSubmit` — rapid double-Enter can fire two concurrent mutations [frontend/src/features/auth/EmailAuthForm.tsx] — fixed
- [x] [Review][Patch] `LoginModal` keeps a stale "Google sign-in failed" message across close/reopen [frontend/src/features/auth/LoginModal.tsx] — fixed: reset moved into the close handler (not a `useEffect`, per the project's `react-hooks/set-state-in-effect` lint rule)
- [x] [Review][Patch] `GoogleTokenVerifierImpl` can throw an unhandled `ClassCastException` if a token's `name` claim isn't a string (catch scope is also broader than needed) [backend/src/main/java/com/guitarapp/security/GoogleTokenVerifierImpl.java:54] — fixed: safe `instanceof` cast + catch narrowed to just the `verify()` call
- [x] [Review][Patch] `ControlBar` logout hardcodes the subscription query-key literal instead of importing the exported `subscriptionQueryKey` [frontend/src/components/ControlBar.tsx:57] — fixed
- [x] [Review][Patch] `authStore.isAuthenticated` is stored, not derived from `accessToken` as AC2 literally specifies [frontend/src/stores/authStore.ts] — fixed: removed as stored state, replaced with a `selectIsAuthenticated` selector; all consumers + tests updated
- [x] [Review][Patch] BCrypt 72-byte truncation is validated by character count (`@Size`), not UTF-8 byte length [backend/src/main/java/com/guitarapp/dto/RegisterRequestDto.java:12, LoginRequestDto.java:8] — fixed: new `@ValidBcryptLength` constraint checks UTF-8 byte length

**Deferred (pre-existing, not blocking):**

- [x] [Review][Defer] Google email-link path uses an unflushed `save()` with no violation handling, unlike the sibling create path [backend/src/main/java/com/guitarapp/service/AuthService.java:114-121] — deferred, pre-existing; verified low real risk (no `@Version` on `User`, and the realistic race writes an identical value to the same row, so it doesn't actually collide as claimed)
- [x] [Review][Defer] Google-derived email/name isn't validated against the 255-char DB column before insert, so an oversized value would surface as a misleading `409 GOOGLE_ACCOUNT_CONFLICT` [backend/src/main/java/com/guitarapp/service/AuthService.java:127-136] — deferred, pre-existing; requires a validly-signed Google token with an absurd claim value, not achievable with real Google accounts
- [x] [Review][Defer] JWT signing secret has a checked-in dev-only default with no fail-fast guard against prod misuse [backend/src/main/resources/application.yml] — deferred, pre-existing; **already tracked** in `deferred-work.md` (code review of 3-2, 2026-06-17) as a Story 3.7 item, reconfirmed here, no new entry added
- [x] [Review][Defer] `SubscriptionController.me()` and `UserController.me()` duplicate an unchecked `(Long)` principal cast [backend/src/main/java/com/guitarapp/controller/SubscriptionController.java, UserController.java] — deferred, pre-existing pattern; intentional mirror per story dev notes, candidate for a shared helper in a future story
- [x] [Review][Defer] `Subscription.user`'s lazy-loading trap has no structural guard against a future field reaching through it (currently safe only because `SubscriptionResponseDto.from()` doesn't touch `getUser()`) [backend/src/main/java/com/guitarapp/dto/SubscriptionResponseDto.java] — deferred; **evolves an already-tracked item** (code review of 3-1, 2026-06-15, "enforce a DTO boundary before returning subscriptions — Story 3.2"): this story's `SubscriptionResponseDto` now delivers that DTO boundary, so the original concern is largely addressed — the residual risk is structural (omission, not enforcement), tracked forward to 3.5/3.6

**Dismissed (3):** CORS preflight blocked by `.anyRequest().authenticated()` (Blind Hunter) — verified false, see note above; undocumented `.formLogin(AbstractHttpConfigurer::disable)` in `SecurityConfig` (Blind Hunter) — pre-existing from before this session, harmless by the reviewer's own assessment; backend validation messages discarded by the frontend's `messageFor()` (Blind Hunter) — by design, matches the project's `error.code`-driven UX-copy convention.

## Dev Notes

### Why this story has a backend slice (read first)

The epic frames 3.4 as "frontend auth integration", but three backend gaps make the frontend ACs **unverifiable** without backend work, so they are in scope here:

1. **`GET /api/v1/subscriptions/me` does not exist** (only `AuthController`, `HealthController`, `UserController` are present). AC5 depends on it. Task 9 builds a **minimal read-only** version; enforcement is 3.6.
2. **No CORS** (`SecurityConfig` has no `.cors(...)`, no `CorsConfig`). A credentialed cross-origin call (Vercel→Railway) is blocked without it. Task 10.
3. **Refresh cookie is `SameSite=Strict; Secure=true`** — not sent cross-site (breaks prod refresh) and dropped over http (breaks local dev). `deferred-work.md` explicitly tags the fix as **Story 3.4**. Task 11.

A story implementation must leave the system working end-to-end, not merely satisfy the literal ACs. If you believe the backend slice should be deferred, raise it (Open Question Q2) before starting — do not silently ship a frontend that cannot authenticate against the real backend.

### What already exists — extend, do not recreate

- `frontend/src/types/api.ts` — `UserResponseDto { id, email, name|null }`, `AuthResponseDto { accessToken, user }`. **Import these; do not redefine.**
- `frontend/src/features/auth/GoogleAuthButton.tsx` — review-hardened (null-credential guard, `onSuccess`/`onError`). Task 8 only swaps its `fetch` for `apiClient` and folds it into `LoginModal`. Keep its contract.
- `frontend/src/stores/subscriptionStore.ts` — stub: `{ isPremium, setIsPremium }` + `DEFAULT_SUBSCRIPTION`. Drive it from `useSubscription`; don't rewrite it.
- `frontend/src/main.jsx` — already nests `GoogleOAuthProvider > BrowserRouter > App` (JSX; `allowJs:true`). Add `QueryClientProvider` inside `GoogleOAuthProvider`.
- `frontend/src/components/ControlBar.tsx` — account `<button>` at ~line 145 is a stub (`onClick={() => {}}`, comment "wired in Story 3.4"). This is the AC1/AC6 entry point.
- `frontend/src/components/ui/` — `badge, button, select, sheet, slider, tooltip` wrap **`@base-ui/react`**. Mirror `sheet.tsx` when adding `dialog.tsx`/`input.tsx`. `components/ui/` is generated-style — follow the existing wrapper shape, don't invent a new one.
- Backend `AuthController` — `tokenResponse()`, `baseCookie()` (Task 11 edits the cookie builder), endpoints `register/login/google/refresh/logout` all present and permit-listed in `SecurityConfig`.
- Backend `UserController.me` — the exact `Authentication#getPrincipal()` → `Long userId` → repo lookup pattern to copy in `SubscriptionController`.
- Backend `SecurityConfig` — `.anyRequest().authenticated()`, stateless, CSRF disabled, `RestAuthenticationEntryPoint` returns the JSON 401 envelope. New `/subscriptions/me` is covered by `anyRequest().authenticated()` automatically.

### `apiClient` design specifics

- Token read **outside React**: `useAuthStore.getState().accessToken` (architecture: "Zustand outside React, not via hook"). Importing the store into a plain module is fine and is the intended boundary.
- Single-flight refresh: a module-scoped `let refreshInFlight: Promise<void> | null`. First 401 sets it; concurrent 401s `await` the same promise; clear it in a `finally`. This prevents N parallel refreshes rotating the cookie N times (the refresh endpoint rotates + version-bumps on every call).
- Replay guard: pass a `retried` boolean through the internal request fn; a 401 on the replay must reject, not recurse.
- Never route `/auth/refresh` back through the 401 handler (infinite loop). Special-case it.
- Error shape: throw `Error(code)`; components/hooks branch on `err.message` (the code). This matches how `GoogleAuthButton` already surfaces codes and the enforcement rule "use `error.code`, not `error.status`".

### Dialog vs Sheet (design conflict — resolve at Q1)

- **Epic AC1** says "login/register modal (**shadcn Dialog**)".
- **UX distillate** lists Sheet for "auth overlay" and states "auth as **Sheet** overlay, never full-page redirect".

Default to **Dialog** (the AC is the acceptance contract) and add `dialog.tsx`. If Voice prefers the UX-spec Sheet, the existing `components/ui/sheet.tsx` can host `EmailAuthForm` + `GoogleAuthButton` with no new primitive. Confirm before Task 5.

### Subscription endpoint scope boundary

`GET /subscriptions/me` here is **status-only**, sourced from the `subscriptions` table (empty for every current user → `status:"NONE"`). Do not add `@PreAuthorize`, expiry math, or Stripe transitions — those are Story 3.5 (checkout/webhook) and 3.6 (enforcement). Keep `SubscriptionResponseDto` minimal so 3.6 can extend it without a breaking rename. Frontend maps `isPremium = status === 'ACTIVE'`, so any non-ACTIVE value correctly yields free tier.

### Cookie / CORS / dev-proxy interaction (get this right or auth silently fails)

- `allowCredentials(true)` + wildcard origin is illegal — CORS origins must be an explicit allow-list.
- Cross-origin (prod) requires the cookie to be `SameSite=None; Secure` **and** CORS `allowCredentials`. Local dev over http cannot set `Secure` cookies, so use the **Vite proxy** to keep dev same-origin and let the cookie be `SameSite=Lax; Secure=false` there. Profile/property-drive both flags (Task 11).
- `credentials: 'include'` must be on **every** `apiClient` request so the refresh cookie rides along on `/auth/refresh`.
- Refresh cookie `path=/api/v1/auth` is intentional — the cookie is only sent to auth endpoints. `/subscriptions/me` uses the Bearer header, not the cookie. Don't widen the cookie path.

### Testing standards

- Frontend: Vitest + Testing Library (existing setup; 174 tests currently green). Mock `fetch` for `apiClient`; use `@testing-library/user-event` for the modal. New tests colocated (`*.test.ts[x]`) per existing convention.
- Backend: extend `support/WebMockTestBase` (excludes DB autoconfig, `@MockitoBean UserRepository`). **Java 25 test JVM** — Mockito/Byte Buddy cannot mock concrete classes: mock `SubscriptionRepository` (interface) via `@MockitoBean`; never mock the `Subscription` entity or concrete services. `SubscriptionController` needs `@MockitoBean SubscriptionRepository`. Add `app.google.client-id=test-google-client-id` is already inherited from `WebMockTestBase` — no change.

### Migration numbering

V1–V4 are in use; the `subscriptions` table already exists (V2). **No new migration** in this story. Epic 4 tables use V5/V6.

### Project Structure Notes

- New frontend files land in their architecture-sanctioned homes: `lib/apiClient.ts`, `lib/queryClient.ts`, `stores/authStore.ts`, `hooks/useSubscription.ts`, `features/auth/{LoginModal,EmailAuthForm}.tsx`, `components/ui/{dialog,input}.tsx`. All match `architecture.distillate.md#Frontend Directory Structure`.
- `ControlBar.tsx` lives at `components/ControlBar.tsx` (not `features/fretboard/`) — a pre-existing variance from the architecture doc's example tree. Follow the **actual** location; do not relocate it.
- Backend new files: `model/Subscription.java`, `repository/SubscriptionRepository.java`, `service/SubscriptionService.java`, `controller/SubscriptionController.java`, `dto/SubscriptionResponseDto.java`, `config/CorsConfig.java` — all match `architecture.distillate.md#Backend Directory Structure`.
- No `tailwind.config.js`/postcss; tokens via `@theme` in `index.css`. Style new UI with existing CSS custom-property tokens only.

### References

- [Source: epics.distillate.md#Story 3.4: Frontend Auth Integration] — AC1–AC6
- [Source: architecture.distillate.md#Auth & Security Architecture] — apiClient sole boundary, token via `getState()`, JWT pair, refresh rotation
- [Source: architecture.distillate.md#API Design] — `/subscriptions/me`, error envelope, `code` not `status`, ISO-8601 dates
- [Source: architecture.distillate.md#State Management] — Zustand stores, TanStack Query for all API state, button-spinner loading
- [Source: architecture.distillate.md#Data Flow] — AuthController→authStore→`/subscriptions/me`→subscriptionStore→PaywallCard
- [Source: ux-design-specification.distillate.md#shadcn/ui Components] — Dialog (paywall) vs Sheet (auth overlay); inline error style; button hierarchy
- [Source: 3-3-google-oauth.md#Dev Notes] — CORS/SameSite deferred to 3.4; `GoogleAuthButton` refactor to apiClient; Java 25 mock constraint
- [Source: deferred-work.md] — 3.4-tagged items: SameSite=None, profile-aware Secure, refresh-failure cookie clear, CSRF/SameSite note

## Open Questions (resolve at dev kickoff)

- **Q1 (Dialog vs Sheet):** Epic AC1 says shadcn **Dialog**; UX spec says auth = **Sheet** overlay. Default taken: Dialog (+ new `dialog.tsx`). Confirm, or switch to the already-present `sheet.tsx` and skip the new primitive.
- **Q2 (backend slice scope):** This story includes the minimal `GET /subscriptions/me`, CORS, and the cookie/proxy fixes because the frontend ACs are otherwise unverifiable end-to-end. Confirm you want them here (recommended) rather than splitting a "3.4b backend enablement" story.
- **Q3 (access-token persistence):** Access token is intentionally memory-only (refresh cookie is the durable credential), so a hard reload lands unauthenticated until the next API call triggers a refresh. Optionally, `App` could attempt a silent `POST /auth/refresh` on mount to restore the session without a visible sign-in. Include that "silent bootstrap refresh"? (Small add; improves UX. Default: **not** included — flag if wanted.)
- **Q4 (register conflict code):** Task 6 copy assumes the register duplicate-email error `code`. Confirm the exact code emitted by `AuthService.register` / `AuthException` (e.g. `EMAIL_ALREADY_EXISTS`) so the inline message matches.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story)

### Debug Log References

- Backend test context failure (all `WebMockTestBase` subclasses): `SubscriptionService` requires a `SubscriptionRepository` bean, but the test context excludes JPA repository scanning. Fixed by adding `@MockitoBean SubscriptionRepository` to `WebMockTestBase` and `GuitarAppApplicationTests` (same pattern as `UserRepository`).
- Frontend `tsc` error `import.meta.env` (TS2339): tsconfig `types` array is explicit and omitted Vite client types. Fixed by adding `src/vite-env.d.ts` with `/// <reference types="vite/client" />`.

### Completion Notes

Kickoff decisions (Open Questions): **Q1 → Sheet** (reused `sheet.tsx`; no `dialog.tsx`), **Q2 → include backend slice** (Tasks 9–11), **Q3 → add silent bootstrap refresh** on App mount, **Q4** verified from code → register duplicate `EMAIL_ALREADY_EXISTS`, bad login `INVALID_CREDENTIALS`.

Delivered:
- **apiClient** as the sole HTTP boundary: Bearer injection via `useAuthStore.getState()` (outside React), `credentials:'include'`, single-flight transparent 401 refresh + one replay (no stampede, no loop), original 401 surfaces on refresh failure with `clearAuth()`.
- **authStore** (memory-only token), **queryClient** + provider, **useSubscription** (drives `isPremium = status==='ACTIVE'`), **EmailAuthForm**/**LoginModal** (Sheet overlay), **GoogleAuthButton** refactored onto apiClient, **ControlBar** account menu + logout, **silent bootstrap refresh** on load.
- Backend: minimal read-only `GET /api/v1/subscriptions/me` (repo/dto/service/controller), credentialed **CORS** (`CorsConfig` + `.cors()` in SecurityConfig), profile/env-driven refresh cookie (`CookieProperties`; dev `Lax`/insecure, prod `None`/`Secure`), refresh-failure now emits an expired `Set-Cookie`, Vite dev proxy for same-origin `/api` in dev.
- CSRF note (deferred item): CSRF stays disabled; with `SameSite=None` in prod the credentialed cross-origin design is CORS-gated. No CSRF tokens added this story.

Validation (automated): frontend `type-check` ✓, `lint` ✓, **192 Vitest tests** ✓ (174 prior + 18 new), production `build` ✓; backend **47 tests** ✓ (43 prior + 4 new), `BUILD SUCCESS`. No new Flyway migration (V1–V4 unchanged).

**Task 13 (manual runtime gate) is PENDING USER** — it needs a running Postgres and a real Google client ID, and it carries the still-open 3.3 Task 9 OAuth runtime check. Everything programmatically verifiable is green.

### File List

**Frontend — new**
- `frontend/src/lib/apiClient.ts`
- `frontend/src/lib/queryClient.ts`
- `frontend/src/stores/authStore.ts`
- `frontend/src/hooks/useSubscription.ts`
- `frontend/src/components/ui/input.tsx`
- `frontend/src/features/auth/EmailAuthForm.tsx`
- `frontend/src/features/auth/LoginModal.tsx`
- `frontend/src/vite-env.d.ts`
- `frontend/src/lib/apiClient.test.ts`
- `frontend/src/stores/authStore.test.ts`
- `frontend/src/features/auth/EmailAuthForm.test.tsx`
- `frontend/src/hooks/useSubscription.test.tsx`
- `frontend/src/components/ControlBar.auth.test.tsx`

**Frontend — modified**
- `frontend/src/features/auth/GoogleAuthButton.tsx` (fetch → apiClient)
- `frontend/src/components/ControlBar.tsx` (account menu, login modal, logout)
- `frontend/src/main.jsx` (QueryClientProvider)
- `frontend/src/App.jsx` (mount useSubscription + bootstrapAuth)
- `frontend/vite.config.ts` (dev proxy)
- `frontend/.env.example` (dev-proxy comment)

**Backend — new**
- `backend/src/main/java/com/guitarapp/repository/SubscriptionRepository.java`
- `backend/src/main/java/com/guitarapp/dto/SubscriptionResponseDto.java`
- `backend/src/main/java/com/guitarapp/service/SubscriptionService.java`
- `backend/src/main/java/com/guitarapp/controller/SubscriptionController.java`
- `backend/src/main/java/com/guitarapp/config/CorsConfig.java`
- `backend/src/main/java/com/guitarapp/config/CookieProperties.java`
- `backend/src/test/java/com/guitarapp/controller/SubscriptionControllerTest.java`

**Backend — modified**
- `backend/src/main/java/com/guitarapp/security/SecurityConfig.java` (`.cors(...)`)
- `backend/src/main/java/com/guitarapp/controller/AuthController.java` (profile-driven cookie; expired cookie on refresh failure; review: catch narrowed to `AuthException`)
- `backend/src/main/resources/application.yml` (`app.cors.*`, `app.cookie.*`)
- `backend/src/test/java/com/guitarapp/support/WebMockTestBase.java` (`@MockitoBean SubscriptionRepository`)
- `backend/src/test/java/com/guitarapp/GuitarAppApplicationTests.java` (`@MockitoBean SubscriptionRepository`)

_(Note: `model/Subscription.java` already existed from prior work — not created here.)_

**Code review pass (2026-08-29) — new**
- `backend/src/main/java/com/guitarapp/dto/validation/ValidBcryptLength.java`
- `backend/src/main/java/com/guitarapp/dto/validation/BcryptLengthValidator.java`
- `backend/src/test/java/com/guitarapp/config/CookiePropertiesTest.java`
- `backend/src/test/java/com/guitarapp/config/CorsConfigTest.java`

**Code review pass (2026-08-29) — modified**
- `frontend/src/lib/apiClient.ts` (excluded `/auth/{login,register,google}` from 401 refresh-retry; wrapped `fetch` calls, added `NETWORK_ERROR` code)
- `frontend/src/lib/apiClient.test.ts` (2 new regression tests for the refresh-retry exclusion)
- `frontend/src/stores/authStore.ts` (`isAuthenticated` removed as stored state; added `selectIsAuthenticated` selector)
- `frontend/src/stores/authStore.test.ts`
- `frontend/src/hooks/useSubscription.ts` (handle `query.isError`)
- `frontend/src/hooks/useSubscription.test.tsx`
- `frontend/src/components/ControlBar.tsx` (use `selectIsAuthenticated`; use exported `subscriptionQueryKey`)
- `frontend/src/components/ControlBar.auth.test.tsx`
- `frontend/src/features/auth/EmailAuthForm.tsx` (`isPending` guard in `onSubmit`)
- `frontend/src/features/auth/EmailAuthForm.test.tsx`
- `frontend/src/features/auth/LoginModal.tsx` (reset `googleFailed` in the close handler)
- `backend/src/main/java/com/guitarapp/config/CorsConfig.java` (trim allowed-origins)
- `backend/src/main/java/com/guitarapp/config/CookieProperties.java` (fail-fast `SameSite=None` without `Secure`)
- `backend/src/main/java/com/guitarapp/security/GoogleTokenVerifierImpl.java` (safe `name`-claim cast; narrowed catch scope)
- `backend/src/test/java/com/guitarapp/security/GoogleTokenVerifierImplTest.java` (1 new test)
- `backend/src/main/java/com/guitarapp/security/RateLimitFilter.java` (separate `/auth/refresh` bucket; idle-eviction sweep)
- `backend/src/test/java/com/guitarapp/security/RateLimitFilterTest.java` (1 new test)
- `backend/src/main/java/com/guitarapp/dto/RegisterRequestDto.java`, `LoginRequestDto.java` (`@ValidBcryptLength`)

### Change Log

- 2026-08-29 — Story 3.4 implemented (Tasks 1–12). Frontend auth (apiClient, authStore, TanStack Query, Sheet-based LoginModal/EmailAuthForm, account menu + logout, silent bootstrap refresh) + backend slice (`GET /subscriptions/me`, credentialed CORS, profile-driven refresh cookie, Vite dev proxy). 192 frontend + 47 backend tests green.
- 2026-08-29 — Task 13 runtime gate **accepted**: live local stack (Docker Postgres + backend + Vite) validated all auth HTTP contracts via curl; UI click-through confirmed by Voice. Google real sign-in deferred (dummy client ID; carries 3.3 Task 9). Story ready for code review.
- 2026-08-29 — Code review (Sonnet 5, bundled 3.2/3.3/3.4 diff on `feat/epic-3-auth`): 3-layer adversarial review (Blind Hunter, Edge Case Hunter, Acceptance Auditor), all findings cross-verified against actual code and the live running stack. 1 dramatic false-positive disproven (CORS preflight). 14 patches applied (most severe: `apiClient` could silently authenticate a failed login attempt as a different, stale session's user). 2 decision-needed items resolved by Voice (bounded rate-limit map + separate `/auth/refresh` bucket). 5 pre-existing items deferred (2 newly logged, 2 reconfirm/evolve already-tracked entries, 1 duplication note). 3 findings dismissed as noise. Post-patch: 195 frontend tests + 54 backend tests green, type-check/lint clean, live stack re-verified via curl.
