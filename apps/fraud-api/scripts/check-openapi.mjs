import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import openapi from '@intergalactic/fraud-contract/openapi';
import { stringify } from 'yaml';

const target = resolve(import.meta.dirname, '../openapi/openapi.yaml');
const expected = stringify(openapi, { lineWidth: 120 });
const actual = readFileSync(target, 'utf8');
if (actual !== expected) {
  console.error('openapi/openapi.yaml is stale. Run npm run build:openapi --workspace=@intergalactic/fraud-api.');
  process.exitCode = 1;
}
