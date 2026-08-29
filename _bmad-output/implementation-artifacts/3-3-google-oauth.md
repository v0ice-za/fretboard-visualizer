# Story 3.3: Google OAuth

Status: done

## Dev Context

- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- Previous story: `_bmad-output/implementation-artifacts/3-2-email-password-auth.md` (JWT infrastructure this builds on)
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **user**,
I want to **sign in with my Google account in one click**,
so that **I can access the app without creating or remembering a separate password**.

## Acceptance Criteria

**AC1** — `POST /api/v1/auth/google` accepts `{"idToken":"<Google ID token>"}`. Backend verifies the token against Google's JWKS endpoint (audience = `GOOGLE_CLIENT_ID`). Invalid, expired, or malformed token → `401 {"error":{"code":"INVALID_GOOGLE_TOKEN","status":401}}`. Google account with `email_verified = false` → same `INVALID_GOOGLE_TOKEN` 401.

**AC2** — New Google user (no matching `google_id` or `email` in DB): creates a `users` row with `email`, `name`, and `google_id` populated; `password_hash` is `NULL`. Returns `200` with the same `AuthResponseDto` (access token in body + 7-day refresh `httpOnly` cookie) as email/password login.

**AC3** — Existing `google_id` match: logs in that user. Returns `200` with `AuthResponseDto`.

**AC4** — Existing `email` match (from a prior email/password registration): links `google_id` to that user row, saves, then logs in. Returns `200` with `AuthResponseDto`. This allows a user who registered via email to later use Google with the same address.

**AC5** — `POST /api/v1/auth/google` is within the existing rate-limit scope (the `RateLimitFilter` already covers all `/api/v1/auth/*`; no extra wiring needed).

**AC6** — Frontend: a `GoogleAuthButton` component exists in `features/auth/`. Clicking it initiates the Google One Tap / Identity Services consent flow. On completion the component POSTs the ID token to the backend and calls `onSuccess(AuthResponseDto)`. On any failure (GSI or backend) it calls `onError(Error)`.

## Tasks / Subtasks

- [x] **Task 1: Backend dependency + Google config (AC: 1)**
  - [x] Add `com.google.api-client:google-api-client:2.8.0` to `backend/pom.xml`. Pin version in a `<google-api-client.version>2.8.0</google-api-client.version>` property. (Latest stable as of 2025-01-xx — confirmed. Contains `GoogleIdTokenVerifier` + pulls in `google-http-client`, `google-oauth-client`, and Apache HttpClient transitively; no separate transport dep required.)
  - [x] Add `app.google.client-id: ${GOOGLE_CLIENT_ID}` to `application.yml` under the existing `app:` block (no dev fallback — must be set explicitly).
  - [x] Create `config/GoogleProperties.java` — `@ConfigurationProperties("app.google")` record with `String clientId`. (Follows the `JwtProperties` pattern; `@ConfigurationPropertiesScan` on `GuitarAppApplication` auto-discovers it.)
  - [x] `./mvnw compile` passes.

- [x] **Task 2: `GoogleTokenVerifier` interface + implementation (AC: 1)**
  - [x] Create `security/GoogleTokenVerifier.java` — interface with a single method: `GoogleTokenClaims verify(String idToken) throws AuthException`. **Interface, not class** — the Java 25 test JVM (Byte Buddy) cannot mock concrete classes; the interface is mocked in tests.
  - [x] Create `security/GoogleTokenClaims.java` — a `record GoogleTokenClaims(String googleId, String email, String name, boolean emailVerified)`.
  - [x] Create `security/GoogleTokenVerifierImpl.java` — `@Service @Primary` implements `GoogleTokenVerifier`. Builds a `com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier` Spring bean on construction (inject `GoogleProperties`). See Dev Notes for the exact API — using `new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance()).setAudience(...).build()`. On `null` returned from `verifier.verify(idToken)` or any `GeneralSecurityException`/`IOException` → throw `AuthException.invalidGoogleToken()`.
  - [x] Add `AuthException.invalidGoogleToken()` factory to `exception/AuthException.java`: `new AuthException("INVALID_GOOGLE_TOKEN", "Google ID token is invalid, expired, or unverified.", HttpStatus.UNAUTHORIZED)`.

