/**
 * Parses forwarded SMS text or UPI-app notification text into a structured
 * credit signal: amount, UTR, sender VPA, bank name, account last-4, app name.
 *
 * Ported as an *idea* from ssPaymentSolutions' payment message parser and
 * reimplemented standalone for merchant-pay (own forwarder, own event shape).
 */

const { detectUpiProvider } = require('@merchant-pay/shared');

const CREDIT_HINTS = /\b(credited|received|credit of|deposited|added to your account|payment received)\b/i;
const DEBIT_HINTS = /\b(debited|debit of|sent|paid to|withdrawn|purchase of)\b/i;

const AMOUNT_RE = /(?:rs\.?|inr|₹)\s*([0-9][0-9,]*\.?[0-9]{0,2})/i;
const UTR_RE = /\b(?:utr|ref(?:erence)?(?:\s*no\.?)?|txn\s*id|upi\s*ref(?:\s*no\.?)?)[\s:]*([a-z0-9]{6,25})\b/i;
const VPA_RE = /\b([a-z0-9.\-_]{2,}@[a-z][a-z0-9.\-_]{1,})\b/i;
const LAST4_RE = /\b(?:a\/?c|account)[a-z\s]*?(?:no\.?|number)?[a-z\s]*?[x*]{2,}\s*([0-9]{4})\b/i;

const BANK_NAMES = [
  'SBI',
  'HDFC',
  'ICICI',
  'Axis',
  'Kotak',
  'Yes Bank',
  'IndusInd',
  'RBL',
  'IDFC',
  'Federal',
  'Bank of Baroda',
  'PNB',
  'Canara',
  'Union Bank',
  'Bank of India',
  'IOB',
];

function extractBankName(text) {
  const hit = BANK_NAMES.find((b) => new RegExp(`\\b${b}\\b`, 'i').test(text));
  return hit || null;
}

/**
 * @param {{ message: string, appIdentifier?: string, logType?: 'sms'|'notification'|string }} input
 */
function parsePaymentMessage({ message, appIdentifier, logType }) {
  const text = String(message || '');
  const empty = {
    isParsed: false,
    isCredit: false,
    amount: null,
    utrNumber: null,
    bankName: null,
    senderUPI: null,
    accountLast4: null,
    appName: null,
    isUpiApp: false,
    confidence: 'none',
  };

  if (!text.trim()) return empty;

  const amountMatch = text.match(AMOUNT_RE);
  const isCredit = CREDIT_HINTS.test(text) && !DEBIT_HINTS.test(text);
  const isDebit = DEBIT_HINTS.test(text) && !CREDIT_HINTS.test(text);

  if (!amountMatch || (!isCredit && !isDebit)) {
    return empty;
  }

  const amount = Number(amountMatch[1].replace(/,/g, ''));
  const utrMatch = text.match(UTR_RE);
  const vpaMatch = text.match(VPA_RE);
  const last4Match = text.match(LAST4_RE);
  const bankName = extractBankName(text);

  const isNotification = logType === 'notification';
  const appName = isNotification
    ? appIdentifier || (vpaMatch ? detectUpiProvider(vpaMatch[1]) : null)
    : vpaMatch
      ? detectUpiProvider(vpaMatch[1])
      : null;

  return {
    isParsed: true,
    isCredit,
    amount: Number.isFinite(amount) ? amount : null,
    utrNumber: utrMatch ? utrMatch[1].toUpperCase() : null,
    bankName,
    senderUPI: vpaMatch ? vpaMatch[1].toLowerCase() : null,
    accountLast4: last4Match ? last4Match[1] : null,
    appName: appName || null,
    isUpiApp: isNotification || Boolean(appName),
    confidence: utrMatch ? 'high' : bankName || vpaMatch ? 'medium' : 'low',
  };
}

module.exports = { parsePaymentMessage };
