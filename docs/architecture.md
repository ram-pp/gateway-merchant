# Architecture

`merchant-pay` is a standalone service — its own Node process, MongoDB, and two separate browser apps. It shares no runtime with `ssPaymentSolutions`.

## Components

```
apps/api/            Express + Mongoose. Owns all business logic and data.
apps/merchant-web/    React/Vite/Tailwind SPA — merchant dashboard + public pay page.
apps/admin-web/       React/Vite/Tailwind SPA — platform operator console.
packages/shared/      UPI provider list, id helpers, constants — used only by apps/api
                       today; frontends keep a small local copy (see
                       apps/merchant-web/src/upiProviders.js) to avoid a build-time
                       dependency on a CommonJS package from Vite.
```

## Request surfaces

| Base path | Auth | Consumers |
|---|---|---|
| `/api/v1/*` | `X-Api-Key` + `X-Api-Secret` | Third-party integrating apps |
| `/api/merchant/*` | Merchant JWT (`aud: merchant_user`) | `apps/merchant-web` |
| `/api/admin/*` | Platform admin JWT (`aud: platform_admin`) | `apps/admin-web` |
| `/api/public/*` | None — scoped by unguessable `publicToken` | Hosted pay page (any origin) |
| `/api/forwarder/*` | `forwarderToken` (per device) | The forwarder mobile app |

Two JWTs, two secrets, two audiences (`merchant_user` vs `platform_admin`). A merchant token is rejected by every admin route and vice versa — see `authenticateMerchantJwt` / `authenticatePlatformAdmin` in `apps/api/src/middleware/auth.middleware.js`.

## Data model

See the plan's "Domain model" section for the full rationale. Two invariants are enforced at the MongoDB index level, not just in application code:

1. **Same-amount pending lock** — `Payment` has a partial unique index on `{ upiAccountId, amount }` where `status: 'pending'`. A second `POST /api/v1/payments` for the same amount on the same UPI account will fail the insert with a duplicate-key error, which the service layer turns into `409 AMOUNT_ALREADY_PENDING`.
2. **Integrator idempotency** — a partial unique index on `{ merchantId, merchantOrderRef }` (string type only) means retried creates with the same `merchantOrderRef` return the existing pending payment instead of creating a duplicate.

## Realtime path

1. Forwarder device (paired via `/api/forwarder/register`) posts SMS/notification text to `/api/forwarder/event`.
2. `apps/api/src/utils/paymentMessageParser.js` extracts amount / UTR / app name / bank hints.
3. `apps/api/src/utils/matcher.js` finds the merchant's pending payments and picks a candidate:
   - **Notification events**: app name must match the target UPI account's `upiProvider` — this is why `upiProvider` is a required field on `MerchantUpiAccount`.
   - **SMS events**: scored by VPA / bank-name / UTR overlap; the same-amount lock means there's almost always exactly one candidate.
4. On match: `Payment.status = 'paid'`, a `WebhookDelivery` is enqueued, and any SSE subscriber on that payment is notified via the in-process hub (`apps/api/src/utils/sse.hub.js`).

## Background workers

Both run as `setInterval` loops inside the same Node process (single-instance MVP — see `docs/admin-runbook.md` for scale-out notes):

- **`webhookWorker.service.js`** — polls `WebhookDelivery` documents whose `nextRetryAt` has passed and attempts delivery with HMAC-SHA256 signing and exponential backoff.
- **`paymentExpiry.service.js`** — flips `pending` payments past `expiresAt` to `expired`, firing the `payment.expired` webhook.

## Why no Redis in this build

The plan's isolation table lists an independent Redis URI as an option for scale (forwarder-token caching, delayed-job webhook retries). This implementation intentionally keeps the MVP to Mongo + one Node process: forwarder-token lookups and webhook retries are both backed by Mongo queries fast enough for a single-merchant-at-a-time forwarder device. If/when this needs to scale past one API instance, swap `sse.hub.js` for a pub/sub-backed fan-out and move the webhook/expiry loops to a real job queue — both are isolated behind small service modules for that reason.