- [x] **Task 3: `UserRepository` extension (AC: 2, 3, 4)**
  - [x] Add `Optional<User> findByGoogleId(String googleId)` to `repository/UserRepository`. (Spring Data JPA derives the query from the method name; `google_id` column already exists from V1 — no migration needed.)

- [x] **Task 4: `GoogleAuthRequestDto` (AC: 1)**
  - [x] Create `dto/GoogleAuthRequestDto.java` — `record GoogleAuthRequestDto(@NotBlank @Size(max = 2048) String idToken)`. Google ID tokens are JWTs and in practice ~1-2 KB; `@Size(max=2048)` prevents oversized payloads.

- [x] **Task 5: `AuthService.loginWithGoogle()` (AC: 1–4)**
  - [x] Add a `GoogleTokenVerifier googleTokenVerifier` parameter to the `AuthService` constructor (inject it).
  - [x] Add `@Transactional public AuthResult loginWithGoogle(GoogleAuthRequestDto request)` to `AuthService`:
    1. `GoogleTokenClaims claims = googleTokenVerifier.verify(request.idToken())` — throws `AuthException.invalidGoogleToken()` on failure.
    2. If `!claims.emailVerified()` → throw `AuthException.invalidGoogleToken()`.
    3. `String email = normalizeEmail(claims.email())`.
    4. `userRepository.findByGoogleId(claims.googleId())` → if found, return `issueTokens(user)`.
    5. `userRepository.findByEmail(email)` → if found, set `user.setGoogleId(claims.googleId())`, `userRepository.save(user)`, return `issueTokens(user)`.
    6. Else: `User user = User.builder().email(email).googleId(claims.googleId()).name(claims.name()).build(); user = userRepository.saveAndFlush(user);` return `issueTokens(user)`.
  - [x] `normalizeEmail()` and `issueTokens()` are **private** methods already in `AuthService` — call them directly (no duplication).

- [x] **Task 6: `AuthController` + `SecurityConfig` update (AC: 1–5)**
  - [x] Add `@PostMapping("/google")` endpoint to `AuthController`:
    ```java
    @PostMapping("/google")
    public ResponseEntity<AuthResponseDto> googleAuth(@Valid @RequestBody GoogleAuthRequestDto request) {
        return tokenResponse(authService.loginWithGoogle(request));
    }
    ```
    Reuses the existing `tokenResponse()` private method — cookie and body format are identical to login/register.
  - [x] Add `"/api/v1/auth/google"` to the `permitAll` list in `SecurityConfig.filterChain()` (extend the existing `requestMatchers(HttpMethod.POST, ...)` block — do not rewrite `SecurityConfig`).

