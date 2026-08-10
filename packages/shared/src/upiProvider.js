/**
 * UPI provider ("which app") detection + canonical list.
 *
 * Ported as an *idea* from ssPaymentSolutions `src/utils/upiProvider.js` and
 * reimplemented standalone for merchant-pay — no runtime dependency on Core.
 *
 * Used for:
 *  - the "Which app is this UPI id?" required select when a merchant adds a UPI account
 *  - matching forwarder UPI-app notifications to the correct MerchantUpiAccount
 */

const HANDLE_MAP = {
  ybl: 'PhonePe',
  ibl: 'PhonePe',
  axl: 'PhonePe',
  okaxis: 'Google Pay',
  okhdfcbank: 'Google Pay',
  okicici: 'Google Pay',
  oksbi: 'Google Pay',
  paytm: 'Paytm',
  pthdfc: 'Paytm',
  ptyes: 'Paytm',
  ptsbi: 'Paytm',
  ptaxis: 'Paytm',
  ptkotak: 'Paytm',
  upi: 'BHIM',
  bhim: 'BHIM',
  apl: 'Amazon Pay',
  yapl: 'Amazon Pay',
  rapl: 'Amazon Pay',
  wa: 'WhatsApp Pay',
  waaxis: 'WhatsApp Pay',
  axisb: 'CRED',
  jio: 'JioMoney',
  jiomoney: 'JioMoney',
  airtel: 'Airtel Money',
  fc: 'Freecharge',
  freecharge: 'Freecharge',
  ikwik: 'MobiKwik',
  sliceaxis: 'Slice',
  fi: 'Fi Money',
  naviaxis: 'Navi',
  groww: 'Groww',
  jupiteraxis: 'Jupiter',
  niyogin: 'Niyogin',
  sbi: 'SBI',
  icici: 'ICICI Bank',
  axis: 'Axis Bank',
  hdfcbank: 'HDFC Bank',
  kotak: 'Kotak Bank',
  yesbank: 'Yes Bank',
  indus: 'IndusInd Bank',
  rbl: 'RBL Bank',
  idfc: 'IDFC Bank',
  federal: 'Federal Bank',
  bob: 'Bank of Baroda',
  pnb: 'PNB',
  cbi: 'Central Bank',
  boi: 'Bank of India',
  union: 'Union Bank',
  canara: 'Canara Bank',
  iob: 'IOB',
  aubank: 'AU Small Finance Bank',
  equitas: 'Equitas Bank',
  ujjivan: 'Ujjivan Bank',
  truebalance: 'TrueBalance',
  bajaj: 'Bajaj Pay',
};

/**
 * Manual-only options — not tied to a single auto-detectable handle (merchant
 * business profiles on these apps can appear under many handles depending on
 * the acquiring bank/aggregator), but merchants still need to pick them
 * explicitly so forwarder app-notification matching (see providersMatch) works.
 */
const EXTRA_MANUAL_PROVIDERS = ['Google Pay Merchant', 'Airtel Merchant'];

/** Canonical, sorted, de-duplicated list of provider labels for selects. */
const UPI_PROVIDER_OPTIONS = [...new Set([...Object.values(HANDLE_MAP), ...EXTRA_MANUAL_PROVIDERS])].sort(
  (a, b) => a.localeCompare(b),
);

/**
 * @param {string} upiId e.g. "shop@okaxis"
 * @returns {string|null}
 */
function detectUpiProvider(upiId) {
  if (!upiId || typeof upiId !== 'string') return null;
  const handle = upiId.trim().toLowerCase().split('@')[1];
  if (!handle) return null;
  return HANDLE_MAP[handle] ?? null;
}

/** Normalize app-name spellings (PhonePe / Google Pay / GPay / BHIM variants...) for comparison. */
function normalizeProviderKey(name) {
  const s = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (s === 'gpay' || s.startsWith('googlepay')) return 'googlepay'; // incl. "Google Pay Merchant"/"Business"
  if (s.startsWith('bhim')) return 'bhim';
  if (s === 'cred' || s === 'credclub') return 'cred';
  if (s === 'mobikwik' || s === 'ikwik') return 'mobikwik';
  if (s === 'freecharge' || s === 'fc') return 'freecharge';
  if (s === 'whatsapp' || s === 'whatsapppay') return 'whatsapppay';
  if (s === 'amazon' || s === 'amazonpay') return 'amazonpay';
  if (s === 'phonepe') return 'phonepe';
  if (s === 'paytm') return 'paytm';
  if (s === 'airtelmerchant' || s === 'airtelpaymentsbank') return 'airtelmerchant';
  if (s === 'airtel' || s === 'airtelmoney' || s === 'airtelthanks') return 'airtelmoney';
  return s;
}

/** True if two provider labels/app-names refer to the same app. */
function providersMatch(a, b) {
  if (!a || !b) return false;
  const x = normalizeProviderKey(a);
  const y = normalizeProviderKey(b);
  return Boolean(x && y && x === y);
}

module.exports = {
  HANDLE_MAP,
  UPI_PROVIDER_OPTIONS,
  detectUpiProvider,
  normalizeProviderKey,
  providersMatch,
};
