const env = require('../config/env');
const { WebhookDelivery, Merchant } = require('../models');
const { attemptDelivery } = require('./webhookDelivery.service');

let timer = null;

async function tick() {
  const due = await WebhookDelivery.find({
    status: { $in: ['pending', 'failed'] },
    nextRetryAt: { $lte: new Date() },
  })
    .limit(25)
    .sort({ nextRetryAt: 1 });

  for (const delivery of due) {
    const merchant = await Merchant.findById(delivery.merchantId).select('+webhookSecret');
    if (!merchant || !merchant.webhookUrl) {
      delivery.status = 'exhausted';
      delivery.lastError = 'Merchant webhook no longer configured.';
      await delivery.save();
      continue;
    }
    await attemptDelivery(delivery, merchant);
  }
}

function startWebhookWorker() {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => console.error('[webhook-worker] tick failed:', err.message));
  }, env.WEBHOOK_WORKER_INTERVAL_MS);
  timer.unref();
  console.log(`[webhook-worker] started (every ${env.WEBHOOK_WORKER_INTERVAL_MS}ms)`);
}

function stopWebhookWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startWebhookWorker, stopWebhookWorker, tick };
