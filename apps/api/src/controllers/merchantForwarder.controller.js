const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ForwarderPairingToken, ForwarderDevice, ForwarderLog } = require('../models');

const TOKEN_TTL_SECONDS = 480;

const generatePairingCode = () => crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 8);

const connect = asyncHandler(async (req, res) => {
  const token = generatePairingCode();
  await ForwarderPairingToken.deleteMany({ merchantId: req.merchant._id });
  await ForwarderPairingToken.create({ merchantId: req.merchant._id, token, label: req.body?.label });

  res.json({
    pairingToken: token,
    expiresInSeconds: TOKEN_TTL_SECONDS,
    message: 'Enter this pairing token in the forwarder app within 8 minutes.',
  });
});

const status = asyncHandler(async (req, res) => {
  const [pairing, devices] = await Promise.all([
    ForwarderPairingToken.findOne({ merchantId: req.merchant._id }),
    ForwarderDevice.find({ merchantId: req.merchant._id }).sort({ createdAt: -1 }),
  ]);

  res.json({
    hasPendingPairing: Boolean(pairing),
    pairingToken: pairing?.token || null,
    pairingExpiresAt: pairing ? new Date(pairing.createdAt.getTime() + TOKEN_TTL_SECONDS * 1000) : null,
    devices,
  });
});

const disconnect = asyncHandler(async (req, res) => {
  const device = await ForwarderDevice.findOne({ _id: req.params.deviceId, merchantId: req.merchant._id });
  if (!device) throw ApiError.notFound('DEVICE_NOT_FOUND', 'Forwarder device not found.');
  device.isActive = false;
  await device.save();
  res.json({ ok: true });
});

const logs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, matchStatus } = req.query;
  const filter = { merchantId: req.merchant._id };
  if (matchStatus) filter.matchStatus = matchStatus;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    ForwarderLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    ForwarderLog.countDocuments(filter),
  ]);
  res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), data });
});

module.exports = { connect, status, disconnect, logs };
