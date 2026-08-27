const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { MerchantUser } = require('../models');
const { hashPassword } = require('../utils/crypto.util');

function serializeStaff(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
  };
}

const list = asyncHandler(async (req, res) => {
  const users = await MerchantUser.find({ merchantId: req.merchant._id }).sort({ createdAt: 1 });
  res.json({ data: users.map(serializeStaff) });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await MerchantUser.findOne({ merchantId: req.merchant._id, email });
  if (existing) throw ApiError.conflict('STAFF_EMAIL_EXISTS', 'A staff account with this email already exists.');

  const passwordHash = await hashPassword(password);
  const user = await MerchantUser.create({
    merchantId: req.merchant._id,
    name,
    email,
    passwordHash,
    role: role || 'merchant_staff',
  });

  res.status(201).json(serializeStaff(user));
});

const update = asyncHandler(async (req, res) => {
  const user = await MerchantUser.findOne({ _id: req.params.id, merchantId: req.merchant._id });
  if (!user) throw ApiError.notFound('STAFF_NOT_FOUND', 'Staff account not found.');

  if (String(user._id) === String(req.merchantUser._id) && req.body.isActive === false) {
    throw ApiError.badRequest('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own account.');
  }

  Object.assign(user, req.body);
  await user.save();
  res.json(serializeStaff(user));
});

module.exports = { list, create, update };
