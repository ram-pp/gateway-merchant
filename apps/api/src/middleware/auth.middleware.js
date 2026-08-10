const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { compareSecret } = require('../utils/crypto.util');
const { Merchant, MerchantUser, PlatformAdmin } = require('../models');

/**
 * Third-party developer auth — X-Api-Key + X-Api-Secret.
 * Attaches req.merchant (Mongoose doc, no secret hash).
 */
const authenticateMerchantApi = asyncHandler(async (req, res, next) => {
  const apiKey = req.header('X-Api-Key');
  const apiSecret = req.header('X-Api-Secret');

  if (!apiKey || !apiSecret) {
    throw ApiError.unauthorized('Missing X-Api-Key / X-Api-Secret headers.');
  }

  const isSandboxKey = apiKey.startsWith('mk_test_');
  const query = isSandboxKey ? { sandboxApiKey: apiKey } : { apiKey };
  const merchant = await Merchant.findOne(query).select(
    isSandboxKey ? '+sandboxApiSecretHash' : '+apiSecretHash',
  );

  if (!merchant) throw ApiError.unauthorized('Invalid API credentials.');
  if (merchant.status === 'suspended') {
    throw new ApiError(403, 'MERCHANT_SUSPENDED', 'This merchant account is suspended.');
  }
  if (!isSandboxKey && merchant.apiCredentialsRevokedAt) {
    throw ApiError.unauthorized('API credentials have been revoked. Rotate to get a new secret.');
  }

  const hash = isSandboxKey ? merchant.sandboxApiSecretHash : merchant.apiSecretHash;
  const valid = await compareSecret(apiSecret, hash);
  if (!valid) throw ApiError.unauthorized('Invalid API credentials.');

  req.merchant = merchant;
  req.isSandbox = isSandboxKey;
  next();
});

/** Merchant dashboard staff — Bearer JWT, audience "merchant_user". */
const authenticateMerchantJwt = asyncHandler(async (req, res, next) => {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing bearer token.');

  let payload;
  try {
    payload = jwt.verify(token, env.MERCHANT_JWT_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session.');
  }
  if (payload.aud !== 'merchant_user') throw ApiError.unauthorized('Invalid token audience.');

  const user = await MerchantUser.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or inactive.');

  const merchant = await Merchant.findById(user.merchantId);
  if (!merchant) throw ApiError.unauthorized('Merchant not found.');
  if (merchant.status === 'suspended') {
    throw new ApiError(403, 'MERCHANT_SUSPENDED', 'This merchant account is suspended.');
  }

  req.merchantUser = user;
  req.merchant = merchant;
  next();
});

/** Platform operators — Bearer JWT, audience "platform_admin". Never valid on merchant panel APIs. */
const authenticatePlatformAdmin = asyncHandler(async (req, res, next) => {
  const header = req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing bearer token.');

  let payload;
  try {
    payload = jwt.verify(token, env.PLATFORM_ADMIN_JWT_SECRET);
  } catch {
    throw ApiError.unauthorized('Invalid or expired session.');
  }
  if (payload.aud !== 'platform_admin') throw ApiError.unauthorized('Invalid token audience.');

  const admin = await PlatformAdmin.findById(payload.sub);
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Account not found or inactive.');

  req.platformAdmin = admin;
  next();
});

const requireSuperadmin = (req, res, next) => {
  if (req.platformAdmin?.role !== 'superadmin') {
    throw ApiError.forbidden('Superadmin role required.');
  }
  next();
};

module.exports = {
  authenticateMerchantApi,
  authenticateMerchantJwt,
  authenticatePlatformAdmin,
  requireSuperadmin,
};
