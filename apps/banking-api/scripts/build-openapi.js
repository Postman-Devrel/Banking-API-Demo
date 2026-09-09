const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const document = require('@intergalactic/banking-contract/openapi');

const target = path.join(__dirname, '../openapi/openapi.yaml');
fs.writeFileSync(target, YAML.stringify(document, { lineWidth: 110 }));
