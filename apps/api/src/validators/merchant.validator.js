const Joi = require('joi');

const createMerchantSchema = Joi.object({
  name: Joi.string().trim().max(120).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9-]{3,60}$/)
    .required(),
  ownerEmail: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  ownerPassword: Joi.string().min(8).required(),
  ownerName: Joi.string().trim().max(120).allow('').optional(),
});

const updateMerchantSchema = Joi.object({
  status: Joi.string().valid('active', 'suspended').optional(),
  name: Joi.string().trim().max(120).allow('').optional(),
  settings: Joi.object({
    defaultTtlSeconds: Joi.number().integer().min(60).max(86400).optional(),
    allowAmountEdit: Joi.boolean().optional(),
    successRedirectUrl: Joi.string().uri().allow(null, '').optional(),
  }).optional(),
});

module.exports = { createMerchantSchema, updateMerchantSchema };
