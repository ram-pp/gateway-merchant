const asyncHandler = require('../utils/asyncHandler');
const { MerchantUpiAccount } = require('../models');
const { enqueueWebhook, attemptDelivery } = require('../services/webhookDelivery.service');
const { prefixedId } = require('@merchant-pay/shared');
const ApiError = require('../utils/ApiError');
const { Merchant } = require('../models');

const ping = asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    merchant: { name: req.merchant.name, slug: req.merchant.slug },
    sandbox: Boolean(req.isSandbox),
    serverTime: new Date().toISOString(),
  });
});

const listUpiAccounts = asyncHandler(async (req, res) => {
  const accounts = await MerchantUpiAccount.find({ merchantId: req.merchant._id, isActive: true }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  res.json({
    data: accounts.map((a) => ({
      upiAccountId: a.publicId,
      upiId: a.upiId,
      displayName: a.displayName,
      upiProvider: a.upiProvider,
      upiType: a.upiType,
      isDefault: a.isDefault,
    })),
  });
});

const testWebhook = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.merchant._id).select('+webhookSecret');
  if (!merchant.webhookUrl) {
    throw ApiError.badRequest('WEBHOOK_NOT_CONFIGURED', 'Set a webhookUrl first (merchant dashboard → Developers).');
  }
  const delivery = await enqueueWebhook({
    merchant,
    event: 'payment.paid',
    isTest: true,
    payload: {
      paymentId: prefixedId('pay'),
      merchantOrderRef: 'TEST-ORDER',
      amount: 1,
      currency: 'INR',
      upiId: 'sample@upi',
      utr: '000000000000',
      paidAt: new Date().toISOString(),
      confirmationSource: 'forwarder',
      metadata: { test: true },
    },
  });
  const result = await attemptDelivery(delivery, merchant);
  res.status(202).json({
    delivered: result.status === 'delivered',
    responseStatus: result.responseStatus,
    lastError: result.lastError,
    eventId: result.eventId,
  });
});

module.exports = { ping, listUpiAccounts, testWebhook };
