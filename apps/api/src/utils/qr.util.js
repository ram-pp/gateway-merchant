const QRCode = require('qrcode');

const PAYTM_STATIC_SIGN = 'AAuN7izDWN5cb8A5scnUiNME+LkZqI2DWgkXlN1McoP6WZABa/KkFTiLvuPRP6/nWK8BPg/rPhb+u4QMrUEX10UsANTDbJaALcSM9b8Wk218X+55T/zOzb7xoiB+BcX8yYuYayELImXJHIgL/c7nkAnHrwUCmbM97nRbCVVRvU0ku3Tr';

/**
 * Build the NPCI UPI deep-link intent for a payment.
 * `upi://pay?pa=<VPA>&pn=<PayeeName>&am=<Amount>&cu=INR&tn=<RandomOrderCode>`
 */
function buildUpiIntent({ vpa, payeeName, amount, transactionNote, tr }) {
  const params = new URLSearchParams();
  params.set('pa', vpa);
  params.set('pn', payeeName || vpa);
  params.set('am', Number(amount).toFixed(2));
  params.set('cu', 'INR');
  if (transactionNote) params.set('tn', transactionNote);
  // tr: transaction reference (public token / id)
  if (tr) params.set('tr', tr);
  return `upi://pay?${params.toString()}`;
}

function buildPaytmCashWalletIntent({
  pa,
  pn,
  amount,
  transactionNote,
  tr,
  sign = PAYTM_STATIC_SIGN,
  mc = '4722',
}) {
  if (!pa) return '';

  const params = new URLSearchParams({
    pa: String(pa),
    pn: String(pn || pa),
    am: String(Number(amount).toFixed(2)),
    cu: 'INR',
    tn: String(transactionNote || ''),
    tr: String(tr || transactionNote || ''),
    mc: String(mc),
    sign: String(sign),
    featuretype: 'money_transfer',
  });

  return `paytmmp://cash_wallet?${params.toString()}`;
}

/** Returns a base64 PNG data (no data: prefix) for the given intent string. */
async function buildQrPngBase64(intent) {
  const buffer = await QRCode.toBuffer(intent, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
  });
  return buffer.toString('base64');
}

module.exports = { buildUpiIntent, buildQrPngBase64, buildPaytmCashWalletIntent };
