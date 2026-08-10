const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('@merchant-pay/shared');

/**
 * Minimal in-memory fixed-window rate limiter, keyed by a request property
 * (e.g. merchant apiKey or IP). Fine for a single Node process; if this API
 * is ever horizontally scaled, swap for a shared store.
 */
function rateLimit({ windowMs = 60_000, max = 120, keyFn }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyFn(req) || req.ip;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      throw new ApiError(429, ERROR_CODES.RATE_LIMITED, 'Too many requests — slow down.');
    }
    next();
  };
}

module.exports = rateLimit;
