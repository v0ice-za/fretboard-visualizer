# Story 3.5: Stripe Checkout & Webhook

Status: in-progress (Task 13 manual gate pending — see Dev Agent Record)

## Dev Context

- Architecture: `_bmad-output/planning-artifacts/architecture.distillate.md`
- Epics: `_bmad-output/planning-artifacts/epics.distillate.md`
- UX: `_bmad-output/planning-artifacts/ux-design-specification.distillate.md`
- Previous story: `_bmad-output/implementation-artifacts/3-4-frontend-auth-integration.md` (auth stack this story builds on: `apiClient`, `useAuthStore`, `useSubscription`/`useSubscriptionStore`, `SubscriptionController`/`SubscriptionResponseDto`)
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md`

**Uncommitted working-tree state:** at story creation time, the 3.4 code-review patches (14 patches across `apiClient.ts`, `authStore.ts`, `RateLimitFilter.java`, `CookieProperties.java`, etc. — see 3.4's Review Findings) are modified/untracked in the working tree but **not yet committed** on `feat/epic-3-auth`. This story's dev agent inherits that tree as-is; it is not this story's concern to commit them, but be aware the "last commit" (`be1c2d9`) does not reflect the current file contents for those paths.

## Story

As a **user**,
I want to **subscribe via secure Stripe checkout and have premium unlock immediately after payment**,
so that **I can pay for the app once a year and get premium access without any manual/server-side intervention**.

## Acceptance Criteria

**AC1 — Checkout initiation.** An authenticated user clicking the "Upgrade" CTA in `PaywallCard` triggers `POST /api/v1/checkout/session` (via `apiClient`, as a TanStack Query `useMutation`). If the user is **not** authenticated, clicking "Upgrade" opens the sign-in overlay instead of calling checkout (UX spec: "CTA triggers auth if unauthenticated") — it does not call the endpoint.

**AC2 — Checkout session creation.** Backend creates a Stripe Checkout Session (`mode=subscription`, the single `$12/yr` Price from `app.stripe.price-id`, `client_reference_id=<userId>`) and returns `{ "url": "https://checkout.stripe.com/..." }`. If the user already has a `stripeCustomerId` on file (a prior checkout attempt), reuse it (`setCustomer`); otherwise pass `setCustomerEmail(user.email)` and let Stripe create the customer.

**AC3 — Redirect to Stripe.** On success, the frontend does a full-page redirect (`window.location.href = url`) to the Stripe-hosted page — no card data ever reaches the backend, no Stripe.js/Elements needed (this is redirect-based Checkout, not embedded).

**AC4 — Webhook receives and verifies.** `POST /api/v1/webhooks/stripe` is `permitAll` (no JWT — Stripe doesn't send one) but verifies the `Stripe-Signature` header against the **raw** request body using `app.stripe.webhook-secret` before trusting the payload. An invalid/missing signature → 400, event is not processed.

**AC5 — Idempotent processing.** The same Stripe event ID processed twice has no side effect. A `processed_stripe_events` table (new migration) records handled event IDs; a duplicate delivery is detected and skipped.

**AC6 — `checkout.session.completed` → activate.** On this event: resolve the user via `client_reference_id`, fetch the completed Checkout Session's `customer` and `subscription` IDs, retrieve the Stripe Subscription to read its `current_period_end`, and upsert the user's `subscriptions` row: `status="ACTIVE"`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end` set. (No row exists yet for any current user per 3.4 — this is the first writer.)

**AC7 — `customer.subscription.updated` / `customer.subscription.deleted` → sync status.** Locate the subscription row by `stripe_subscription_id` and set our `status` from the **Stripe subscription object's own `status` field** (`active`/`trialing` → `ACTIVE`, anything else — `canceled`, `unpaid`, `incomplete_expired`, etc. — → `EXPIRED`), updating `current_period_end` from the same object. See Open Question Q1 for why this derives from the actual Stripe status rather than blindly setting `EXPIRED` for every `updated` event.

## Tasks / Subtasks

