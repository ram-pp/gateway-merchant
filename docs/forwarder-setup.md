# Forwarder setup

The forwarder is the **only** auto-verifier in this system: a small app running on the phone that receives UPI credit SMS/app-notifications for a merchant's VPA, which relays that text to merchant-pay's API so it can match it against a pending payment.

This is a **separate implementation** from ssPaymentSolutions' forwarder — different pairing tokens, different event endpoint, different DB. Do not point a device at Core's `/api/forwarder/*`.

## 1. Pair a device (merchant dashboard)

1. Log into the merchant panel → **Forwarder** → *Generate pairing code*.
2. You get an 8-character code, valid for 8 minutes (`ForwarderPairingToken`, TTL-indexed — it self-deletes).

## 2. Register the device

The forwarder app calls this once per device install, exchanging the short-lived pairing code for a long-lived `forwarderToken`:

```bash
curl -X POST https://api.pay.example.com/api/forwarder/register \
  -H "Content-Type: application/json" \
  -d '{ "pairingToken": "0E0D4DC1", "forwarderToken": "<device-generated-random-string>", "label": "Shop counter phone" }'
```

Store the returned `forwarderToken` securely on-device (e.g. Android `EncryptedSharedPreferences`) — it authenticates every future event call and is never shown again by the API.

## 3. Forward events

Whenever the device's SMS/notification listener sees a UPI credit, POST it:

```bash
curl -X POST https://api.pay.example.com/api/forwarder/event \
  -H "Content-Type: application/json" \
  -d '{
    "forwarderToken": "<stored token>",
    "type": "notification",
    "appIdentifier": "Google Pay",
    "message": "You received Rs.500 from John via UPI Ref 123456789012"
  }'
```

- `type: "sms"` for SMS text, `type: "notification"` for a UPI-app push notification.
- `appIdentifier` should be the UPI app's display name (e.g. `PhonePe`, `Google Pay`) for notification events — this is matched against the target `MerchantUpiAccount.upiProvider`. Get this wrong (or omit it) and notification-path matching silently falls through to "unmatched".

The API responds `201` immediately with just a log id; matching runs asynchronously so the forwarder app is never blocked waiting on the match pipeline.

## 4. Why `upiProvider` matters

A phone can have several UPI apps installed. If a ₹500 PhonePe notification arrives but the merchant's `shop@okaxis` VPA is configured with `upiProvider: "Google Pay"`, the notification path will **not** auto-confirm — this is intentional, to avoid crediting the wrong VPA's payment from an unrelated app's notification. SMS events fall back to VPA/bank-name/UTR scoring instead of requiring an app-name match, since bank SMS doesn't carry an app identity.

Get the app right at add-UPI time (merchant panel → UPI accounts → required "Which app is this UPI id?" select). The panel suggests a value from the VPA handle, but always confirm — many handles are ambiguous (e.g. multiple apps share bank-issued handles).

## 5. Reprocessing

If a payment was created *after* a credit already arrived (rare, but possible with slow devices), platform admins can force a re-run from the admin panel → **Forwarder logs** → *Reprocess*, or:

```bash
curl -X POST https://api.pay.example.com/api/admin/forwarder-logs/<logId>/reprocess \
  -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN"
```

## Simulating a credit without a device

For CI or local dev, skip the phone entirely — register a throwaway device against your test merchant and POST the event directly (see steps 2–3 above) with your sandbox merchant's UPI id/provider in the message. This exercises the exact same parser + matcher + webhook + SSE path as a real forwarder.
