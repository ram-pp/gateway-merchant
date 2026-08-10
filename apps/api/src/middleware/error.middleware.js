const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('@merchant-pay/shared');

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: ERROR_CODES.NOT_FOUND, message: `No route: ${req.method} ${req.path}` } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json(err.toJSON());
  }

  if (err?.name === 'ValidationError' || err?.isJoi) {
    return res.status(400).json({
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: err.message },
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      error: {
        code: ERROR_CODES.MERCHANT_ORDER_REF_CONFLICT,
        message: 'A resource with the same unique field already exists.',
        keyValue: err.keyValue,
      },
    });
  }

  console.error('[error]', err);
  return res.status(500).json({
    error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Something went wrong.' },
  });
}

module.exports = { notFoundHandler, errorHandler };
