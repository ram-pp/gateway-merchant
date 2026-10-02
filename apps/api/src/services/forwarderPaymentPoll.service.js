const env = require('../config/env');
const { Payment, Merchant, MerchantUpiAccount, ForwarderDevice, ForwarderLinkedAccount } = require('../models');
const { fetchLinkedAccountTransactions } = require('./forwarderAccountFetch.service');
const { amountsMatch } = require('../utils/matcher');
const { publish } = require('../utils/sse.hub');
const { enqueueWebhook } = require('./webhookDelivery.service');
const { serializePayment } = require('./payment.service');

/**
 * Every payment's UPI intent embeds a fresh, random transactionNote as its
 * `tn`/`tr` (see payment.service.js) specifically so it can be traced back
 * later. When the upstream transaction carries a non-empty description, it
 * must echo that note back to count as a match — a non-empty description
 * that doesn't is either a different payment's event or a generic app-level
 * description (e.g. "Payment from PhonePe"), not proof of this one.
 */
function descriptionMatchesNote(tx, payment) {
  const description = typeof tx.description === 'string' ? tx.description.trim() : '';
  if (!description) return null; // nothing to compare — caller falls back to amount+time
  return Boolean(payment.transactionNote) && description.toLowerCase().includes(payment.transactionNote.toLowerCase());
}

/**
 * A fetched transaction confirms a payment if its description echoes back
 * the payment's own embedded transactionNote (authoritative — no further
 * check needed), or, when the transaction has no description to check,
 * falls back to amount + rough timing: the transaction's upstream timestamp
 * must fall between the payment's creation (minus clock-skew tolerance) and
 * now (plus the same tolerance) — it must have happened around when the
 * payment was created, not some unrelated transaction that merely shares the
 * amount.
 */
function transactionConfirmsPayment(tx, payment) {
  if (!amountsMatch(tx.amount, payment.amount)) return false;

  const descriptionMatch = descriptionMatchesNote(tx, payment);
  if (descriptionMatch !== null) return descriptionMatch;

  if (!tx.time) return true;

  const skewMs = env.FORWARDER_POLL_TIME_SKEW_MS;
  const txMs = tx.time.getTime();
  const createdMs = new Date(payment.createdAt).getTime();

  if (txMs < createdMs - skewMs) return false;
  if (txMs > Date.now() + skewMs) return false;
  return true;
}

/**
 * Confirms a payment from a matched transaction. Returns false (without
 * throwing) if the payment was no longer pending, or if this exact upstream
 * transaction had already confirmed a *different* payment — the unique index
 * on forwarderTransactionId is the authoritative guard against that; this
 * just means two payments raced to claim the same transaction, and this one
 * lost.
 */
async function confirmPaymentFromTransaction(payment, tx, linkedAccount) {
  const freshPayment = await Payment.findOne({ _id: payment._id, status: 'pending' });
  if (!freshPayment) return false;

  freshPayment.status = 'paid';
  freshPayment.paidAt = new Date();
  freshPayment.utr = tx.referenceId || freshPayment.utr;
  freshPayment.confirmationSource = 'forwarder_poll';
  freshPayment.forwarderTransactionId = tx.transactionId;
  freshPayment.matchReason = descriptionMatchesNote(tx, payment)
    ? `Forwarder account poll: description echoed note "${payment.transactionNote}" on transaction ${tx.transactionId} (linked account ${linkedAccount.accountId}).`
    : `Forwarder account poll: amount ₹${payment.amount} matched transaction ${tx.transactionId} on linked account ${linkedAccount.accountId}.`;
  try {
    await freshPayment.save();
  } catch (error) {
    if (error.code === 11000) {
      console.warn(
        `[forwarder-poll] transaction ${tx.transactionId} already confirmed a different payment; skipping payment ${payment._id}.`,
      );
      return false;
    }
    throw error;
  }

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

  // Load transactionIds already spent on some payment (any status, any
  // tick) so this tick never retries one the unique index would reject
  // anyway, and tracks ones it spends itself so two due payments in the same
  // tick can't both claim the same transaction before either save lands.
  const usedTransactionIds = new Set(
    await Payment.distinct('forwarderTransactionId', { forwarderTransactionId: { $ne: null } }),
  );

  let matched = 0;
  for (const payment of duePayments) {
    const device = deviceByUpiAccountId.get(String(payment.upiAccountId));
    const linkedAccountsForDevice = linkedAccountsByDeviceId.get(String(device._id)) || [];

    for (const linkedAccount of linkedAccountsForDevice) {
      const transactions = await getTransactions(linkedAccount);
      const hit = transactions.find(
        (tx) => !usedTransactionIds.has(tx.transactionId) && transactionConfirmsPayment(tx, payment),
      );
      if (!hit) continue;

      usedTransactionIds.add(hit.transactionId);
      if (await confirmPaymentFromTransaction(payment, hit, linkedAccount)) {
        matched += 1;
        break;
      }
    }
  }

  return { checked: duePayments.length, matched };
}

module.exports = { pollDuePayments };
