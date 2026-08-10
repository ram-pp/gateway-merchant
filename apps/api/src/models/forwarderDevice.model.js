const mongoose = require('mongoose');

const forwarderDeviceSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    forwarderToken: { type: String, required: true, unique: true, index: true },
    label: { type: String, default: 'Forwarder device' },
    isActive: { type: Boolean, default: true },
    lastEventAt: { type: Date, default: null },
    pairedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model('ForwarderDevice', forwarderDeviceSchema);
