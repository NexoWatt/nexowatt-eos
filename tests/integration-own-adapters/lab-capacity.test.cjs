'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveLabProfile } = require('../postgresql/fixtures/lab-cluster.cjs');
const { clusterConfig } = require('../../runtime/postgresql/host.cjs');

test('full management fixture uses the bounded production connection capacity', () => {
    const profile = resolveLabProfile('management');
    const productCapacity = clusterConfig().split('\n').filter(line => line.startsWith('max_connections='));
    assert.deepEqual(productCapacity, ['max_connections=128']);
    assert.equal(profile.maxConnections, Number(productCapacity[0].split('=')[1]));
    assert.deepEqual({ port: profile.port, database: profile.database }, { port: 15432, database: 'eos' });
    // The small isolated TLS laboratory stays separate; neither accepts
    // caller-selected capacity or arbitrary PostgreSQL configuration.
    assert.equal(resolveLabProfile('laboratory').maxConnections, 40);
    for (const input of [{ profile: 'management', maxConnections: 4096 }, 128, 'management\nmax_connections=4096']) {
        assert.throws(() => resolveLabProfile(input), { code: 'EOS_PG_LAB_PROFILE' });
    }
});
