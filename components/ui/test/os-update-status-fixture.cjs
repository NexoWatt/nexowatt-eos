'use strict';
// Nicht geheime Statusdaten; keine Paketinhalte oder Produktivdateien.
function statusFixture(now = Date.now()) {
  const stamp = new Date(now).toISOString();
  return { schemaVersion: 1, generatedAt: stamp, state: 'ok', lastAttemptAt: stamp, lastSuccessAt: stamp, lastError: null,
    freshness: { maxAgeSeconds: 129600 }, policy: { automatic: true, rebootAutomatic: false, debianMajor: '13', serviceRestartsPossible: true },
    timers: { enabled: true, active: true, checkedAt: stamp }, pending: { securityCount: 0, heldSecurityCount: 0, blockedSecurityCount: 0 },
    activation: { state: 'not-required', serviceRestartCount: 0, sessionRestartCount: 0 }, reboot: { state: 'not-required' },
    coverage: { state: 'complete-for-configured-origins', gaps: [] } };
}
module.exports = { statusFixture };
