const express = require('express');
const { authenticateMerchantApi } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const rateLimit = require('../middleware/rateLimit.middleware');
const { createPaymentSchema } = require('../validators/payment.validator');
const payments = require('../controllers/v1Payments.controller');
const misc = require('../controllers/v1Misc.controller');

const router = express.Router();

router.use(authenticateMerchantApi);
router.use(
  rateLimit({
    windowMs: 60_000,
    max: 240,
    keyFn: (req) => req.merchant?.apiKey,
  }),
);

router.get('/ping', misc.ping);
router.get('/upi-accounts', misc.listUpiAccounts);

router.post('/payments', validate(createPaymentSchema), payments.create);
router.get('/payments/by-ref/:ref', payments.getByRef);
router.get('/payments/:id/events', payments.events);
router.get('/payments/:id', payments.getById);
router.post('/payments/:id/cancel', payments.cancel);

router.post('/webhooks/test', misc.testWebhook);

module.exports = router;
