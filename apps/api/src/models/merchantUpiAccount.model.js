const mongoose = require('mongoose');
const { UPI_PROVIDER_OPTIONS, UPI_TYPES } = require('@merchant-pay/shared');

const merchantUpiAccountSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, index: true }, // "upiacc_..."
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    upiId: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },

    // Required — which app this VPA's credit notifications come from.
    upiProvider: { type: String, required: true, enum: UPI_PROVIDER_OPTIONS },

    upiType: { type: String, enum: UPI_TYPES, default: 'merchant' },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    forwarderDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForwarderDevice', default: null },
  },
  { timestamps: true },
);

merchantUpiAccountSchema.index({ merchantId: 1, upiId: 1 }, { unique: true });

module.exports = mongoose.model('MerchantUpiAccount', merchantUpiAccountSchema);
