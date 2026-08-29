# Story 3.2: Email/Password Auth

Status: done

## Dev Context

- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- Previous story: `_bmad-output/implementation-artifacts/3-1-backend-scaffold-and-database.md` (scaffold this builds on)
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md`

## Story

As a **user**,
I want to **register and log in with email and password**,
so that **I have an account and an authenticated session the app can use to gate premium features**.

## Acceptance Criteria

**AC1** — `POST /api/v1/auth/register` with a valid email + password creates a `users` row with a **bcrypt** `password_hash`, then returns an `AuthResponseDto` containing a **JWT access token** (HS256, 15-min expiry) in the body and sets a **7-day refresh token** as an `httpOnly` + `Secure` cookie. Duplicate email → `409 {"error":{"code":"EMAIL_ALREADY_EXISTS","status":409}}`. Invalid input (malformed email, password too short) → `400 {"error":{"code":"VALIDATION_ERROR","status":400}}`.

**AC2** — `POST /api/v1/auth/login` with valid credentials returns the same token pair (access token in body + refresh cookie). Invalid credentials → `401 {"error":{"code":"INVALID_CREDENTIALS","status":401}}`. A non-existent email and a wrong password return the **identical** `INVALID_CREDENTIALS` response (no user enumeration).

**AC3** — `POST /api/v1/auth/refresh` reads the refresh token from the `httpOnly` cookie, validates it, **rotates** it (the previously issued refresh token is invalidated), sets the new refresh cookie, and returns a fresh access token. Missing/invalid/expired refresh token → `401 {"error":{"code":"INVALID_REFRESH_TOKEN","status":401}}`.

**AC4** — `POST /api/v1/auth/logout` clears the refresh token cookie (expired `Set-Cookie`) and invalidates the current refresh token server-side. Returns `204 No Content`. Safe to call when already logged out.

**AC5** — A `JwtFilter` validates the `Authorization: Bearer <accessToken>` header on every request to a protected route, sets the Spring Security `Authentication` (with the `ROLE_FREE`/`ROLE_PREMIUM` authority from the token claim), and lets the request proceed. A protected route with a missing/invalid/expired access token → `401 {"error":{"code":"UNAUTHORIZED","status":401}}` rendered through the error envelope (NOT a bare Spring 403/HTML).

**AC6** — All `/api/v1/auth/*` endpoints are rate-limited via **Bucket4j** (token bucket, 10 requests/min per client IP). Exceeding the limit → `429 {"error":{"code":"RATE_LIMITED","status":429}}`.

**AC7** — `GET /api/v1/users/me` returns the authenticated user's `UserResponseDto` (`id`, `email`, `name`) — proves the access token + `JwtFilter` round-trip end-to-end. Unauthenticated → `401` via the error envelope.

## Tasks / Subtasks

- [x] **Task 1: Dependencies & JWT config (AC: 1, 5, 6)**
  - [x] Add to `backend/pom.xml`: `io.jsonwebtoken:jjwt-api`, `io.jsonwebtoken:jjwt-impl` (runtime), `io.jsonwebtoken:jjwt-jackson` (runtime) — pin a single `<jjwt.version>` property (verify latest stable 0.12.x on Maven Central; current is `0.12.6`). See Dev Notes for the 0.12.x API.
  - [x] Add Bucket4j core dependency (verify latest stable coordinate — see Dev Notes; do NOT guess the artifactId, confirm on Maven Central).
  - [x] Add JWT config to `application.yml` under an `app.jwt` block: `secret: ${JWT_SECRET:<dev-only-256-bit-base64>}`, `access-token-ttl: 15m`, `refresh-token-ttl: 7d`. Bind via a `@ConfigurationProperties("app.jwt")` record/class.
  - [x] `./mvnw compile` succeeds.

- [x] **Task 2: V4 migration — refresh-token invalidation column (AC: 3, 4)**
  - [x] Create `backend/src/main/resources/db/migration/V4__add_user_token_version.sql` — adds `token_version INT NOT NULL DEFAULT 0` to `users`. (Next free version is **V4**: V3 is `unique_subscription_user` from the 3.1 code review — see Dev Notes "Migration numbering".)
  - [x] Add `tokenVersion` field to `User` entity (`@Column(nullable = false)`, default `0`; use `@Builder.Default private int tokenVersion = 0;`).

- [x] **Task 3: UserRepository + password encoder (AC: 1, 2)**
  - [x] Create `repository/UserRepository extends JpaRepository<User, Long>` with `Optional<User> findByEmail(String email)` and `boolean existsByEmail(String email)`.
  - [x] Expose a `BCryptPasswordEncoder` `@Bean` (in `SecurityConfig` or a `PasswordConfig`).

- [x] **Task 4: JwtService (AC: 1, 3, 5)**
  - [x] Create `security/JwtService` — `generateAccessToken(User)` (subject = user id, claims: `email`, `role` = `ROLE_FREE` for now), `generateRefreshToken(User)` (claim: `tokenVersion`), `parseAndValidate(token)`, and typed extractors. Use the jjwt 0.12.x builder/parser API (see Dev Notes).
  - [x] Sign with an HMAC-SHA key derived from `app.jwt.secret` (`Keys.hmacShaKeyFor(...)`).

- [x] **Task 5: AuthService + DTOs (AC: 1, 2, 3, 4)**
  - [x] Create DTOs in `dto/`: `RegisterRequestDto` (email, password, optional name — Jakarta Validation: `@Email`, `@Size(min=8)`), `LoginRequestDto` (email, password), `AuthResponseDto` (accessToken, UserResponseDto), `UserResponseDto` (id, email, name).
  - [x] Create `service/AuthService` — `register`, `login`, `refresh`, `logout`. Refresh rotation: validate refresh token's `tokenVersion` == `user.tokenVersion`, then **increment** `user.tokenVersion` (invalidating the old token) and issue a new refresh token carrying the new version. Logout: increment `tokenVersion`.
  - [x] bcrypt-hash passwords on register; compare on login with the encoder.

- [x] **Task 6: Exception infrastructure + error envelope (AC: 1–7)**
  - [x] Create `exception/GuitarAppException` (base: `code`, `message`, `HttpStatus`), `exception/AuthException` (extends base), and `exception/GlobalExceptionHandler` (`@RestControllerAdvice`) that renders the standard envelope `{"error":{"code","message","status"}}` for `GuitarAppException`, `MethodArgumentNotValidException` (→ `VALIDATION_ERROR`/400), and a fallback 500. NO stack traces in responses.
  - [x] This is the project's first `GlobalExceptionHandler` — it satisfies the deferred 3.1 finding (bare 403 → error envelope).

- [x] **Task 7: AuthController + UserController (AC: 1–5, 7)**
  - [x] Create `controller/AuthController` (`@RequestMapping("/api/v1/auth")`): `register`, `login`, `refresh`, `logout`. Set/clear the refresh cookie via `ResponseCookie` (`httpOnly(true).secure(true).path("/api/v1/auth").sameSite("Strict")`).
  - [x] Create `controller/UserController` (`@GetMapping("/api/v1/users/me")`) returning `UserResponseDto` from the authenticated principal.

- [x] **Task 8: JwtFilter + extend SecurityConfig (AC: 5, 7)**
  - [x] Create `security/JwtFilter extends OncePerRequestFilter` — reads `Authorization: Bearer`, validates via `JwtService`, builds an `Authentication` with the role authority, sets `SecurityContextHolder`. On invalid token, do NOT throw — let the request reach the entry point as unauthenticated.
  - [x] **Extend** (do not rewrite) `SecurityConfig`: permit `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout` and keep `/api/v1/health` permitted; everything else `authenticated()`. Add `.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)`. Add an `authenticationEntryPoint` that writes the `UNAUTHORIZED`/401 error envelope (resolves the deferred 3.1 finding). Keep CSRF disabled + STATELESS.

- [x] **Task 9: Bucket4j rate-limit filter (AC: 6)**
  - [x] Create `security/RateLimitFilter` (or config) applying a per-IP token bucket (10/min) to `/api/v1/auth/*`. On exhaustion, write the `RATE_LIMITED`/429 envelope. Register it before `JwtFilter`. Keep buckets in an in-memory `ConcurrentHashMap<String, Bucket>` (no Redis — per architecture).

- [x] **Task 10: Tests (AC: 1–7)**
  - [x] `AuthControllerTest` (`@WebMvcTest` + `@Import(SecurityConfig...)` or `@SpringBootTest` with mocked service): register success → 200 + access token + Set-Cookie; login invalid → 401 `INVALID_CREDENTIALS`; duplicate email → 409.
  - [x] `JwtServiceTest` (pure unit): round-trip generate→parse; expired token rejected; tampered signature rejected.
  - [x] `JwtFilterTest`: valid Bearer → `/users/me` 200; missing/invalid → 401 envelope.
  - [x] Rate-limit test: 11th request within a minute → 429.
  - [x] `./mvnw test` → all pass. (DB-backed integration tests with Testcontainers remain deferred to Story 3.7.)

- [x] **Task 11: Runtime validation (AC: 1–7)**
  - [x] `docker compose up postgres -d`, then `./mvnw spring-boot:run`; confirm V4 applies.
  - [x] `curl` register → 200 + token; login → 200; `/users/me` with Bearer → 200; bad password → 401 envelope; spam 11×/min → 429.

## Dev Notes

### What already exists (from Story 3.1) — extend, do not recreate

- `model/User.java` — `id, email (unique, not null), passwordHash (nullable), googleId (unique nullable), name, createdAt (@CreationTimestamp)`. **Add `tokenVersion` here.**
- `model/Subscription.java` — `@OneToOne` to User; `status` defaults `"FREE"`. Not modified in this story (subscription enforcement is 3.6); leave as-is.
- `security/SecurityConfig.java` — currently permits `/api/v1/health`, `anyRequest().authenticated()`, CSRF off, STATELESS, httpBasic off. **Extend this exact bean** — add the auth permits, `JwtFilter`, `RateLimitFilter`, and the `authenticationEntryPoint`.
- `controller/HealthController.java` — leave as-is.
- `application.yml` — datasource + JPA + Flyway already configured. **Add the `app.jwt` block.**
- `GlobalExceptionHandler` does **not** exist yet — create it in this story.

### Migration numbering (IMPORTANT)

The architecture distillate plans `V3__create_custom_tunings` / `V4__create_saved_sessions`, but **V3 is already taken** by `V3__unique_subscription_user.sql` (added in the 3.1 code review). So:
- This story uses **`V4__add_user_token_version.sql`**.
- Epic 4's custom-tunings / saved-sessions migrations must be **renumbered to V5/V6** when those stories are built. Flyway orders by version number; the file names from the architecture doc are guidance, not contracts.

### Refresh-token rotation/invalidation — chosen approach

AC3/AC4 require the old refresh token to be invalidated on rotate/logout, which needs server-side state. **Chosen: a `token_version` integer on `users`** (minimal, aligns with the architecture's stateless ethos + the explicit rejection of Redis):
- Refresh token embeds `tokenVersion`. On refresh: check `claim.tokenVersion == user.tokenVersion`, then `user.tokenVersion++` and issue a new refresh token with the incremented value → the just-used token is now stale.
- Logout: `user.tokenVersion++` and clear the cookie.
- Trade-off: one active refresh chain per user (a new login elsewhere supersedes older sessions). Acceptable for v1; a per-device `refresh_tokens` table can replace it later if multi-device sessions are needed. **(See open question Q1.)**

### jjwt 0.12.x API (breaking vs older guides)

```java
// build
String jwt = Jwts.builder()
    .subject(user.getId().toString())
    .claim("email", user.getEmail())
    .claim("role", "ROLE_FREE")
    .issuedAt(now)
    .expiration(exp)
    .signWith(key)            // key = Keys.hmacShaKeyFor(secretBytes)
    .compact();

// parse + verify
Jws<Claims> jws = Jwts.parser()
    .verifyWith(key)
    .build()
    .parseSignedClaims(jwt);  // throws JwtException on invalid/expired
Claims claims = jws.getPayload();
```
`app.jwt.secret` must be ≥256 bits for HS256. Provide a base64 dev default in `application.yml`; real secret comes from `JWT_SECRET` env (Railway) per Story 3.7.

### Security & API contracts (from architecture)

- Access token: HS256, 15-min, stateless (no DB lookup per request). Role claim `ROLE_FREE`/`ROLE_PREMIUM` — this story only issues `ROLE_FREE` (subscription wiring is 3.5/3.6).
- Error envelope: `{ "error": { "code": SCREAMING_SNAKE_CASE, "message": "...", "status": <int> } }`. Frontend branches on `code`, not `status`.
- JSON fields camelCase (Jackson default). Dates ISO-8601 UTC.
- Route surface is **fixed** — only the auth routes + `/users/me` listed in the architecture. Do not invent endpoints.
- Rate limiting: auth endpoints only, Bucket4j token bucket, 10 req/min per IP. Other endpoints are stateless — no limiter.
- `@PreAuthorize("hasRole('PREMIUM')")` enforcement is **out of scope** here (Story 3.6).

### Bucket4j note

Bucket4j's Maven coordinates changed across 8.x (the JDK-specific `bucket4j_jdk17-core` split). **Verify the current artifactId/version on Maven Central before adding** — do not copy a version blindly. A simple in-memory `ConcurrentHashMap<String, Bucket>` keyed by client IP is sufficient; resolve client IP from `X-Forwarded-For` (Railway proxy) falling back to `request.getRemoteAddr()`.

### Cookie specifics

`ResponseCookie.from("refresh_token", token).httpOnly(true).secure(true).sameSite("Strict").path("/api/v1/auth").maxAge(Duration.ofDays(7)).build()` → add via `HttpHeaders.SET_COOKIE`. Logout sets `maxAge(0)`. `path=/api/v1/auth` so the cookie is only sent to auth endpoints (refresh/logout).

### Testing standards

- `@WebMvcTest` for controller slices (mock the service layer); pure JUnit for `JwtService`. Follow the 3.1 `HealthControllerTest` pattern (`@Import(SecurityConfig.class)` so the real chain is exercised) — but note `JwtFilter`/`RateLimitFilter` beans must be available or mocked in the slice.
- Testcontainers / full DB integration remains deferred to Story 3.7.

### Project Structure Notes

New backend files land in the package layout already defined: `controller/`, `service/`, `repository/`, `dto/`, `security/`, `exception/`. This matches `architecture.distillate.md` §Backend Directory Structure exactly. No frontend work in this story (frontend auth integration is Story 3.4).

### References

- [Source: epics.distillate.md#Story 3.2: Email/Password Auth] — ACs
- [Source: architecture.distillate.md#Auth & Security Architecture] — JWT pair, rotation, Bucket4j, role claims
- [Source: architecture.distillate.md#API Design] — route surface, error envelope, JSON/date conventions
- [Source: architecture.distillate.md#Backend Directory Structure] — package layout + suffixes
- [Source: 3-1-backend-scaffold-and-database.md#Review Findings] — deferred: bare-403 → error envelope (resolved here via entry point)

## Open Questions (resolve before/at dev kickoff)

- **Q1 (refresh-token strategy):** Confirm the `token_version`-column approach (single active session per user, no new table) vs. a dedicated `refresh_tokens` table (multi-device sessions + reuse detection). Story assumes `token_version`. *(If you want multi-device now, say so and the migration/AC3 change is small.)*
- **Q2 (register `name`):** `users.name` is nullable. Should `RegisterRequestDto.name` be required, optional, or omitted entirely for email/password (collected later)? Story assumes **optional**.
- **Q3 (CORS):** `config/CorsConfig` is in the architecture but not yet created. The frontend (Vercel) will call this API cross-origin in Story 3.4. Add CORS now (allow the Vercel origin + credentials for the cookie) or defer to 3.4? Story currently **defers CORS to 3.4** — flag if you'd rather wire it here so the refresh cookie works cross-site sooner.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Dev Story workflow)

### Debug Log References

- `backend/target/app-run.log` — Spring Boot runtime; confirms Flyway "Migrating schema public to version 4 - add user token version" → "now at version v4".
- `backend/target/surefire-reports/` — JUnit results (15 tests, all pass).

### Completion Notes List

- **Open questions resolved at kickoff** (story defaults confirmed by user): Q1 → `token_version` column (single active refresh chain per user); Q2 → register `name` optional; Q3 → CORS deferred to Story 3.4.
- **Dependencies** pinned: `jjwt 0.12.6` (api compile + impl/jackson runtime), `bucket4j_jdk17-core 8.14.0` (JDK17+ variant for Java 21) — versions verified on Maven Central.
- **First `GlobalExceptionHandler`** created (envelope `{"error":{"code,message,status}}`). `RestAuthenticationEntryPoint` + `ErrorResponseWriter` render the same envelope from the filter/entry-point layer, resolving the deferred Story 3.1 finding (bare 403/HTML → `UNAUTHORIZED` 401 envelope). Verified at runtime via curl.
- **Filters** (`JwtFilter`, `RateLimitFilter`) are constructed inside `SecurityConfig` rather than registered as beans, to keep them out of the servlet container's global auto-registration and confine them to the security chain.
- **Refresh rotation/logout** invalidation via `user.tokenVersion` (incremented on refresh + logout); logout is a safe no-op when the cookie is missing/invalid. Cookie: `httpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`.
- **Migration numbering**: used `V4` (V3 was taken by the 3.1 review's `unique_subscription_user`). Epic 4 custom-tunings/saved-sessions must renumber to V5/V6.
- **Testing environment note**: the test JVM is **Java 25** (Temurin 25.0.3) even though the project targets Java 21. Mockito's Byte Buddy backend cannot instrument *concrete* classes on Java 25, so `AuthService` (a class) is exercised *directly* with a mocked `UserRepository` (an interface — mocks fine via JDK proxy) rather than being mocked. Web-layer tests use a shared `@SpringBootTest` base (`WebMockTestBase`) that excludes DB auto-config and mocks `UserRepository`; `HealthControllerTest` and `GuitarAppApplicationTests` were updated to match. Full DB-backed (Testcontainers) integration remains deferred to Story 3.7.
- **Runtime validation (curl, real Postgres 16):** register → 200 + access token + refresh cookie; login → 200; `/users/me` w/ Bearer → 200; unauthenticated → 401 `UNAUTHORIZED` envelope; bad password → 401 `INVALID_CREDENTIALS`; 11th request/min on one IP → 429 `RATE_LIMITED`. V4 applied cleanly.
- **Tests:** 15 pass (`JwtServiceTest` 5, `JwtFilterTest` 3, `AuthControllerTest` 4, `RateLimitFilterTest` 1, plus health + context smoke).
- **Code-review follow-up (2026-06-25):** all 5 [Review][Patch] items resolved. Test suite expanded to **28 pass** (`JwtServiceTest` 7 — added extractor-guard tests for the malformed-refresh-token path; `AuthControllerTest` 15 — added refresh-rotation, refresh-stale-version, refresh-missing-cookie, refresh-with-access-token, logout-invalidates, logout-idempotent, logout-with-access-token, concurrent-duplicate-DB-violation, email-case-normalization, oversized-email; existing `JwtFilterTest` 3, `RateLimitFilterTest` 1, `HealthControllerTest` 1, app context smoke 1). To keep the Bucket4j buckets — which live in a `ConcurrentHashMap` inside the shared Spring test context — from leaking 429s between tests, each `AuthControllerTest` method is assigned a deterministic unique IP in `@BeforeEach`.

### File List

**New — main:**
- `backend/src/main/java/com/guitarapp/config/JwtProperties.java`
- `backend/src/main/java/com/guitarapp/config/PasswordConfig.java`
- `backend/src/main/java/com/guitarapp/repository/UserRepository.java`
- `backend/src/main/java/com/guitarapp/security/JwtService.java`
- `backend/src/main/java/com/guitarapp/security/JwtFilter.java`
- `backend/src/main/java/com/guitarapp/security/RateLimitFilter.java`
- `backend/src/main/java/com/guitarapp/security/RestAuthenticationEntryPoint.java`
- `backend/src/main/java/com/guitarapp/service/AuthService.java`
- `backend/src/main/java/com/guitarapp/dto/RegisterRequestDto.java`
- `backend/src/main/java/com/guitarapp/dto/LoginRequestDto.java`
- `backend/src/main/java/com/guitarapp/dto/AuthResponseDto.java`
- `backend/src/main/java/com/guitarapp/dto/UserResponseDto.java`
- `backend/src/main/java/com/guitarapp/dto/ErrorResponse.java`
- `backend/src/main/java/com/guitarapp/exception/GuitarAppException.java`
- `backend/src/main/java/com/guitarapp/exception/AuthException.java`
- `backend/src/main/java/com/guitarapp/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/guitarapp/exception/ErrorResponseWriter.java`
- `backend/src/main/java/com/guitarapp/controller/AuthController.java`
- `backend/src/main/java/com/guitarapp/controller/UserController.java`
- `backend/src/main/resources/db/migration/V4__add_user_token_version.sql`

**New — test:**
- `backend/src/test/java/com/guitarapp/support/WebMockTestBase.java`
- `backend/src/test/java/com/guitarapp/security/JwtServiceTest.java`
- `backend/src/test/java/com/guitarapp/security/JwtFilterTest.java`
- `backend/src/test/java/com/guitarapp/security/RateLimitFilterTest.java`
- `backend/src/test/java/com/guitarapp/controller/AuthControllerTest.java`

**Modified:**
- `backend/pom.xml` — jjwt + bucket4j deps/properties
- `backend/src/main/resources/application.yml` — `app.jwt` block
- `backend/src/main/java/com/guitarapp/GuitarAppApplication.java` — `@ConfigurationPropertiesScan`
- `backend/src/main/java/com/guitarapp/model/User.java` — `tokenVersion` field
- `backend/src/main/java/com/guitarapp/security/SecurityConfig.java` — auth permits, JWT + rate-limit filters, entry point
- `backend/src/test/java/com/guitarapp/controller/HealthControllerTest.java` — migrated to `WebMockTestBase`
- `backend/src/test/java/com/guitarapp/GuitarAppApplicationTests.java` — mock `UserRepository`

**Modified — review follow-up (2026-06-25):**
- `backend/src/main/java/com/guitarapp/security/JwtService.java` — `extractUserId`/`extractTokenVersion` throw `JwtException` on missing/non-numeric claims (Patch 1)
- `backend/src/main/java/com/guitarapp/service/AuthService.java` — `RefreshClaims` record wraps extractor calls inside the `JwtException` catch; `register` uses `saveAndFlush` + `DataIntegrityViolationException` → 409; `normalizeEmail` applied at register/login (Patches 1–3)
- `backend/src/main/java/com/guitarapp/dto/RegisterRequestDto.java` — `@Size(max=255)` on email, password, name (Patch 4)
- `backend/src/test/java/com/guitarapp/security/JwtServiceTest.java` — added extractor-guard tests (Patch 5)
- `backend/src/test/java/com/guitarapp/controller/AuthControllerTest.java` — refresh-rotation, refresh-stale, refresh-missing, refresh-with-access-token, logout, logout-idempotent, logout-with-access-token, concurrent-DB-violation, email-normalization, oversized-email; per-test unique IP to prevent Bucket4j leakage (Patch 5)

## Change Log

| Date | Change |
|---|---|
| 2026-06-17 | Implemented Story 3.2 (email/password auth): JWT pair + refresh rotation, `JwtFilter`, Bucket4j rate limiting, `GlobalExceptionHandler` + error envelope (resolves deferred 3.1 bare-403 finding), `/users/me`. V4 migration adds `users.token_version`. 15 tests pass; runtime-validated against Postgres 16. Status → review. |
| 2026-06-25 | Addressed code review findings — 5 items resolved (malformed-refresh 500→401, concurrent-duplicate 500→409, email normalization, `@Size(max=255)`, refresh/logout test coverage). 28 tests pass. Status → review. |

### Review Findings

Code review 2026-06-17 (parallel adversarial: Blind Hunter, Edge Case Hunter, Acceptance Auditor). All 7 ACs + spec constraints confirmed satisfied in code; findings are robustness/security hardening + one test-coverage gap.

**Patch (fix before done):**
- [x] [Review][Patch] Refresh/logout return 500 instead of 401 when a token lacking a `tokenVersion` claim (valid access token) or with a non-numeric subject is sent as the refresh cookie — NPE/`NumberFormatException` escapes the `JwtException` catch [`JwtService.java`, `AuthService.refresh/logout`] — **Resolved:** `JwtService.extractUserId`/`extractTokenVersion` now throw `JwtException` on missing/non-numeric claims; `AuthService` parses both extractors inside the existing `try/catch (JwtException)` (via a `RefreshClaims` record), so refresh → 401 and logout → 204 idempotent.
- [x] [Review][Patch] Concurrent duplicate registration → 500 not 409; DB unique violation not mapped to `EMAIL_ALREADY_EXISTS` [`AuthService.register`] — **Resolved:** register now uses `saveAndFlush` and catches `DataIntegrityViolationException` → `EMAIL_ALREADY_EXISTS` (409).
- [x] [Review][Patch] Email not normalized (case-sensitive) → duplicate accounts / login fails for differing case [`AuthService.register/login`] — **Resolved:** `normalizeEmail` (trim + `toLowerCase(Locale.ROOT)`) applied at register and login.
- [x] [Review][Patch] Email/name > 255 chars → 500 not 400; add `@Size(max=255)` [`RegisterRequestDto.java`] — **Resolved:** `@Size(max=255)` added to `email`, `password`, and `name`.
- [x] [Review][Patch] No automated tests for refresh rotation (AC3) or logout invalidation/idempotency (AC4) — implemented + manually curl-checked only [`AuthControllerTest.java`] — **Resolved:** added `refresh_rotates_token_version_and_returns_new_access_token`, `refresh_with_stale_token_version_returns_401`, `refresh_with_missing_cookie_returns_401`, `refresh_with_access_token_returns_401_not_500`, `logout_invalidates_token_version_and_clears_cookie`, `logout_is_idempotent_when_already_logged_out`, `logout_with_access_token_is_idempotent_not_500`, plus regression tests for patches 2–4.

**Deferred (tracked in deferred-work.md):**
- [x] [Review][Defer] Rate limiter trusts spoofable `X-Forwarded-For` + unbounded bucket map [`RateLimitFilter.java`] — deferred; architecture sanctioned the simple in-memory map for v1
- [x] [Review][Defer] `SameSite=Strict` refresh cookie will break cross-site refresh from Vercel [`AuthController.java`] — deferred to Story 3.4 (→ `SameSite=None; Secure`)
- [x] [Review][Defer] JWT secret has committed dev default; no prod fail-fast guard [`application.yml`] — deferred to Story 3.7
- [x] [Review][Defer] Concurrent-refresh race; no `@Version` optimistic lock [`User.java`] — acceptable for v1 single-session (Q1); revisit with multi-device
- [x] [Review][Defer] Login timing-based user enumeration (no dummy hash on not-found) [`AuthService.login`] — security hardening, low priority
- [x] [Review][Defer] CSRF disabled on cookie refresh endpoint [`SecurityConfig.java`] — coupled to SameSite; revisit in Story 3.4
- [x] [Review][Defer] `secure(true)` cookie breaks local HTTP dev [`AuthController.java`] — make profile-aware in Story 3.4
- [x] [Review][Defer] V3 migration has no dedup before adding UNIQUE constraint [`V3__unique_subscription_user.sql`] — 3.1 carryover, low value

**Dismissed (4):** validation message echoing field names (conventional); hardcoded `ROLE_FREE` (scoped to 3.5/3.6); `Subscription.java` edit (3.1 carryover); `JwtFilter` null-claim NPE (not reachable — all minted tokens carry the claims).

### Review Findings (Pass 2 — 2026-06-25)

Code review second pass (parallel adversarial: Blind Hunter, Edge Case Hunter, Acceptance Auditor). All prior patch items confirmed resolved.

**Patch (fix before done):**
- [x] [Review][Patch] BCrypt 72-byte truncation unenforced — `@Size(max=255)` on `password` allows inputs BCrypt silently truncates at 72 bytes; two passwords sharing the same first 72 bytes produce the same hash (authentication bypass) [`RegisterRequestDto.java`] — **Resolved:** `@Size(max=72, message="must be between 8 and 72 characters")` on `RegisterRequestDto.password`; `LoginRequestDto.password` also capped to 72.
- [x] [Review][Patch] Malformed JSON body returns 500 INTERNAL_ERROR instead of 400 VALIDATION_ERROR — `HttpMessageNotReadableException` not caught by `GlobalExceptionHandler` [`GlobalExceptionHandler.java`] — **Resolved:** added `@ExceptionHandler(HttpMessageNotReadableException.class)` returning `VALIDATION_ERROR`/400.
- [x] [Review][Patch] `GlobalExceptionHandler.handleUnexpected` swallows exceptions with no logging — unhandled exceptions produce zero log output, making production debugging impossible [`GlobalExceptionHandler.java`] — **Resolved:** added `log.error("Unhandled exception", ex)` in `handleUnexpected`.
- [x] [Review][Patch] `LoginRequestDto` missing `@Size(max=255)` on `email` and `password` — `RegisterRequestDto` caps both fields but `LoginRequestDto` does not, enabling large-input BCrypt DoS [`LoginRequestDto.java`] — **Resolved:** added `@Size(max=255)` on `email` and `@Size(max=72)` on `password` (matches register cap); `@Size` import added.

**Deferred (tracked in deferred-work.md):**
- [x] [Review][Defer] `JwtFilter.extractRole` returns null for tokens missing the `role` claim; `SimpleGrantedAuthority(null)` throws `IllegalArgumentException` caught by the filter's broad catch — correct 401 outcome but by coincidence, not explicit guard [`JwtFilter.java`] — deferred, latent fragility not a current bug
- [x] [Review][Defer] Bearer scheme check is case-sensitive (`startsWith("Bearer ")`) — RFC 6750 makes the scheme name case-insensitive [`JwtFilter.java`] — deferred, all standard clients send `Bearer` exactly
- [x] [Review][Defer] `AuthController.refresh()` does not clear the refresh cookie on failure — dead cookie persists in the browser until natural expiry [`AuthController.java`] — deferred to Story 3.4 (frontend 401 detection compensates)
- [x] [Review][Defer] No `AccessDeniedHandler` registered in `SecurityConfig` — future `hasRole(...)` rules (Story 3.5/3.6) will produce HTML 403 instead of the JSON error envelope [`SecurityConfig.java`] — deferred to Story 3.5/3.6

**Dismissed (2):** ROLE_FREE hardcoded (scoped to 3.5/3.6, previously dismissed in pass 1); `JwtProperties` bean registration (false positive — `@ConfigurationPropertiesScan` on `GuitarAppApplication.java` handles it).
