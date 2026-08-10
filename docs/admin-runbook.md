# Admin runbook

For platform operators using `apps/admin-web` (`admin.pay.example.com`).

## Bootstrap

The first superadmin is created outside the UI, via seed script (no chicken-and-egg problem):

```bash
npm run seed --workspace apps/api
```

Reads `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` from `apps/api/.env`. Change the password after first login — there's no forced-rotation flow yet, so do it manually.

## Onboard a merchant

1. **Merchants → Create merchant.** Provide a name, slug, and an owner email/password.
2. The response includes `apiKey` / `apiSecret` (live) and a sandbox pair — **shown once**. Hand these to the integrator over a secure channel (not email/Slack in plaintext if you can avoid it); if lost, the merchant can self-rotate from their dashboard's Developers page.
3. The merchant logs into `merchant.pay.example.com` with the owner email/password, adds a UPI account (required app selection), and pairs a forwarder device.

## Suspend / reactivate

**Merchants → [merchant] → Suspend.** Immediately blocks:
- All `/api/v1/*` calls (`403 MERCHANT_SUSPENDED`)
- Merchant dashboard login for that merchant's staff

Existing pending payments are untouched (they'll still expire on schedule) but no *new* payments can be created. Reactivate the same way.

## Support: a payment is stuck pending

1. **Payments → search by ID or `merchantOrderRef`.**
2. Open the payment → check **Forwarder trail**. If a forwarder log matched but something went wrong downstream, that's visible there with `matchReason`.
3. If the customer has a UTR from their bank app, **Manual confirm** with that UTR — this marks the payment paid with `confirmationSource: "manual"` and still fires the merchant's webhook.
4. If the payment should never have been created (e.g. test order), **Force expire**.

## Support: forwarder events aren't matching

1. **Forwarder logs** → filter by `unmatched`.
2. Read `matchReason` — most common causes:
   - App-name mismatch: the notification's `appIdentifier` doesn't equal the target UPI account's `upiProvider`. Fix the UPI account's provider (merchant dashboard → UPI accounts) and hit **Reprocess** on the log.
   - No pending payment existed yet when the credit arrived (device or customer was faster than the merchant creating the order). Reprocess after the correct payment is created.
   - Amount mismatch — the parser mis-read the amount from noisy SMS text. Check `parsedData.amount` on the log; if wrong, this is a parser gap worth reporting/fixing in `apps/api/src/utils/paymentMessageParser.js`.

## Support: webhook deliveries failing

**Webhooks** → filter by `failed` / `exhausted`. Common causes: merchant's endpoint is down, returns non-2xx, or times out (10s timeout). Once their endpoint is fixed, hit **Retry** — this doesn't wait for the backoff schedule.

## Operational notes

- **Single process.** Both background workers (webhook retry, payment expiry) run inside the one `apps/api` Node process via `setInterval`. If you ever run more than one API replica, only one should run these loops (or move them to a real job queue) — otherwise deliveries/expiries could double-fire. Not a concern at the current single-instance MVP scale.
- **SSE is single-instance.** The realtime hub (`apps/api/src/utils/sse.hub.js`) keeps subscriber connections in memory. A load balancer with sticky sessions (or a single instance) is required until this is swapped for a pub/sub-backed fan-out.
- **TTL cleanup.** `ForwarderPairingToken` documents self-delete via a Mongo TTL index (8 minutes) — no cron needed for that piece.