- [x] **Task 1: Stripe SDK + config (AC: 2, 4)**
  - [x] Add to `backend/pom.xml`: `<stripe-java.version>33.3.0</stripe-java.version>` property (verify the current stable release at [mvnrepository.com/artifact/com.stripe/stripe-java](https://mvnrepository.com/artifact/com.stripe/stripe-java) before pinning — 33.x was current as of this story's research) and a `com.stripe:stripe-java:${stripe-java.version}` dependency.
  - [x] Create `config/StripeProperties.java`: `@ConfigurationProperties("app.stripe") record StripeProperties(String secretKey, String webhookSecret, String priceId)`. Mirror `GoogleProperties`' doc-comment style. No dev fallback for any of the three (same pattern as `GOOGLE_CLIENT_ID`) — real secrets must come from env.
  - [x] Create `config/FrontendProperties.java`: `@ConfigurationProperties("app.frontend") record FrontendProperties(String baseUrl)` — used to build the Checkout success/cancel URLs. Dev fallback `http://localhost:5173` (this is not a secret).
  - [x] `application.yml` additions:
    ```yaml
    app:
      stripe:
        secret-key: ${STRIPE_SECRET_KEY}
        webhook-secret: ${STRIPE_WEBHOOK_SECRET}
        price-id: ${STRIPE_PRICE_ID}
      frontend:
        base-url: ${FRONTEND_BASE_URL:http://localhost:5173}
    ```
  - [x] `@ConfigurationPropertiesScan` is already on `GuitarAppApplication` — no extra registration needed (same as `GoogleProperties`/`CookieProperties`).
  - [x] Set `Stripe.apiKey` once from `StripeProperties.secretKey()` in `StripeGatewayImpl`'s constructor (mirrors how `GoogleTokenVerifierImpl` builds its verifier from `GoogleProperties` in the constructor).

- [x] **Task 2: Idempotency table + model (AC: 5)**
  - [x] Create `backend/src/main/resources/db/migration/V5__create_processed_stripe_events.sql`. **V5 is next** — actual migrations are V1 (users), V2 (subscriptions), V3 (`unique_subscription_user`), V4 (`add_user_token_version`); the `architecture.distillate.md` mention of V3/V4 being `custom_tunings`/`saved_sessions` is stale (those didn't happen yet) — do not reuse V3/V4.
    ```sql
    CREATE TABLE processed_stripe_events (
        stripe_event_id VARCHAR(255) PRIMARY KEY,
        event_type      VARCHAR(100) NOT NULL,
        processed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    ```
  - [x] Create `model/ProcessedStripeEvent.java` (`@Entity`, `@Table(name = "processed_stripe_events")`, `@Id private String stripeEventId`, `eventType`, `@CreationTimestamp processedAt` — mirror `Subscription.java`'s Lombok annotations).
  - [x] Create `repository/ProcessedStripeEventRepository.java extends JpaRepository<ProcessedStripeEvent, String>` (inherited `existsById` is sufficient).

- [x] **Task 3: `StripeGateway` — mockable SDK boundary (AC: 2, 4, 6, 7)**
  - [x] Create `security/StripeGateway.java` (interface) — placed alongside `GoogleTokenVerifier` as the pattern to mirror: **declared as an interface specifically so it mocks cleanly on the Java 25 test JVM** (Byte Buddy cannot subclass concrete classes; the raw Stripe SDK classes are concrete with static methods and are NOT mockable directly).
    ```java
    public interface StripeGateway {
        String createCheckoutSession(Long userId, String customerEmail, String existingStripeCustomerId);
        Event constructWebhookEvent(String payload, String sigHeader); // com.stripe.model.Event
        StripeSubscriptionSnapshot retrieveSubscription(String stripeSubscriptionId);
    }
    ```
  - [x] Define `StripeSubscriptionSnapshot` as a small record (own type, not a leaked Stripe model — same reasoning as `GoogleTokenClaims`): `record StripeSubscriptionSnapshot(String subscriptionId, String customerId, String status, OffsetDateTime currentPeriodEnd)`.
  - [x] Create `security/StripeGatewayImpl.java implements StripeGateway`, `@Service`. Sets `Stripe.apiKey = stripeProperties.secretKey()` once in the constructor.
    - `createCheckoutSession`: builds `SessionCreateParams` — `setMode(SessionCreateParams.Mode.SUBSCRIPTION)`, one line item `{price: priceId, quantity: 1}`, `setClientReferenceId(userId.toString())`, `setSuccessUrl(frontendBaseUrl + "/?checkout=success")`, `setCancelUrl(frontendBaseUrl + "/?checkout=cancelled")`. If `existingStripeCustomerId` is non-null use `setCustomer(...)`, else `setCustomerEmail(customerEmail)`. Calls `Session.create(params)`; wrap `StripeException` → `PaymentException.checkoutFailed()`. Return `session.getUrl()`.
    - `constructWebhookEvent`: `Webhook.constructEvent(payload, sigHeader, webhookSecret)`; wrap `SignatureVerificationException` → `PaymentException.invalidSignature()`.
    - `retrieveSubscription`: `com.stripe.model.Subscription.retrieve(id)`; wrap `StripeException` → `PaymentException.checkoutFailed()` (retrieval failures at this point are a backend/Stripe-account misconfiguration, not user-facing). Map to `StripeSubscriptionSnapshot` — `current_period_end` is Unix seconds (`long`) on the Stripe object; convert via `Instant.ofEpochSecond(...).atOffset(ZoneOffset.UTC)`.

- [x] **Task 4: `PaymentException` (AC: 4)**
  - [x] Create `exception/PaymentException.java extends GuitarAppException` (mirror `AuthException`'s static-factory style): `checkoutFailed()` → `"CHECKOUT_SESSION_FAILED"`, 502 Bad Gateway; `invalidSignature()` → `"INVALID_STRIPE_SIGNATURE"`, 400 Bad Request.

- [x] **Task 5: Checkout endpoint (AC: 1, 2, 3)**
  - [x] Create `dto/CheckoutSessionResponseDto.java` — `record CheckoutSessionResponseDto(String url)`.
  - [x] Create `service/CheckoutService.java`: `createSession(Long userId)` — loads `User` (for email) via `UserRepository`, loads existing `Subscription` via `SubscriptionRepository.findByUserId` (may be absent — do not create a row here, only read the `stripeCustomerId` if a row happens to exist), calls `stripeGateway.createCheckoutSession(userId, user.getEmail(), existingCustomerId)`, wraps in `CheckoutSessionResponseDto`.
  - [x] Create `controller/CheckoutController.java`: `@PostMapping("/api/v1/checkout/session")`, reads `userId` from `Authentication#getPrincipal()` (same `(Long)` cast pattern as `UserController`/`SubscriptionController` — intentional mirror, a shared helper is a tracked future item, see `deferred-work.md`). **Not** permit-listed — `anyRequest().authenticated()` covers it, matching how `/subscriptions/me` needs no explicit entry.

- [x] **Task 6: Webhook endpoint + processing (AC: 4, 5, 6, 7)**
  - [x] Create `webhook/StripeWebhookHandler.java` (`@RestController`, matches `architecture.distillate.md`'s `webhook/` package). `@PostMapping("/api/v1/webhooks/stripe")` with `@RequestBody String payload` (Spring's `StringHttpMessageConverter` claims any content type ahead of Jackson when the target type is `String` — this is the standard way to get the **untouched raw body** Stripe's signature check requires; do not `@RequestBody` onto a DTO here, JSON parsing would corrupt what's hashed) and `@RequestHeader("Stripe-Signature") String sigHeader`. Calls `stripeGateway.constructWebhookEvent(payload, sigHeader)` then `stripeWebhookService.process(event)`. Returns `200 OK` (Stripe retries on non-2xx).
  - [x] Create `service/StripeWebhookService.java`:
    - `process(Event event)`: if `processedStripeEventRepository.existsById(event.getId())` → return (already handled — **check first, before any side effect**).
    - Dispatch on `event.getType()`: `"checkout.session.completed"` → `handleCheckoutCompleted`; `"customer.subscription.updated"`, `"customer.subscription.deleted"` → `handleSubscriptionChanged`; anything else → no-op (ignore unhandled event types, do not throw).
    - `handleCheckoutCompleted`: deserialize the event's data object as `com.stripe.model.checkout.Session` (via `event.getDataObjectDeserializer()`), read `getClientReferenceId()` → `Long userId`, `getCustomer()`, `getSubscription()`. Call `stripeGateway.retrieveSubscription(subscriptionId)` for `currentPeriodEnd`. Find-or-create the `Subscription` row by `userId` (first writer — no row exists yet per 3.4), set `stripeCustomerId`, `stripeSubscriptionId`, `status="ACTIVE"`, `currentPeriodEnd`, save.
    - `handleSubscriptionChanged`: deserialize as `com.stripe.model.Subscription`, get its id + the Stripe `status` string. Find our row by `stripeSubscriptionId`; if absent, log and skip (nothing to update — should not happen if `checkout.session.completed` always precedes these). Map Stripe status → ours (`active`/`trialing` → `ACTIVE`, else → `EXPIRED`), update `currentPeriodEnd` from `retrieveSubscription` (or directly off the deserialized object — both carry the field), save.
    - After the domain update succeeds, record the event: `processedStripeEventRepository.saveAndFlush(new ProcessedStripeEvent(event.getId(), event.getType()))`, catching `DataIntegrityViolationException` (a concurrent duplicate delivery raced the PK insert — the other request's write already applied, safe to ignore).
    - This ordering (idempotent domain write, *then* record the event) means a crash between the two on first delivery causes a harmless reprocess on Stripe's retry, rather than a silently-skipped real update.

- [x] **Task 7: Security config — permit the webhook (AC: 4)**
  - [x] `SecurityConfig.filterChain`: add `.requestMatchers(HttpMethod.POST, "/api/v1/webhooks/stripe").permitAll()` to the existing permit-list (alongside the auth endpoints and `/health`). `/api/v1/checkout/session` is **not** added here — it requires the Bearer token like every other authenticated endpoint.
  - [x] `RateLimitFilter.shouldNotFilter` already excludes everything outside `/api/v1/auth/*` — no change needed; the webhook and checkout endpoints are untouched by the auth rate limiter (acceptable for v1; Stripe's own retry behavior and signature verification are the abuse guard on the webhook).

- [x] **Task 8: Frontend — `loginModalOpen` lifted to `layoutStore` (AC: 1)**
  - [x] `stores/layoutStore.ts`: add `loginModalOpen: boolean` (default `false`), `openLoginModal: () => void`, `closeLoginModal: () => void` to the store (small global UI flag — same category of thing as `sidePanel`, not a new store).
  - [x] `components/ControlBar.tsx`: replace the local `const [loginOpen, setLoginOpen] = useState(false)` with reads/writes against `useLayoutStore` (`activeLayout` already destructures `setLayout`; use the new dedicated actions instead — don't shoehorn this into `setLayout`/`LayoutConfig`, it isn't part of the layout-zone config). The "Sign in" button and `<LoginModal open=... onOpenChange=...>` wiring both move to the store.

- [x] **Task 9: Frontend — `PaywallCard` Upgrade CTA (AC: 1, 3)**
  - [x] `types/api.ts`: add `export interface CheckoutSessionResponseDto { url: string }`.
  - [x] `components/shared/PaywallCard.tsx`: replace the `console.log('Upgrade clicked — wired in Story 3.5')` handler with a `useMutation` (TanStack Query — project convention, no raw `fetch`) calling `apiClient.post<CheckoutSessionResponseDto>('/checkout/session')`. On success: `window.location.href = data.url` (full-page redirect — do not use React Router). On error: inline rose/coral 12px error text in the card (matches `EmailAuthForm`'s inline-error styling) — map any code to a generic "Something went wrong — please try again" (no specific backend codes are user-actionable here). Button shows a spinner and is disabled while `isPending` (architecture: "button spinner from mutation `isPending`").
  - [x] Before calling the mutation, check `useAuthStore(selectIsAuthenticated)`: if `false`, call `useLayoutStore.getState().closeLoginModal` → no — call `openLoginModal()` and `onClose()` (dismiss the paywall) instead of firing the mutation.

- [x] **Task 10: Frontend — post-checkout return handling (AC: 6, 7)**
  - [x] In `App.jsx`, on mount, check `window.location.search` for `checkout=success`: if present, call `queryClient.invalidateQueries({ queryKey: subscriptionQueryKey })` (webhook processing is near-instant but not guaranteed to have landed before the redirect back completes — documented, acceptable v1 gap, not a polling loop) and strip the query param via `history.replaceState` (so a page refresh doesn't re-invalidate). No toast/UI feedback beyond the store update reaching `isPremium` — a full toast system is out of scope for this story (UX spec lists a "Premium unlocked" toast as a nice-to-have; no `Toast`/`sonner` primitive exists yet in `components/ui/` — do not add one here, note it in Dev Notes instead).

- [x] **Task 11: Backend tests (AC: 1–7)**
  - [x] `WebMockTestBase` + `GuitarAppApplicationTests`: add `"app.stripe.secret-key=sk_test_dummy"`, `"app.stripe.webhook-secret=whsec_dummy"`, `"app.stripe.price-id=price_dummy"` to the `@SpringBootTest(properties = {...})` block (same reason as the existing `app.google.client-id` dummy — `StripeProperties` has no dev fallback so the context won't start without it), and `@MockitoBean ProcessedStripeEventRepository` (same pattern as `SubscriptionRepository` in 3.4 — a web bean now depends on it).
  - [x] `CheckoutControllerTest` (extends `WebMockTestBase`): mock `StripeGateway` (`@MockitoBean` — it's an interface, mocks cleanly) → authed request returns `{url:...}`; unauthenticated → 401 envelope; Stripe failure (`PaymentException.checkoutFailed()` thrown by the mocked gateway) → 502 envelope.
  - [x] `StripeWebhookHandlerTest`: valid signature (mock `StripeGateway.constructWebhookEvent` to return a real `Event` built from a JSON fixture via `ApiResource.GSON.fromJson(json, Event.class)` — Stripe's SDK supports constructing `Event` objects this way without hitting the network) → 200; invalid signature (mocked gateway throws `PaymentException.invalidSignature()`) → 400.
  - [x] `StripeWebhookServiceTest`: `@MockitoBean SubscriptionRepository`, `ProcessedStripeEventRepository`, `StripeGateway` — construct real `Event`/`Session`/`Subscription` fixtures via Stripe's own JSON deserialization (no network calls needed for these tests, only for constructing the java objects from literal JSON strings) covering: `checkout.session.completed` creates a new `ACTIVE` row; `customer.subscription.updated` with Stripe status `active` keeps/sets `ACTIVE`; with status `canceled` → `EXPIRED`; **duplicate event ID is a no-op** (repository save is never invoked a second time — this is the AC5 test).
  - [x] `./mvnw test` all green; extend, don't break, the existing 54 backend tests.

- [x] **Task 12: Frontend tests (AC: 1, 3)**
  - [x] `PaywallCard.test.tsx`: unauthenticated click on Upgrade → `openLoginModal` called (spy/mock `layoutStore`), no `apiClient.post` call; authenticated click → `apiClient.post('/checkout/session')` called, success sets `window.location.href` (mock `window.location` per Vitest convention — check existing tests for how `window.location` is already mocked elsewhere in the suite, e.g. `useUrlState.test`, to reuse the same technique); error shows inline message; button disabled while pending.
  - [x] `layoutStore` gets a couple of unit assertions for the new `loginModalOpen`/`openLoginModal`/`closeLoginModal` if `layoutStore.test.ts` exists, else colocate in `ControlBar.auth.test.tsx`.
  - [x] `ControlBar.auth.test.tsx`: Sign-in button still opens the modal (now via the store) — update the existing assertions if they inspected local state.
  - [x] Keep the existing 195 frontend tests green; `tsc --noEmit` + eslint clean.

- [ ] **Task 13: Runtime validation (manual gate — AC: 1–7)**
  - [ ] Requires real Stripe test-mode keys (`STRIPE_SECRET_KEY`, a test Price ID for `STRIPE_PRICE_ID`) and the [Stripe CLI](https://docs.stripe.com/stripe-cli) for local webhook forwarding (`stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe`, which prints a `whsec_...` to use as `STRIPE_WEBHOOK_SECRET` locally). Run the local stack, log in, click Upgrade, complete a test-mode checkout (Stripe's `4242 4242 4242 4242` test card), confirm: redirect to Stripe → redirect back to `/?checkout=success` → `GET /subscriptions/me` returns `ACTIVE` → `PaywallCard`/locked library items unlock (informal spot-check; full enforcement UI wiring is Story 3.6). Use `stripe trigger customer.subscription.deleted` (or cancel the test subscription in the Stripe dashboard) to confirm the revert-to-`EXPIRED` path. This is a user-run gate — same pattern as 3.4's Task 13; PENDING until Voice runs it.

## Dev Notes

### What already exists — extend, do not recreate

- `Subscription` (model/repository/DTO/service/controller) — all four Stripe-relevant columns (`stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`) already exist from `V2` (3.1) and are already mapped in `Subscription.java`/`SubscriptionResponseDto` (3.4). **No entity or DTO changes needed** — this story only adds writers (checkout + webhook), the reader (`GET /subscriptions/me`) from 3.4 is untouched.
- `GoogleTokenVerifier`/`GoogleTokenVerifierImpl` — the exact interface-wrapper pattern this story's `StripeGateway`/`StripeGatewayImpl` mirrors, for the same reason (Java 25 test JVM can't mock concrete SDK classes with static methods).
- `AuthException` — the exact static-factory-per-error-code pattern `PaymentException` mirrors.
- `CorsConfig`/`CookieProperties`/`GoogleProperties` — the `@ConfigurationProperties` record pattern `StripeProperties`/`FrontendProperties` mirrors; `@ConfigurationPropertiesScan` on `GuitarAppApplication` already picks up any new one automatically.
- `useSubscription.ts`/`subscriptionQueryKey` (3.4) — already drives `isPremium` off `GET /subscriptions/me`; this story's job is only to make that endpoint eventually return `ACTIVE` for a paying user via the webhook. Do not touch `useSubscription.ts`.
- `layoutStore.ts` — currently only `activeLayout`/`setLayout`; Task 8 adds `loginModalOpen` alongside it as a second top-level field, not inside `LayoutConfig` (that type is specifically the AppShell zone config).
- No `lib/stripe.ts` exists, and **none is needed** — this is redirect-based Stripe Checkout (backend creates the session, frontend does `window.location.href = url`). Stripe.js/Elements would only be needed for an embedded/custom payment form, which is out of scope. Don't add a frontend Stripe SDK dependency.

### Migration numbering (read before creating the migration)

Actual applied migrations are **V1** (`create_users`), **V2** (`create_subscriptions`), **V3** (`unique_subscription_user`), **V4** (`add_user_token_version`). `architecture.distillate.md`'s Database Schema section says V3/V4 are `custom_tunings`/`saved_sessions` — that's the **original plan**, superseded by what actually shipped in 3.1–3.4. This story's migration is **V5**. Epic 4's `custom_tunings`/`saved_sessions` tables will need to claim V6/V7 whenever they land.

### Why the literal AC7 wording is refined (Open Question Q1)

The epic's AC text says `customer.subscription.updated` → `status=EXPIRED`. Taken literally, this is a bug: Stripe fires `customer.subscription.updated` on **every** change to a subscription, including routine renewals (where `status` stays `"active"` and only `current_period_end` moves forward) and payment-method updates — treating every such event as an instant downgrade would kick out paying, current customers on their own renewal. The task above instead derives our `status` from the **Stripe subscription object's own `status` field** on both `updated` and `deleted` events: `active`/`trialing` → `ACTIVE`, everything else (`canceled`, `unpaid`, `past_due` treated conservatively as non-active, `incomplete_expired`) → `EXPIRED`. This still satisfies the literal AC for the case it actually cares about (a real cancellation, where Stripe's `status` becomes `canceled`), while not breaking renewals. Flagging this rather than silently deviating — confirm this reading is correct, or if a stricter mapping (e.g. treat `past_due` as still-`ACTIVE` with a grace period) is wanted; that refinement is deferable to Story 3.6 if raised.

### Stripe SDK & webhook specifics

- Pin `stripe-java` via a `<stripe-java.version>` property, matching the existing `jjwt.version`/`bucket4j.version`/`google-api-client.version` style in `pom.xml`.
- Webhook signature verification **requires the untouched raw request body** — `Webhook.constructEvent(payload, sigHeader, secret)` recomputes an HMAC over the exact bytes Stripe sent. A `@RequestBody String payload` controller parameter gets this for free (Spring's `StringHttpMessageConverter` reads any content type into a `String` ahead of Jackson); binding to a parsed DTO would corrupt the bytes being verified and every signature check would fail. Do not add custom `HttpMessageConverter` config — the default converter ordering already does the right thing here.
- `current_period_end` on both the Checkout-completed path and the subscription-changed path comes from the **Stripe** `Subscription` object as Unix epoch seconds — convert with `Instant.ofEpochSecond(...).atOffset(ZoneOffset.UTC)`, consistent with `Subscription.currentPeriodEnd` being `OffsetDateTime` and `SubscriptionResponseDto.from()`'s existing `ISO_OFFSET_DATE_TIME` formatting (untouched, still correct).
- Idempotency: check-then-skip on `processedStripeEventRepository.existsById(event.getId())` **before** any domain write, then perform the (naturally idempotent — same values twice is a no-op) subscription upsert, then best-effort record the event ID (catch a duplicate-key race on the insert). This ordering means a mid-process crash causes a harmless reprocess on Stripe's automatic retry rather than a silently-dropped real update — the safer failure mode.
- Return `200` from the webhook handler even though processing already fully completed synchronously in-request (no queue/async in v1 — traffic volume doesn't warrant it). Stripe retries on any non-2xx.

### Backend directory placement

- `webhook/StripeWebhookHandler.java` — matches `architecture.distillate.md#Backend Directory Structure`'s `webhook/` package (previously empty).
- `controller/CheckoutController.java`, `service/CheckoutService.java`, `service/StripeWebhookService.java`, `security/StripeGateway.java` + `StripeGatewayImpl.java`, `exception/PaymentException.java`, `config/StripeProperties.java` + `FrontendProperties.java`, `model/ProcessedStripeEvent.java`, `repository/ProcessedStripeEventRepository.java` — all match the existing package scheme (`controller`, `service`, `security`, `exception`, `config`, `model`, `repository`).
- `StripeGateway` lives in `security/` alongside `GoogleTokenVerifier` — both are "verify/call an external identity-adjacent SDK behind a mockable interface" utilities, not domain services.

### Testing standards

- Backend: extend `WebMockTestBase` (Java 25 test JVM — mock interfaces only: `StripeGateway`, `SubscriptionRepository`, `ProcessedStripeEventRepository`, `UserRepository`; never mock `Subscription`/`ProcessedStripeEvent`/Stripe SDK concrete model classes — construct real instances or deserialize real JSON fixtures instead).
- Stripe SDK objects (`Event`, `Session`, `Subscription`) are plain data holders once deserialized — build test fixtures with `ApiResource.GSON.fromJson(rawJson, Event.class)` (or the narrower type) rather than trying to mock them; only the network-calling boundary (`StripeGateway`) needs mocking.
- Frontend: Vitest + Testing Library, colocated `*.test.ts[x]`, existing 195-test baseline.

### Project Structure Notes

- No changes to `frontend/src/data/*.js`, `components/ui/`, or any Hard Constraint path.
- New API routes (`POST /api/v1/checkout/session`, `POST /api/v1/webhooks/stripe`) are both already listed in `architecture.distillate.md#API Design`'s complete API surface — nothing invented here.
- `PaywallCard.tsx`/`ControlBar.tsx` are modified, not recreated — both already exist from Epic 2 / Story 3.4.

### References

- [Source: epics.distillate.md#Story 3.5: Stripe Checkout & Webhook] — AC source text
- [Source: architecture.distillate.md#API Design] — `/checkout/session`, `/webhooks/stripe` in the complete API surface; error envelope; ISO-8601 dates
- [Source: architecture.distillate.md#Technology Stack Decisions] — "Stripe Billing (subscription management) + Stripe Checkout (payment UI); webhooks to POST /api/v1/webhooks/stripe"
- [Source: architecture.distillate.md#Database Schema] — migration file naming; note the V3/V4 staleness called out above
- [Source: ux-design-specification.distillate.md#UX Patterns] — Paywall CTA behavior, "CTA triggers auth if unauthenticated", toast pattern (not implemented this story)
- [Source: 3-4-frontend-auth-integration.md] — `apiClient`/`useAuthStore`/`useSubscription` this story's checkout flow depends on; `SubscriptionController`/`SubscriptionResponseDto` this story writes into; Java 25 Mockito constraint
- [Source: deferred-work.md] — `SubscriptionController.me()`/`UserController.me()` principal-cast duplication (this story adds a third instance in `CheckoutController`, reinforcing that a shared helper is due); `Subscription.user` lazy-loading DTO-boundary note

## Open Questions (resolve at dev kickoff)

- **Q1 (subscription-status mapping):** See "Why the literal AC7 wording is refined" above — default taken is deriving `ACTIVE`/`EXPIRED` from the Stripe subscription's actual `status` field rather than blindly setting `EXPIRED` on every `updated` event. Confirm, or specify an exact status-mapping table if a stricter reading (e.g. `past_due` handling) is wanted.
- **Q2 (Stripe test credentials):** Task 13's manual gate needs real Stripe test-mode keys + a test Price ID + the Stripe CLI. Confirm you have (or will create) a Stripe account/test Price before dev starts, since Tasks 1–12 can complete without them but Task 13 cannot.
- **Q3 (existing-customer reuse):** Task 5 reuses `stripeCustomerId` from an existing `subscriptions` row if present (avoids creating duplicate Stripe customers on repeat checkout attempts). Confirm this is wanted, or accept the simpler always-`setCustomerEmail` approach (Stripe would then create a fresh customer per attempt — harmless but messier in the Stripe dashboard).

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (Claude Code, bmad-dev-story)

### Debug Log References

- **`current_period_end` moved off `Subscription` in Stripe's 2025-03-31 "Basil" API version** — the epic/architecture docs assumed the pre-Basil shape. Confirmed via `stripe-java` 33.x javadoc (`Subscription` no longer has `getCurrentPeriodEnd()`; it's now `SubscriptionItem.getCurrentPeriodEnd()`). `StripeGatewayImpl.toSnapshot()` reads it off `subscription.getItems().getData().get(0)` instead. Would have been a silent `null` bug (or a compile error, since the SDK method doesn't exist) if implemented per the original Dev Notes text.
- Latest stable `stripe-java` verified as **33.4.0** via the GitHub Releases API (`api.github.com/repos/stripe/stripe-java/releases/latest`) rather than trusting search-engine synthesis, which suggested a nonexistent `33.3.0`/`33.5.0`.
- `EventDataObjectDeserializer.deserializeUnsafe()` throws a **checked** `EventDataObjectDeserializationException` — the initial `orElseGet(deserializer::deserializeUnsafe)` one-liner didn't compile (incompatible thrown types in a functional interface). Rewritten as explicit try/catch.
- `EventDataObjectDeserializer.getObject()` itself can throw (observed: `NullPointerException` on `event.apiVersion` when the field is absent) rather than just returning an empty `Optional` on a version mismatch — discovered via `StripeWebhookServiceTest`'s hand-built JSON fixtures (no `api_version` field). Hardened `deserialize()` to catch `RuntimeException` around `getObject()` too, always falling through to `deserializeUnsafe()`. This is a real hardening, not just a test workaround — a malformed/old-shape webhook payload lacking `api_version` would otherwise 500 instead of processing.
- First draft of `StripeWebhookHandlerTest` used `@MockitoBean StripeWebhookService` — `StripeWebhookService` is a concrete class, so this hit the project's well-documented Java 25/Byte Buddy "cannot mock concrete classes" wall (`MockitoException: Could not modify all classes`). Rewrote the test to exercise the real service against the already-mocked repository interfaces instead (see Testing Standards in Dev Notes — should have applied this the first time).
- Local Maven is configured (user-level `~/.m2/settings.xml`, unrelated to this repo) with a corporate Nexus mirror that returned 401 Unauthorized for the new `stripe-java` dependency (not pre-cached there). Verified compilation/tests using a scratch `-s` settings file pointing at plain Maven Central instead of editing the shared `~/.m2/settings.xml`. **Voice may need to pull `com.stripe:stripe-java:33.4.0` into the corporate Nexus (or otherwise get it cached) before `./mvnw` works normally on this machine** — flagging since it's outside this story's or repo's control.

### Completion Notes List

Kickoff decisions (Open Questions): **Q1 → confirmed** (status derived from Stripe's actual subscription status, not blind `EXPIRED` on every `updated` event — see Dev Notes). **Q2 → not resolved this session**: no real Stripe test-mode credentials were available, so Task 13 (manual runtime gate) is PENDING. **Q3 → confirmed** (reuse an existing `stripeCustomerId` when present).

Delivered (Tasks 1–12, all automatable work):
- **Backend**: `stripe-java` 33.4.0 dependency; `StripeProperties`/`FrontendProperties` config; `V5__create_processed_stripe_events.sql` migration + `ProcessedStripeEvent` model/repository (idempotency ledger); `StripeGateway`/`StripeGatewayImpl` (mockable SDK boundary, mirrors `GoogleTokenVerifier`); `PaymentException`; `CheckoutService`/`CheckoutController` (`POST /api/v1/checkout/session`, reuses an existing Stripe customer when present); `StripeWebhookService`/`StripeWebhookHandler` (`POST /api/v1/webhooks/stripe`, `permitAll`, raw-body signature verification, idempotent processing, status derived from Stripe's own subscription status field); `SecurityConfig` permit-list entry for the webhook; a new `SubscriptionRepository.findByStripeSubscriptionId` method.
- **Frontend**: `loginModalOpen` lifted into `layoutStore` (so `PaywallCard`'s Upgrade CTA can trigger sign-in); `ControlBar` wired to the store instead of local state; `PaywallCard`'s Upgrade CTA now a real `useMutation` → `POST /checkout/session` → full-page redirect, with an unauthenticated → open-login-modal branch, inline error state, and pending-state button; `App.jsx` post-checkout return handling (`?checkout=success` → invalidate the subscription query, strip the param). No `lib/stripe.ts`/Stripe.js added — redirect-only Checkout needs none. No toast primitive added — out of scope per Dev Notes.

Validation (automated): backend `./mvnw test` → **68 tests green** (54 prior + 14 new: `CheckoutControllerTest` ×3, `StripeWebhookHandlerTest` ×4, `StripeWebhookServiceTest` ×7); frontend `pnpm vitest run` → **202 tests green** (195 prior + 7 new/modified across `PaywallCard.test.tsx`, `layoutStore.test.ts`, `LibraryPanel.test.tsx`'s QueryClientProvider wrapper fix); `tsc --noEmit` clean; `eslint .` clean; `pnpm run build` clean.

**Task 13 (manual runtime gate) is PENDING** — it requires real Stripe test-mode keys (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`) and the Stripe CLI, none of which are available in this environment. Per Q2, this wasn't confirmed available before dev started. Everything programmatically verifiable (Tasks 1–12) is green and the story is otherwise implementation-complete; per the dev-story workflow's Step 9 gate ("if any task is incomplete → HALT"), story Status is left as **in-progress** rather than **review** until Voice either runs Task 13's manual gate or explicitly directs skipping/deferring it.

### File List

**Backend — new**
- `backend/src/main/java/com/guitarapp/config/StripeProperties.java`
- `backend/src/main/java/com/guitarapp/config/FrontendProperties.java`
- `backend/src/main/resources/db/migration/V5__create_processed_stripe_events.sql`
- `backend/src/main/java/com/guitarapp/model/ProcessedStripeEvent.java`
- `backend/src/main/java/com/guitarapp/repository/ProcessedStripeEventRepository.java`
- `backend/src/main/java/com/guitarapp/exception/PaymentException.java`
- `backend/src/main/java/com/guitarapp/security/StripeGateway.java`
- `backend/src/main/java/com/guitarapp/security/StripeSubscriptionSnapshot.java`
- `backend/src/main/java/com/guitarapp/security/StripeGatewayImpl.java`
- `backend/src/main/java/com/guitarapp/dto/CheckoutSessionResponseDto.java`
- `backend/src/main/java/com/guitarapp/service/CheckoutService.java`
- `backend/src/main/java/com/guitarapp/controller/CheckoutController.java`
- `backend/src/main/java/com/guitarapp/service/StripeWebhookService.java`
- `backend/src/main/java/com/guitarapp/webhook/StripeWebhookHandler.java`
- `backend/src/test/java/com/guitarapp/controller/CheckoutControllerTest.java`
- `backend/src/test/java/com/guitarapp/webhook/StripeWebhookHandlerTest.java`
- `backend/src/test/java/com/guitarapp/service/StripeWebhookServiceTest.java`

**Backend — modified**
- `backend/pom.xml` (`stripe-java` 33.4.0 dependency + version property)
- `backend/src/main/resources/application.yml` (`app.stripe.*`, `app.frontend.*`)
- `backend/src/main/java/com/guitarapp/repository/SubscriptionRepository.java` (`findByStripeSubscriptionId`)
- `backend/src/main/java/com/guitarapp/security/SecurityConfig.java` (permit-list `POST /api/v1/webhooks/stripe`)
- `backend/src/test/java/com/guitarapp/support/WebMockTestBase.java` (`app.stripe.*` dummies, `@MockitoBean ProcessedStripeEventRepository`/`StripeGateway`)
- `backend/src/test/java/com/guitarapp/GuitarAppApplicationTests.java` (`app.stripe.*` dummies, `@MockitoBean ProcessedStripeEventRepository`)

**Frontend — new**
- (none — all changes extend existing files)

**Frontend — modified**
- `frontend/src/stores/layoutStore.ts` (`loginModalOpen`/`openLoginModal`/`closeLoginModal`)
- `frontend/src/stores/layoutStore.test.ts` (3 new tests)
- `frontend/src/components/ControlBar.tsx` (login-modal state moved to `layoutStore`)
- `frontend/src/types/api.ts` (`CheckoutSessionResponseDto`)
- `frontend/src/components/shared/PaywallCard.tsx` (real checkout mutation, auth-gated, error/pending states)
- `frontend/src/components/shared/PaywallCard.test.tsx` (rewritten with `QueryClientProvider` wrapper + 4 new Upgrade-CTA tests)
- `frontend/src/features/library/LibraryPanel.test.tsx` (`renderPanel()` helper adds the `QueryClientProvider` `PaywallCard` now requires)
- `frontend/src/App.jsx` (post-checkout `?checkout=success` handling)

**Other**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (3-5 → in-progress)

### Change Log

- 2026-08-29 — Story 3.5 implemented (Tasks 1–12): Stripe Checkout session creation, webhook signature verification + idempotent processing, subscription activation/status-sync, frontend Upgrade CTA wiring. 68 backend + 202 frontend tests green, type-check/lint/build clean. Task 13 (manual Stripe test-mode runtime gate) left pending — no real Stripe credentials available this session.
