#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { validatePublishChannel } = require('./nexowatt-publish-channel-guard.cjs');

const stable = {
    version: '7.9.94',
    publishConfig: { tag: 'latest' },
    nexowattReleasePolicy: { distTag: 'latest', purpose: 'accepted stable sales-product release' },
};
const prerelease = {
    version: '7.9.94-rc.1',
    publishConfig: { tag: 'latest' },
    nexowattReleasePolicy: { distTag: 'latest' },
};

assert.equal(validatePublishChannel(stable, {}).ok, true, 'stable 7.9.94 must publish to latest');
assert.equal(validatePublishChannel(stable, { npm_config_tag: 'latest' }).ok, true, '--tag latest must be accepted');
assert.equal(validatePublishChannel(stable, { npm_config_tag: 'rc' }).ok, false, 'stable release must not use rc');
assert.equal(validatePublishChannel({ ...stable, publishConfig: { tag: 'rc' } }, {}).ok, false, 'package metadata must keep latest');
assert.equal(validatePublishChannel({ ...stable, nexowattReleasePolicy: { distTag: 'latest', acceptedPrerelease: '7.9.87-rc.4' } }, {}).ok, false, 'stable metadata must not retain prerelease acceptance');
assert.equal(validatePublishChannel(prerelease, {}).ok, false, 'an unapproved future prerelease must not move latest');
assert.equal(validatePublishChannel({ ...prerelease, nexowattReleasePolicy: { distTag: 'latest', acceptedPrerelease: prerelease.version } }, {}).ok, true, 'the generic guard still supports an explicitly accepted prerelease when deliberately configured');

console.log('[NexoWatt EOS publish channel selftest] OK');
