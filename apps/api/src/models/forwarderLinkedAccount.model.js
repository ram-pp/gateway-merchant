const mongoose = require('mongoose');

/**
 * First-party portal sessions linked from the MerchRelay forwarder app.
 * Cookies are stored encrypted at rest (see crypto.util encrypt/decrypt).
 */
const forwarderLinkedAccountSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ForwarderDevice',
      required: true,
      index: true,
    },
    accountId: { type: String, required: true, trim: true, index: true },
    cookieEncrypted: { type: String, default: null },
    remark: { type: String, default: 'Linked Account', trim: true, maxlength: 120 },
    linkedAt: { type: Date, default: Date.now },
    lastSyncedAt: { type: Date, default: Date.now },
    // Rotation bookkeeping — mirrors the standalone cookie-rotation sample script.
    cookieExpiresAt: { type: Date, default: null, index: true },
    lastRotatedAt: { type: Date, default: null },
    lastRotationError: { type: String, default: null },
    // Per-session anti-automation token required by the upstream fetch RPC.
    // TODO: derivation formula not yet known — stays null until cookieRotation
    // .service's deriveAtToken() is implemented; fetch requests send at="" until then.
    atToken: { type: String, default: null },
  },
  { timestamps: true },
);

forwarderLinkedAccountSchema.index({ deviceId: 1, accountId: 1 }, { unique: true });

module.exports = mongoose.model('ForwarderLinkedAccount', forwarderLinkedAccountSchema);
