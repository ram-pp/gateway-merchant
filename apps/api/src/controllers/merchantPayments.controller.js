const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('@merchant-pay/shared');
const { Payment, MerchantUpiAccount } = require('../models');
const { createPayment, buildCreateResponse, serializePayment } = require('../services/payment.service');
const { enqueueWebhook } = require('../services/webhookDelivery.service');
const { publish } = require('../utils/sse.hub');
const { Merchant } = require('../models');

const create = asyncHandler(async (req, res) => {
  const { payment, upiAccount } = await createPayment(req.merchant, req.body);
  const response = await buildCreateResponse(payment, upiAccount);
  res.status(201).json(response);
});

const list = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, q } = req.query;
  const filter = { merchantId: req.merchant._id };
  if (status) filter.status = status;
  if (q) filter.$or = [{ merchantOrderRef: new RegExp(q, 'i') }, { publicId: new RegExp(q, 'i') }];

  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);

  const accountIds = [...new Set(payments.map((p) => String(p.upiAccountId)))];
  const accounts = await MerchantUpiAccount.find({ _id: { $in: accountIds } });
  const accountsById = new Map(accounts.map((a) => [String(a._id), a]));

  res.json({
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: payments.map((p) => serializePayment(p, accountsById.get(String(p.upiAccountId)))),
  });
});

const getOne = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');
  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  res.json(serializePayment(payment, upiAccount));
});

const cancel = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');
  if (payment.status !== 'pending') {
    throw ApiError.badRequest(ERROR_CODES.PAYMENT_NOT_PENDING, `Payment is ${payment.status}, cannot cancel.`);
  }
  payment.status = 'cancelled';
  payment.cancelledAt = new Date();
  await payment.save();
  res.json({ ok: true });
});

/** Manual UTR fallback confirm (dashboard-initiated, not forwarder). */
const confirm = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');
  if (payment.status !== 'pending') {
    throw ApiError.badRequest(ERROR_CODES.PAYMENT_NOT_PENDING, `Payment is ${payment.status}, cannot confirm.`);
  }

  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.utr = req.body.utr;
  payment.confirmationSource = 'manual';
  await payment.save();

  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  const serialized = serializePayment(payment, upiAccount);
  publish(payment.publicId, 'status', { status: 'paid', ...serialized });

  const merchant = await Merchant.findById(req.merchant._id).select('+webhookSecret');
  await enqueueWebhook({ merchant, event: 'payment.paid', paymentId: payment._id, payload: serialized });

  res.json(serialized);
});

module.exports = { create, list, getOne, cancel, confirm };
