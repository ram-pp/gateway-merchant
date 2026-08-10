const Joi = require('joi');

const createPaymentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  merchantOrderRef: Joi.string().trim().max(140).optional(),
  upiAccountId: Joi.string().trim().optional(),
  expiresInSeconds: Joi.number().integer().min(60).max(86400).optional(),
  metadata: Joi.object().unknown(true).optional(),
});

const listPaymentsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'expired', 'cancelled', 'failed').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  q: Joi.string().trim().max(140).optional(),
});

const confirmPaymentSchema = Joi.object({
  utr: Joi.string().trim().min(4).max(30).required(),
});

module.exports = { createPaymentSchema, listPaymentsQuerySchema, confirmPaymentSchema };
