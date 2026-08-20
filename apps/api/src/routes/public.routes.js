const express = require('express');
const rateLimit = require('../middleware/rateLimit.middleware');
const publicCtrl = require('../controllers/public.controller');

const router = express.Router();

router.use(rateLimit({ windowMs: 60_000, max: 300, keyFn: (req) => req.ip }));

router.get('/pay/:publicToken', publicCtrl.getByPublicToken);
router.get('/pay/:publicToken/events', publicCtrl.streamByPublicToken);
router.post('/webhook-echo', publicCtrl.webhookEcho);

module.exports = router;
