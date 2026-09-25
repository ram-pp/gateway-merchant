const cron = require('node-cron');
const env = require('../config/env');
const { ForwarderLinkedAccount } = require('../models');
const { rotateLinkedAccount } = require('./cookieRotation.service');

let task = null;

async function tick() {
  // Mirrors cookieRotation.service.js's cookieNeedsRotation: rotate once when never
  // rotated before (lastRotatedAt unset), then only when a known expiry is close —
  // an account that stays expiry-less after its first rotation is trusted indefinitely.
  const due = await ForwarderLinkedAccount.find({
    cookieEncrypted: { $ne: null },
    $or: [
      { lastRotatedAt: null },
      { cookieExpiresAt: { $ne: null, $lte: new Date(Date.now() + env.COOKIE_EXPIRY_SKEW_MS) } },
    ],
  }).limit(50);

  for (const linkedAccount of due) {
    try {
      await rotateLinkedAccount(linkedAccount);
    } catch (error) {
      console.error(
        `[cookie-rotation] rotation failed for account ${linkedAccount.accountId}:`,
        error,
      );
    }
  }
}

function startCookieRotationWorker() {
  if (task) return;
  task = cron.schedule(env.COOKIE_ROTATE_CRON, () => {
    tick().catch((err) => console.error('[cookie-rotation] tick failed:', err.message));
  });
  console.log(`[cookie-rotation] started (cron "${env.COOKIE_ROTATE_CRON}")`);
}

function stopCookieRotationWorker() {
  if (task) task.stop();
  task = null;
}

module.exports = { startCookieRotationWorker, stopCookieRotationWorker, tick };
