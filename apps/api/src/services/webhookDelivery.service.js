const { prefixedId } = require('@merchant-pay/shared');
const crypto = require('crypto');
const env = require('../config/env');
const { WebhookDelivery } = require('../models');
const { hmacSign } = require('../utils/crypto.util');

function backoffMs(attempt) {
  // 1m, 2m, 5m, 15m, 30m, 1h, 2h, 4h (capped)
  const steps = [60, 120, 300, 900, 1800, 3600, 7200, 14400];
  const seconds = steps[Math.min(attempt, steps.length - 1)];
  return seconds * 1000;
}

/** Queue a webhook delivery for a merchant. No-op if merchant has no webhookUrl configured. */
async function enqueueWebhook({ merchant, event, payload, paymentId = null, isTest = false }) {
  if (!merchant.webhookUrl) return null;

  const eventId = prefixedId('evt');
  const body = JSON.stringify({ event, ...payload });
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

  return WebhookDelivery.create({
    merchantId: merchant._id,
    paymentId,
    eventId,
    event,
    url: merchant.webhookUrl,
    payload: { event, ...payload },
    payloadHash,
    maxAttempts: env.WEBHOOK_MAX_ATTEMPTS,
    nextRetryAt: new Date(),
    isTest,
  });
}

/** Attempt to deliver one WebhookDelivery doc; updates its state in place. */
async function attemptDelivery(delivery, merchant) {
  const body = JSON.stringify(delivery.payload);
  const timestamp = String(Date.now());
  const secret = merchant.webhookSecret;
  const signature = secret ? hmacSign(secret, `${timestamp}.${body}`) : hmacSign('unsigned', body);

  delivery.attempt += 1;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(delivery.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': `sha256=${signature}`,
        'X-Timestamp': timestamp,
        'X-Event-Id': delivery.eventId,
        ...(merchant.webhookHeaders || {}),
      },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    delivery.responseStatus = res.status;

    if (res.ok) {
      delivery.status = 'delivered';
      delivery.deliveredAt = new Date();
      delivery.lastError = null;
    } else {
      delivery.lastError = `HTTP ${res.status}`;
      if (delivery.attempt >= delivery.maxAttempts) {
        delivery.status = 'exhausted';
      } else {
        delivery.status = 'failed';
        delivery.nextRetryAt = new Date(Date.now() + backoffMs(delivery.attempt));
      }
    }
  } catch (err) {
    delivery.responseStatus = null;
    delivery.lastError = err.message;
    if (delivery.attempt >= delivery.maxAttempts) {
      delivery.status = 'exhausted';
    } else {
      delivery.status = 'failed';
      delivery.nextRetryAt = new Date(Date.now() + backoffMs(delivery.attempt));
    }
  }

  await delivery.save();
  return delivery;
}

module.exports = { enqueueWebhook, attemptDelivery, backoffMs };
