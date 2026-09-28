const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('@merchant-pay/shared');
const { Payment, MerchantUpiAccount } = require('../models');
const { createPayment, buildCreateResponse, serializePayment } = require('../services/payment.service');
const { enqueueWebhook } = require('../services/webhookDelivery.service');
const { publish } = require('../utils/sse.hub');
const { istDayStart, parseIstDateStart, parseIstDateEnd } = require('../utils/date.util');
const { Merchant } = require('../models');

const create = asyncHandler(async (req, res) => {
  const { payment, upiAccount } = await createPayment(req.merchant, req.body);
  const response = await buildCreateResponse(payment, upiAccount);
  res.status(201).json(response);
});

const list = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, q, fromDate, toDate } = req.query;
  const filter = { merchantId: req.merchant._id };
  if (status) filter.status = status;
  if (q) filter.$or = [{ merchantOrderRef: new RegExp(q, 'i') }, { publicId: new RegExp(q, 'i') }];
  if (fromDate || toDate) {
    filter.createdAt = {};
    // Date-only values (from the dashboard's date filter) are IST calendar
    // days, not UTC ones — parse them against the fixed IST offset so the
    // range lines up with what the merchant actually picked.
    if (fromDate) filter.createdAt.$gte = parseIstDateStart(fromDate);
    if (toDate) filter.createdAt.$lte = parseIstDateEnd(toDate);
  }

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

// Dashboard summary. Computed server-side via aggregation rather than by
// fetching a page of payments and reducing client-side, so it stays correct
// regardless of how many payments the merchant does in a day (a capped
// fetch would silently undercount on busy days). "Today" is an IST calendar
// day (see date.util) — the API server itself may run in any timezone.
// Money-received figures key off paidAt, not createdAt: a payment created
// yesterday but confirmed today is today's revenue, not yesterday's.
const stats = asyncHandler(async (req, res) => {
  const merchantId = req.merchant._id;
  const startOfDay = istDayStart();

  const [paymentsToday, pendingCount, paidTodayAgg] = await Promise.all([
    Payment.countDocuments({ merchantId, createdAt: { $gte: startOfDay } }),
    Payment.countDocuments({ merchantId, status: 'pending' }),
    Payment.aggregate([
      { $match: { merchantId, status: 'paid', paidAt: { $gte: startOfDay } } },
      { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$amount' } } },
    ]),
  ]);

  const paidToday = paidTodayAgg[0] || { count: 0, volume: 0 };

  res.json({
    paymentsToday,
    pendingCount,
    paidTodayCount: paidToday.count,
    paidTodayVolume: paidToday.volume,
  });
});

const getOne = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');
  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  res.json(serializePayment(payment, upiAccount));
});

// Payments the merchant can still manually settle from the dashboard even
// though the payer can no longer act on them (e.g. the QR expired but the
// merchant confirms money actually arrived, or wants to formally close it out).
const MANUALLY_SETTLEABLE_STATUSES = ['pending', 'expired'];

const cancel = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');
  if (!MANUALLY_SETTLEABLE_STATUSES.includes(payment.status)) {
    throw ApiError.badRequest(ERROR_CODES.PAYMENT_NOT_PENDING, `Payment is ${payment.status}, cannot cancel.`);
  }
  payment.status = 'cancelled';
  payment.cancelledAt = new Date();
  await payment.save();
  // enqueue webhook so merchant systems see the failure
  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  const serialized = serializePayment(payment, upiAccount);
  const merchant = await Merchant.findById(req.merchant._id).select('+webhookSecret');
  await enqueueWebhook({ merchant, event: 'payment.failed', paymentId: payment._id, payload: serialized });

  res.json({ ok: true });
});

/** Manual UTR fallback confirm (dashboard-initiated, not forwarder). */
const confirm = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!payment) throw ApiError.notFound(ERROR_CODES.PAYMENT_NOT_FOUND, 'Payment not found.');
  if (!MANUALLY_SETTLEABLE_STATUSES.includes(payment.status)) {
    throw ApiError.badRequest(ERROR_CODES.PAYMENT_NOT_PENDING, `Payment is ${payment.status}, cannot confirm.`);
  }

  payment.status = 'paid';
  payment.paidAt = new Date();
  // Only set utr if provided (dashboard may mark paid without supplying a UTR)
  if (typeof req.body.utr !== 'undefined' && req.body.utr !== '') {
    payment.utr = req.body.utr;
  }
  payment.confirmationSource = 'manual';
  await payment.save();

  const upiAccount = await MerchantUpiAccount.findById(payment.upiAccountId);
  const serialized = serializePayment(payment, upiAccount);
  publish(payment.publicId, 'status', { status: 'paid', ...serialized });

  const merchant = await Merchant.findById(req.merchant._id).select('+webhookSecret');
  await enqueueWebhook({ merchant, event: 'payment.paid', paymentId: payment._id, payload: serialized });

  res.json(serialized);
});

module.exports = { create, list, stats, getOne, cancel, confirm };
