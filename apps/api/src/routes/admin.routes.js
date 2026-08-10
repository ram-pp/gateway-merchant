const express = require('express');
const Joi = require('joi');
const { authenticatePlatformAdmin, requireSuperadmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { loginSchema } = require('../validators/auth.validator');
const { createMerchantSchema, updateMerchantSchema } = require('../validators/merchant.validator');
const { confirmPaymentSchema } = require('../validators/payment.validator');

const auth = require('../controllers/adminAuth.controller');
const merchants = require('../controllers/adminMerchants.controller');
const payments = require('../controllers/adminPayments.controller');
const forwarderLogs = require('../controllers/adminForwarderLogs.controller');
const webhooks = require('../controllers/adminWebhooks.controller');
const admins = require('../controllers/adminAdmins.controller');
const overviewCtrl = require('../controllers/adminOverview.controller');

const createAdminSchema = Joi.object({
  name: Joi.string().trim().max(120).allow('').optional(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('superadmin', 'support').default('support'),
});

const router = express.Router();

router.post('/auth/login', validate(loginSchema), auth.login);

router.use(authenticatePlatformAdmin);

router.get('/auth/me', auth.me);
router.get('/overview', overviewCtrl.overview);

router.post('/merchants', validate(createMerchantSchema), merchants.create);
router.get('/merchants', merchants.list);
router.get('/merchants/:id', merchants.getOne);
router.patch('/merchants/:id', validate(updateMerchantSchema), merchants.update);

router.get('/payments', payments.list);
router.get('/payments/:id', payments.getOne);
router.post('/payments/:id/confirm', validate(confirmPaymentSchema), payments.confirm);
router.post('/payments/:id/expire', payments.expire);

router.get('/forwarder-logs', forwarderLogs.list);
router.post('/forwarder-logs/:id/reprocess', forwarderLogs.reprocess);

router.get('/webhook-deliveries', webhooks.list);
router.post('/webhook-deliveries/:id/retry', webhooks.retry);

router.get('/admins', requireSuperadmin, admins.list);
router.post('/admins', requireSuperadmin, validate(createAdminSchema), admins.create);
router.patch('/admins/:id', requireSuperadmin, admins.update);

module.exports = router;
