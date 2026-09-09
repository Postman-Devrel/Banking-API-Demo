const crypto = require('crypto');

const hashApiKey = apiKey => crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex');
const safeEqualHash = (left, right) => {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

module.exports = { hashApiKey, safeEqualHash };
