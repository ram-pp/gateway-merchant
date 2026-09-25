const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { startWebhookWorker } = require('./services/webhookWorker.service');
const { startPaymentExpiryWorker } = require('./services/paymentExpiry.service');
const { startCookieRotationWorker } = require('./services/cookieRotation.worker');

async function main() {
  await connectDb();

  app.listen(env.PORT, () => {
    console.log(`[merchant-pay-api] listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  startWebhookWorker();
  startPaymentExpiryWorker();
  startCookieRotationWorker();
}

main().catch((err) => {
  console.error('[merchant-pay-api] fatal startup error:', err);
  process.exit(1);
});
