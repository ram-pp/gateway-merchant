/**
 * Forwarder event → pending Payment matching.
 *
 * Ported as an *idea* from ssPaymentSolutions' transactionMatcher /
 * forwarderPayinMatch and reimplemented for merchant-pay's data model, where
 * the same-amount pending lock already guarantees at most one pending
 * Payment per (upiAccountId, amount).
 */

const { providersMatch } = require('@merchant-pay/shared');

// Exact rupees-and-paise equality, compared in integer paise to sidestep
// binary float representation error (e.g. 19.99 - 19.98 !== 0.01 exactly).
function amountsMatch(a, b) {
  return Math.round(Number(a) * 100) === Math.round(Number(b) * 100);
}

function normBank(name) {
  return (name || '').toLowerCase().replace(/\s+bank\s*$/i, '').trim();
}

/**
 * @param {object} parsed - output of parsePaymentMessage
 * @param {Array} candidatePayments - pending Payment docs (lean), each with `.upiAccount` populated
 * @param {{ logType?: string }} [opts]
 * @returns {{ matched: boolean, payment: object|null, confidence: string, reason: string, autoConfirm: boolean }}
 */
function matchForwarderEvent(parsed, candidatePayments, opts = {}) {
  const noMatch = {
    matched: false,
    payment: null,
    confidence: 'none',
    reason: '',
    autoConfirm: false,
  };

  if (!parsed?.isParsed || !parsed.isCredit) return noMatch;
  if (!Array.isArray(candidatePayments) || candidatePayments.length === 0) return noMatch;

  // If the message/notification text itself carries a date/time (e.g. "...on
  // 15-08-26 at 14:32:11"), that's when the underlying transaction happened —
  // a pay link created after that instant couldn't be the one it refers to.
  let pool = candidatePayments;
  if (parsed.messageTime instanceof Date && !Number.isNaN(parsed.messageTime.getTime())) {
    pool = pool.filter((p) => new Date(p.createdAt).getTime() <= parsed.messageTime.getTime());
    if (!pool.length) {
      return {
        ...noMatch,
        reason: `Message timestamp ${parsed.messageTime.toISOString()} predates every pending payment — none of them could be the one referenced.`,
      };
    }
  }

  const amountHits = pool.filter((p) => amountsMatch(p.amount, parsed.amount));
  if (!amountHits.length) return noMatch;

  const isNotification = opts.logType === 'notification' || parsed.isUpiApp;

  if (isNotification) {
    if (!parsed.appName) {
      return { ...noMatch, reason: 'Notification has no known UPI app name — cannot confirm.' };
    }
    const linked = amountHits.filter((p) => providersMatch(parsed.appName, p.upiAccount?.upiProvider));
    if (!linked.length) {
      return {
        ...noMatch,
        reason: `Amount matched ${amountHits.length} pending payment(s) but none linked to app "${parsed.appName}".`,
      };
    }
    linked.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return {
      matched: true,
      payment: linked[0],
      confidence: 'high',
      reason: `App "${parsed.appName}" notification matches UPI account provider + amount ₹${parsed.amount}.`,
      autoConfirm: true,
    };
  }

  // SMS fallback: score by VPA / bank-name / UTR hints; amount+upiAccount lock already
  // guarantees uniqueness in the common case.
  const scored = amountHits.map((p) => {
    let score = 0;
    const hits = [];
    if (parsed.senderUPI && p.upiAccount?.upiId) {
      if (String(parsed.senderUPI).toLowerCase() === String(p.upiAccount.upiId).toLowerCase()) {
        score += 40;
        hits.push(`VPA ${parsed.senderUPI}`);
      }
    }
    if (parsed.bankName) {
      const provider = normBank(p.upiAccount?.upiProvider);
      const bank = normBank(parsed.bankName);
      if (provider && bank && (provider.includes(bank) || bank.includes(provider))) {
        score += 20;
        hits.push(`bank "${parsed.bankName}"`);
      }
    }
    if (parsed.utrNumber) {
      score += 5;
      hits.push(`UTR ${parsed.utrNumber}`);
    }
    return { payment: p, score, hits };
  });

  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : new Date(a.payment.createdAt) - new Date(b.payment.createdAt),
  );
  const best = scored[0];

  if (best.score === 0) {
    if (amountHits.length === 1) {
      return {
        matched: true,
        payment: amountHits[0],
        confidence: 'low',
        reason: `Amount ₹${parsed.amount} matched the single pending payment on this VPA. No secondary signal.`,
        autoConfirm: true,
      };
    }
    return {
      ...noMatch,
      reason: `Amount ₹${parsed.amount} matched ${amountHits.length} pending payments with no secondary signal — ambiguous.`,
    };
  }

  return {
    matched: true,
    payment: best.payment,
    confidence: best.score >= 40 ? 'high' : best.score >= 20 ? 'medium' : 'low',
    reason: `Matched via: ${best.hits.join(', ')} (score ${best.score}).`,
    autoConfirm: best.score >= 20 || amountHits.length === 1,
  };
}

module.exports = { matchForwarderEvent, amountsMatch };
