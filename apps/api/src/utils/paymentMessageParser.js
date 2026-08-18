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

// Bank/UPI messages often carry their own timestamp, e.g. "...credited on
// 15-08-26 at 14:32:11 IST" or "...received 15/Aug/2026 14:32". DATE_RE and
// TIME_RE are matched independently since either can appear without the
// other, or in either order.
const DATE_RE = /\b(\d{1,2})[-\/\s]([A-Za-z]{3,9}|\d{1,2})[-\/\s](\d{2,4})\b/;
const TIME_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i;

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseMonthToken(tok) {
  if (/^\d+$/.test(tok)) {
    const n = Number(tok);
    return n >= 1 && n <= 12 ? n - 1 : null;
  }
  const key = tok.slice(0, 3).toLowerCase();
  return key in MONTHS ? MONTHS[key] : null;
}

/**
 * Extracts an explicit date/time mentioned in the message/title text. A
 * time-of-day with no date in the text is anchored to `eventTime`'s calendar
 * date (the day the forwarder saw the event), since that's the day the
 * transaction almost always happened on. Returns null if no time-of-day is
 * present — a bare date with no time isn't precise enough to be useful as a
 * cutoff.
 */
function extractMessageTime(text, eventTime) {
  const timeMatch = text.match(TIME_RE);
  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = timeMatch[3] ? Number(timeMatch[3]) : 0;
  const meridiem = timeMatch[4] ? timeMatch[4].replace(/\./g, '').toLowerCase() : null;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59 || second > 59) return null;

  const anchor = eventTime instanceof Date && !Number.isNaN(eventTime.getTime()) ? eventTime : new Date();
  let year = anchor.getFullYear();
  let month = anchor.getMonth();
  let day = anchor.getDate();

  const dateMatch = text.match(DATE_RE);
  if (dateMatch) {
    const d = Number(dateMatch[1]);
    const m = parseMonthToken(dateMatch[2]);
    let y = Number(dateMatch[3]);
    if (m !== null && d >= 1 && d <= 31) {
      if (y < 100) y += 2000;
      year = y;
      month = m;
      day = d;
    }
  }

  const result = new Date(year, month, day, hour, minute, second);
  return Number.isNaN(result.getTime()) ? null : result;
}

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
 * @param {{ message: string, title?: string, appIdentifier?: string, logType?: 'sms'|'notification'|string, eventTime?: Date }} input
 */
function parsePaymentMessage({ message, title, appIdentifier, logType, eventTime }) {
  // Consider title and message together; title may contain amount/details
  const text = `${String(title || '')}\n${String(message || '')}`;
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
    messageTime: null,
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
  const shared = require('@merchant-pay/shared');
  const detectProviderFromAppIdentifier = typeof shared.detectProviderFromAppIdentifier === 'function' ? shared.detectProviderFromAppIdentifier : null;
  const appName = isNotification
    ? ((detectProviderFromAppIdentifier && detectProviderFromAppIdentifier(appIdentifier)) || (vpaMatch ? detectUpiProvider(vpaMatch[1]) : null))
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
    messageTime: extractMessageTime(text, eventTime),
  };
}

module.exports = { parsePaymentMessage };
