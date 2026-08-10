const asyncHandler = require('../utils/asyncHandler');
const {
  generateApiKey,
  generateApiSecret,
  hashSecret,
  lastFour,
  generateWebhookSecret,
} = require('../utils/crypto.util');
const { Merchant } = require('../models');

const rotate = asyncHandler(async (req, res) => {
  const sandbox = Boolean(req.body?.sandbox);
  const apiKey = generateApiKey(sandbox);
  const apiSecret = generateApiSecret();
  const apiSecretHash = await hashSecret(apiSecret);

  const update = sandbox
    ? { sandboxApiKey: apiKey, sandboxApiSecretHash: apiSecretHash }
    : {
        apiKey,
        apiSecretHash,
        apiSecretLastFour: lastFour(apiSecret),
        apiCredentialsRotatedAt: new Date(),
        apiCredentialsRevokedAt: null,
      };

  await Merchant.findByIdAndUpdate(req.merchant._id, update);

  res.json({
    sandbox,
    apiKey,
    apiSecret, // shown once
    message: 'Store this secret now — it will not be shown again.',
  });
});

const revoke = asyncHandler(async (req, res) => {
  await Merchant.findByIdAndUpdate(req.merchant._id, { apiCredentialsRevokedAt: new Date() });
  res.json({ ok: true, message: 'API credentials revoked. Rotate to issue a new secret.' });
});

const rotateWebhookSecret = asyncHandler(async (req, res) => {
  const webhookSecret = generateWebhookSecret();
  await Merchant.findByIdAndUpdate(req.merchant._id, { webhookSecret });
  res.json({ webhookSecret, message: 'Store this secret now — it will not be shown again.' });
});

module.exports = { rotate, revoke, rotateWebhookSecret };
