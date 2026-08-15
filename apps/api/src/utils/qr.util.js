const QRCode = require('qrcode');

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

module.exports = { buildUpiIntent, buildQrPngBase64 };
