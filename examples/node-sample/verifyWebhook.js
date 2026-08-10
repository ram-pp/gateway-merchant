// Minimal Express webhook receiver that verifies the X-Signature HMAC.
// Usage: MERCHANT_PAY_WEBHOOK_SECRET=whsec_... node verifyWebhook.js
// (requires `npm install express` in this folder to actually run the server)

import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.MERCHANT_PAY_WEBHOOK_SECRET;

export function verifySignature(rawBody, timestampHeader, signatureHeader) {
  if (!WEBHOOK_SECRET) throw new Error('Set MERCHANT_PAY_WEBHOOK_SECRET.');
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex');
  const given = String(signatureHeader || '').replace('sha256=', '');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(given, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Example Express handler (needs raw body, not pre-parsed JSON, to hash correctly):
//
// app.post('/webhooks/merchant-pay', express.raw({ type: 'application/json' }), (req, res) => {
//   const raw = req.body.toString('utf8');
//   const ok = verifySignature(raw, req.header('X-Timestamp'), req.header('X-Signature'));
//   if (!ok) return res.status(401).send('bad signature');
//   const event = JSON.parse(raw);
//   // idempotent on req.header('X-Event-Id') / event.paymentId
//   res.sendStatus(200);
// });
