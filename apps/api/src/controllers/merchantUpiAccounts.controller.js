const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ERROR_CODES, prefixedId, detectUpiProvider } = require('@merchant-pay/shared');
const { MerchantUpiAccount } = require('../models');

const list = asyncHandler(async (req, res) => {
  const accounts = await MerchantUpiAccount.find({ merchantId: req.merchant._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });
  res.json({ data: accounts });
});

const suggestProvider = asyncHandler(async (req, res) => {
  const { upiId } = req.query;
  res.json({ suggested: detectUpiProvider(upiId) });
});

const create = asyncHandler(async (req, res) => {
  const { upiId, displayName, upiProvider, upiType, isDefault } = req.body;

  const existing = await MerchantUpiAccount.findOne({ merchantId: req.merchant._id, upiId });
  if (existing) throw ApiError.conflict('UPI_ACCOUNT_EXISTS', 'This UPI id is already added for your account.');

  if (isDefault) {
    await MerchantUpiAccount.updateMany({ merchantId: req.merchant._id }, { $set: { isDefault: false } });
  }

  const account = await MerchantUpiAccount.create({
    publicId: prefixedId('upiacc'),
    merchantId: req.merchant._id,
    upiId,
    displayName,
    upiProvider,
    upiType,
    isDefault: Boolean(isDefault),
  });

  res.status(201).json(account);
});

const update = asyncHandler(async (req, res) => {
  const account = await MerchantUpiAccount.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!account) throw ApiError.notFound(ERROR_CODES.UPI_ACCOUNT_NOT_FOUND, 'UPI account not found.');

  if (req.body.isDefault === true) {
    await MerchantUpiAccount.updateMany(
      { merchantId: req.merchant._id, _id: { $ne: account._id } },
      { $set: { isDefault: false } },
    );
  }

  Object.assign(account, req.body);
  await account.save();
  res.json(account);
});

const remove = asyncHandler(async (req, res) => {
  const account = await MerchantUpiAccount.findOne({ publicId: req.params.id, merchantId: req.merchant._id });
  if (!account) throw ApiError.notFound(ERROR_CODES.UPI_ACCOUNT_NOT_FOUND, 'UPI account not found.');
  account.isActive = false;
  await account.save();
  res.json({ ok: true });
});

module.exports = { list, create, update, remove, suggestProvider };
