const asyncHandler = require('../utils/asyncHandler');
const { Merchant, Payment, ForwarderLog, WebhookDelivery } = require('../models');
const { istDayStart } = require('../utils/date.util');

const overview = asyncHandler(async (req, res) => {
  // IST calendar day, not the server process's local day — this API runs
  // in a container with no TZ set (UTC), which would otherwise shift
  // "today" by 5:30 relative to the IST business day.
  const startOfDay = istDayStart();

  const [merchantCount, activeMerchantCount, paymentsToday, paidToday, unmatchedLogs, failedWebhooks] =
    await Promise.all([
      Merchant.countDocuments(),
      Merchant.countDocuments({ status: 'active' }),
      Payment.countDocuments({ createdAt: { $gte: startOfDay } }),
      Payment.find({ status: 'paid', paidAt: { $gte: startOfDay } }),
      ForwarderLog.countDocuments({ matchStatus: 'unmatched', createdAt: { $gte: startOfDay } }),
      WebhookDelivery.countDocuments({ status: { $in: ['failed', 'exhausted'] } }),
    ]);

  res.json({
    merchantCount,
    activeMerchantCount,
    paymentsToday,
    paidTodayCount: paidToday.length,
    paidTodayAmount: paidToday.reduce((sum, p) => sum + p.amount, 0),
    unmatchedLogsToday: unmatchedLogs,
    failedWebhooks,
  });
});

module.exports = { overview };