- [x] **Task 7: Frontend — `@react-oauth/google` + `GoogleAuthButton.tsx` (AC: 6)**
  - [x] `pnpm add @react-oauth/google@0.13.5` in `frontend/`.
  - [x] Update `frontend/src/main.jsx`: import `{ GoogleOAuthProvider }` from `@react-oauth/google` and wrap the `<BrowserRouter><App /></BrowserRouter>` tree with `<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>`. Note: `main.jsx` stays `.jsx` (the file already exists as JSX; the project uses `allowJs:true`).
  - [x] Create `frontend/src/types/api.ts` (new file, `.ts`):
    ```ts
    export interface UserResponseDto {
      id: number;
      email: string;
      name: string | null;
    }
    export interface AuthResponseDto {
      accessToken: string;
      user: UserResponseDto;
    }
    ```
    (Story 3.4 imports from here for `useAuthStore` and `apiClient.ts`.)
  - [x] Create `frontend/src/features/auth/GoogleAuthButton.tsx` (new file, `.tsx`). Props: `onSuccess: (result: AuthResponseDto) => void` and `onError?: (err: Error) => void`. Uses `GoogleLogin` from `@react-oauth/google`:
    ```tsx
    import { GoogleLogin } from '@react-oauth/google';
    import type { AuthResponseDto } from '@/types/api';
    
    interface Props {
      onSuccess: (result: AuthResponseDto) => void;
      onError?: (err: Error) => void;
    }
    
    export function GoogleAuthButton({ onSuccess, onError }: Props) {
      return (
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              const res = await fetch('/api/v1/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: credentialResponse.credential }),
                credentials: 'include',
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error?.code ?? 'GOOGLE_AUTH_FAILED');
              }
              onSuccess(await res.json());
            } catch (err) {
              onError?.(err instanceof Error ? err : new Error(String(err)));
            }
          }}
          onError={() => onError?.(new Error('GOOGLE_AUTH_CANCELLED'))}
        />
      );
    }
    ```
    **Note:** This story uses a direct `fetch` so the component is self-contained. Story 3.4 adds `apiClient.ts` (auth injection + 401 retry) and will refactor this `fetch` call to use it. `credentials: 'include'` ensures the refresh cookie is set cross-origin once CORS is added in Story 3.4.

- [x] **Task 8: Tests (AC: 1–4)**
  - [x] `GoogleAuthControllerTest extends WebMockTestBase` — add `@MockitoBean GoogleTokenVerifier googleTokenVerifier` to this test class (NOT to `WebMockTestBase`; only Google auth tests need it). Cover:
    - New Google user → 200 + access token + `Set-Cookie` (refresh token).
    - Existing `google_id` → 200 (login, no new row).
    - Email linking (existing email/password user, no `google_id`) → 200 (google_id linked).
    - Invalid token (verifier throws `INVALID_GOOGLE_TOKEN`) → 401 error envelope.
    - Missing body / `idToken` blank → 400 `VALIDATION_ERROR` (handled by existing `GlobalExceptionHandler` / `@Valid`).
  - [x] `GoogleTokenVerifierImplTest` — unit test for the implementation wrapping:
    - Use a real `GoogleIdTokenVerifier` in test only if you can supply a valid test token (unlikely); otherwise construct a test double by subclassing or use `@ExtendWith(MockitoExtension.class)` — note `GoogleIdTokenVerifier` is a concrete class, so **mock** it via `spy` or use Mockito's inline mock maker if available. **Alternative (simpler):** test `GoogleTokenVerifierImpl` by swapping the `GoogleIdTokenVerifier` for a test double at construction time via a package-private or constructor-injected field. At minimum, test: `null` result from verifier → `AuthException("INVALID_GOOGLE_TOKEN")`; `emailVerified = false` → same exception; valid claims → `GoogleTokenClaims` returned.
  - [x] `./mvnw test` → all pass.

- [ ] **Task 9: Runtime validation (AC: 1, 6)**
  - [ ] Set `GOOGLE_CLIENT_ID` in the local environment (or `.env` / `export GOOGLE_CLIENT_ID=<your-client-id>` before running Spring Boot). Set `VITE_GOOGLE_CLIENT_ID=<same>` in `frontend/.env.local`.
  - [ ] Start `./mvnw spring-boot:run` (Flyway: still at V4 — no new migration expected).
  - [ ] Test `POST /api/v1/auth/google` with a real Google ID token via curl or frontend. Confirm: new user row created; re-login returns same user; email-linked account works.
  - [ ] Start `pnpm dev` in `frontend/`, click the Google button, complete the OAuth consent flow.

## Dev Notes

### What already exists (Story 3.2) — extend, do not recreate

