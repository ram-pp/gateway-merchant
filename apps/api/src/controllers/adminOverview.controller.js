const asyncHandler = require('../utils/asyncHandler');
const { Merchant, Payment, ForwarderLog, WebhookDelivery } = require('../models');

const overview = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

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
