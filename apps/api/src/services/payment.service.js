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
async function resolveUpiAccount(merchantId, upiAccountId) {
  if (upiAccountId) {
    const account = await MerchantUpiAccount.findOne({ publicId: upiAccountId, merchantId });
    if (!account) {
      throw ApiError.badRequest(ERROR_CODES.UPI_ACCOUNT_NOT_FOUND, 'upiAccountId not found for this merchant.');
    }
    if (!account.isActive) {
      throw ApiError.badRequest(ERROR_CODES.UPI_ACCOUNT_INACTIVE, 'That UPI account is inactive.');
    }
    return account;
  }

  const active = await MerchantUpiAccount.find({ merchantId, isActive: true }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  if (active.length === 0) {
    throw ApiError.badRequest(ERROR_CODES.UPI_ACCOUNT_REQUIRED, 'Merchant has no active UPI accounts. Add one first.');
  }
  return active[0];
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

  const account = await resolveUpiAccount(merchant._id, upiAccountId);

  const ttl = Number(expiresInSeconds) > 0 ? Number(expiresInSeconds) : env.DEFAULT_PAYMENT_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const publicId = prefixedId('pay');
  const publicToken = prefixedId('tok', 32);
  // A fresh, cryptographically random reference embedded as the UPI `tn`
  // (description) on every QR so each payment's note is unique and traceable.
  const transactionNote = shortCode(10);
  const upiIntent = buildUpiIntent({
    vpa: account.upiId,
    payeeName: account.displayName,
    amount,
    transactionNote,
  });

  let payment;
  try {
    payment = await Payment.create({
      publicId,
      merchantId: merchant._id,
      upiAccountId: account._id,
      amount,
      currency: 'INR',
      status: 'pending',
      merchantOrderRef: merchantOrderRef || null,
      publicToken,
      transactionNote,
      upiIntent,
      metadata: metadata || {},
      expiresAt,
      idempotencyKey: idempotencyKey || null,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Same-amount pending lock tripped, or a race on merchantOrderRef/idempotencyKey.
      if (err.keyPattern?.upiAccountId) {
        const pending = await Payment.findOne({
          upiAccountId: account._id,
          amount,
          status: 'pending',
        });
        throw ApiError.conflict(
          ERROR_CODES.AMOUNT_ALREADY_PENDING,
          `A pending payment of ₹${amount} already exists on this UPI account. Cancel it, use a different amount, or another UPI account.`,
          { pendingPaymentId: pending?.publicId },
        );
      }
      const existing = await Payment.findOne({ merchantId: merchant._id, merchantOrderRef });
      if (existing) return { payment: existing, upiAccount: account, isExisting: true };
    }
    throw err;
  }

  return { payment, upiAccount: account, isExisting: false, transactionNote };
}

async function buildCreateResponse(payment, upiAccount) {
  const qrPngBase64 = await buildQrPngBase64(payment.upiIntent);
  return { ...serializePayment(payment, upiAccount), qrPngBase64 };
}

module.exports = { resolveUpiAccount, createPayment, serializePayment, buildCreateResponse };
