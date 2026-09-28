const env = require('../config/env');
const { Payment, Merchant, MerchantUpiAccount, ForwarderDevice, ForwarderLinkedAccount } = require('../models');
const { fetchLinkedAccountTransactions } = require('./forwarderAccountFetch.service');
const { amountsMatch } = require('../utils/matcher');
const { publish } = require('../utils/sse.hub');
const { enqueueWebhook } = require('./webhookDelivery.service');
const { serializePayment } = require('./payment.service');

/**
 * A fetched transaction confirms a payment only if its upstream timestamp
 * falls between the payment's creation (minus clock-skew tolerance) and now
 * (plus the same tolerance) — it must have happened around when the payment
 * was created, not some unrelated transaction that merely shares the amount.
 */
function transactionConfirmsPayment(tx, payment) {
  if (!amountsMatch(tx.amount, payment.amount)) return false;
  if (!tx.time) return true;

  const skewMs = env.FORWARDER_POLL_TIME_SKEW_MS;
  const txMs = tx.time.getTime();
  const createdMs = new Date(payment.createdAt).getTime();

  if (txMs < createdMs - skewMs) return false;
  if (txMs > Date.now() + skewMs) return false;
  return true;
}

async function confirmPaymentFromTransaction(payment, tx, linkedAccount) {
  const freshPayment = await Payment.findOne({ _id: payment._id, status: 'pending' });
  if (!freshPayment) return false;

  freshPayment.status = 'paid';
  freshPayment.paidAt = new Date();
  freshPayment.utr = tx.referenceId || freshPayment.utr;
  freshPayment.confirmationSource = 'forwarder_poll';
  freshPayment.matchReason = `Forwarder account poll: amount ₹${payment.amount} matched transaction ${tx.transactionId} on linked account ${linkedAccount.accountId}.`;
  await freshPayment.save();

  try {
    const merchant = await Merchant.findById(freshPayment.merchantId).select('+webhookSecret');
    const upiAccount = await MerchantUpiAccount.findById(freshPayment.upiAccountId);
    const serialized = serializePayment(freshPayment, upiAccount);

    publish(freshPayment.publicId, 'status', { status: 'paid', ...serialized });

    if (merchant) {
      await enqueueWebhook({
        merchant,
        event: 'payment.paid',
        paymentId: freshPayment._id,
        payload: serialized,
      });
    }
  } catch (err) {
    console.error(`[forwarder-poll] post-match notify failed for payment ${freshPayment._id}:`, err.message);
  }

  return true;
}

/**
 * For every merchant UPI account backed by a forwarder-linked portal account,
 * checks recently-created pending payments against that account's upstream
 * transaction list and marks matching ones paid.
 */
async function pollDuePayments() {
  const since = new Date(Date.now() - env.FORWARDER_POLL_LOOKBACK_MS);

  const devices = await ForwarderDevice.find({ isActive: true, upiAccountId: { $ne: null } }).lean();
  if (!devices.length) return { checked: 0, matched: 0 };

  const linkedAccounts = await ForwarderLinkedAccount.find({
    deviceId: { $in: devices.map((d) => d._id) },
  }).lean();
  if (!linkedAccounts.length) return { checked: 0, matched: 0 };

  const linkedAccountsByDeviceId = new Map();
  for (const la of linkedAccounts) {
    const key = String(la.deviceId);
    if (!linkedAccountsByDeviceId.has(key)) linkedAccountsByDeviceId.set(key, []);
    linkedAccountsByDeviceId.get(key).push(la);
  }

  const deviceByUpiAccountId = new Map();
  for (const device of devices) {
    if (linkedAccountsByDeviceId.has(String(device._id))) {
      deviceByUpiAccountId.set(String(device.upiAccountId), device);
    }
  }
  if (!deviceByUpiAccountId.size) return { checked: 0, matched: 0 };

  const duePayments = await Payment.find({
    status: 'pending',
    upiAccountId: { $in: [...deviceByUpiAccountId.keys()] },
    createdAt: { $gte: since },
  }).lean();
  if (!duePayments.length) return { checked: 0, matched: 0 };

  // Fetch each linked account's transactions at most once per tick, shared
  // across every pending payment that could match it.
  const transactionsByLinkedAccountId = new Map();
  function getTransactions(linkedAccount) {
    const key = String(linkedAccount._id);
    if (!transactionsByLinkedAccountId.has(key)) {
      transactionsByLinkedAccountId.set(
        key,
        fetchLinkedAccountTransactions(linkedAccount)
          .then((r) => r.transactions)
          .catch((err) => {
            console.error(`[forwarder-poll] fetch failed for account ${linkedAccount.accountId}:`, err.message);
            return [];
          }),
      );
    }
    return transactionsByLinkedAccountId.get(key);
  }

  let matched = 0;
  for (const payment of duePayments) {
    const device = deviceByUpiAccountId.get(String(payment.upiAccountId));
    const linkedAccountsForDevice = linkedAccountsByDeviceId.get(String(device._id)) || [];

    for (const linkedAccount of linkedAccountsForDevice) {
      const transactions = await getTransactions(linkedAccount);
      const hit = transactions.find((tx) => transactionConfirmsPayment(tx, payment));
      if (hit && (await confirmPaymentFromTransaction(payment, hit, linkedAccount))) {
        matched += 1;
        break;
      }
    }
  }

  return { checked: duePayments.length, matched };
}

module.exports = { pollDuePayments };
