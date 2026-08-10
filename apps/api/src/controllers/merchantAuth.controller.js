const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { MerchantUser, Merchant } = require('../models');
const { comparePassword } = require('../utils/crypto.util');

function issueToken(user) {
  return jwt.sign({ sub: String(user._id), aud: 'merchant_user', role: user.role }, env.MERCHANT_JWT_SECRET, {
    expiresIn: env.MERCHANT_JWT_EXPIRES_IN,
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await MerchantUser.findOne({ email }).select('+passwordHash');
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid email or password.');

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password.');

  const merchant = await Merchant.findById(user.merchantId);
  if (!merchant) throw ApiError.unauthorized('Merchant not found.');
  if (merchant.status === 'suspended') {
    throw new ApiError(403, 'MERCHANT_SUSPENDED', 'This merchant account is suspended.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    token: issueToken(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    merchant: { id: merchant._id, name: merchant.name, slug: merchant.slug, status: merchant.status },
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    user: {
      id: req.merchantUser._id,
      name: req.merchantUser.name,
      email: req.merchantUser.email,
      role: req.merchantUser.role,
    },
    merchant: {
      id: req.merchant._id,
      name: req.merchant.name,
      slug: req.merchant.slug,
      status: req.merchant.status,
      apiKey: req.merchant.apiKey,
      sandboxApiKey: req.merchant.sandboxApiKey,
      webhookUrl: req.merchant.webhookUrl,
      settings: req.merchant.settings,
    },
  });
});

module.exports = { login, me };
