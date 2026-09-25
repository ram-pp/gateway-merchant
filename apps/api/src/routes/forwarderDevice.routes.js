const express = require('express');
const validate = require('../middleware/validate.middleware');
const rateLimit = require('../middleware/rateLimit.middleware');
const {
  registerForwarderSchema,
  forwarderEventSchema,
  linkAccountSchema,
  listAccountsSchema,
} = require('../validators/forwarder.validator');
const device = require('../controllers/forwarderDevice.controller');

const router = express.Router();

router.use(rateLimit({ windowMs: 60_000, max: 600, keyFn: (req) => req.ip }));

router.post('/register', validate(registerForwarderSchema), device.register);
router.post('/event', validate(forwarderEventSchema), device.receiveEvent);
router.post('/accounts/link', validate(linkAccountSchema), device.linkAccount);
router.post('/accounts/list', validate(listAccountsSchema), device.listAccounts);

module.exports = router;
