const { prefixedId, shortCode, ERROR_CODES } = require('@merchant-pay/shared');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { buildUpiIntent, buildQrPngBase64 } = require('../utils/qr.util');
const { Payment, MerchantUpiAccount } = require('../models');

/**
 * Resolve which UPI account a create-payment request targets.
 * If upiAccountId is passed explicitly (e.g. by an API integrator), use that.
 * Otherwise auto-select: prefer the account marked isDefault, then fall back
 * to the longest-active account. Merchants are never asked to pick one.
 */
async function resolveUpiAccount(merchantId, amount) {
  const active = await MerchantUpiAccount.find({ merchantId, isActive: true }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  if (active.length === 0) {
    throw ApiError.badRequest(ERROR_CODES.UPI_ACCOUNT_REQUIRED, 'Merchant has no active UPI accounts. Add one first.');
  }

  const numericAmount = Number(amount);
  let effectiveAmount = Number.isFinite(numericAmount) ? numericAmount : null;

  let pendingSet = new Set();
  if (effectiveAmount && effectiveAmount > 0) {
    const pending = await Payment.find({ merchantId, amount: effectiveAmount, status: 'pending' }).select('upiAccountId').lean();
    pendingSet = new Set(pending.map((payment) => String(payment.upiAccountId)));
  }

  // First, if any account has no pending payment for the exact amount, use it.
  const freeAccount = active.find((account) => !pendingSet.has(String(account._id)));
  if (freeAccount) {
    return { account: freeAccount, amount: effectiveAmount, amountAdjustmentApplied: false, originalAmount: effectiveAmount };
  }

  // All accounts are occupied for this exact amount. For each account,
  // attempt up to 10 small increments (0.001, 0.002, ...) on that specific
  // UPI (checking the (upiAccountId, amount) pending lock). If a free
  // candidate is found for an account, return it immediately.
  if (effectiveAmount && effectiveAmount > 0) {
    const maxAttemptsPerAccount = 10;
    const step = 0.01;
    for (const acct of active) {
      for (let i = 1; i <= maxAttemptsPerAccount; i++) {
        const candidate = Number((effectiveAmount + step * i).toFixed(3));
        const collision = await Payment.exists({ merchantId, upiAccountId: acct._id, amount: candidate, status: 'pending' });
        if (!collision) {
          return { account: acct, amount: candidate, amountAdjustmentApplied: true, originalAmount: effectiveAmount };
        }
      }
      // attempts exhausted for this acct, move to next acct
    }
  }

  // Nothing free found after per-account retries — fall back to default/oldest.
  return { account: active[0], amount: effectiveAmount, amountAdjustmentApplied: false, originalAmount: effectiveAmount };
}

function serializePayment(payment, upiAccount) {
  return {
    id: payment.publicId,
    merchantOrderRef: payment.merchantOrderRef,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    upiAccountId: upiAccount?.publicId,
    upiId: upiAccount?.upiId,
    upiProvider: upiAccount?.upiProvider,
    upiIntent: payment.upiIntent,
    description: payment.transactionNote,
    payUrl: `${env.PAY_PAGE_BASE_URL}/pay/${payment.publicToken}`,
    publicToken: payment.publicToken,
    utr: payment.utr || null,
    paidAt: payment.paidAt || null,
    confirmationSource: payment.confirmationSource || null,
    metadata: payment.metadata || {},
    expiresAt: payment.expiresAt,
    createdAt: payment.createdAt,
  };
}

/**
 * Create a payment: resolve UPI account, enforce same-amount pending lock,
 * generate a fresh QR, persist. Handles integrator idempotency via
 * merchantOrderRef (return existing pending payment for same ref) and via
 * an optional Idempotency-Key header.
 */
async function createPayment(merchant, input) {
  const { amount, merchantOrderRef, upiAccountId, expiresInSeconds, metadata, idempotencyKey } = input;

  if (merchantOrderRef) {
    const existing = await Payment.findOne({ merchantId: merchant._id, merchantOrderRef });
    if (existing && existing.status === 'pending') {
      const account = await MerchantUpiAccount.findById(existing.upiAccountId);
      return { payment: existing, upiAccount: account, isExisting: true };
    }
  }

  if (idempotencyKey) {
    const existing = await Payment.findOne({ merchantId: merchant._id, idempotencyKey });
    if (existing) {
      const account = await MerchantUpiAccount.findById(existing.upiAccountId);
      return { payment: existing, upiAccount: account, isExisting: true };
    }
  }

  const { account: selectedAccount, amount: resolvedAmount, amountAdjustmentApplied, originalAmount } =
    await resolveUpiAccount(merchant._id, amount);

  const ttl = Number(expiresInSeconds) > 0 ? Number(expiresInSeconds) : env.DEFAULT_PAYMENT_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const publicId = prefixedId('pay');
  const publicToken = prefixedId('tok', 32);
  // A fresh, cryptographically random reference embedded as the UPI `tn`
  // (description) on every QR so each payment's note is unique and traceable.
  const transactionNote = shortCode(10);
  const upiIntent = buildUpiIntent({
    vpa: selectedAccount.upiId,
    payeeName: selectedAccount.displayName,
    amount: resolvedAmount,
    transactionNote,
  });

  const paymentMetadata = {
    ...(metadata || {}),
    ...(amountAdjustmentApplied ? { originalAmount: Number(originalAmount), adjustedAmount: resolvedAmount } : {}),
  };

  let payment;
  try {
    payment = await Payment.create({
      publicId,
      merchantId: merchant._id,
      upiAccountId: selectedAccount._id,
      amount: resolvedAmount,
      currency: 'INR',
      status: 'pending',
      merchantOrderRef: merchantOrderRef || null,
      publicToken,
      transactionNote,
      upiIntent,
      metadata: paymentMetadata,
      expiresAt,
      idempotencyKey: idempotencyKey || null,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Same-amount pending lock tripped, or a race on merchantOrderRef/idempotencyKey.
      if (err.keyPattern?.upiAccountId) {
        const pending = await Payment.findOne({
          upiAccountId: selectedAccount._id,
          amount: resolvedAmount,
          status: 'pending',
        });
        throw ApiError.conflict(
          ERROR_CODES.AMOUNT_ALREADY_PENDING,
          `A pending payment of ₹${resolvedAmount} already exists on this UPI account. Cancel it, use a different amount, or another UPI account.`,
          { pendingPaymentId: pending?.publicId },
        );
      }
      const existing = await Payment.findOne({ merchantId: merchant._id, merchantOrderRef });
      if (existing) return { payment: existing, upiAccount: selectedAccount, isExisting: true };
    }
    throw err;
  }

  return { payment, upiAccount: selectedAccount, isExisting: false, transactionNote };
}

async function buildCreateResponse(payment, upiAccount) {
  const qrPngBase64 = await buildQrPngBase64(payment.upiIntent);
  return { ...serializePayment(payment, upiAccount), qrPngBase64 };
}

module.exports = { resolveUpiAccount, createPayment, serializePayment, buildCreateResponse };
