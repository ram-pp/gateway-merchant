const ApiError = require('../utils/ApiError');
const { ERROR_CODES } = require('@merchant-pay/shared');

/** Validate req[part] against a Joi schema; replaces it with the (defaulted/cast) value. */
const validate = (schema, part = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[part], { abortEarly: false, stripUnknown: true });
  if (error) {
    throw ApiError.badRequest(
      ERROR_CODES.VALIDATION_ERROR,
      error.details.map((d) => d.message).join('; '),
    );
  }
  req[part] = value;
  next();
};

module.exports = validate;
