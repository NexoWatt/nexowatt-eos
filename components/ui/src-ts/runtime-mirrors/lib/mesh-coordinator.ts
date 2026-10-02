// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/mesh-coordinator.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * lib/mesh-coordinator.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 17966cf0e6f8d334ceffa9e6ec3dcae85dd468d6ff456d9e6d7a556f84fb33de
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/mesh-coordinator.ts
 * Quell-Hash: sha256:04f63d9b5e822e818cc7762889a29b0993f9f864abbc78876d400ffff4c2c2f7
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/mesh-coordinator.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verbindet einen festen EOS-Master mit bis zu 99 Slaves über das getrennte Tailscale-Netz.
 * Daten und Wirkung: Signierte HTTP-Nachrichten, verschlüsselte lokale Paarung, monotone Freigaben und lokale EMS-Grenzen. Keine direkte Geräteansteuerung.
 * Bei Änderungen: Sicherheitsvertrag, finale Writer, Rollenprüfung und 99-Knoten-/Ausfalltests gemeinsam prüfen. Geräteseitige Watchdogs bleiben erforderlich.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/mesh-coordinator.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const { performance } = require('node:perf_hooks');
const C = require('./mesh-coordinator-contract');
const { MeshEnergyService, defaults: accountingDefaults, validateAccounting } = require('./mesh-energy-service');
const { MeshMasterProtocol, MeshSlaveLease, validSample } = require('./mesh-coordinator-protocol');
const { buildNvpSnapshotFromRegistry } = require('../ems/services/measurement-freshness');
const CONTROL_KEYS = ['evW', 'chargeW', 'dischargeW', 'pvW', 'flexW'];

/** Ein Keep-alive-Kanal je Slave. Gesamte Anfrage inklusive DNS/TLS hat ein Zeitlimit;
 * keine Redirects, unbegrenzten Bodies, Wiederholungswarteschlangen oder Token-URLs. */
function exchangeHttp(origin, packet, timeoutMs, agents, pending, endpoint = '/api/mesh/coordinator/exchange') {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, origin);
    const body = Buffer.from(JSON.stringify(packet));
    const client = url.protocol === 'https:' ? https : http;
    let settled = false; let timer;
