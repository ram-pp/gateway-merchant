const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Payment, MerchantUpiAccount, Merchant } = require('../models');
const { serializePayment } = require('../services/payment.service');
const { buildQrPngBase64 } = require('../utils/qr.util');
const { subscribe } = require('../utils/sse.hub');

const DEFAULT_PAY_PAGE_THEME = {
  mode: 'light',
  brand: {
    merchantName: 'Merchant',
    logoUrl: '',
    accentColor: '#2563eb',
    primaryText: '#0f172a',
    secondaryText: '#475569',
    background: '#f8fafc',
    cardBackground: '#ffffff',
    buttonColor: '#2563eb',
    buttonText: '#ffffff',
    successColor: '#16a34a',
    borderColor: '#e2e8f0',
  },
  layout: {
    showMerchantName: true,
    showAmount: true,
    showNote: true,
    showQr: true,
    showPayButtons: true,
    showPoweredBy: false,
  },
  copy: {
    title: 'Pay now',
    subtitle: 'Secure payment',
    buttonText: 'Pay now',
    noteLabel: 'Note',
  },
};

/** GET /api/public/pay/:publicToken — unauthenticated, unguessable-token status + QR for hosted pay page. */
const getByPublicToken = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({ publicToken: req.params.publicToken });
  if (!payment) throw ApiError.notFound('PAYMENT_NOT_FOUND', 'Payment not found or link expired.');

  const [upiAccount, merchant] = await Promise.all([
    MerchantUpiAccount.findById(payment.upiAccountId),
    Merchant.findById(payment.merchantId),
  ]);

  const qrPngBase64 = payment.status === 'pending' ? await buildQrPngBase64(payment.upiIntent) : null;

  const theme = {
    ...DEFAULT_PAY_PAGE_THEME,
    ...((merchant?.settings?.payPageTheme) || {}),
    brand: {
      ...DEFAULT_PAY_PAGE_THEME.brand,
      ...((merchant?.settings?.payPageTheme?.brand) || {}),
    },
    layout: {
      ...DEFAULT_PAY_PAGE_THEME.layout,
      ...((merchant?.settings?.payPageTheme?.layout) || {}),
    },
    copy: {
      ...DEFAULT_PAY_PAGE_THEME.copy,
      ...((merchant?.settings?.payPageTheme?.copy) || {}),
    },
  };

  res.json({
    ...serializePayment(payment, upiAccount),
    qrPngBase64,
    merchantName: merchant?.name || theme.brand.merchantName,
    payPageTheme: theme,
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
