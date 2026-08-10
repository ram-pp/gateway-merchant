const mongoose = require('mongoose');
const { MERCHANT_STATUSES } = require('@merchant-pay/shared');

const merchantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    status: { type: String, enum: MERCHANT_STATUSES, default: 'active', index: true },

    apiKey: { type: String, required: true, unique: true, index: true },
    apiSecretHash: { type: String, required: true, select: false },
    apiSecretLastFour: { type: String },
    apiCredentialsRotatedAt: { type: Date },
    apiCredentialsRevokedAt: { type: Date, default: null },

    sandboxApiKey: { type: String, unique: true, sparse: true, index: true },
    sandboxApiSecretHash: { type: String, select: false },

    webhookUrl: { type: String, default: null },
    webhookSecret: { type: String, default: null, select: false },
    webhookHeaders: { type: mongoose.Schema.Types.Mixed, default: {} },

    settings: {
      defaultTtlSeconds: { type: Number, default: 900 },
      allowAmountEdit: { type: Boolean, default: true },
      successRedirectUrl: { type: String, default: null },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Merchant', merchantSchema);
