#!/usr/bin/env node
'use strict';
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft den gemeinsamen Lebenszyklus von Microgrid-App, Regelung und Archiv.
 * Daten und Wirkung: Temporäre verschlüsselte Konfiguration und ioBroker-Fixtures;
 * keine Hardware und kein externer Netzwerkverkehr. Prüft auch Neustart/Migration.
 * Bei Änderungen: Installation, Parallel-Save, Rückfall und unveränderte Archive gemeinsam prüfen.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const C = require('../lib/mesh-coordinator-contract');
const { MeshCoordinator } = require('../lib/mesh-coordinator');
const enabled = () => ({ emsApps: { apps: { meshMicrogrid: { installed: true, enabled: true } } } });
async function main() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nw-mesh-app-'));
  const writes = []; let transports = 0;
  const adapter = { namespace: 'test.0', config: {}, log: { info() {} },
    setStateAsync: async (id, state) => { writes.push({ id, state }); },
    nwApplyInstallerPatchToRuntimeConfig: (_base, patch) => JSON.parse(JSON.stringify(patch)),
    emsEngine: { requestImmediateTick() {} } };
  const options = { directory, systemSecret: 'fixture-system-key', transport: async () => { transports++; throw new Error('offline'); } };
  let service = new MeshCoordinator(adapter, options);
  try {
    await service.init(); await service.start(); await service.cycle();
    assert.equal(service.started, false); assert.equal(service.timer, undefined); assert.equal(service.energy.timer, undefined); assert.equal(transports, 0);
    assert.equal(service.currentLimits().required, false);
    await assert.rejects(service.configure(C.defaultConfig()), /installieren/);
    console.log('OK Nicht installiert: keine Timer, Kommunikation, Aufzeichnung oder Konfiguration');

    adapter.config = enabled(); adapter.config.emsApps.apps.meshMicrogrid.enabled = false;
    const master = { ...C.defaultConfig(), role: 'master', siteId: 'site', nodeId: 'master', masterId: 'master' };
    await service.configure(master); assert.equal(service.started, false);
    await assert.rejects(service.configure({ ...master, mode: 'active' }), /aktivieren/);
    adapter.config.emsApps.apps.meshMicrogrid.enabled = true;
    await service.syncAppLifecycle(); assert(service.started); assert(service.timer); assert(service.energy.timer);
    adapter.config.emsApps.apps.meshMicrogrid.enabled = false;
    await service.syncAppLifecycle(); assert.equal(service.started, false); assert(service.energy.stopped);
    adapter.config.emsApps.apps.meshMicrogrid.enabled = true;
    await service.syncAppLifecycle(); assert(service.started); assert.equal(service.energy.stopped, false);
    service.stop();
    console.log('OK Installiert/inaktiv: Einrichtung möglich; Aktivieren/Aus/Reaktivieren folgen dem AppCenter');

    adapter._nwMeshAppSaveInProgress = true;
    await assert.rejects(service.configure(master), /bereits gespeichert/);
    adapter._nwMeshAppSaveInProgress = false;
    // Dauerhafte v15-Datei ohne App-Lifecycle-Marke simulieren, nicht die neue persist-Methode.
    const key = await service.encryptionKey(); const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const active = C.validateConfig({ ...master, mode: 'active' });
    const data = { config: active, keys: { fixture: 'paired-value' }, slaveKey: '' };
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
    await fs.writeFile(service.file, JSON.stringify({ iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: encrypted.toString('hex') }));
    service = new MeshCoordinator(adapter, options); await service.init();
    adapter.config = {}; adapter._nwInstallerConfigPatch = { gridConstraints: { importLimitW: 15000 } };
    const epoch = service.master.epoch;
    await service.migrateAppLifecycle();
    assert(service.appState().installed && service.appState().enabled && service.appState().protected);
    assert.equal(adapter.config.gridConstraints.importLimitW, 15000); assert.equal(service.keys.fixture, 'paired-value'); assert.equal(service.master.epoch, epoch);
    const count = writes.length; await service.migrateAppLifecycle(); assert.equal(writes.length, count);
    assert.throws(() => service.assertAppChange({ emsApps: { apps: { meshMicrogrid: { installed: false, enabled: false } } } }), /Stillsetzung/);
    assert.throws(() => service.assertAppChange({ emsApps: { apps: { meshMicrogrid: { installed: true, enabled: false } } } }), /Stillsetzung/);
    console.log('OK Versionsumstieg: bestehende aktive Anlage sichtbar, Paarung/Grenzen/Protokoll erhalten, einmalige Migration');

    const local = { id: 'house', max: { ...C.ZERO }, fallback: { ...C.ZERO }, weight: 1, commissioned: true, watchdogVerified: true };
    service.config = C.validateConfig({ ...active, role: 'slave', nodeId: 'house', localParticipates: true, local, masterUrl: 'http://127.0.0.1:8188' }); service.resetProtocols();
    adapter.config.emsApps.apps.meshMicrogrid.enabled = false;
    assert.equal(service.currentLimits().required, true); assert.equal(service.currentLimits().state, 'FALLBACK');
    assert.equal(service.currentLimits().limits.importW, 0); assert.equal(service.notificationEvent().severity, 'critical');
    await service.cycle(); assert.equal(transports, 0);
    await assert.rejects(service.energy.receive({}), /inactive/);
    service.accounting.enabled = true; await service.energy.cycle(); assert.equal(service.energy.journals.size, 0);
    console.log('OK Manipuliertes Aus-Flag: Rückfall bleibt wirksam; keine weitere Netz-/Archivkommunikation');
  } finally { service.stop(); await fs.rm(directory, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
