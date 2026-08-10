const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { WebhookDelivery, Merchant } = require('../models');
const { attemptDelivery } = require('../services/webhookDelivery.service');

const list = asyncHandler(async (req, res) => {
  const { status, merchantId, page = 1, limit = 40 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (merchantId) filter.merchantId = merchantId;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    WebhookDelivery.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('merchantId', 'name slug'),
    WebhookDelivery.countDocuments(filter),
  ]);

  res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), data });
});

const retry = asyncHandler(async (req, res) => {
  const delivery = await WebhookDelivery.findById(req.params.id);
  if (!delivery) throw ApiError.notFound('DELIVERY_NOT_FOUND', 'Webhook delivery not found.');

  const merchant = await Merchant.findById(delivery.merchantId).select('+webhookSecret');
  if (!merchant?.webhookUrl) throw ApiError.badRequest('WEBHOOK_NOT_CONFIGURED', 'Merchant has no webhookUrl configured.');

  delivery.status = 'pending';
  const result = await attemptDelivery(delivery, merchant);
  res.json(result);
});

module.exports = { list, retry };
