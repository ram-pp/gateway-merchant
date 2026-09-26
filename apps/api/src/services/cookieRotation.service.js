const env = require('../config/env');
const { encryptSecret, decryptSecret } = require('../utils/crypto.util');
const { getSetCookieHeaders, mergeCookies, getEarliestCookieExpiry } = require('../utils/cookie.util');
const { ForwarderLinkedAccount } = require('../models');

// One in-flight rotation per linked account, so concurrent triggers (worker tick +
// on-demand fetch) share the same request instead of racing each other.
const rotationsInFlight = new Map();

function cookieNeedsRotation(linkedAccount) {
  if (!linkedAccount.cookieEncrypted) return true;
  // Never rotated yet — do it once so we learn the real expiry (or confirm the
  // upstream doesn't provide one, in which case we trust the cookie from then on).
  if (!linkedAccount.lastRotatedAt) return true;
  if (!linkedAccount.cookieExpiresAt) return false;
  return Date.now() + env.COOKIE_EXPIRY_SKEW_MS >= new Date(linkedAccount.cookieExpiresAt).getTime();
}

async function requestRotatedCookie(currentCookie) {
  if (!currentCookie) {
    throw new Error('Linked account has no cookie to rotate from');
  }

  const response = await fetch(env.COOKIE_ROTATION_URL, {
    method: 'POST',
    headers: {
      accept: '*/*',
      'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      cookie: currentCookie,
      origin: env.COOKIE_ROTATION_ORIGIN,
      pragma: 'no-cache',
      priority: 'u=3, i',
      referer: `${env.COOKIE_ROTATION_ORIGIN}/`,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'same-origin',
      'sec-fetch-site': 'same-origin',
      'user-agent': env.COOKIE_ROTATION_USER_AGENT,
    },
    body: env.COOKIE_ROTATION_BODY,
  });

  if (!response.ok) {
    throw new Error(`RotateCookies returned HTTP ${response.status}`);
  }

  const setCookieHeaders = getSetCookieHeaders(response.headers);
  if (!setCookieHeaders.length) {
    throw new Error('RotateCookies response did not include Set-Cookie headers');
  }

  return {
    cookie: mergeCookies(currentCookie, setCookieHeaders),
    expiresAt: getEarliestCookieExpiry(setCookieHeaders),
  };
}

/**
 * TODO: derive the upstream RPC's per-session `at=` anti-automation token.
 * Formula not yet known — until this is implemented, fetch requests send at="".
 * Once known, compute it here (e.g. from the rotated cookie / rotation response)
 * right after each rotation.
 */
function deriveAtToken(/* { cookie, expiresAt } */) {
  return null;
}

/** Rotate one linked account's cookie and persist the result. Returns { cookie, atToken }. */
async function rotateLinkedAccount(linkedAccount) {
  const key = String(linkedAccount._id);
  if (rotationsInFlight.has(key)) {
    return rotationsInFlight.get(key);
  }

  const promise = (async () => {
    const currentCookie = decryptSecret(
      linkedAccount.cookieEncrypted,
      env.LINKED_ACCOUNT_COOKIE_SECRET,
    );

    try {
      const { cookie, expiresAt } = await requestRotatedCookie(currentCookie);
      const cookieEncrypted = encryptSecret(cookie, env.LINKED_ACCOUNT_COOKIE_SECRET);
      const atToken = deriveAtToken({ cookie, expiresAt });
      const now = new Date();

      await ForwarderLinkedAccount.updateOne(
        { _id: linkedAccount._id },
        {
          $set: {
            cookieEncrypted,
            cookieExpiresAt: expiresAt ? new Date(expiresAt) : null,
            lastRotatedAt: now,
            lastSyncedAt: now,
            lastRotationError: null,
            atToken,
          },
        },
      );

      return { cookie, atToken };
    } catch (error) {
      await ForwarderLinkedAccount.updateOne(
        { _id: linkedAccount._id },
        { $set: { lastRotationError: error.message } },
      );
      throw error;
    }
  })();

  rotationsInFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    rotationsInFlight.delete(key);
  }
}

/** Ensure a linked account has a fresh cookie, rotating on-demand if needed. Returns { cookie, atToken }. */
async function ensureFreshCookie(linkedAccount) {
  if (!cookieNeedsRotation(linkedAccount)) {
    return {
      cookie: decryptSecret(linkedAccount.cookieEncrypted, env.LINKED_ACCOUNT_COOKIE_SECRET),
      atToken: linkedAccount.atToken || '',
    };
  }
  return rotateLinkedAccount(linkedAccount);
}

module.exports = { cookieNeedsRotation, rotateLinkedAccount, ensureFreshCookie };
