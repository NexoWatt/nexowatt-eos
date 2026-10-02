#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { NexoWattStableUpdateManager, isNexoWattRepositoryEntry } = require('../build/lib/eosAutoUpdate.js');

const copy = value => JSON.parse(JSON.stringify(value));

function createFixture() {
    const objects = new Map();
    const states = new Map();
    const objectWrites = [];
    const stateWrites = [];
    const refresh = [];

    objects.set('system.adapter.eos-admin.0', {
        _id: 'system.adapter.eos-admin.0',
        common: { name: 'eos-admin', version: '7.10.2' },
        native: {
            eosNexoWattAutoUpdate: true,
            eosNexoWattAutoUpdateState: {
                previousPolicies: {},
                lastSync: 1,
            },
        },
    });
    objects.set('system.config', {
        _id: 'system.config',
        common: {
            activeRepo: ['stable'],
            adapterAutoUpgrade: { repositories: { stable: false }, defaultPolicy: 'none' },
        },
        native: {},
    });
    objects.set('system.repositories', {
        _id: 'system.repositories',
        native: {
            repositories: {
                stable: {
                    json: {
                        'eos-admin': { name: 'eos-admin', version: '7.10.2', meta: 'https://github.com/NexoWatt/ioBroker.eos-admin' },
                        'nexowatt-ui': { name: 'nexowatt-ui', version: '0.8.202', publisher: 'NexoWatt' },
                        'nexowatt-beta': { name: 'nexowatt-beta', version: '1.0.0-beta.1', publisher: 'NexoWatt' },
                        admin: { name: 'admin', version: '7.7.0', publisher: 'ioBroker' },
                    },
                },
            },
        },
    });
    objects.set('system.adapter.eos-admin', {
        _id: 'system.adapter.eos-admin',
        common: { name: 'eos-admin', version: '7.10.2', automaticUpgrade: 'patch' },
        native: {},
    });
    objects.set('system.adapter.nexowatt-ui', {
        _id: 'system.adapter.nexowatt-ui',
        common: { name: 'nexowatt-ui', version: '0.8.202' },
        native: {},
    });
    objects.set('system.adapter.admin', {
        _id: 'system.adapter.admin',
        common: { name: 'admin', version: '7.7.0', automaticUpgrade: 'minor' },
        native: {},
    });

    const adapter = {
        namespace: 'eos-admin.0',
        host: 'eos-host',
        log: { debug() {}, info() {}, warn() {}, error() {} },
        getForeignObjectAsync: async id => copy(objects.get(id) || null),
        setForeignObjectAsync: async (id, object) => {
            objectWrites.push(id);
            objects.set(id, copy(object));
        },
        getObjectViewAsync: async () => ({
            rows: [...objects.entries()]
                .filter(([id]) => /^system\.adapter\.[^.]+$/.test(id))
                .map(([id, value]) => ({ id, value: copy(value) })),
        }),
        getStateAsync: async id => copy(states.get(id) || null),
        setStateAsync: async (id, value, ack) => {
            const state = value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'val')
                ? { ...value }
                : { val: value, ack: Boolean(ack) };
            stateWrites.push(id);
            states.set(id, copy(state));
        },
        sendToHostAsync: async (...args) => { refresh.push(args); },
    };

    return { adapter, objects, states, objectWrites, stateWrites, refresh };
}

