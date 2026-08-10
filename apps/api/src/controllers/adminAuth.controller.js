const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { PlatformAdmin } = require('../models');
const { comparePassword } = require('../utils/crypto.util');

function issueToken(admin) {
  return jwt.sign({ sub: String(admin._id), aud: 'platform_admin', role: admin.role }, env.PLATFORM_ADMIN_JWT_SECRET, {
    expiresIn: env.PLATFORM_ADMIN_JWT_EXPIRES_IN,
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await PlatformAdmin.findOne({ email }).select('+passwordHash');
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Invalid email or password.');

  const valid = await comparePassword(password, admin.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password.');

  admin.lastLoginAt = new Date();
  await admin.save();

  res.json({
    token: issueToken(admin),
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
});

const me = asyncHandler(async (req, res) => {
  const { _id, name, email, role } = req.platformAdmin;
  res.json({ admin: { id: _id, name, email, role } });
});

module.exports = { login, me };
