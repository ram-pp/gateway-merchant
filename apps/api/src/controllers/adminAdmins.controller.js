const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { PlatformAdmin } = require('../models');
const { hashPassword } = require('../utils/crypto.util');

const list = asyncHandler(async (req, res) => {
  const admins = await PlatformAdmin.find().sort({ createdAt: -1 });
  res.json({ data: admins });
});

const create = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await PlatformAdmin.findOne({ email });
  if (exists) throw ApiError.conflict('EMAIL_TAKEN', 'A platform admin with that email already exists.');

  const passwordHash = await hashPassword(password);
  const admin = await PlatformAdmin.create({ name, email, passwordHash, role: role || 'support' });
  res.status(201).json({ id: admin._id, name: admin.name, email: admin.email, role: admin.role });
});

const update = asyncHandler(async (req, res) => {
  const admin = await PlatformAdmin.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!admin) throw ApiError.notFound('ADMIN_NOT_FOUND', 'Platform admin not found.');
  res.json(admin);
});

module.exports = { list, create, update };
