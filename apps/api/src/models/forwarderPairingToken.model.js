const mongoose = require('mongoose');

const forwarderPairingTokenSchema = new mongoose.Schema({
  merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
  token: { type: String, required: true, unique: true },
  label: { type: String, default: null },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 480, // seconds — TTL index, auto-deletes stale pairing tokens
  },
});

module.exports = mongoose.model('ForwarderPairingToken', forwarderPairingTokenSchema);
