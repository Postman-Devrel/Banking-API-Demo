const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schemas = require('@intergalactic/banking-contract/schemas');

const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);
const validators = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, ajv.compile(schema)]));

const validate = name => (req, res, next) => {
  const validator = validators[name];
  if (validator(req.body)) return next();
  return res.status(400).json({
    error: {
      name: 'validationError',
      message: 'Request body does not match the operation schema',
      details: validator.errors.map(error => ({ path: error.instancePath || '/', message: error.message }))
    }
  });
};

module.exports = { validate, validators, schemas };
