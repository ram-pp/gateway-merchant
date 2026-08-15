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
      payPageTheme: {
        mode: { type: String, default: 'light' },
        brand: {
          merchantName: { type: String, default: 'Merchant' },
          logoUrl: { type: String, default: '' },
          accentColor: { type: String, default: '#2563eb' },
          primaryText: { type: String, default: '#0f172a' },
          secondaryText: { type: String, default: '#475569' },
          background: { type: String, default: '#f8fafc' },
          cardBackground: { type: String, default: '#ffffff' },
          buttonColor: { type: String, default: '#2563eb' },
          buttonText: { type: String, default: '#ffffff' },
          successColor: { type: String, default: '#16a34a' },
          borderColor: { type: String, default: '#e2e8f0' },
        },
        appButtons: {
          showPaytm: { type: Boolean, default: true },
          showPhonePe: { type: Boolean, default: true },
          style: { type: String, default: 'card' },
          paytmLabel: { type: String, default: 'Paytm' },
          phonepeLabel: { type: String, default: 'PhonePe' },
          paytmBackground: { type: String, default: '#1d4ed8' },
          paytmTextColor: { type: String, default: '#ffffff' },
          paytmBorderColor: { type: String, default: '#1d4ed8' },
          phonepeBackground: { type: String, default: '#6d28d9' },
          phonepeTextColor: { type: String, default: '#ffffff' },
          phonepeBorderColor: { type: String, default: '#6d28d9' },
        },
        layout: {
          showMerchantName: { type: Boolean, default: true },
          showAmount: { type: Boolean, default: true },
          showNote: { type: Boolean, default: true },
          showQr: { type: Boolean, default: true },
          showPayButtons: { type: Boolean, default: true },
          showPoweredBy: { type: Boolean, default: false },
        },
        copy: {
          title: { type: String, default: 'Pay now' },
          subtitle: { type: String, default: 'Secure payment' },
          buttonText: { type: String, default: 'Pay now' },
          noteLabel: { type: String, default: 'Note' },
        },
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Merchant', merchantSchema);
