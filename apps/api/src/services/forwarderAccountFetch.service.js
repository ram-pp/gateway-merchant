const env = require('../config/env');
const { ensureFreshCookie } = require('./cookieRotation.service');
const { buildFetchRequestBody } = require('../utils/upstreamRequest.util');

/**
 * Parses the batchexecute wrb.fr payload into a flat list of recent
 * transactions. Field indices reverse-engineered from a captured response
 * (see scripts/parseData.js) — row[2] is a [seconds, nanos] timestamp pair.
 */
function parseTransactions(data) {
  const wrb = Array.isArray(data) ? data.find((item) => item[0] === 'wrb.fr') : null;
  if (!wrb) return [];

  let result;
  try {
    result = JSON.parse(wrb[2]);
  } catch {
    return [];
  }

  const rows = Array.isArray(result?.[0]) ? result[0] : [];
  return rows
    .map((row) => {
      const seconds = Array.isArray(row?.[2]) ? row[2][0] : null;
      return {
        transactionId: row?.[0] ?? null,
        referenceId: row?.[1] ?? null,
        time: typeof seconds === 'number' ? new Date(seconds * 1000) : null,
        currency: row?.[3]?.[0] ?? null,
        amount: row?.[3]?.[1] ?? null,
        name: row?.[8]?.[0] ?? null,
        vpa: row?.[8]?.[1] ?? null,
        description: row?.[9] ?? null,
      };
    })
    .filter((t) => t.transactionId != null);
}

/**
 * Fetches a linked account's upstream data (rotating its cookie first if
 * needed) and parses out the recent-transactions list. Shared by the
 * on-demand /accounts/fetch controller and the forwarder poll worker.
 */
async function fetchLinkedAccountTransactions(linkedAccount) {
  let cookie;
  let atToken;
  try {
    ({ cookie, atToken } = await ensureFreshCookie(linkedAccount));
  } catch (error) {
    error.stage = 'cookie_rotation';
    throw error;
  }
  if (!cookie) {
    const error = new Error('No cookie available for this account.');
    error.stage = 'cookie_missing';
    throw error;
  }

  const body = buildFetchRequestBody(linkedAccount.accountId, atToken);

  let response;
  try {
    response = await fetch(env.UPSTREAM_URL, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8',
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        cookie,
        origin: env.UPSTREAM_ORIGIN,
        priority: 'u=1, i',
        referer: `${env.UPSTREAM_ORIGIN}/`,
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': env.UPSTREAM_USER_AGENT,
        'x-same-domain': '1',
      },
      body,
    });
  } catch (error) {
    error.stage = 'upstream_unreachable';
    throw error;
  }

  const contentType = response.headers.get('content-type');
  const resp = await response.text();
  const clean = resp.replace(/^\)\]\}'\s*/, '');
  const data = JSON.parse(clean);
  const transactions = parseTransactions(data);

  return { ok: response.ok, upstreamStatus: response.status, contentType, data, transactions };
}

module.exports = { fetchLinkedAccountTransactions, parseTransactions };
