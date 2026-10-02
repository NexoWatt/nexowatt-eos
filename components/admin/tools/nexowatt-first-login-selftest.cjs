#!/usr/bin/env node
'use strict';

/**
 * Current account initialization gate: execute behavioral tests for the actual
 * scoped HTTP/session boundaries. The previous string-marker test demanded the
 * retired shared initial password, default accounts and composition rules.
 * Its exact text is preserved in docs/security/historical and its failed run in
 * the integrated branding report. Those obsolete assertions are not a pass.
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['--test', 'test/eos-roles-account.test.cjs'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
});
if (result.error) {
    console.error('[NexoWatt EOS first-login] Cannot execute account boundary tests.');
    process.exitCode = 1;
} else {
    process.exitCode = result.status === 0 ? 0 : 1;
}
