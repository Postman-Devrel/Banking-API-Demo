const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const document = require('@intergalactic/banking-contract/openapi');

const target = path.join(__dirname, '../openapi/openapi.yaml');
const expected = YAML.stringify(document, { lineWidth: 110 });
const actual = fs.readFileSync(target, 'utf8');
if (actual !== expected) {
  console.error('openapi/openapi.yaml is stale. Run npm run build:openapi.');
  process.exitCode = 1;
}
