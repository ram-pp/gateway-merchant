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

/** Derive a 32-byte AES key from an app secret. */
function deriveKey(secret) {
  return crypto.createHash('sha256').update(String(secret || 'dev-linked-account-secret')).digest();
}

/**
 * Encrypt a UTF-8 string (e.g. session cookie) with AES-256-GCM.
 * Returns `iv:tag:ciphertext` hex bundle, or null if plain is empty.
 */
function encryptSecret(plain, secret) {
  if (plain == null || plain === '') return null;
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/** Decrypt a bundle from encryptSecret. Returns null on failure/empty. */
function decryptSecret(bundle, secret) {
  if (!bundle) return null;
  try {
    const [ivHex, tagHex, dataHex] = String(bundle).split(':');
    if (!ivHex || !tagHex || !dataHex) return null;
    const key = deriveKey(secret);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
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
  encryptSecret,
  decryptSecret,
};
