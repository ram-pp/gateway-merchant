const crypto = require('crypto');

/** Short random base36 suffix, e.g. for ids/tokens. */
function randomSuffix(length = 20) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, length);
}

function prefixedId(prefix, length = 20) {
  return `${prefix}_${randomSuffix(length)}`;
}

/** Short human-friendly transaction-note code for the UPI `tn` field. */
function shortCode(length = 8) {
  return randomSuffix(length).toUpperCase();
}

module.exports = { randomSuffix, prefixedId, shortCode };