- `User.java` — `id, email, passwordHash (nullable), googleId (unique nullable), name, tokenVersion, createdAt`. **`googleId` already present from V1** — no migration needed.
- `UserRepository` — has `findByEmail`, `existsByEmail`. **Add `findByGoogleId` here.**
- `AuthService` — has `register`, `login`, `refresh`, `logout`, private `issueTokens(User)`, private `normalizeEmail(String)`. **Add `loginWithGoogle` and inject `GoogleTokenVerifier`.**
- `AuthController` — has `tokenResponse(AuthResult)` private helper that sets the refresh cookie and returns the body. **Add one endpoint — reuse `tokenResponse()` exactly.**
- `SecurityConfig` — extend the existing `permitAll` matcher block, do not rewrite.
- `GlobalExceptionHandler` — handles `GuitarAppException`, `MethodArgumentNotValidException`, `HttpMessageNotReadableException`, and `Exception`. No changes needed.
- `WebMockTestBase` — base test class that excludes DB auto-config and mocks `UserRepository`. Google auth tests extend it and add their own `@MockitoBean GoogleTokenVerifier`.
- `config/JwtProperties.java` — shows the exact `@ConfigurationProperties` record pattern. Follow it for `GoogleProperties`.
- `GuitarAppApplication.java` — has `@ConfigurationPropertiesScan`; it auto-discovers `GoogleProperties` without any additional registration.

### Migration numbering (IMPORTANT)

V1–V4 are in use. `users.google_id` was added in V1; this story requires **no new migration**. Epic 4 tables (custom_tunings, saved_sessions) must use V5/V6 when built.

### `GoogleIdTokenVerifier` API (google-api-client 2.8.0)

```java
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

// Build once — inject as a Spring-managed field in GoogleTokenVerifierImpl
GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
        new NetHttpTransport(), GsonFactory.getDefaultInstance())
        .setAudience(Collections.singletonList(googleProperties.clientId()))
        .build();

// Verify (in the verify() method)
try {
    GoogleIdToken token = verifier.verify(rawIdToken);
    if (token == null) throw AuthException.invalidGoogleToken();
    GoogleIdToken.Payload payload = token.getPayload();
    return new GoogleTokenClaims(
        payload.getSubject(),        // google_id ("sub" claim)
        payload.getEmail(),          // email
        (String) payload.get("name"), // display name (may be null)
        Boolean.TRUE.equals(payload.getEmailVerified())
    );
} catch (GeneralSecurityException | IOException e) {
    throw AuthException.invalidGoogleToken();
}
```

`verifier.verify()` calls Google's JWKS endpoint on first use and caches the public keys. The `NetHttpTransport` handles the outbound HTTPS call. Do NOT wrap `GoogleIdTokenVerifier` in `@Bean` alone — create it inside `GoogleTokenVerifierImpl`'s constructor or `@PostConstruct` init.

### Java 25 test JVM — mock the interface, not the implementation

The test JVM is Java 25. Mockito's Byte Buddy subclassing agent cannot mock concrete classes on this JVM. The pattern is:
- `GoogleTokenVerifier` is an **interface** — `@MockitoBean GoogleTokenVerifier googleTokenVerifier` works fine.
- `GoogleIdTokenVerifier` (from google-api-client) is a **concrete class** — do not try to `@MockitoBean` it. Instead, test `GoogleTokenVerifierImpl` with constructor injection: accept a `GoogleIdTokenVerifier` param, pass a test double in unit tests.

### Email-linking security note

The linking in AC4 (`findByEmail` → attach `googleId`) is deliberate and safe: Google's ID token verification guarantees the `email` claim belongs to the authenticated user, and `email_verified = true` is enforced (AC1). An attacker cannot forge a Google token. The approach is consistent with how major OAuth providers handle account linking by verified email.

### Rate limiting

`RateLimitFilter` already applies to all `/api/v1/auth/*` via a `request.getRequestURI().startsWith("/api/v1/auth/")` prefix check. Adding the new endpoint under `/api/v1/auth/google` means it is automatically rate-limited. No code changes needed.

### CORS / SameSite deferred

