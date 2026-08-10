const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/** mk_live_xxx / mk_test_xxx public API key. */
function generateApiKey(sandbox = false) {
  const raw = crypto.randomBytes(18).toString('base64url');
  return `mk_${sandbox ? 'test' : 'live'}_${raw}`;
}

/** High-entropy plaintext secret — shown once, never stored raw. */
function generateApiSecret() {
  return `ms_${crypto.randomBytes(32).toString('base64url')}`;
}

function generateWebhookSecret() {
  return `whsec_${crypto.randomBytes(24).toString('base64url')}`;
}

async function hashSecret(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function compareSecret(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

function lastFour(value) {
  const s = String(value || '');
  return s.length >= 4 ? s.slice(-4) : s;
}

/** HMAC-SHA256 hex signature over a raw payload string. */
function hmacSign(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeEqualHex(a, b) {
  const bufA = Buffer.from(String(a || ''), 'hex');
  const bufB = Buffer.from(String(b || ''), 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function randomToken(length = 24) {
  return crypto.randomBytes(length).toString('base64url');
}

module.exports = {
  generateApiKey,
  generateApiSecret,
  generateWebhookSecret,
  hashSecret,
  compareSecret,
  hashPassword,
  comparePassword,
  lastFour,
  hmacSign,
  timingSafeEqualHex,
  randomToken,
};
