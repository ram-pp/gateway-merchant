const dotenv = require('dotenv');

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  return value;
}

const env = {
  NODE_ENV: required('NODE_ENV', 'development'),
  PORT: Number(required('PORT', 4000)),
  MONGO_URI: required('MONGO_URI', 'mongodb://127.0.0.1:27017/merchant_pay'),
  API_BASE_URL: required('API_BASE_URL', 'http://localhost:4000'),
  PAY_PAGE_BASE_URL: required('PAY_PAGE_BASE_URL', 'http://localhost:5173'),
  CORS_ORIGINS: required('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  MERCHANT_JWT_SECRET: required('MERCHANT_JWT_SECRET', 'dev-merchant-secret-change-me'),
  MERCHANT_JWT_EXPIRES_IN: required('MERCHANT_JWT_EXPIRES_IN', '12h'),
  PLATFORM_ADMIN_JWT_SECRET: required(
    'PLATFORM_ADMIN_JWT_SECRET',
    'dev-platform-admin-secret-change-me',
  ),
  PLATFORM_ADMIN_JWT_EXPIRES_IN: required('PLATFORM_ADMIN_JWT_EXPIRES_IN', '12h'),
  DEFAULT_PAYMENT_TTL_SECONDS: Number(required('DEFAULT_PAYMENT_TTL_SECONDS', 900)),
  FORWARDER_MATCH_WINDOW_MIN: Number(required('FORWARDER_MATCH_WINDOW_MIN', 30)),
  /** Used to encrypt linked-account session cookies at rest. */
  LINKED_ACCOUNT_COOKIE_SECRET: required(
    'LINKED_ACCOUNT_COOKIE_SECRET',
    required('MERCHANT_JWT_SECRET', 'dev-merchant-secret-change-me'),
  ),
  WEBHOOK_MAX_ATTEMPTS: Number(required('WEBHOOK_MAX_ATTEMPTS', 8)),
  WEBHOOK_WORKER_INTERVAL_MS: Number(required('WEBHOOK_WORKER_INTERVAL_MS', 5000)),
  SEED_SUPERADMIN_EMAIL: required('SEED_SUPERADMIN_EMAIL', 'admin@merchant-pay.local'),
  SEED_SUPERADMIN_PASSWORD: required('SEED_SUPERADMIN_PASSWORD', 'ChangeMe123!'),

  // Linked-account cookie rotation (RotateCookies) + per-account upstream data fetch.
  COOKIE_ROTATE_CRON: required('COOKIE_ROTATE_CRON', '*/1 * * * *'),
  COOKIE_EXPIRY_SKEW_MS: Number(required('COOKIE_EXPIRY_SKEW_MS', 30_000)),
  COOKIE_ROTATION_URL: required(
    'COOKIE_ROTATION_URL',
    'https://accounts.fasspay.com/RotateCookies',
  ),
  COOKIE_ROTATION_BODY: required('COOKIE_ROTATION_BODY', '[453,"-7099739106709624144"]'),
  COOKIE_ROTATION_ORIGIN: required('COOKIE_ROTATION_ORIGIN', 'https://accounts.fasspay.com'),
  COOKIE_ROTATION_USER_AGENT: required(
    'COOKIE_ROTATION_USER_AGENT',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15',
  ),
  // {accountId} is substituted with the linked account's accountId.
  UPSTREAM_URL_TEMPLATE: required(
    'UPSTREAM_URL_TEMPLATE',
    'https://pay.fasspay.com/accounts/{accountId}/transactions',
  ),
  UPSTREAM_METHOD: required('UPSTREAM_METHOD', 'GET').toUpperCase(),
  UPSTREAM_BODY: required('UPSTREAM_BODY', undefined),
  UPSTREAM_ORIGIN: required('UPSTREAM_ORIGIN', 'https://pay.fasspay.com'),
  UPSTREAM_USER_AGENT: required(
    'UPSTREAM_USER_AGENT',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15',
  ),
};

module.exports = env;
