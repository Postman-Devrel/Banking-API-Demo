const db = require('../database/db');
const { hashApiKey } = require('../security/credentials');

const INTERNAL_FIELDS = new Set([
  'apiKey', 'credential', 'credentialHash', 'credentials', 'ownerPrincipalId', 'createdByPrincipalId'
]);

const publicView = (value, credentialHashes = new Set()) => {
  if (Array.isArray(value)) return value.map(item => publicView(item, credentialHashes));
  if (typeof value === 'string' && credentialHashes.has(hashApiKey(value))) return '[REDACTED]';
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).reduce((result, key) => {
    if (!INTERNAL_FIELDS.has(key)) result[key] = publicView(value[key], credentialHashes);
    return result;
  }, {});
};

const redactOwnership = (req, res, next) => {
  const credentialHashes = new Set(db.getRun(req.runId).credentials.keys());
  const json = res.json.bind(res);
  res.json = body => json(publicView(body, credentialHashes));
  next();
};

redactOwnership.publicView = publicView;
module.exports = redactOwnership;
