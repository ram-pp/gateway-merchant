const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Merchant, MerchantUser, MerchantUpiAccount, Payment } = require('../models');
const {
  generateApiKey,
  generateApiSecret,
  hashSecret,
  hashPassword,
  lastFour,
  generateWebhookSecret,
} = require('../utils/crypto.util');

const create = asyncHandler(async (req, res) => {
  const { name, slug, ownerEmail, ownerPassword, ownerName } = req.body;

  const exists = await Merchant.findOne({ slug });
  if (exists) throw ApiError.conflict('SLUG_TAKEN', 'That merchant slug is already in use.');

  const apiKey = generateApiKey(false);
  const apiSecret = generateApiSecret();
  const apiSecretHash = await hashSecret(apiSecret);
  const sandboxApiKey = generateApiKey(true);
  const sandboxApiSecret = generateApiSecret();
  const sandboxApiSecretHash = await hashSecret(sandboxApiSecret);
  const webhookSecret = generateWebhookSecret();

  const merchant = await Merchant.create({
    name,
    slug,
    status: 'active',
    apiKey,
    apiSecretHash,
    apiSecretLastFour: lastFour(apiSecret),
    apiCredentialsRotatedAt: new Date(),
    sandboxApiKey,
    sandboxApiSecretHash,
    webhookSecret,
  });

  const passwordHash = await hashPassword(ownerPassword);
  const owner = await MerchantUser.create({
    merchantId: merchant._id,
    name: ownerName || name,
    email: ownerEmail,
    passwordHash,
    role: 'merchant_admin',
  });

  res.status(201).json({
    merchant: { id: merchant._id, name: merchant.name, slug: merchant.slug, status: merchant.status },
    owner: { id: owner._id, email: owner.email },
    credentials: {
      apiKey,
      apiSecret,
      sandboxApiKey,
      sandboxApiSecret,
      message: 'Secrets are shown once — store them now.',
    },
  });
});

const list = asyncHandler(async (req, res) => {
  const { q, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { slug: new RegExp(q, 'i') }];

  const skip = (Number(page) - 1) * Number(limit);
  const [merchants, total] = await Promise.all([
    Merchant.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Merchant.countDocuments(filter),
  ]);

  res.json({ total, page: Number(page), pages: Math.ceil(total / Number(limit)), data: merchants });
});

const getOne = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) throw ApiError.notFound('MERCHANT_NOT_FOUND', 'Merchant not found.');

  const [upiAccounts, users, recentPayments, paymentCount] = await Promise.all([
    MerchantUpiAccount.find({ merchantId: merchant._id }),
    MerchantUser.find({ merchantId: merchant._id }),
    Payment.find({ merchantId: merchant._id }).sort({ createdAt: -1 }).limit(10),
    Payment.countDocuments({ merchantId: merchant._id }),
  ]);

  res.json({ merchant, upiAccounts, users, recentPayments, paymentCount });
});

const update = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!merchant) throw ApiError.notFound('MERCHANT_NOT_FOUND', 'Merchant not found.');
  res.json(merchant);
});

module.exports = { create, list, getOne, update };
