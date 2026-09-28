const cron = require('node-cron');
const env = require('../config/env');
const { pollDuePayments } = require('./forwarderPaymentPoll.service');

let task = null;

function startForwarderPollWorker() {
  if (task) return;
  task = cron.schedule(env.FORWARDER_POLL_CRON, () => {
    pollDuePayments()
      .then(({ checked, matched }) => {
        if (checked) {
          console.log(`[forwarder-poll] checked ${checked} pending payment(s), matched ${matched}.`);
        }
      })
      .catch((err) => console.error('[forwarder-poll] tick failed:', err.message));
  });
  console.log(`[forwarder-poll] started (cron "${env.FORWARDER_POLL_CRON}")`);
}

function stopForwarderPollWorker() {
  if (task) task.stop();
  task = null;
}

module.exports = { startForwarderPollWorker, stopForwarderPollWorker };
