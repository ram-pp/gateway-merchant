const env = require('../config/env');

/**
 * Builds the internal batchexecute-style `f.req` request body for a per-account
 * data fetch. accountId is the only variable slot — the rest of the RPC envelope
 * is a fixed template for this call.
 *
 * TODO: `at` is currently sent empty until cookieRotation.service's deriveAtToken
 * has a real formula (see that file).
 */
function buildFetchRequestBody(accountId, at) {
  const innerArgs = JSON.stringify([accountId, null, [null, 10], 1, null, 1]);
  const fReq = JSON.stringify([[[env.UPSTREAM_RPC_ID, innerArgs, null, '4']]]);

  const params = new URLSearchParams();
  params.set('f.req', fReq);
  params.set('at', at || '');

  return `${params.toString()}&`;
}

module.exports = { buildFetchRequestBody };
