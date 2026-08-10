const Joi = require('joi');

const registerForwarderSchema = Joi.object({
  pairingToken: Joi.string().trim().required(),
  forwarderToken: Joi.string().trim().min(10).required(),
  label: Joi.string().trim().max(60).optional(),
});

const forwarderEventSchema = Joi.object({
  forwarderToken: Joi.string().trim().required(),
  appIdentifier: Joi.string().trim().allow(null, '').optional(),
  message: Joi.string().trim().min(1).required(),
  type: Joi.string().valid('sms', 'notification', 'info').default('sms'),
  time: Joi.date().optional(),
});

module.exports = { registerForwarderSchema, forwarderEventSchema };