(async () => {
    let checks = 0;
    const check = (value, expected, message) => { assert.deepEqual(value, expected, message); checks++; };
    check(isNexoWattRepositoryEntry('nexowatt-ui', { publisher: 'NexoWatt' }), true, 'prefix only classifies quarantine scope');
    check(isNexoWattRepositoryEntry('foreign', { publisher: 'NexoWatt', meta: 'https://github.com/NexoWatt/foreign' }), false, 'free-form metadata grants no issuer trust');
    check(isNexoWattRepositoryEntry('../eos-admin', {}), false, 'invalid names excluded');

    const fixture = createFixture();
    const manager = new NexoWattStableUpdateManager(fixture.adapter);
    const status = await manager.start();
    check(status.enabled, false, 'legacy true flag cannot enable installation');
    check(status.blocked, true, 'explicit blocked status');
    check(status.error, 'UNATTENDED_UPDATES_BLOCKED_UNVERIFIED_RELEASE', 'actionable machine reason');
    check(status.policy, 'none', 'status matches effective policy');
    check(status.managedAdapters, ['eos-admin', 'nexowatt-ui'], 'installed manufacturer namespace quarantined');
    check(fixture.objects.get('system.adapter.eos-admin').common.automaticUpgrade, 'none', 'existing patch disabled');
    check(fixture.objects.get('system.adapter.nexowatt-ui').common.automaticUpgrade, 'none', 'missing policy cannot inherit automatic default');
    check(fixture.objects.get('system.adapter.admin').common.automaticUpgrade, 'minor', 'unmanaged third party policy preserved');
    check(fixture.states.get('info.nexowattStableUpdatesEnabled').val, false, 'legacy switch persisted disabled');
    check(fixture.objectWrites.includes('system.adapter.eos-admin.0'), false, 'no running-instance native mutation/restart');
    check(fixture.refresh, [], 'no repository/installation host dispatch');
    const writes = fixture.objectWrites.length;
    await manager.reconcile('repeat');
    check(fixture.objectWrites.length, writes, 'quarantine is idempotent');
    const enabled = await manager.setEnabled(true);
    check(enabled.enabled, false, 'API cannot override missing integrity gate');
    check(fixture.objects.get('system.adapter.eos-admin').common.automaticUpgrade, 'none', 'API leaves policy disabled');
    manager.stop();
    const stopped = await manager.setEnabled(true);
    check(stopped.enabled, false, 'late settings cannot restart stopped manager');

    const legacy = createFixture();
    legacy.states.set('info.nexowattStableUpdatesEnabled', { val: true });
    legacy.states.set('info.nexowattStableUpdatesState', { val: JSON.stringify({
        previousPolicies: { 'eos-admin': 'patch', 'nexowatt-ui': null, admin: 'minor' },
        managedAdapters: ['admin', 'eos-admin', 'nexowatt-ui'], selectedRepository: 'stable',
        previousRepositoryEnabled: false, previousActiveRepo: ['manual'], ownsActiveRepoOrder: true,
    }) });
    legacy.objects.get('system.config').common.adapterAutoUpgrade.repositories.stable = true;
    legacy.objects.get('system.adapter.admin').common.automaticUpgrade = 'major';
    const legacyManager = new NexoWattStableUpdateManager(legacy.adapter);
    await legacyManager.start();
    check(legacy.objects.get('system.adapter.admin').common.automaticUpgrade, 'none', 'historically misclassified managed third party quarantined');
    check(legacy.objects.get('system.config').common.adapterAutoUpgrade.repositories.stable, false, 'EOS-owned repository enable reverted');
    check(legacy.objects.get('system.config').common.activeRepo, ['manual'], 'EOS-owned repository order restored');
    check(legacy.refresh, [], 'legacy migration does not dispatch remote work');
    legacyManager.stop();

    const shared = createFixture();
    shared.states.set('info.nexowattStableUpdatesState', { val: JSON.stringify({ selectedRepository: 'stable', previousRepositoryEnabled: true }) });
    shared.objects.get('system.config').common.adapterAutoUpgrade.repositories.stable = true;
    const sharedManager = new NexoWattStableUpdateManager(shared.adapter);
    await sharedManager.start();
    await sharedManager.reconcile('repeat-preserve-unowned-repository');
    check(shared.objects.get('system.config').common.adapterAutoUpgrade.repositories.stable, true, 'pre-existing global repository enable remains unchanged across repeats');
    sharedManager.stop();

    const failure = createFixture();
    failure.adapter.setForeignObjectAsync = async () => { throw new Error('fixtureWriteDenied'); };
    const failedManager = new NexoWattStableUpdateManager(failure.adapter);
    const failed = await failedManager.start();
    check(failed.enabled, false, 'migration failure never claims enabled');
    check(failed.error, 'UNATTENDED_UPDATE_MIGRATION_FAILED', 'migration failure visible; requires system intervention');
    failedManager.stop();
    console.log(`[NexoWatt EOS auto update] OK (${checks} behavior checks: immediate quarantine, no metadata trust, legacy migration, failure visibility, no instance restart)`);
})().catch(error => {
    console.error(error.stack || error);
    process.exit(1);
});
