const express = require('express');
const { authenticateMerchantJwt } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { loginSchema, webhookSettingsSchema } = require('../validators/auth.validator');
const { createUpiAccountSchema, updateUpiAccountSchema } = require('../validators/upiAccount.validator');
const { createPaymentSchema, listPaymentsQuerySchema, confirmPaymentSchema } = require('../validators/payment.validator');

const auth = require('../controllers/merchantAuth.controller');
const upiAccounts = require('../controllers/merchantUpiAccounts.controller');
const settings = require('../controllers/merchantSettings.controller');
const credentials = require('../controllers/merchantCredentials.controller');
const payments = require('../controllers/merchantPayments.controller');
const forwarder = require('../controllers/merchantForwarder.controller');

const router = express.Router();

router.post('/auth/login', validate(loginSchema), auth.login);

router.use(authenticateMerchantJwt);

router.get('/auth/me', auth.me);

router.get('/upi-accounts', upiAccounts.list);
router.get('/upi-accounts/suggest-provider', upiAccounts.suggestProvider);
router.post('/upi-accounts', validate(createUpiAccountSchema), upiAccounts.create);
router.patch('/upi-accounts/:id', validate(updateUpiAccountSchema), upiAccounts.update);
router.delete('/upi-accounts/:id', upiAccounts.remove);

router.get('/settings/webhook', settings.getWebhookSettings);
router.put('/settings/webhook', validate(webhookSettingsSchema), settings.updateWebhookSettings);
router.put('/settings/general', settings.updateGeneralSettings);

router.post('/credentials/rotate', credentials.rotate);
router.post('/credentials/revoke', credentials.revoke);
router.post('/credentials/webhook-secret/rotate', credentials.rotateWebhookSecret);

router.get('/payments', validate(listPaymentsQuerySchema, 'query'), payments.list);
router.post('/payments', validate(createPaymentSchema), payments.create);
router.get('/payments/:id', payments.getOne);
router.post('/payments/:id/cancel', payments.cancel);
router.post('/payments/:id/confirm', validate(confirmPaymentSchema), payments.confirm);

router.post('/forwarder/connect', forwarder.connect);
router.get('/forwarder/status', forwarder.status);
router.delete('/forwarder/:deviceId', forwarder.disconnect);
router.get('/forwarder/logs', forwarder.logs);

module.exports = router;