CORS (`CorsConfig`) and changing `SameSite=Strict` on the refresh cookie are both deferred to Story 3.4. The frontend `fetch` uses `credentials: 'include'`, which will work once CORS is configured. The refresh cookie will be correctly set for same-origin dev and will be cross-origin–ready after 3.4.

### Frontend notes

- `main.jsx` already wraps with `<StrictMode>` and `<BrowserRouter>`. Add `<GoogleOAuthProvider>` as the outermost wrapper (outside `StrictMode` is fine, or inside — both work).
- `VITE_GOOGLE_CLIENT_ID` must be set in `frontend/.env.local` for local dev. Do not commit `.env.local`.
- Story 3.4 creates `apiClient.ts` and `useAuthStore`. At that point, the `fetch` call in `GoogleAuthButton` will be refactored to `apiClient.post('/auth/google', ...)` — but Story 3.3 must leave a working standalone component.
- New frontend components go in `features/auth/` (create the `features/auth/` directory — `features/library/` exists as a reference). Use `.tsx` extension for new components.
- Existing features use `@/stores/...` and `@/hooks/...` aliases. `GoogleAuthButton.tsx` uses `@/types/api` for the response type — this is the new `types/api.ts` file this story creates.

### Error codes (frontend contracts)

New code added: `INVALID_GOOGLE_TOKEN` (401). Frontend will branch on `error.code`, not `error.status`. Keep that pattern — the `GoogleAuthButton` exposes `onError(Error)` where the `Error.message` carries the code string from the backend envelope.

### References

