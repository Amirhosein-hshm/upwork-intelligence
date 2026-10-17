#!/usr/bin/env node
// Store one secret in AWS SSM Parameter Store (SecureString) with hidden input.
//
//   AWS_PROFILE=... AWS_REGION=eu-west-2 node scripts/put-secret.mjs GEMINI_API_KEY
//
// The value never lands in shell history or logs. Allowed names: SECRET_NAMES in src/lib/config.js

import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { SECRET_NAMES } from '../src/lib/config.js';

const PREFIX = '/upwork-agent/';
const name = process.argv[2];
if (!name || !SECRET_NAMES.includes(name)) {
  console.error(`Usage: node scripts/put-secret.mjs <NAME>\nAllowed names:\n  ${SECRET_NAMES.join('\n  ')}`);
  process.exit(1);
}
if (!process.stdin.isTTY) {
  console.error('This script must run in an interactive terminal.');
  process.exit(1);
}

function readHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') process.exit(130);
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    process.stdin.on('data', onData);
    process.stdin.resume();
  });
}

const value = (await readHidden(`Value for ${name} (hidden): `)).trim();
if (!value) {
  console.error('The value is empty.');
  process.exit(1);
}

const ssm = new SSMClient({});
await ssm.send(
  new PutParameterCommand({ Name: PREFIX + name, Value: value, Type: 'SecureString', Overwrite: true })
);
console.log(`✓ Saved ${PREFIX}${name}`);
