// Minimal example: create a payment, then poll until it's paid/expired.
// Usage: MERCHANT_PAY_API_KEY=... MERCHANT_PAY_API_SECRET=... node createPayment.js

const BASE_URL = process.env.MERCHANT_PAY_API_URL || 'http://localhost:4000';
const API_KEY = process.env.MERCHANT_PAY_API_KEY;
const API_SECRET = process.env.MERCHANT_PAY_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('Set MERCHANT_PAY_API_KEY and MERCHANT_PAY_API_SECRET.');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'X-Api-Key': API_KEY,
  'X-Api-Secret': API_SECRET,
};

async function createPayment() {
  const res = await fetch(`${BASE_URL}/api/v1/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount: 500, merchantOrderRef: `SAMPLE-${Date.now()}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${data.error?.code}: ${data.error?.message}`);
  return data;
}

async function pollUntilSettled(paymentId, { intervalMs = 2000, timeoutMs = 60_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/api/v1/payments/${paymentId}`, { headers });
    const data = await res.json();
    if (data.status !== 'pending') return data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Timed out waiting for payment to settle.');
}

const payment = await createPayment();
console.log('Created payment:', payment.id, payment.payUrl);
console.log('Scan/pay the QR, or open:', payment.upiIntent);

const settled = await pollUntilSettled(payment.id);
console.log('Final status:', settled.status, settled.utr ? `UTR ${settled.utr}` : '');
