const Joi = require('joi');

const createPaymentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  merchantOrderRef: Joi.string().trim().max(140).optional(),
  customerMobile: Joi.string().trim().max(20).optional().allow(''),
  upiAccountId: Joi.string().trim().optional(),
  expiresInSeconds: Joi.number().integer().min(60).max(86400).optional(),
  metadata: Joi.object().unknown(true).optional(),
});

const listPaymentsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'expired', 'cancelled', 'failed').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  q: Joi.string().trim().max(140).optional(),
  // Kept as a plain "YYYY-MM-DD" string rather than Joi.date() — the latter
  // converts to a JS Date at validation time (validate.middleware writes
  // that converted value back onto req.query), which would strip the
  // date-only string the controller needs to anchor the range to IST
  // calendar days instead of UTC ones.
  fromDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const confirmPaymentSchema = Joi.object({
  // UTR may not always be known when manually marking paid from the dashboard,
  // allow it to be omitted or an empty string.
  utr: Joi.string().trim().min(4).max(30).optional().allow(''),
});

module.exports = { createPaymentSchema, listPaymentsQuerySchema, confirmPaymentSchema };
