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

    transactionNote: { type: String },
    upiIntent: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    utr: { type: String, default: null },
    paidAt: { type: Date, default: null },
    confirmationSource: { type: String, enum: CONFIRMATION_SOURCES, default: null },
    matchReason: { type: String, default: null },
    forwarderLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForwarderLog', default: null },

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

module.exports = mongoose.model('Payment', paymentSchema);
