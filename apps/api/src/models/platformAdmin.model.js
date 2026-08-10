const mongoose = require('mongoose');
const { PLATFORM_ADMIN_ROLES } = require('@merchant-pay/shared');

const platformAdminSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: PLATFORM_ADMIN_ROLES, default: 'support' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PlatformAdmin', platformAdminSchema);