- [Source: epics.distillate.md#Story 3.3: Google OAuth] — ACs
- [Source: architecture.distillate.md#Google OAuth Flow] — GSI frontend, ID token → backend, `GoogleTokenVerifier`, `google-auth-library`
- [Source: architecture.distillate.md#Auth & Security Architecture] — JWT pair reuse, role claims, cookie pattern
- [Source: 3-2-email-password-auth.md#Dev Notes] — Java 25 mock constraint, `WebMockTestBase`, `AuthController.tokenResponse()` pattern

## Open Questions (resolve before or at dev kickoff)

- **Q1 (Google OAuth consent screen):** You need an OAuth 2.0 Client ID from Google Cloud Console (Credentials → Web application) with your local `http://localhost:5173` and production Vercel URL as authorized JavaScript origins. Assumed you'll set this up manually before Task 9.
- **Q2 (name field from Google):** The `name` claim in a Google ID token is the display name (e.g. "John Smith"). This story stores it as-is in `users.name`. Confirm this is the right field vs. `given_name` / `family_name` separately.
- **Q3 (email-linking ambiguity):** If a user has email/password and also an unverified Google account with the same email, the current logic (`email_verified = false` → reject) prevents the link. This is the correct behaviour — confirmed by AC1.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (bmad-dev-story workflow)

### Debug Log References

- **Context-load failure — `GoogleTokenVerifierImpl`: "No default constructor found".** Spring could not choose between the two constructors (production `GoogleProperties` ctor + package-private `GoogleIdTokenVerifier` test-seam ctor). Fixed by annotating the production constructor with `@Autowired`. All 39 backend tests then passed.
- **Test config:** `app.google.client-id` has no dev fallback in `application.yml` (per Task 1), so every full-context test constructs the real `GoogleTokenVerifierImpl` bean and needs the property resolvable. Added `app.google.client-id=test-google-client-id` to the `@SpringBootTest(properties=…)` of `WebMockTestBase` and `GuitarAppApplicationTests`. A test-scoped `application.yml` was deliberately avoided — it would shadow (not merge with) the main one and drop JWT/datasource config.

### Completion Notes

- Backend Google sign-in fully implemented and covered: `POST /api/v1/auth/google` verifies the ID token, then finds-by-google_id / links-by-verified-email / creates a new password-less account, returning the same `AuthResponseDto` (access token body + httpOnly refresh cookie) as email/password auth.
- `GoogleTokenVerifier` is an interface (mocks cleanly on the Java 25 test JVM); `GoogleTokenVerifierImpl` wraps the concrete `GoogleIdTokenVerifier` and exposes a package-private constructor seam so its unit test injects an anonymous subclass as a test double.
- Rate limiting (AC5) needs no code — `RateLimitFilter`'s `/api/v1/auth/*` prefix already covers `/google`.
- **Tests:** 11 new backend tests (7 `GoogleAuthControllerTest` covering new-user / existing-google_id / email-link / invalid-token / unverified-email / blank-idToken / missing-field; 4 `GoogleTokenVerifierImplTest` covering valid-claims / unverified-passthrough / null-result / security-exception). Full suite: **39 backend + 174 frontend, all green.** Frontend `tsc --noEmit` and eslint clean.
- **AC coverage:** AC1–AC5 verified by the automated backend suite; AC6 (`GoogleAuthButton` component) implemented and typechecked.
- **Task 9 (runtime OAuth validation) is NOT complete — it is a manual gate for the user.** It requires a real Google Cloud OAuth 2.0 Web client ID (Open Question Q1) and a human consent flow in the browser, which cannot be automated. Set `GOOGLE_CLIENT_ID` (backend env) and `VITE_GOOGLE_CLIENT_ID` (`frontend/.env.local`) to the same value, run backend + `pnpm dev`, and exercise the real Google button before considering the story production-ready.

---

## File List

**Backend — new:**
- `backend/src/main/java/com/guitarapp/config/GoogleProperties.java`
- `backend/src/main/java/com/guitarapp/security/GoogleTokenVerifier.java`
- `backend/src/main/java/com/guitarapp/security/GoogleTokenClaims.java`
- `backend/src/main/java/com/guitarapp/security/GoogleTokenVerifierImpl.java`
- `backend/src/main/java/com/guitarapp/dto/GoogleAuthRequestDto.java`
- `backend/src/test/java/com/guitarapp/controller/GoogleAuthControllerTest.java`
- `backend/src/test/java/com/guitarapp/security/GoogleTokenVerifierImplTest.java`

**Backend — modified:**
- `backend/pom.xml` (google-api-client 2.8.0 + version property)
- `backend/src/main/resources/application.yml` (`app.google.client-id`)
- `backend/src/main/java/com/guitarapp/exception/AuthException.java` (`invalidGoogleToken()`)
- `backend/src/main/java/com/guitarapp/repository/UserRepository.java` (`findByGoogleId`)
- `backend/src/main/java/com/guitarapp/service/AuthService.java` (`loginWithGoogle` + verifier injection)
- `backend/src/main/java/com/guitarapp/controller/AuthController.java` (`/google` endpoint)
- `backend/src/main/java/com/guitarapp/security/SecurityConfig.java` (permitAll `/api/v1/auth/google`)
- `backend/src/test/java/com/guitarapp/support/WebMockTestBase.java` (test `app.google.client-id`)
- `backend/src/test/java/com/guitarapp/GuitarAppApplicationTests.java` (test `app.google.client-id`)

**Frontend — new:**
- `frontend/src/types/api.ts`
- `frontend/src/features/auth/GoogleAuthButton.tsx`

**Frontend — modified:**
- `frontend/package.json` + `frontend/pnpm-lock.yaml` (`@react-oauth/google` 0.13.5)
- `frontend/src/main.jsx` (`GoogleOAuthProvider` wrapper)
- `frontend/.env.example` (`VITE_GOOGLE_CLIENT_ID`)

---

## Change Log

- **2026-07-03** — Implemented Story 3.3 Google OAuth (Tasks 1–8). Backend `POST /api/v1/auth/google` with ID-token verification and find/link/create user logic; frontend `GoogleAuthButton` + `GoogleOAuthProvider`. 11 new backend tests; full suite green (39 backend / 174 frontend). Task 9 (runtime OAuth validation) left as a manual gate pending the user's Google client ID. Status → review.

## Review Findings

Code review 2026-07-03 (parallel adversarial: Blind Hunter, Edge Case Hunter, Acceptance Auditor). AC2–AC6 confirmed satisfied in code; **AC1 partial** — a structurally malformed ID token returns 500 instead of 401 (Patch 1). No Story 3.2 contract regressions. All patch findings verified against source.

**Patch (fix before done) — all resolved 2026-07-03:**
- [x] [Review][Patch] Malformed Google ID token → 500 `INTERNAL_ERROR` instead of 401 `INVALID_GOOGLE_TOKEN` (violates AC1 "malformed → 401") — `verify()` caught only `GeneralSecurityException | IOException`, but `GoogleIdTokenVerifier.verify()` throws unchecked `IllegalArgumentException` on a structurally malformed token. **Resolved:** `GoogleTokenVerifierImpl.verify()` now also catches `IllegalArgumentException` → `invalidGoogleToken()`; new `GoogleTokenVerifierImplTest.malformed_token_illegal_argument_throws_invalid_google_token`. [GoogleTokenVerifierImpl.java]
- [x] [Review][Patch] Concurrent first-time Google sign-in → 500 not clean login — new-user branch `saveAndFlush` had no `DataIntegrityViolationException` guard. **Resolved:** the create path now catches `DataIntegrityViolationException` → `AuthException.googleAccountConflict()` (409 `GOOGLE_ACCOUNT_CONFLICT`), mirroring `register()`. (Deliberately maps to a clean 409 rather than an in-transaction re-read, which is unreliable after a flush violation marks the JPA tx rollback-only; the winning request already logged the user in.) New test `concurrent_new_google_user_db_violation_returns_409_not_500`. [AuthService.java, AuthException.java]
- [x] [Review][Patch] Verified token with null/blank email → 500 — no email-presence guard. **Resolved:** guard is now `!claims.emailVerified() || !StringUtils.hasText(claims.email())` → `invalidGoogleToken()`; new test `verified_token_with_null_email_returns_401_invalid_google_token`. [AuthService.java]
- [x] [Review][Patch] Email-link path overwrote an existing, different `google_id`. **Resolved:** link now only occurs when `existing.getGoogleId() == null`; a mismatched already-linked account logs in by verified email without clobbering. New test `email_row_already_linked_to_different_google_id_logs_in_without_overwriting`. [AuthService.java]
- [x] [Review][Patch] `@Size(max = 2048)` on `idToken` could reject valid Google tokens. **Resolved:** raised to `@Size(max = 8192)`. [GoogleAuthRequestDto.java]
- [x] [Review][Patch] Frontend: `undefined` credential silently POSTed as `{}`. **Resolved:** guards `credentialResponse.credential` before fetch, calling `onError(new Error('GOOGLE_AUTH_FAILED'))` when absent. [GoogleAuthButton.tsx]

**Deferred (pre-existing from Story 3.2 — already tracked in `deferred-work.md`, re-surfaced here):**
- [x] [Review][Defer] `RateLimitFilter` trusts a spoofable `X-Forwarded-For` first hop (bypass) + unbounded bucket map (memory DoS) — also weakens AC5's `/google` coverage; v1 in-memory map is architecture-sanctioned [RateLimitFilter.java]
- [x] [Review][Defer] JWT secret has a committed base64 dev default with no prod fail-fast guard — deferred to Story 3.7 [application.yml]
- [x] [Review][Defer] Concurrent `refresh()` rotation race (no `@Version` optimistic lock) — acceptable for the v1 single-session model [AuthService.refresh / User.java]
- [x] [Review][Defer] Access-token role hardcoded `ROLE_FREE` (ignores subscription tier) — scoped to Story 3.5/3.6 premium enforcement [JwtService.generateAccessToken]

**Dismissed (1):** Rate limiter shares one 10/min budget across all `/api/v1/auth/*` per IP (NAT/CGNAT false positives) — a known trade-off of the sanctioned in-memory design; folded into the deferred rate-limiter item.
