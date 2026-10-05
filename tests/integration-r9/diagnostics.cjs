'use strict';
// Extend the existing strict diagnostic allowlist only with literal fixture codes.
const existing = require('../integration-management/diagnostics.cjs');
const CODES = new Set([
    'R9_NATIVE_UI_LEASE_DEADLINE', 'R9_NATIVE_FIXED_FIXTURE', 'R9_NATIVE_APP_CHANGED',
    'R9_LICENSE_OPTIONS', 'R9_LICENSE_EDITION', 'R9_LICENSE_TOKEN', 'R9_LICENSE_DEADLINE',
    'R9_LICENSE_TLS', 'R9_LICENSE_TRANSPORT', 'R9_LICENSE_RESPONSE_LIMIT', 'R9_LICENSE_RESPONSE',
    'R9_LICENSE_ADMIN_LOGIN', 'R9_LICENSE_UI_LOGIN', 'R9_LICENSE_STATUS', 'R9_LICENSE_UI_STATUS',
    'R9_LICENSE_UI_COOKIE', 'R9_LICENSE_FIXTURE',
    'R9_LICENSE_REMOVE', 'R9_LICENSE_ISSUE', 'R9_LICENSE_UUID', 'R9_LICENSE_QUOTA', 'R9_LICENSE_FEATURES',
]);
function stageFailure(error) {
    const code = error?.code || error?.message;
    return CODES.has(code) ? code : existing.stageFailure(error);
}
module.exports = { ...existing, stageFailure };
