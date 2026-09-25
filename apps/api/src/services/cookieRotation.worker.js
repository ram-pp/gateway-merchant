const cron = require('node-cron');
const env = require('../config/env');
const { ForwarderLinkedAccount } = require('../models');
const { rotateLinkedAccount } = require('./cookieRotation.service');

let task = null;

async function tick() {
  const due = await ForwarderLinkedAccount.find({
    $or: [
      { cookieExpiresAt: null },
      { cookieExpiresAt: { $lte: new Date(Date.now() + env.COOKIE_EXPIRY_SKEW_MS) } },
    ],
    cookieEncrypted: { $ne: null },
  }).limit(50);

  for (const linkedAccount of due) {
    try {
      await rotateLinkedAccount(linkedAccount);
    } catch (error) {
      console.error(
        `[cookie-rotation] rotation failed for account ${linkedAccount.accountId}:`,
        error.message,
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