/**
 * Code-Teil: finish
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); pending.delete(req); error ? reject(error) : resolve(value); };
    const req = client.request(url, { method: 'POST', agent: agents[url.protocol], headers: { 'Content-Type': 'application/json', 'Content-Length': body.length } }, res => {
      let size = 0; const chunks = [];
      res.on('data', chunk => { size += chunk.length; if (size > 65536) req.destroy(new Error('response_too_large')); else chunks.push(chunk); });
      res.on('error', error => finish(error));
      res.on('end', () => { try { if (res.statusCode !== 200) throw new Error(`master_http_${res.statusCode}`); finish(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { finish(error); } });
    });
    pending.add(req); req.on('error', error => finish(error));
    timer = setTimeout(() => req.destroy(new Error('master_timeout')), timeoutMs); timer.unref?.(); req.end(body);
  });
}
/**
 * Code-Teil: MeshCoordinator
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class MeshCoordinator {
  constructor(adapter, options = {}) {
    this.adapter = adapter; this.options = options; this.now = options.now || (() => performance.now());
    this.accounting = accountingDefaults(); this.operatorLimits = null; this.energy = new MeshEnergyService(this);
    this.archiveAgents = { 'http:': new http.Agent({ keepAlive: true, maxSockets: 1 }), 'https:': new https.Agent({ keepAlive: true, maxSockets: 1 }) }; this.archivePending = new Set();
    this.config = C.defaultConfig(); this.keys = {}; this.slaveKey = ''; this.locked = false; this.started = false;
    this.pending = new Set(); this.rates = new Map(); this.latencies = []; this.lastAttempt = null; this.failedRequests = 0; this.error = ''; this.applied = null;
    this.agents = { 'http:': new http.Agent({ keepAlive: true, maxSockets: 1 }), 'https:': new https.Agent({ keepAlive: true, maxSockets: 1 }) };
  }
  /** Die technische Sicherheitskonfiguration bleibt bei App-Wechseln erhalten.
   * Ein beschädigter bestehender Speicher verriegelt auf Null; er wird nie als „aus“ interpretiert. */
  async init() {
    if (this.initialized) return; if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      this.directory = this.options.directory || require('@iobroker/adapter-core').getAbsoluteInstanceDataDir(this.adapter);
      this.file = path.join(this.directory, 'mesh-coordinator.enc');
      this.activeMarker = path.join(this.directory, 'mesh-coordinator.active');
      try {
        const encrypted = JSON.parse(await fs.readFile(this.file, 'utf8'));
        const key = await this.encryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'hex'));
        decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));
        const data = JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted.data, 'hex')), decipher.final()]).toString('utf8'));
        this.appLifecycleVersion = data.appLifecycleVersion || 0;
        this.accounting = data.accounting || accountingDefaults(); this.operatorLimits = data.operatorLimits || null;
        this.config = C.validateConfig(data.config); this.keys = data.keys || {}; this.slaveKey = data.slaveKey || ''; this.resetProtocols();
      } catch (error) {
        let previouslyActive = false; try { await fs.access(this.activeMarker); previouslyActive = true; } catch {}
        if (error.code !== 'ENOENT' || previouslyActive) { this.locked = true; this.error = 'Gespeicherte Mesh-Konfiguration nicht lesbar; Anlage bleibt begrenzt.'; }
      }
      this.initialized = true;
    })();
    return this.initializing;
  }
  async encryptionKey() {
    const secret = this.options.systemSecret || (await this.adapter.getForeignObjectAsync('system.config'))?.native?.secret;
    if (!secret || typeof secret !== 'string') throw new Error('Systemschlüssel fehlt.');
    return crypto.createHash('sha256').update(`${secret}:nexowatt-mesh:${this.adapter.namespace}`).digest();
  }
  async persist(data) {
    const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', await this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ ...data, appLifecycleVersion: 1, accounting: data.accounting || this.accounting, operatorLimits: data.operatorLimits === undefined ? this.operatorLimits : data.operatorLimits }), 'utf8'), cipher.final()]);
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    const temp = `${this.file}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    const handle = await fs.open(temp, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify({ iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: ciphertext.toString('hex') })); await handle.sync(); }
    finally { await handle.close(); }
    try { await fs.rename(temp, this.file); } catch (error) { await fs.unlink(temp).catch(() => {}); throw error; }
    // Marker bleibt nach Aktivierung erhalten: Löschen/Verlieren der verschlüsselten
    // Datei darf beim nächsten Start nicht als unkonfigurierte Erstinstallation gelten.
    if (data.config.mode === 'active') {
      const marker = await fs.open(this.activeMarker, 'w', 0o600);
      try { await marker.writeFile('active\n'); await marker.sync(); } finally { await marker.close(); }
    }
    // Auf POSIX auch die Namensänderungen synchronisieren. Windows unterstützt
    // Verzeichnis-fsync nicht; Datei-fsync und atomisches Rename bleiben wirksam.
    if (process.platform !== 'win32') { const dir = await fs.open(this.directory, 'r'); try { await dir.sync(); } finally { await dir.close(); } }
  }
  /** AppCenter ist die einzige Betriebsfreigabe. Der Aktiv-Modus der technischen
   * Konfiguration bezeichnet dagegen die erfolgte Inbetriebnahme. Bei Manipulation
   * der App-Flags bleiben bestehende Grenzen als Rückfall wirksam, nie als Freigabe. */
  appState(config = this.adapter.config) {
    const st = config?.emsApps?.apps?.meshMicrogrid;
    const licensed = this.adapter._nwLicenseAllowsAppId?.('meshMicrogrid') !== false;
    const installed = st?.installed === true;
    return { role: this.config.role, installed, enabled: installed && st?.enabled === true && licensed, licensed,
      protected: this.locked || this.config.mode === 'active' };
  }
  assertAppChange(candidate) {
    const next = candidate?.emsApps?.apps?.meshMicrogrid;
    if (this.appState().protected && (!next?.installed || !next?.enabled)) {
      throw new Error('Microgrid regelt bereits oder ist sicherheitsverriegelt. Aus/Deinstallieren ist gesperrt; zuerst eine geplante physische Stillsetzung und Neu-Inbetriebnahme durchführen.');
    }
  }
  /** Einmaliger Umstieg aus 1.0.14/15: Ein tatsächlich eingerichteter Verbund wird
   * im AppCenter sichtbar übernommen. Erst App-Zustand dauerhaft speichern, dann
   * Migrationsmarke setzen; ein Absturz dazwischen wiederholt nur denselben Schritt. */
  async migrateAppLifecycle() {
    if (this.appLifecycleVersion === 1 || !this.locked && this.config.role === 'off') return;
    const patch = C.clone(this.adapter._nwInstallerConfigPatch || {});
    patch.emsApps = patch.emsApps || { schemaVersion: 1, apps: {} };
    patch.emsApps.apps = patch.emsApps.apps || {};
    patch.emsApps.apps.meshMicrogrid = { installed: true, enabled: true };
    patch.enableMeshMicrogrid = true;
    patch.meshMicrogrid = { ...patch.meshMicrogrid, enabled: true };
    await this.adapter.setStateAsync('installer.configJson', { val: JSON.stringify(patch), ack: true });
    this.adapter._nwInstallerConfigPatch = patch;
    this.adapter.config = this.adapter.nwApplyInstallerPatchToRuntimeConfig(this.adapter.config, patch);
    if (!this.locked) await this.persist({ config: this.config, keys: this.keys, slaveKey: this.slaveKey });
    this.appLifecycleVersion = 1;
    this.adapter.log?.info?.('Bestehender Microgrid-Verbund in die EMS-App übernommen; technische Grenzen und Paarungen bleiben erhalten.');
  }
  /** Start/Stop folgt der gespeicherten EMS-App. Ein in Betrieb genommener Schutz
   * darf bei einem extern manipulierten Aus-Flag nur in den sicheren Rückfall gehen. */
  async syncAppLifecycle() {
    const app = this.appState();
    if (app.enabled && this.config.role !== 'off' || app.protected) await this.start();
    else if (this.started) this.stop();
  }
  publicConfig() { return { app: this.appState(), config: C.clone(this.config), pairedNodes: Object.keys(this.keys), slaveKeySet: !!this.slaveKey, locked: this.locked }; }
  /** Aktive Verbünde dürfen nicht durch Speichern/Deaktivieren ihre Grenzen verlieren.
   * Änderungen zunächst unter nachgewiesener physischer Stillsetzung neu in Betrieb nehmen. */
  async configure(raw, slaveKey) {
    await this.init();
    if (this.saving || this.adapter._nwMeshAppSaveInProgress) throw new Error('Konfiguration wird bereits gespeichert.');
    if (!this.appState().installed) throw new Error('Microgrid zuerst im EMS-AppCenter installieren.');
    this.saving = true;
    try {
      const next = C.validateConfig(raw);
      if (next.mode === 'active' && !this.appState().enabled) throw new Error('Microgrid zuerst im EMS-AppCenter aktivieren.');
      if (this.locked || this.config.mode === 'active') throw new Error('Aktive oder verriegelte Mesh-Konfiguration ist geschützt. Änderungen erfordern eine geplante Stillsetzung und lokale Neu-Inbetriebnahme.');
      const key = slaveKey || this.slaveKey;
      if (next.role === 'slave' && !/^[A-Za-z0-9_-]{43}$/.test(key)) throw new Error('Gültiger individueller Paarungsschlüssel erforderlich.');
      if (next.mode === 'active' && next.localParticipates) this.checkLocalWriters(next);
      const keys = Object.fromEntries(next.nodes.filter(row => this.keys[row.id]).map(row => [row.id, this.keys[row.id]]));
      if (next.mode === 'active' && next.role === 'master' && next.nodes.some(row => !keys[row.id])) throw new Error('Alle Slaves zuerst einzeln paaren.');
      await this.persist({ config: next, keys, slaveKey: next.role === 'slave' ? key : '' });
      this.config = next; this.keys = keys; this.slaveKey = next.role === 'slave' ? key : ''; this.resetProtocols(); await this.syncAppLifecycle(); this.requestTick();
      return this.publicConfig();
    } finally { this.saving = false; }
  }
  checkLocalWriters(config) {
    if (['bhkw', 'generator'].some(kind => (this.adapter.config?.[kind]?.devices || []).some(device => device.enabled === true))) throw new Error('BHKW-/Generator-Sonderregler benötigen vor aktiver Mesh-Einbindung einen eigenen Begrenzungsnachweis.');
    const grid = this.adapter.config?.gridConstraints || {};
    const storage = this.adapter.config?.storage || {};
    // Ein nicht numerisch begrenzbarer Speicherpfad darf keine Leistungsfreigabe bestätigen.
    if ((config.local.max.chargeW > 0 || config.local.max.dischargeW > 0) && storage.controlMode === 'enableFlags') throw new Error('Mesh benötigt einen numerischen Speicher-Sollwert oder numerische Leistungsgrenzen.');
    if (config.local.max.chargeW > 0 || config.local.max.dischargeW > 0) {
      const dp = this.adapter.emsEngine?.dp;
      const generic = storage.controlMode === 'limits'
        ? dp?.getEntry('st.maxChargeW') && dp?.getEntry('st.maxDischargeW')
        : dp?.getEntry('st.targetPowerW') || (dp?.getEntry('st.targetChargePowerW') && dp?.getEntry('st.targetDischargePowerW'));
      const special = dp?.getEntry('st.feneconGridSetpointW') || dp?.getEntry('st.e3dcSetPowerValueW');
      const authority = this.adapter._nwGetStorageControlAuthority?.();
      const farm = this.adapter.config?.storageFarm;
      const farmConfigured = farm?.enabled || (farm?.storages || []).some(row => row.enabled !== false);
      if (!generic || special || farmConfigured || (authority && authority.selectedTopology !== 'single')) throw new Error('Aktives Mesh: Speicher benötigt derzeit einen generischen W-Sollwert oder numerische W-Limits. Hersteller-Sondermodi und Speicherfarmen zunächst im Diagnosebetrieb prüfen.');
    }
    if (config.local.max.pvW > 0) {
      const dp = this.adapter.emsEngine?.dp;
      const inverters = grid.pvCurtailInvertersZero || [];
      const controllable = inverters.length ? inverters.every((_row, i) => dp?.getEntry(`pv.zero.${i}.limitW`) || dp?.getEntry(`pv.zero.${i}.limitPct`)) : dp?.getEntry('pv.limitW') || dp?.getEntry('pv.limitPct');
      if (!controllable) throw new Error('Aktives Mesh benötigt für jeden PV-Wechselrichter eine numerische Erzeugungsgrenze W/%; eine reine Einspeisegrenze reicht nicht.');
    }
    if (config.local.max.pvW > 0 && !(grid.zeroExportEnabled === true && (grid.exportLimitInstallerApproved === true || grid.zeroExportInstallerApproved === true))) throw new Error('PV: lokalen Export Guard vor der Mesh-Aktivierung einrichten und freigeben.');
  }
  async pair(nodeId) {
    await this.init();
    if (!this.appState().installed || this.saving || this.adapter._nwMeshAppSaveInProgress || this.config.mode === 'active' || this.config.role !== 'master') throw new Error('Paarung nur bei ruhender Diagnose-Konfiguration.');
    const member = this.config.nodes.find(row => row.id === nodeId); if (!member) throw new Error('Slave unbekannt.');
    this.saving = true;
    try {
      const key = crypto.randomBytes(32).toString('base64url'); const keys = { ...this.keys, [nodeId]: key };
      await this.persist({ config: this.config, keys, slaveKey: '' }); this.keys = keys;
      const config = { ...C.clone(this.config), role: 'slave', mode: 'diagnostic', nodeId, local: C.clone(member), localParticipates: true, nodes: [], branches: [], feedback: {} };
      return { config, pairingKey: key };
    } finally { this.saving = false; }
  }
  resetProtocols() {
    this.generation = (this.generation || 0) + 1;
    for (const req of this.pending) req.destroy(new Error('configuration_changed'));
    this.master = this.config.role === 'master' ? new MeshMasterProtocol(this.config, this.now) : null;
    this.slave = this.config.localParticipates ? new MeshSlaveLease(this.config, this.now) : null;
    if (this.master) this.master.operatorLimits = this.operatorLimits;
    this.applied = null; this.everNormal = false; this.rates.clear(); this.latencies = []; this.lastAttempt = null; this.error = '';
  }
  /** Liest echte, frische Messungen. Fehlende/alte DPs werden nicht als 0 W ausgegeben.
   * Feedback-DPs sind positive W-Beträge und werden gesondert im Register geführt. */
  sample() {
    if (this.options.sample) return this.options.sample();
    const dp = this.adapter.emsEngine?.dp; if (!dp) return { quality: 'missing' };
    try {
      const nvp = buildNvpSnapshotFromRegistry({ registry: dp, now: Date.now(), staleMs: this.config.staleMs, maxHeartbeatHoldMs: this.config.staleMs, invertGrid: !!this.adapter.config?.settings?.flowInvertGrid });
      const ages = []; const phaseA = ['ps.l1A', 'ps.l2A', 'ps.l3A'].map(key => {
        const age = dp.getMeasurementAgeMs(key); const value = dp.getNumber(key, null);
        if (!dp.getEntry(key) || !Number.isFinite(age) || !Number.isFinite(value) || dp.getConnectionStatus?.(key) === false) throw new Error('phase_missing');
        ages.push(age); return Math.abs(value);
      });
      for (const key of ['vis.gridNetW', 'vis.gridBuyW', 'vis.gridSellW']) if (dp.getEntry(key)) { const age = dp.getMeasurementAgeMs(key); if (!Number.isFinite(age)) throw new Error('nvp_age'); ages.push(age); }
      const controlledW = {};
      if (this.config.localParticipates) for (const key of CONTROL_KEYS) {
        const mapped = this.config.feedback[key];
        if (!mapped) { if (this.config.local.max[key] > 0) throw new Error('feedback_missing'); controlledW[key] = 0; continue; }
        const entry = dp.getEntry(`mesh.feedback.${key}`);
        if (!entry || String(entry.srcObjectId || entry.objectId) !== mapped) throw new Error('feedback_pending');
        const age = dp.getMeasurementAgeMs(`mesh.feedback.${key}`); const value = dp.getNumber(`mesh.feedback.${key}`, null);
        if (!Number.isFinite(age) || !Number.isFinite(value) || value < 0 || dp.getConnectionStatus?.(`mesh.feedback.${key}`) === false) throw new Error('feedback_invalid');
        ages.push(age); controlledW[key] = value;
      }
      const ageMs = Math.max(...ages); const licenseReady = typeof this.adapter._nwLicenseAllowsAppId !== 'function' || this.adapter._nwLicenseAllowsAppId('meshMicrogrid');
      const devicesHealthy = licenseReady && !Object.values(this.adapter._nwSafetyCriticalFaults || {}).some(Boolean);
      const result = { quality: nvp.usable && ageMs <= this.config.staleMs ? 'ok' : 'stale', ageMs, gridW: nvp.netW, phaseA, controlledW, devicesHealthy, sampledAt: Date.now() };
      return { ...result, ...this.localDemand(result) };
    } catch { return { quality: 'missing', devicesHealthy: false }; }
  }
  /** Ein noch wartender AC-/DC-Ladepunkt verbraucht 0 W, braucht aber bereits
   * seine Mindestfreigabe. Frischer lokaler Ladebedarf stammt aus dem bestehenden
   * Audit vor der Netzbegrenzung; er erteilt selbst keine Gerätefreigabe.
   * Unbekannte Phasen werden konservativ wie ein einphasiger Verbraucher behandelt. */
  localDemand(sample) {
    const audit = this.adapter._nwChargingManagementAudit?.getSnapshot?.();
    const age = Date.now() - Number(audit?.ts);
    if (!this.config.localParticipates || !audit?.controlActive || !Number.isFinite(age) || age < 0 || age > 10000) return {};
    const desired = Math.min(this.config.local.max.evW, Number(audit.grid?.requestedW) || 0);
    const actual = Math.max(0, Number(sample.controlledW?.evW) || 0);
    if (!(desired > 0)) return {};
    const points = (audit.wallboxes || []).filter(r => r.online && r.enabled && r.controlAvailable && r.connected && !r.faultActive && !r.unavailableActive && r.mode !== 'off' && r.minimumPowerW > 0);
    const minimum = points.length ? Math.min(desired, ...points.map(r => r.minimumPowerW)) : 0;
    const phases = points.length ? Math.max(1, Math.min(...points.map(r => Number(r.phaseCount) || 1))) : 1;
    const requestedNetwork = { importW: Math.max(0, sample.gridW + Math.max(0, desired - actual)), exportW: Math.max(0, -sample.gridW) };
    const minimumNetwork = { importW: Math.max(0, sample.gridW - actual) + minimum, exportW: 0 };
    for (let i = 0; i < 3; i++) {
      requestedNetwork[`l${i+1}A`] = sample.phaseA[i] + Math.max(0, desired - actual) / (230 * phases);
      minimumNetwork[`l${i+1}A`] = sample.phaseA[i] + Math.max(0, minimum - actual) / (230 * phases);
    }
    for (const k of C.NETWORK_KEYS) { requestedNetwork[k] = Math.min(this.config.local.max[k], requestedNetwork[k]); minimumNetwork[k] = Math.min(this.config.local.max[k], minimumNetwork[k]); }
    return { requestedNetwork, minimumNetwork: minimum > 0 ? minimumNetwork : null, demandSource: 'local-charging-audit' };
  }
  /** Beim Master mit eigenem Haus ist der Hauptzähler eine getrennte Messstelle.
   * Die Hausmessung darf niemals mit dem gesamten Verbundverbrauch verwechselt werden. */
  siteSample() {
    if (!this.config.localParticipates) return this.sample();
    if (this.options.siteSample) return this.options.siteSample();
    const dp = this.adapter.emsEngine?.dp;
    try {
      const values = {}; const ages = [];
      for (const key of ['gridW', 'l1A', 'l2A', 'l3A']) {
        const entry = dp?.getEntry(`mesh.site.${key}`); const value = dp?.getNumber(`mesh.site.${key}`, null); const age = dp?.getMeasurementAgeMs(`mesh.site.${key}`);
        if (!entry || String(entry.srcObjectId || entry.objectId) !== this.config.siteFeedback[key] || !Number.isFinite(value) || !Number.isFinite(age) || dp.getConnectionStatus?.(`mesh.site.${key}`) === false) return { quality: 'missing' };
        values[key] = value; ages.push(age);
      }
      return { quality: 'ok', ageMs: Math.max(...ages), gridW: values.gridW, phaseA: ['l1A','l2A','l3A'].map(key => Math.abs(values[key])), devicesHealthy: true };
    } catch { return { quality: 'missing' }; }
  }
  async registerFeedback() {
    const dp = this.adapter.emsEngine?.dp; if (!dp) return;
    if (this.config.role === 'master' && this.config.localParticipates) for (const [key, objectId] of Object.entries(this.config.siteFeedback)) if (objectId) {
      const previous = dp.getEntry(`mesh.site.${key}`);
      if (String(previous?.srcObjectId || previous?.objectId || '') !== objectId) await dp.upsert({ key: `mesh.site.${key}`, objectId, dataType: 'number', direction: 'in', unit: key.endsWith('A') ? 'A' : 'W', useAliveForStale: false });
    }
    if (!this.config.localParticipates) return;
    for (const [key, objectId] of Object.entries(this.config.feedback)) if (objectId) {
      const previous = dp.getEntry(`mesh.feedback.${key}`);
      if (String(previous?.srcObjectId || previous?.objectId || '') !== objectId) await dp.upsert({ key: `mesh.feedback.${key}`, objectId, dataType: 'number', direction: 'in', unit: 'W', useAliveForStale: false });
    }
  }
  /** Nach erfolgreichem EMS-Zyklus merken wir exakt dessen Freigabe. VERIFIED setzt
   * zusätzlich Messungen voraus, die nach diesem Zyklus aufgenommen wurden. */
  markApplied(lease) {
    if (!lease?.valid || Object.values(this.adapter._nwSafetyCriticalFaults || {}).some(Boolean)) return;
    const current = this.currentLimits();
    // Derselbe Befehl behält den ersten erfolgreichen Anwendungszeitpunkt.
    // Sonst würde jeder schnelle EMS-Tick die benötigte Messwertbestätigung verschieben.
    if (this.applied?.epoch === lease.epoch && this.applied?.commandSeq === lease.commandSeq) return;
    if (current.epoch === lease.epoch && current.commandSeq === lease.commandSeq) this.applied = { epoch: lease.epoch, commandSeq: lease.commandSeq, at: Date.now() };
  }
  currentLimits() {
    if (this.locked) return { required: true, valid: false, state: 'LOCKED', limits: { ...C.ZERO }, reason: this.error };
    if (!this.appState().enabled) {
      if (this.config.mode === 'active' && this.config.localParticipates) {
        this.slave?.fail('ems_app_inactive');
        return { required: true, valid: false, state: 'FALLBACK', limits: C.clone(this.config.local.fallback), reason: 'EMS-App nicht freigegeben; geprüfter Rückfall bleibt wirksam.' };
      }
      return { required: false, valid: false, state: 'OFF', limits: { ...C.ZERO } };
    }
    // Lokale Messausfälle wirken schon vor der nächsten Netzwerkrunde.
    if (this.slave && this.config.mode === 'active' && !validSample(this.sample(), this.config.staleMs)) this.slave.fail('local_measurement_invalid');
    return this.slave ? this.slave.current() : { required: false, valid: false, state: this.config.role === 'off' ? 'OFF' : this.master?.state, limits: { ...C.ZERO } };
  }
  requestTick() { try { this.adapter.emsEngine?.requestImmediateTick?.('mesh-coordinator', 50); } catch {} }
  /** Nur bekannte IDs mit individuellem HMAC dürfen den Master erreichen. Diese
   * Funktion wartet weder auf andere Slaves noch auf Archiv-/Datenträgerzugriffe. */
  receive(packet) {
    if (!this.appState().enabled || !this.master || this.locked) throw new Error('master_unavailable');
    const nodeId = packet?.payload?.nodeId; const key = this.keys[nodeId];
    if (!key || !C.verify(packet, key)) throw new Error('authentication_failed');
    const now = this.now(); const recent = (this.rates.get(nodeId) || []).filter(ts => now - ts < 1000);
    if (recent.length >= Math.ceil(1000 / this.config.intervalMs) + 3) throw new Error('rate_limit'); recent.push(now); this.rates.set(nodeId, recent);
    const request = packet.payload;
    if (!['hello', 'exchange'].includes(request.kind)) throw new Error('invalid_kind');
    return C.sign(request.kind === 'hello' ? this.master.hello(request) : this.master.exchange(request, this.siteSample()), key);
  }
  async cycle() {
    if (this.busy || this.stopped || !this.initialized || !this.appState().enabled) return;
    this.busy = true; const generation = this.generation; let attempt = null; let phase = 'preparation';
    try {
      await this.registerFeedback();
      if (this.stopped || !this.appState().enabled || generation !== this.generation) return;
      if (this.master) { this.master.plan(this.siteSample()); if (this.master.state === 'NORMAL') this.everNormal = true; }
      if (!this.slave) return;
      const sample = this.sample();
      const applied = this.applied && this.applied.epoch === this.slave.epoch && Number.isFinite(sample.ageMs) && Date.now() - sample.ageMs >= this.applied.at ? this.applied.commandSeq : 0;
      const hello = !this.slave.epoch;
      const request = hello ? this.slave.hello() : this.slave.request(sample, applied, this.latencies.at(-1) ?? null);
      const start = this.now(); let response;
      // Die erfolgreiche RTT-Serie bleibt kompatibel. Der aktuelle Versuch
      // erhält einen getrennten, konstant großen Nachweis auch bei Ablehnung;
      // sonst würde ein Timeout irreführend die vorige erfolgreiche RTT zeigen.
      attempt = { kind: hello ? 'hello' : 'exchange', started: this.slave.pending.started, timeoutMs: this.config.requestTimeoutMs };
      this.lastAttempt = { kind: attempt.kind, durationMs: 0, timeoutMs: attempt.timeoutMs, outcome: 'pending', phase: 'request' };
      if (this.master) { phase = 'master'; response = hello ? this.master.hello(request) : this.master.exchange(request, this.siteSample()); }
      else {
        phase = 'transport';
        const packet = await (this.options.transport || exchangeHttp)(this.config.masterUrl, C.sign(request, this.slaveKey), this.config.requestTimeoutMs, this.agents, this.pending);
        phase = 'signature';
        if (!C.verify(packet, this.slaveKey)) throw new Error('invalid_master_signature'); response = packet.payload;
      }
      if (generation !== this.generation || this.stopped || !this.appState().enabled) return;
      phase = 'lease';
      if (hello) this.slave.acceptHello(response); else this.slave.accept(response);
      this.lastAttempt = { kind: attempt.kind, durationMs: Math.max(0, this.now() - attempt.started), timeoutMs: attempt.timeoutMs, outcome: 'accepted', phase: 'complete' };
      this.latencies.push(Math.max(0, this.now() - start)); if (this.latencies.length > 120) this.latencies.shift();
      if (this.slave.current().state === 'NORMAL') this.everNormal = true;
      this.error = ''; this.requestTick();
    } catch (error) {
      if (generation === this.generation && this.slave) {
        if (attempt) this.lastAttempt = { kind: attempt.kind, durationMs: Math.max(0, this.now() - attempt.started), timeoutMs: attempt.timeoutMs, outcome: 'rejected', phase };
        this.slave.fail(String(error.message)); this.slave.epoch = ''; this.failedRequests++; this.error = String(error.message); this.requestTick();
      }
    } finally { this.busy = false; }
  }
  async start() {
    await this.init(); if (this.started) return;
    const app = this.appState();
    if (!(app.enabled && this.config.role !== 'off') && !app.protected) return;
    this.started = true; this.stopped = false;
    const runGeneration = this.runGeneration = (this.runGeneration || 0) + 1;
/**
 * Code-Teil: run
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
    const run = async () => { const started = this.now(); await this.cycle(); if (!this.stopped && runGeneration === this.runGeneration) { this.timer = setTimeout(run, Math.max(1, this.config.intervalMs - (this.now() - started))); this.timer.unref?.(); } };
    if (app.enabled) this.energy.start();
    // Knoten starten verteilt. Ein einzelner Timeout blockiert nur seinen eigenen Kanal.
    this.timer = setTimeout(run, crypto.randomInt(20, 500)); this.timer.unref?.();
    this.watchdog = setInterval(() => {
      const current = this.currentLimits(); const key = `${current.state}:${current.commandSeq || 0}`;
      if (current.required && key !== this.lastWatchdogState) this.requestTick(); this.lastWatchdogState = key;
      if (this.master) { this.master.plan(this.appState().enabled ? this.siteSample() : null); if (this.master.state === 'NORMAL') this.everNormal = true; }
    }, 100); this.watchdog.unref?.();
  }
  stop() { this.runGeneration = (this.runGeneration || 0) + 1; this.started = false; this.generation = (this.generation || 0) + 1; this.energy.stop(); for (const req of this.archivePending) req.destroy(new Error('shutdown')); this.archiveAgents['http:'].destroy(); this.archiveAgents['https:'].destroy(); this.stopped = true; clearTimeout(this.timer); clearInterval(this.watchdog); for (const req of this.pending) req.destroy(new Error('shutdown')); this.agents['http:'].destroy(); this.agents['https:'].destroy(); this.slave?.fail('shutdown'); }
  /** Ein Störungsereignis pro Verbund statt 99 Einzelmails. Die vorhandene
   * NotificationPolicy übernimmt sofort/30 Minuten/täglich und Wiederholschutz. */
  notificationEvent() {
    if (this.locked) return { severity: 'critical', title: 'Microgrid-Konfiguration verriegelt', message: 'Die gespeicherte Sicherheitskonfiguration ist nicht lesbar. Lokale Freigaben bleiben gesperrt. Installer verständigen.' };
    if (this.config.mode !== 'active') return null;
    if (!this.appState().enabled) return { severity: 'critical', title: 'Microgrid-App ohne Betriebsfreigabe', message: 'Ein bereits in Betrieb genommener Verbund wurde außerhalb des AppCenters deaktiviert oder die Lizenz fehlt. Geprüfte Rückfallgrenzen bleiben wirksam; Installer verständigen.' };
    const state = this.master?.state || this.currentLimits().state;
    if (state === 'NORMAL') return null;
    return { severity: this.everNormal ? 'critical' : 'warning', title: 'Microgrid im Rückfallbetrieb', message: 'Master-Freigabe, frische Messung oder bestätigte Begrenzung fehlt. Der Verbund bleibt im sicheren Rückfall. Microgrid-Diagnose prüfen.' };
  }
  archiveTransport(packet) { return exchangeHttp(this.config.masterUrl, packet, 5000, this.archiveAgents, this.archivePending, '/api/mesh/coordinator/energy'); }
  /** Betriebsvorgaben können nur innerhalb der geprüften Anschluss- und Rückfallgrenzen
   * geändert werden. Neue Kapazität wird erst nach Wirkungsbestätigungen verteilt. */
  async setOperating(raw) {
    await this.init();
    if (this.saving || this.locked || !this.master || !['fixed','transformer'].includes(raw?.strategy || this.config.allocation.strategy)) throw new Error('Trafo-Master nicht bereit.');
    const next = {};
    for (const key of ['importW','exportW']) {
      const minimum = this.config.site.reserve[key] + this.config.site.unmonitored[key] + C.membersOf(this.config).reduce((sum, n) => sum + n.fallback[key], 0);
      next[key] = C.number(raw?.[key], `Verbund-${key}`, minimum, this.config.site.limit[key]);
    }
    this.saving = true;
    try {
      // Nur die Verteilstrategie ändert sich. Geprüfte Teilnehmer, Maxima, Rückfälle,
      // Sitzung und Reservierungen bleiben erhalten; daher keine ungesicherte Live-Migration.
      const config = { ...this.config, allocation: { ...this.config.allocation, strategy: raw.strategy || this.config.allocation.strategy } };
      await this.persist({ config, keys: this.keys, slaveKey: this.slaveKey, operatorLimits: next });
      this.config = config; this.master.config = config; this.operatorLimits = next; this.master.operatorLimits = next;
      this.master.lastPlan = -Infinity; this.master.plan(this.siteSample()); this.requestTick(); return { ...next, strategy: config.allocation.strategy };
    }
    finally { this.saving = false; }
  }
  /** Archiv-/Tarifdaten sind von der verriegelten technischen Inbetriebnahme getrennt.
   * Speichern löst weder einen Protokollneustart noch eine neue Leistungsfreigabe aus. */
  async configureAccounting(raw) {
    await this.init(); if (this.saving || this.energy.busy || this.energy.busyNodes.size) throw new Error('Archiv beschäftigt; bitte erneut speichern.');
    const next = validateAccounting(raw, this.config);
    if (this.accounting.meter?.id && ['id','importDp','exportDp','unit'].some(key => next.meter[key] !== this.accounting.meter[key]) && next.meter.epoch === this.accounting.meter.epoch) throw new Error('Bei geänderter Zählerzuordnung eine neue Zählerepoche vergeben.');
    this.saving = true; this.energy.busy = true;
    try {
      await this.persist({ config: this.config, keys: this.keys, slaveKey: this.slaveKey, accounting: next });
      this.accounting = next; this.energy.lastCapture = 0; this.energy.syncKnown = false;
      for (const journal of this.energy.journals.values()) journal.maxBytes = next.maxArchiveMB * 1024 * 1024;
      return { config: C.clone(next), status: this.energy.status() };
    } finally { this.saving = false; this.energy.busy = false; }
  }
  status() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    return { role: this.config.role, mode: this.config.mode, siteId: this.config.siteId, nodeId: this.config.nodeId, maxSlaves: 99,
      local: this.currentLimits(), master: this.master?.status() || null, error: this.error, failedRequests: this.failedRequests,
      timing: { lastRttMs: this.latencies.at(-1) ?? null, p95RttMs: sorted.length ? sorted[Math.ceil(sorted.length * .95) - 1] : null,
        lastAttempt: this.lastAttempt ? { ...this.lastAttempt } : null, intervalMs: this.config.intervalMs, leaseMs: this.config.leaseMs },
      accounting: this.energy.status(),
      network: 'Tailscale separat; direkte/Relay-Verbindung mit tailscale status prüfen.' };
  }
}
module.exports = { MeshCoordinator, exchangeHttp };
