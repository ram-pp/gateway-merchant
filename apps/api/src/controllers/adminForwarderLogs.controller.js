const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ForwarderLog, Merchant } = require('../models');
const { runMatchPipeline } = require('../services/forwarderMatch.service');

const list = asyncHandler(async (req, res) => {
  const { matchStatus, merchantId, page = 1, limit = 40 } = req.query;
  const filter = {};
  if (matchStatus) filter.matchStatus = matchStatus;
  if (merchantId) filter.merchantId = merchantId;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    ForwarderLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('merchantId', 'name slug'),
    ForwarderLog.countDocuments(filter),
  ]);

  res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), data });
});

const reprocess = asyncHandler(async (req, res) => {
  const log = await ForwarderLog.findById(req.params.id);
  if (!log) throw ApiError.notFound('LOG_NOT_FOUND', 'Forwarder log not found.');

  log.matchStatus = 'pending_parse';
  log.isDuplicate = false;
  log.duplicateOf = null;
  log.matchedPaymentId = null;
  log.matchReason = null;
  await log.save();

  const merchant = await Merchant.findById(log.merchantId);
  const result = await runMatchPipeline({ log, merchant });

  const updated = await ForwarderLog.findById(log._id);
  res.json({ result, log: updated });
});

module.exports = { list, reprocess };
