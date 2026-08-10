const mongoose = require('mongoose');
const { MERCHANT_USER_ROLES } = require('@merchant-pay/shared');

const merchantUserSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    name: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: MERCHANT_USER_ROLES, default: 'merchant_admin' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

merchantUserSchema.index({ merchantId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('MerchantUser', merchantUserSchema);
