# Developer API guide

Base URL: `https://api.pay.example.com` (local dev: `http://localhost:4000`).

Full machine-readable contract: [`docs/openapi.yaml`](./openapi.yaml), also served live at `GET /api/v1/openapi.json`.

## 1. Authenticate

Every `/api/v1/*` request needs two headers, issued once when your merchant account was created (or via `POST /api/merchant/credentials/rotate` in the dashboard):

```
X-Api-Key: mk_live_xxxxxxxxxxxx
X-Api-Secret: ms_xxxxxxxxxxxxxxxxxxxxxxxx
```

Use the `mk_test_…` / sandbox secret pair against the same base URL to run without touching real UPI accounts — sandbox payments behave identically but are namespaced by key prefix.

```bash
curl https://api.pay.example.com/api/v1/ping \
  -H "X-Api-Key: $MERCHANT_PAY_API_KEY" \
  -H "X-Api-Secret: $MERCHANT_PAY_API_SECRET"
```

## 2. Create a payment

```bash
curl -X POST https://api.pay.example.com/api/v1/payments \
  -H "X-Api-Key: $MERCHANT_PAY_API_KEY" \
  -H "X-Api-Secret: $MERCHANT_PAY_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500,
    "merchantOrderRef": "APP-ORDER-991",
    "expiresInSeconds": 900,
    "metadata": { "customerId": "c_1" }
  }'
```

`upiAccountId` is optional and normally omitted — the receiving UPI ID is picked automatically (the account marked default, falling back to the longest-active account) so you never have to ask which account to use. Pass `upiAccountId` explicitly only if you want to force a specific account; call `GET /api/v1/upi-accounts` to list your options. `400 UPI_ACCOUNT_REQUIRED` now only occurs if the merchant has no active UPI accounts at all.

Response (`201`):

```json
{
  "id": "pay_...",
  "merchantOrderRef": "APP-ORDER-991",
  "amount": 500,
  "currency": "INR",
  "status": "pending",
  "upiAccountId": "upiacc_...",
  "upiId": "shop@okaxis",
  "upiProvider": "Google Pay",
  "upiIntent": "upi://pay?pa=shop%40okaxis&pn=...&am=500.00&cu=INR&tn=K3F9QZX7PL",
  "description": "K3F9QZX7PL",
  "qrPngBase64": "iVBOR...",
  "payUrl": "https://merchant.pay.example.com/pay/tok_...",
  "expiresAt": "2026-08-07T10:45:00.000Z"
}
```

Render `qrPngBase64` directly (`data:image/png;base64,<value>`) or build your own QR from `upiIntent`. `payUrl` is a hosted fallback page for customers without a QR scanner handy. `description` is a fresh, cryptographically random reference generated for every payment and embedded as the `tn` (note) parameter in the UPI intent/QR — useful for reconciling a scanned QR back to this specific payment.

### Idempotency

- Same `merchantOrderRef` while the prior payment is still `pending` → returns the existing payment (no duplicate, no new QR).
- Or pass a request-scoped `Idempotency-Key` header if you don't have a stable order ref yet.

### Same-amount pending lock

At most one `pending` payment per amount **per UPI account**. A second create with the same amount on the same account gets:

```json
{
  "error": {
    "code": "AMOUNT_ALREADY_PENDING",
    "message": "A pending payment of ₹500 already exists on this UPI account. Cancel it, use a different amount, or another UPI account.",
    "pendingPaymentId": "pay_..."
  }
}
```

Recover by cancelling the older payment (`POST /api/v1/payments/:id/cancel`), nudging the amount (₹500 → ₹500.01), or targeting a different `upiAccountId`.

## 3. Get status

```bash
curl https://api.pay.example.com/api/v1/payments/pay_... -H "X-Api-Key: ..." -H "X-Api-Secret: ..."
curl https://api.pay.example.com/api/v1/payments/by-ref/APP-ORDER-991 -H "X-Api-Key: ..." -H "X-Api-Secret: ..."
```

## 4. Realtime: SSE or webhook

**SSE** (meant for a backend integration, not a browser — `EventSource` can't set custom headers):

```bash
curl -N https://api.pay.example.com/api/v1/payments/pay_.../events \
  -H "X-Api-Key: ..." -H "X-Api-Secret: ..."
```

Streams `event: status` frames with `{ "status": "paid" | "expired", ... }` as they happen.

**Webhook** — set `webhookUrl` (and get your signing secret) from the merchant dashboard → Developers, or `PUT /api/merchant/settings/webhook`. On `payment.paid` / `payment.expired`:

```http
POST {webhookUrl}
Content-Type: application/json
X-Signature: sha256=<hmac_hex>
X-Timestamp: <ms epoch>
X-Event-Id: evt_...
```

```json
{
  "event": "payment.paid",
  "paymentId": "pay_...",
  "merchantOrderRef": "APP-ORDER-991",
  "amount": 500,
  "currency": "INR",
  "upiId": "shop@okaxis",
  "utr": "412345678901",
  "paidAt": "2026-08-07T10:30:00.000Z",
  "confirmationSource": "forwarder",
  "metadata": { "customerId": "c_1" }
}
```

Verify the signature:

```js
const crypto = require('crypto');

function verify(rawBody, timestamp, signatureHeader, webhookSecret) {
  const expected = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${rawBody}`).digest('hex');
  const given = signatureHeader.replace('sha256=', '');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(given, 'hex'));
}
```

Delivery is at-least-once with exponential backoff (up to `WEBHOOK_MAX_ATTEMPTS`, default 8) — de-duplicate on `X-Event-Id` / `paymentId`. Test your endpoint anytime with `POST /api/v1/webhooks/test`.

**Poll fallback**: if you can't accept webhooks or run SSE, poll `GET /api/v1/payments/:id` every few seconds until `status` leaves `pending`.

## 5. Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body/query failed schema validation |
| `INVALID_AMOUNT` | 400 | Amount not positive / malformed |
| `UPI_ACCOUNT_REQUIRED` | 400 | Merchant has no active UPI accounts to auto-select from |
| `UPI_ACCOUNT_INACTIVE` | 400 | Target UPI account is deactivated |
| `UPI_ACCOUNT_NOT_FOUND` | 400 | `upiAccountId` doesn't belong to this merchant |
| `AMOUNT_ALREADY_PENDING` | 409 | Same-amount pending lock tripped |
| `PAYMENT_NOT_FOUND` | 404 | No such payment for this merchant |
| `PAYMENT_NOT_PENDING` | 400 | Cancel/confirm attempted on a non-pending payment |
| `UNAUTHORIZED` | 401 | Bad/missing API key+secret, or expired session |
| `MERCHANT_SUSPENDED` | 403 | Merchant account suspended by platform admin |
| `RATE_LIMITED` | 429 | Too many requests from this API key |

## 6. Sandbox

Use your `mk_test_…` key/secret pair for CI or local development. Combine with `POST /api/forwarder/event` against a test forwarder device to simulate a credit and drive a payment to `paid` without a real phone — see [`docs/forwarder-setup.md`](./forwarder-setup.md#simulating-a-credit-without-a-device).
