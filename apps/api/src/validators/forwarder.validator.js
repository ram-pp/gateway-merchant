const Joi = require('joi');

const connectForwarderSchema = Joi.object({
  label: Joi.string().trim().max(60).optional(),
  upiAccountId: Joi.string().trim().optional(),
});

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
  meta: Joi.object({
    title: Joi.string().trim().allow(null, '').optional(),
    sender: Joi.string().trim().allow(null, '').optional(),
  }).optional(),
  time: Joi.date().optional(),
});

const linkAccountSchema = Joi.object({
  forwarderToken: Joi.string().trim().required(),
  pairingToken: Joi.string().trim().allow(null, '').optional(),
  accountId: Joi.string().trim().min(1).max(128).required(),
  cookie: Joi.string().allow(null, '').optional(),
  status: Joi.string().valid('add', 'delete').required(),
  remark: Joi.string().trim().max(120).allow(null, '').optional(),
});

const listAccountsSchema = Joi.object({
  forwarderToken: Joi.string().trim().required(),
  pairingToken: Joi.string().trim().allow(null, '').optional(),
});

const fetchAccountDataSchema = Joi.object({
  forwarderToken: Joi.string().trim().required(),
  accountId: Joi.string().trim().min(1).max(128).required(),
});

module.exports = {
  connectForwarderSchema,
  registerForwarderSchema,
  forwarderEventSchema,
  linkAccountSchema,
  listAccountsSchema,
  fetchAccountDataSchema,
};
