const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { randomToken } = require('../utils/crypto.util');
const { ForwarderPairingToken, ForwarderDevice, ForwarderLog, Merchant } = require('../models');
const { runMatchPipeline } = require('../services/forwarderMatch.service');

/** POST /api/forwarder/register — forwarder app exchanges a pairing token for a persistent forwarderToken. */
const register = asyncHandler(async (req, res) => {
  const { pairingToken, label } = req.body;

  const pairing = await ForwarderPairingToken.findOne({ token: pairingToken });
  if (!pairing) {
    throw ApiError.notFound('PAIRING_TOKEN_INVALID', 'Invalid or expired pairing token. Generate a new one from the merchant panel.');
  }

  const forwarderToken = randomToken(24);
  const device = await ForwarderDevice.create({
    merchantId: pairing.merchantId,
    forwarderToken,
    label: label || 'Forwarder device',
  });

  await ForwarderPairingToken.deleteOne({ _id: pairing._id });

  res.status(201).json({
    forwarderToken,
    deviceId: device._id,
    message: 'Forwarder linked. Use forwarderToken on every /api/forwarder/event call.',
  });
});

/** POST /api/forwarder/event — SMS / UPI-app notification credit event from a paired device. */
const receiveEvent = asyncHandler(async (req, res) => {
  const { forwarderToken, appIdentifier, message, type, time, meta } = req.body;

  const device = await ForwarderDevice.findOne({ forwarderToken, isActive: true });
  console.log('body', req.body);
  console.log('device', device);
  if (!device) throw ApiError.unauthorized('Invalid or inactive forwarderToken.');

  device.lastEventAt = new Date();
  await device.save();

  const merchant = await Merchant.findById(device.merchantId);
  if (!merchant) throw ApiError.unauthorized('Merchant not found for this device.');

  // Store meta.title and meta.sender separately so the parser can
  // consider title and body independently (some apps put amounts in title).
  const messageToStore = message || '';

  const log = await ForwarderLog.create({
    merchantId: device.merchantId,
    deviceId: device._id,
    type: type || 'sms',
    appIdentifier: appIdentifier || null,
    message: messageToStore,
    metaTitle: meta?.title || null,
    metaSender: meta?.sender || null,
    time: time ? new Date(time) : new Date(),
    matchStatus: 'pending_parse',
  });

  res.status(201).json({ id: log._id, createdAt: log.createdAt });

  setImmediate(() => {
    runMatchPipeline({ log, merchant }).catch((err) =>
      console.error(`[forwarder] match pipeline failed for log ${log._id}:`, err.message),
    );
  });
});

module.exports = { register, receiveEvent };
