const { ERROR_CODES } = require('@merchant-pay/shared');

/** Stable-contract API error: { error: { code, message, ...extra } } */
class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, ...this.extra } };
  }

  static badRequest(code, message, extra) {
    return new ApiError(400, code, message, extra);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(code, message) {
    return new ApiError(404, code || ERROR_CODES.NOT_FOUND, message || 'Not found');
  }

  static conflict(code, message, extra) {
    return new ApiError(409, code, message, extra);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}

module.exports = ApiError;
