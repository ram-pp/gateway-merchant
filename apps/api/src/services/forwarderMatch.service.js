const { parsePaymentMessage } = require('../utils/paymentMessageParser');
const { matchForwarderEvent } = require('../utils/matcher');
const { Payment, MerchantUpiAccount, ForwarderLog } = require('../models');
const { publish } = require('../utils/sse.hub');
const { enqueueWebhook } = require('./webhookDelivery.service');
const { serializePayment } = require('./payment.service');

/**
 * Run the match pipeline for one forwarder event/log against a merchant's
 * pending payments. Mutates and saves the ForwarderLog with the outcome, and
 * on match marks the Payment paid + fires webhook/SSE.
 */
async function runMatchPipeline({ log, merchant }) {
  const parsed = parsePaymentMessage({
    message: log.message,
    title: log.metaTitle,
    appIdentifier: log.appIdentifier,
    logType: log.type,
  });

  log.parsedData = {
    isParsed: parsed.isParsed,
    isCredit: parsed.isCredit,
    amount: parsed.amount,
    utrNumber: parsed.utrNumber,
    bankName: parsed.bankName,
    senderUPI: parsed.senderUPI,
    accountLast4: parsed.accountLast4,
    appName: parsed.appName,
    confidence: parsed.confidence,
  };

  if (!parsed.isParsed || !parsed.isCredit) {
    log.matchStatus = 'irrelevant';
    await log.save();
    return { matched: false };
  }

  // Dedup: same UTR already matched for this merchant recently.
  if (parsed.utrNumber) {
    const prior = await ForwarderLog.findOne({
      merchantId: merchant._id,
      'parsedData.utrNumber': parsed.utrNumber,
      _id: { $ne: log._id },
      matchStatus: { $in: ['matched', 'matched_low'] },
    });
    if (prior) {
      log.matchStatus = 'duplicate';
      log.isDuplicate = true;
      log.duplicateOf = prior._id;
      log.matchedPaymentId = prior.matchedPaymentId;
      log.matchReason = `Duplicate of log ${prior._id} (same UTR ${parsed.utrNumber}).`;
      await log.save();
      return { matched: false, duplicate: true };
    }
  }

  const pendingPayments = await Payment.find({ merchantId: merchant._id, status: 'pending' }).lean();
  const upiAccounts = await MerchantUpiAccount.find({
    _id: { $in: pendingPayments.map((p) => p.upiAccountId) },
  }).lean();
  const accountsById = new Map(upiAccounts.map((a) => [String(a._id), a]));
  const candidates = pendingPayments.map((p) => ({ ...p, upiAccount: accountsById.get(String(p.upiAccountId)) }));

  const result = matchForwarderEvent(parsed, candidates, { logType: log.type });

  if (!result.matched) {
    log.matchStatus = 'unmatched';
    log.matchReason = result.reason || 'No pending payment matched this credit.';
    await log.save();
    return { matched: false };
  }

  const paymentDoc = await Payment.findOne({ _id: result.payment._id, status: 'pending' });
  if (!paymentDoc) {
    log.matchStatus = 'unmatched';
    log.matchReason = 'Matched payment is no longer pending.';
    await log.save();
    return { matched: false };
  }

  paymentDoc.status = 'paid';
  paymentDoc.paidAt = new Date();
  paymentDoc.utr = parsed.utrNumber || paymentDoc.utr;
  paymentDoc.confirmationSource = 'forwarder';
  paymentDoc.matchReason = result.reason;
  paymentDoc.forwarderLogId = log._id;
  await paymentDoc.save();

  log.matchStatus = result.confidence === 'low' ? 'matched_low' : 'matched';
  log.matchedPaymentId = paymentDoc._id;
  log.matchReason = result.reason;
  await log.save();

  const upiAccount = accountsById.get(String(paymentDoc.upiAccountId));
  const serialized = serializePayment(paymentDoc, upiAccount);

  publish(paymentDoc.publicId, 'status', { status: 'paid', ...serialized });

  await enqueueWebhook({
    merchant,
    event: 'payment.paid',
    paymentId: paymentDoc._id,
    payload: serialized,
  });

  return { matched: true, payment: paymentDoc };
}

module.exports = { runMatchPipeline };
