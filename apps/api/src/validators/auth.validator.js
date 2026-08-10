const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
});

const webhookSettingsSchema = Joi.object({
  webhookUrl: Joi.string().uri({ scheme: ['http', 'https'] }).allow(null, '').optional(),
  webhookHeaders: Joi.object().unknown(true).optional(),
});

module.exports = { loginSchema, webhookSettingsSchema };
