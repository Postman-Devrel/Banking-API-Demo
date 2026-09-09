import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import openapi from '@intergalactic/fraud-contract/openapi';
import { stringify } from 'yaml';

const target = resolve(import.meta.dirname, '../openapi/openapi.yaml');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, stringify(openapi, { lineWidth: 120 }), 'utf8');
