const upiProvider = require('./upiProvider');
const constants = require('./constants');
const ids = require('./ids');

module.exports = {
  ...upiProvider,
  detectProviderFromAppIdentifier: upiProvider.detectProviderFromAppIdentifier,
  ...constants,
  ...ids,
};
