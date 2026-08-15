const mongoose = require('mongoose');

const forwarderLogSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForwarderDevice', required: true },
    type: { type: String, enum: ['sms', 'notification', 'info'], default: 'sms' },
    appIdentifier: { type: String, default: null },
    message: { type: String, required: true },
    metaTitle: { type: String, default: null },
    metaSender: { type: String, default: null },
    time: { type: Date, default: Date.now },

    parsedData: {
      isParsed: { type: Boolean, default: false },
      isCredit: { type: Boolean, default: false },
      amount: { type: Number, default: null },
      utrNumber: { type: String, default: null },
      bankName: { type: String, default: null },
      senderUPI: { type: String, default: null },
      accountLast4: { type: String, default: null },
      appName: { type: String, default: null },
      confidence: { type: String, default: 'none' },
    },

    matchStatus: {
      type: String,
      enum: ['pending_parse', 'matched', 'matched_low', 'unmatched', 'irrelevant', 'duplicate'],
      default: 'pending_parse',
      index: true,
    },
    matchedPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    matchReason: { type: String, default: null },
    isDuplicate: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'ForwarderLog', default: null },
  },
  { timestamps: true },
);

forwarderLogSchema.index({ merchantId: 1, createdAt: -1 });

module.exports = mongoose.model('ForwarderLog', forwarderLogSchema);
