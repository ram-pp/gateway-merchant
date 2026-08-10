const mongoose = require('mongoose');
const env = require('../config/env');
const { connectDb } = require('../config/db');
const { PlatformAdmin } = require('../models');
const { hashPassword } = require('../utils/crypto.util');

async function seed() {
  await connectDb();

  const existing = await PlatformAdmin.findOne({ email: env.SEED_SUPERADMIN_EMAIL });
  if (existing) {
    console.log(`[seed] superadmin ${env.SEED_SUPERADMIN_EMAIL} already exists — skipping.`);
  } else {
    const passwordHash = await hashPassword(env.SEED_SUPERADMIN_PASSWORD);
    await PlatformAdmin.create({
      name: 'Superadmin',
      email: env.SEED_SUPERADMIN_EMAIL,
      passwordHash,
      role: 'superadmin',
    });
    console.log(`[seed] created superadmin ${env.SEED_SUPERADMIN_EMAIL}`);
    console.log(`[seed] password: ${env.SEED_SUPERADMIN_PASSWORD} (change after first login)`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
