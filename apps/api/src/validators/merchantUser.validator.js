const Joi = require('joi');
const { MERCHANT_USER_ROLES } = require('@merchant-pay/shared');

const createStaffSchema = Joi.object({
  name: Joi.string().trim().max(80).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string()
    .valid(...MERCHANT_USER_ROLES)
    .default('merchant_staff'),
});

const updateStaffSchema = Joi.object({
  name: Joi.string().trim().max(80).optional(),
  role: Joi.string().valid(...MERCHANT_USER_ROLES).optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = { createStaffSchema, updateStaffSchema };
