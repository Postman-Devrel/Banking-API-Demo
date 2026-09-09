import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
const require = createRequire(import.meta.url);
const expected = require('@intergalactic/support-contract/openapi');
const path = fileURLToPath(new URL('../openapi/openapi.yaml', import.meta.url));
const actual = YAML.parse(await readFile(path, 'utf8'));
if (JSON.stringify(actual) !== JSON.stringify(expected)) { console.error('Generated Support OpenAPI is stale. Run npm run build:openapi.'); process.exit(1); }
