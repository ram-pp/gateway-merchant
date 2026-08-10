const mongoose = require('mongoose');
const { WEBHOOK_EVENTS } = require('@merchant-pay/shared');

const webhookDeliverySchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null, index: true },
    eventId: { type: String, required: true, unique: true },
    event: { type: String, enum: WEBHOOK_EVENTS, required: true },
    url: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    payloadHash: { type: String },

    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'exhausted'],
      default: 'pending',
      index: true,
    },
    attempt: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 8 },
    nextRetryAt: { type: Date, default: () => new Date(), index: true },
    responseStatus: { type: Number, default: null },
    lastError: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
    isTest: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
