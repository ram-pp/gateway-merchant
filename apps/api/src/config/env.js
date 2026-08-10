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
  WEBHOOK_MAX_ATTEMPTS: Number(required('WEBHOOK_MAX_ATTEMPTS', 8)),
  WEBHOOK_WORKER_INTERVAL_MS: Number(required('WEBHOOK_WORKER_INTERVAL_MS', 5000)),
  SEED_SUPERADMIN_EMAIL: required('SEED_SUPERADMIN_EMAIL', 'admin@merchant-pay.local'),
  SEED_SUPERADMIN_PASSWORD: required('SEED_SUPERADMIN_PASSWORD', 'ChangeMe123!'),
};

module.exports = env;
