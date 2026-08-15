const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Payment, MerchantUpiAccount, ForwarderLog, Merchant } = require('../models');
const { serializePayment } = require('../services/payment.service');
const { enqueueWebhook } = require('../services/webhookDelivery.service');
const { publish } = require('../utils/sse.hub');

const list = asyncHandler(async (req, res) => {
  const { status, merchantId, q, page = 1, limit = 30 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (merchantId) filter.merchantId = merchantId;
  if (q) filter.$or = [{ publicId: new RegExp(q, 'i') }, { merchantOrderRef: new RegExp(q, 'i') }];

  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('merchantId', 'name slug'),
    Payment.countDocuments(filter),
  ]);

  res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), data: payments });
});

const getOne = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id).populate('merchantId', 'name slug');
  if (!payment) throw ApiError.notFound('PAYMENT_NOT_FOUND', 'Payment not found.');

  const [upiAccount, forwarderTrail] = await Promise.all([
    MerchantUpiAccount.findById(payment.upiAccountId),
    ForwarderLog.find({ matchedPaymentId: payment._id }).sort({ createdAt: -1 }),
  ]);

  res.json({ payment, upiAccount, forwarderTrail });
});

const confirm = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('PAYMENT_NOT_FOUND', 'Payment not found.');
  if (payment.status !== 'pending') {
    throw ApiError.badRequest('PAYMENT_NOT_PENDING', `Payment is ${payment.status}, cannot confirm.`);
  }

  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.utr = req.body.utr;
  payment.confirmationSource = 'manual';
  await payment.save();

  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  const serialized = serializePayment(payment, upiAccount);
  publish(payment.publicId, 'status', { status: 'paid', ...serialized });

  const merchant = await Merchant.findById(payment.merchantId).select('+webhookSecret');
  await enqueueWebhook({ merchant, event: 'payment.paid', paymentId: payment._id, payload: serialized });

  res.json(payment);
});

const expire = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('PAYMENT_NOT_FOUND', 'Payment not found.');
  if (payment.status !== 'pending') {
    throw ApiError.badRequest('PAYMENT_NOT_PENDING', `Payment is ${payment.status}, cannot expire.`);
  }
  payment.status = 'expired';
  await payment.save();
  publish(payment.publicId, 'status', { status: 'expired', paymentId: payment.publicId });

  // enqueue webhook for failed/expired payments so merchants get notified
  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  const serialized = serializePayment(payment, upiAccount);
  const merchant = await Merchant.findById(payment.merchantId).select('+webhookSecret');
  await enqueueWebhook({ merchant, event: 'payment.failed', paymentId: payment._id, payload: serialized });

  res.json(payment);
});

module.exports = { list, getOne, confirm, expire };
