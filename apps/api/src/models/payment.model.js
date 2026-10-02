const mongoose = require('mongoose');
const { PAYMENT_STATUSES, CONFIRMATION_SOURCES } = require('@merchant-pay/shared');

const paymentSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "pay_..."
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    upiAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MerchantUpiAccount',
      required: true,
      index: true,
    },

    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },

    merchantOrderRef: { type: String, default: null },
    publicToken: { type: String, required: true, unique: true, index: true },
    customerMobile: { type: String, default: null },

    transactionNote: { type: String },
    upiIntent: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    utr: { type: String, default: null },
    paidAt: { type: Date, default: null },
    confirmationSource: { type: String, enum: CONFIRMATION_SOURCES, default: null },
    matchReason: { type: String, default: null },
    forwarderLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForwarderLog', default: null },
    // Upstream transactionId that confirmed this payment via the forwarder
    // account-poll worker — see the unique index below.
    forwarderTransactionId: { type: String, default: null },

    cancelledAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },

    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true },
);

// Integrator idempotency: unique merchantOrderRef per merchant (sparse — ref is optional).
paymentSchema.index(
  { merchantId: 1, merchantOrderRef: 1 },
  { unique: true, partialFilterExpression: { merchantOrderRef: { $type: 'string' } } },
);

// The same-amount pending lock — DB-level guarantee: at most one pending
// payment per (upiAccountId, amount).
paymentSchema.index(
  { upiAccountId: 1, amount: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

paymentSchema.index(
  { merchantId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);

// DB-level guarantee that one upstream transaction can only ever confirm one
// payment — without this, a transaction still present in the account's
// "recent transactions" list across multiple poll ticks (or re-fetched for a
// later, unrelated same-amount payment) could silently confirm several
// payments with the same real-world credit.
paymentSchema.index(
  { forwarderTransactionId: 1 },
  { unique: true, partialFilterExpression: { forwarderTransactionId: { $type: 'string' } } },
);

module.exports = mongoose.model('Payment', paymentSchema);
