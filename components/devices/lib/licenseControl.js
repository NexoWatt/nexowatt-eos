'use strict';

const { LicenseError } = require('./eos-license-client');
const { AsyncLocalStorage } = require('node:async_hooks');
const controls = new AsyncLocalStorage();

// Every external control path must reach this boundary, including delayed driver
// queues. Missing adapter initialization is a denial, never a test/legacy bypass.
function assertLicensedControl(adapter) {
  if (!adapter || adapter._unloading || !adapter._licenseGuard) {
    throw new LicenseError('NOT_CHECKED');
  }
  adapter._licenseGuard.assertAllowed();
  const active = controls.getStore();
  if (active?.adapter === adapter && active.epoch !== (adapter._licenseControlEpoch || 0)) {
    throw new LicenseError('CONTROL_CANCELLED');
  }
}

function runLicensedControl(adapter, operation) {
  assertLicensedControl(adapter);
  if (controls.getStore()?.adapter === adapter) return operation();
  return controls.run({ adapter, epoch: adapter._licenseControlEpoch || 0 }, operation);
}

module.exports = { assertLicensedControl, runLicensedControl };
