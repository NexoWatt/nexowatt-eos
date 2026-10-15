'use strict';
// Synthetic CLI fixture; this is not the controller or an EOS system backup.
const fs = require('node:fs');
const { gzipSync } = require('node:zlib');
const destination = process.argv[3];
if (process.argv[2] !== 'backup' || !destination) process.exit(2);
if (destination.includes('_missing_')) process.exit(0);
if (destination.includes('_empty_')) fs.writeFileSync(destination, '', { mode: 0o600 });
else fs.writeFileSync(destination, gzipSync('synthetic backup-result test'), { mode: 0o600 });
if (destination.includes('_failed_')) process.exit(1);
