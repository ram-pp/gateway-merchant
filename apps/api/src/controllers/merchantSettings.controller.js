const asyncHandler = require('../utils/asyncHandler');
const { Merchant } = require('../models');

const getWebhookSettings = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.merchant._id).select('+webhookSecret');
  res.json({
    webhookUrl: merchant.webhookUrl,
    webhookHeaders: merchant.webhookHeaders,
    webhookSecretSet: Boolean(merchant.webhookSecret),
  });
});

const updateWebhookSettings = asyncHandler(async (req, res) => {
  const { webhookUrl, webhookHeaders } = req.body;
  const update = {};
  if (webhookUrl !== undefined) update.webhookUrl = webhookUrl || null;
  if (webhookHeaders !== undefined) update.webhookHeaders = webhookHeaders;
  const merchant = await Merchant.findByIdAndUpdate(req.merchant._id, update, { new: true });
  res.json({ webhookUrl: merchant.webhookUrl, webhookHeaders: merchant.webhookHeaders });
});

const updateGeneralSettings = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findByIdAndUpdate(
    req.merchant._id,
    { $set: { settings: { ...req.merchant.settings.toObject?.() ?? req.merchant.settings, ...req.body.settings } } },
    { new: true },
  );
  res.json({ settings: merchant.settings });
});

module.exports = { getWebhookSettings, updateWebhookSettings, updateGeneralSettings };
