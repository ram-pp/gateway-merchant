const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ERROR_CODES } = require('@merchant-pay/shared');
const { Payment, MerchantUpiAccount } = require('../models');
const { createPayment, buildCreateResponse, serializePayment } = require('../services/payment.service');
const { subscribe } = require('../utils/sse.hub');

const create = asyncHandler(async (req, res) => {
  const idempotencyKey = req.header('Idempotency-Key') || null;
  const { payment, upiAccount } = await createPayment(req.merchant, { ...req.body, idempotencyKey });
  const response = await buildCreateResponse(payment, upiAccount);
  res.status(201).json(response);
});

const getById = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');
  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  res.json(serializePayment(payment, upiAccount));
});

const getByRef = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    merchantOrderRef: req.params.ref,
    merchantId: req.merchant._id,
  }).sort({ createdAt: -1 });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found for that merchantOrderRef.');
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
  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  res.json(serializePayment(payment, upiAccount));
});

const events = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: status\ndata: ${JSON.stringify({ status: payment.status, paymentId: payment.publicId })}\n\n`);

  subscribe(payment.publicId, res);

  const keepAlive = setInterval(() => res.write(':\n\n'), 20_000);
  req.on('close', () => clearInterval(keepAlive));
});

module.exports = { create, getById, getByRef, cancel, events };
