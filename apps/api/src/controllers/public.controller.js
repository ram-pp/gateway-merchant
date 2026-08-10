const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Payment, MerchantUpiAccount, Merchant } = require('../models');
const { serializePayment } = require('../services/payment.service');
const { buildQrPngBase64 } = require('../utils/qr.util');
const { subscribe } = require('../utils/sse.hub');

/** GET /api/public/pay/:publicToken — unauthenticated, unguessable-token status + QR for hosted pay page. */
const getByPublicToken = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicToken: req.params.publicToken });
  if (!payment) throw ApiError.notFound('PAYMENT_NOT_FOUND', 'Payment not found or link expired.');

  const [upiAccount, merchant] = await Promise.all([
    MerchantUpiAccount.findById(payment.upiAccountId),
    Merchant.findById(payment.merchantId),
  ]);

  const qrPngBase64 = payment.status === 'pending' ? await buildQrPngBase64(payment.upiIntent) : null;

  res.json({
    ...serializePayment(payment, upiAccount),
    qrPngBase64,
    merchantName: merchant?.name,
    successRedirectUrl: merchant?.settings?.successRedirectUrl || null,
  });
});

/**
 * GET /api/public/pay/:publicToken/events — browser-friendly SSE (EventSource
 * cannot set custom auth headers), scoped by the unguessable publicToken only.
 */
const streamByPublicToken = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicToken: req.params.publicToken });
  if (!payment) throw ApiError.notFound('PAYMENT_NOT_FOUND', 'Payment not found or link expired.');

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

module.exports = { getByPublicToken, streamByPublicToken };
