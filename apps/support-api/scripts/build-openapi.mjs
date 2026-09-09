import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
const require = createRequire(import.meta.url);
const document = require('@intergalactic/support-contract/openapi');
await writeFile(fileURLToPath(new URL('../openapi/openapi.yaml', import.meta.url)), YAML.stringify(document, { lineWidth: 0, aliasDuplicateObjects: false }), 'utf8');
