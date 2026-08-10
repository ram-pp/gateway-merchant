const { Payment, Merchant, MerchantUpiAccount } = require('../models');
const { enqueueWebhook } = require('./webhookDelivery.service');
const { publish } = require('../utils/sse.hub');
const { serializePayment } = require('./payment.service');

const TICK_MS = 15_000;
let timer = null;

async function expireDuePayments() {
  const due = await Payment.find({ status: 'pending', expiresAt: { $lte: new Date() } }).limit(200);

  for (const payment of due) {
    payment.status = 'expired';
    await payment.save();

    publish(payment.publicId, 'status', { status: 'expired', paymentId: payment.publicId });

    try {
      const merchant = await Merchant.findById(payment.merchantId).select('+webhookSecret');
      const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
      if (merchant) {
        await enqueueWebhook({
          merchant,
          event: 'payment.expired',
          paymentId: payment._id,
          payload: serializePayment(payment, upiAccount),
        });
      }
    } catch (err) {
      console.error('[payment-expiry] webhook enqueue failed:', err.message);
    }
  }

  return due.length;
}

function startPaymentExpiryWorker() {
  if (timer) return;
  timer = setInterval(() => {
    expireDuePayments().catch((err) => console.error('[payment-expiry] tick failed:', err.message));
  }, TICK_MS);
  timer.unref();
  console.log(`[payment-expiry] started (every ${TICK_MS}ms)`);
}

function stopPaymentExpiryWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startPaymentExpiryWorker, stopPaymentExpiryWorker, expireDuePayments };
