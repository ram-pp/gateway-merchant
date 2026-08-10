const Joi = require('joi');
const { UPI_PROVIDER_OPTIONS, UPI_TYPES } = require('@merchant-pay/shared');

const createUpiAccountSchema = Joi.object({
  upiId: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z][a-zA-Z0-9.\-_]{1,}$/)
    .required()
    .messages({ 'string.pattern.base': 'upiId must look like name@bank.' }),
  displayName: Joi.string().trim().max(80).required(),
  upiProvider: Joi.string()
    .valid(...UPI_PROVIDER_OPTIONS)
    .required()
    .messages({ 'any.required': 'upiProvider is required — pick the app this VPA receives credit notifications from.' }),
  upiType: Joi.string().valid(...UPI_TYPES).default('merchant'),
  isDefault: Joi.boolean().default(false),
});

const updateUpiAccountSchema = Joi.object({
  displayName: Joi.string().trim().max(80).optional(),
  upiProvider: Joi.string().valid(...UPI_PROVIDER_OPTIONS).optional(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = { createUpiAccountSchema, updateUpiAccountSchema };
