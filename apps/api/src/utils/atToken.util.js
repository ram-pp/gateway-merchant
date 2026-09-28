const { parse } = require('node-html-parser');
const acorn = require('acorn');
const env = require('../config/env');
const { nodeToValue } = require('./astLiteral.util');

const WINDOW_VAR_NAME = 'WIZ_global_data';
const TOKEN_PROPERTY = 'SNlM0e';

function isTargetAssignment(node) {
  if (node.type !== 'ExpressionStatement') return false;
  const expr = node.expression;
  if (expr.type !== 'AssignmentExpression') return false;
  const left = expr.left;
  return (
    left.type === 'MemberExpression' &&
    left.object.type === 'Identifier' &&
    left.object.name === 'window' &&
    left.property.type === 'Identifier' &&
    left.property.name === WINDOW_VAR_NAME
  );
}

/**
 * Fetches the account's txx.fasspay.co.in page with its cookie and extracts the
 * upstream RPC's `at=` anti-automation token from the inline
 * `window.age_data_token_at = {...}` script variable's `age` property.
 * Returns the token string, or null if the page/variable/property isn't found
 * (never throws for a "just not there" case — only for a hard request failure).
 */
async function fetchAtToken({ cookie, accountId }) {
  const url = new URL(env.TXX_URL_PATH, env.TXX_ORIGIN);
  url.searchParams.set(env.TXX_QUERY_PARAM, accountId);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8',
      cookie,
      referer: `${env.TXX_ORIGIN}/`,
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'user-agent': env.UPSTREAM_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`txx page returned HTTP ${response.status}`);
  }

  const html = await response.text();
  const root = parse(html);

  const script = root
    .querySelectorAll('script')
    .find((el) => el.text.includes(`window.${WINDOW_VAR_NAME}`))?.text;
  if (!script) return null;

  let ast;
  try {
    ast = acorn.parse(script, { ecmaVersion: 'latest' });
  } catch {
    return null;
  }

  const assignment = ast.body.find(isTargetAssignment);
  if (!assignment) return null;

  const value = nodeToValue(assignment.expression.right);
  if (!value || typeof value !== 'object') return null;

  return value[TOKEN_PROPERTY] ?? null;
}

module.exports = { fetchAtToken };
