'use strict';
// Never include error.message, request/response objects or unbounded properties.
function probeFailure(error, port) {
    return { code: error?.code === 'ONBOARD_HTTPS_NOT_READY' ? 'ONBOARD_HTTPS_NOT_READY' : 'MANAGEMENT_PROBE_FAILED',
        stage: error?.stage === 'https-probe' ? 'https-probe' : 'unknown',
        reason: ['input', 'transport', 'tls', 'size', 'response', 'deadline'].includes(error?.reason) ? error.reason : 'unknown',
        port: [8081, 8188].includes(port) ? port : null };
}
module.exports = { probeFailure };
