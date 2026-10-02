// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Sammelt wichtige Anlagenstörungen und versendet freigegebene Meldungsgruppen über verschlüsselt gespeicherte SMTP-Konfiguration.
 * Daten und Wirkung: Liest Kundenfreigabe, Empfänger und Diagnose-States; nutzt NotificationPolicy für die Auswahl und Nodemailer für den TLS-Versand. Die Konfiguration liegt AES-GCM-verschlüsselt im Instanzdatenverzeichnis.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/notification-mail.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { NotificationPolicy } = require('./notification-policy');
const FROM = 'info@nexowatt.com';
const ADDRESS = /^[^\s<>@,;\r\n]+@[^\s<>@,;\r\n]+\.[^\s<>@,;\r\n]+$/;
const validAddress = v => typeof v === 'string' && v.length <= 254 && ADDRESS.test(v);
const safeId = v => String(v || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
const MODULES = new Set(['coreLimits', 'peakShaving', 'chargingManagement', 'storage', 'storageControl', 'storageFarm', 'gridConstraints', 'para14a', 'netOperatorInterface', 'heatingRod', 'heatingRodControl', 'consumerManagement', 'speicherMapping', 'speicherRegelung', 'multiUse', 'thermalControl', 'meshMicrogrid', 'nvpCoordinator', 'bhkwControl', 'generatorControl', 'thresholdControl', 'nexoLogicBudget']);

/**
 * Ablauf und Zusammenhang: Prüft Server, Port, Benutzer und Passwort vor dem Speichern. Ein leeres Passwortfeld übernimmt das bisherige Passwort; nur clearPassword löscht es ausdrücklich. Aktivierung ohne vollständige Zugangsdaten wird abgewiesen.
 */
function normalizeConfig(input = {}, previous = {}) {
  const c = { enabled: input.enabled === true, host: String(input.host || '').trim(), port: Number(input.port || 465),
    tlsMode: input.tlsMode === 'starttls' ? 'starttls' : 'tls', user: String(input.user || FROM).trim(), from: FROM,
    siteName: String(input.siteName || '').trim().replace(/[\r\n]/g, ' ').slice(0, 100),
    password: input.clearPassword === true ? '' : (typeof input.password === 'string' && input.password !== '' ? input.password : (previous.password || '')) };
  if (c.host && (!/^[a-zA-Z0-9.-]+$/.test(c.host) || c.host.length > 253)) throw new Error('Ungültiger SMTP-Server.');
  if (!Number.isInteger(c.port) || c.port < 1 || c.port > 65535) throw new Error('Ungültiger SMTP-Port.');
  if (/[\r\n]/.test(c.user) || c.user.length > 254 || c.password.length > 4096) throw new Error('Ungültige SMTP-Zugangsdaten.');
  if (c.enabled && (!c.host || !c.user || !c.password)) throw new Error('SMTP-Server, Benutzer und Passwort sind erforderlich.');
  return c;
}
/**
 * Ablauf und Zusammenhang: Übersetzt SMTP-Fehlercodes in feste Diagnosemeldungen. Rohmeldungen des Servers werden nicht durchgereicht, weil darin Zugangsdaten oder andere vertrauliche Inhalte stehen könnten.
 */
function smtpError(error) {
  const code = String(error?.code || '');
  if (code === 'EAUTH') return 'SMTP-Anmeldung fehlgeschlagen. Zugangsdaten prüfen.';
  if (['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'EDNS'].includes(code)) return 'Mailserver nicht erreichbar oder Verbindung abgebrochen. Erneuter Versuch folgt.';
  if (code === 'EENVELOPE') return 'Mailserver hat Absender oder Empfänger abgelehnt.';
  return 'Mailserver hat den Versand nicht bestätigt. SMTP- und TLS-Konfiguration prüfen.';
}

class NotificationMail {
  /**
   * Ablauf und Zusammenhang: Hält genau den Versandzustand dieser Adapter-Instanz. Uhr, Verzeichnis und Transport sind für lokale Tests austauschbar; produktiv kommen Zeit, Instanzdatenverzeichnis und Nodemailer zum Einsatz.
   */
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.options = options;
    this.startedAt = (options.now || Date.now)();
    this.now = options.now || Date.now;
    this.config = normalizeConfig();
    this.policy = new NotificationPolicy();
    this.busy = false;
    this.closed = false;
    this.transport = null;
    this.lastSnapshot = '';
    this.lastStatus = '';
  }
  /**
   * Ablauf und Zusammenhang: Initialisiert den Versand nur einmal und teilt das Initialisierungs-Promise mit parallelen Aufrufern. Nach einem Ladefehler wird ein späterer neuer Versuch zugelassen.
   */
  async init() {
    if (!this.initPromise) this.initPromise = this._load().catch(error => { this.initPromise = null; throw error; });
    return this.initPromise;
  }
  /**
   * Ablauf und Zusammenhang: Leitet den AES-Schlüssel aus ioBroker-Systemschlüssel und Instanzname ab. Entschlüsselt die lokale Mailkonfiguration und lädt den Wiederholschutz; ein beschädigtes Protokoll löst eine vorsichtige Versandpause aus.
   */
  async _load() {
    this.directory = this.options.directory || require('@iobroker/adapter-core').getAbsoluteInstanceDataDir(this.adapter);
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    const system = await this.adapter.getForeignObjectAsync('system.config');
    const secret = system?.native?.secret;
    if (!secret || typeof secret !== 'string') throw new Error('Systemschlüssel für geschützten Mailversand fehlt.');
    this.key = crypto.createHash('sha256').update(`${secret}:nexowatt-mail:${this.adapter.namespace}`).digest();
    try {
      const stored = JSON.parse(await fs.readFile(path.join(this.directory, 'notification-mail.json'), 'utf8'));
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(stored.iv, 'hex'));
      decipher.setAuthTag(Buffer.from(stored.tag, 'hex'));
      const plain = Buffer.concat([decipher.update(Buffer.from(stored.data, 'hex')), decipher.final()]);
      this.config = normalizeConfig(JSON.parse(plain.toString('utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error('Gespeicherte SMTP-Konfiguration ist nicht lesbar. Systemschlüssel oder Sicherung prüfen.');
    }
    try { this.policy = new NotificationPolicy(JSON.parse(await fs.readFile(path.join(this.directory, 'notification-ledger.json'), 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') this.policy.nextAttempt = this.now() + 3600000; }
  }
  /**
   * Ablauf und Zusammenhang: Schreibt JSON zuerst in eine lokale temporäre Datei mit Besitzerrechten und ersetzt danach die Zieldatei. So soll ein unterbrochener Schreibvorgang nicht die bisherige vollständige Konfiguration zerstören.
   */
  async atomic(name, value) {
    const target = path.join(this.directory, name);
    const temporary = `${target}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
    await fs.rename(temporary, target);
  }
  /**
   * Ablauf und Zusammenhang: Speichert den Snapshot der Versand-Policy nur bei Änderung. Dieses Protokoll erhält den Wiederholschutz auch über Adapter-Neustarts hinweg.
   */
  async saveLedger() {
    const data = this.policy.snapshot();
    const json = JSON.stringify(data);
    if (json !== this.lastSnapshot) { await this.atomic('notification-ledger.json', data); this.lastSnapshot = json; }
  }
  /**
   * Ablauf und Zusammenhang: Entfernt das Passwort aus der Konfigurationsantwort. Die Oberfläche bekommt nur passwordSet als Hinweis, ob ein Passwort vorhanden ist; der Passwortwert wird nicht zurückgegeben.
   */
  publicConfig() {
    const { password, ...publicFields } = this.config;
    return { ...publicFields, passwordSet: !!password };
  }
  /**
   * Ablauf und Zusammenhang: Übernimmt eine zuvor von der Admin-Route autorisierte Eingabe. Prüft die Werte, speichert AES-256-GCM-Chiffre mit neuem IV und verwirft den bisherigen SMTP-Transport; busy verhindert eine parallele Umkonfiguration während des Versands.
   */
  async configure(input) {
    await this.init();
    if (this.busy) throw new Error('Mailversand läuft. Bitte kurz warten.');
    this.busy = true;
    try {
      const config = normalizeConfig(input, this.config);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
      const data = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
      await this.atomic('notification-mail.json', { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: data.toString('hex') });
      this.transport?.close(); this.transport = null;
      this.config = config;
      return this.publicConfig();
    } finally { this.busy = false; }
  }
  /**
   * Ablauf und Zusammenhang: Schreibt einen geänderten Versandstatus in den Diagnose-State lastMailResult. Gleiche Meldungen werden nicht bei jedem Tick erneut geschrieben.
   */
  async status(message) {
    if (this.lastStatus === message) return;
    this.lastStatus = message;
    await this.adapter._notifySetDebugState('lastMailResult', message);
  }
  /**
   * Ablauf und Zusammenhang: Sendet genau eine Nachricht mit verpflichtendem TLS und Zertifikatsprüfung. Erfolg bedeutet Annahme durch den SMTP-Server, nicht nachgewiesene Zustellung im Kundenpostfach; ungültige Empfänger und ausgeschalteter Versand werden abgewiesen.
   */
  async send(to, subject, text) {
    if (!this.config.enabled) return { ok: false, error: 'Direkter Mailversand ist im Installerbereich noch nicht eingerichtet oder deaktiviert.' };
    if (!validAddress(to)) return { ok: false, error: 'Eine gültige einzelne Empfängeradresse ist erforderlich.' };
    if (this.closed) return { ok: false, error: 'Adapter wird beendet.' };
    try {
      if (!this.transport) {
        const create = this.options.createTransport || require('nodemailer').createTransport;
        this.transport = create({ host: this.config.host, port: this.config.port, secure: this.config.tlsMode === 'tls',
          requireTLS: true, auth: { user: this.config.user, pass: this.config.password },
          tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
          connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
          pool: false, logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true });
      }
      const info = await this.transport.sendMail({ from: { name: 'NexoWatt EOS', address: FROM }, to,
        subject: String(subject).replace(/[\r\n]/g, ' ').slice(0, 200), text: String(text).slice(0, 48000),
        disableFileAccess: true, disableUrlAccess: true });
      const accepted = Array.isArray(info?.accepted) && info.accepted.some(v => String(v).toLowerCase() === to.toLowerCase());
      if (!accepted || info?.rejected?.length) return { ok: false, error: 'Mailserver hat die Empfängeradresse nicht angenommen.' };
      return { ok: true, status: 'smtp-accepted' };
    } catch (error) { return { ok: false, error: smtpError(error) }; }
  }
  /**
   * Ablauf und Zusammenhang: Reserviert den Versandversuch und speichert ihn vor dem Netzwerkaufruf. Nach der SMTP-Antwort werden Erfolg oder Wiederholpause in der Policy festgehalten; ein Neustart soll dadurch keine ungebremste Wiederholung auslösen.
   */
  async deliver(to, subject, text, batch, test = false) {
    const now = this.now();
    this.policy.reserve(now, test);
    await this.saveLedger(); // A restart cannot turn repeated timeouts into an unbounded send loop.
    const result = await this.send(to, subject, text);
    this.policy.complete(batch, this.now(), result.ok);
    await this.saveLedger();
    await this.status(result.ok ? 'smtp-accepted' : result.error);
    if (result.ok) {
      await this.adapter._notifySetDebugState('lastMailTs', this.now());
      await this.adapter._notifySetDebugState('lastMailSubject', subject);
    }
    return result;
  }
  /**
   * Ablauf und Zusammenhang: Versendet eine Testnachricht an die gespeicherte/übergebene einzelne Kundenadresse. Nutzt denselben geschützten Transport, aber eine eigene Testmail-Begrenzung von mindestens fünf Minuten.
   */
  async test(to) {
    if (this.busy) return { ok: false, error: 'Ein Mailversand läuft bereits.' };
    this.busy = true;
    try {
      await this.init();
      if (!validAddress(to)) return { ok: false, error: 'Bitte eine gültige Empfängeradresse speichern.' };
      if (!this.config.enabled) return { ok: false, error: 'Mailversand im Installerbereich einrichten und aktivieren.' };
      if (!this.policy.quota(this.now(), true)) return { ok: false, error: 'Versandpause aktiv. Testmails frühestens nach fünf Minuten wiederholen.' };
      return await this.deliver(to, 'NexoWatt EOS: Test-Benachrichtigung', `${this.config.siteName || 'NexoWatt EOS'}\nDer direkte E-Mail-Versand wurde getestet.\nAbsender: ${FROM}`, [], true);
    } catch (_error) { return { ok: false, error: 'Geschützte Versandkonfiguration oder Versandprotokoll nicht verfügbar.' }; }
    finally { this.busy = false; }
  }
  /**
   * Ablauf und Zusammenhang: Liest Kundenfreigabe und Empfänger, sammelt relevante Ereignisse und lässt NotificationPolicy die fällige Gruppe auswählen. Die ersten 30 Sekunden nach Start werden ausgespart; busy verhindert doppelte parallele Versandläufe.
   */
  async tick() {
    if (this.busy || this.closed) return;
    this.busy = true;
    try {
      await this.init();
      const a = this.adapter;
      const enabled = a._notifyGetSettingBool('notifyEnabled', false);
      const to = a._notifyGetSettingString('email', '');
      if (!enabled) { if (this.policy.records.size) { this.policy.records.clear(); await this.saveLedger(); } return; }
      if (!validAddress(to)) { await this.status('Gültige Kunden-E-Mail-Adresse fehlt.'); return; }
      if (!this.config.enabled) { await this.status('Mailversand im Installerbereich einrichten und aktivieren.'); return; }
      if (this.now() - this.startedAt < 30000) return;
      this.policy.setRecipient(crypto.createHash('sha256').update(to.toLowerCase()).digest('hex'));
      const categories = new Set(['system', 'inverters', 'charging', 'communications', 'grid'].filter(c => a._notifyGetSettingBool({ system: 'notifySystem', inverters: 'notifyInverters', charging: 'notifyCharging', communications: 'notifyCommunication', grid: 'notifyHardCurtailment' }[c], true)));
      const events = await this.collect(categories);
      this.policy.observe(events, this.now(), categories);
      await this.saveLedger();
      await a._notifySetDebugState('activeCount', events.length);
      await a._notifySetDebugState('activeJson', JSON.stringify(events.map(e => ({ id: e.id, title: e.title, severity: e.severity }))));
      const batch = this.policy.batch(this.now(), a._notifyGetSettingBool('notifyRecovery', true));
      if (!batch.length) return;
      const alarms = batch.filter(e => e.kind === 'alarm').length;
      const subject = `NexoWatt EOS${this.config.siteName ? ' – ' + this.config.siteName : ''}: ${alarms} Störung(en), ${batch.length - alarms} Entwarnung(en)`;
      const body = [`Anlage: ${this.config.siteName || a.namespace}`, `Zeit: ${new Date(this.now()).toISOString()}`, '',
        ...batch.flatMap(e => [`${e.kind === 'recovery' ? 'WIEDER OK' : (e.severity === 'critical' ? 'STÖRUNG' : (e.severity === 'info' ? 'HINWEIS' : 'WARNUNG'))}: ${e.title}`, e.kind === 'recovery' ? 'Die Störung besteht seit mindestens fünf Minuten nicht mehr.' : (e.resolved ? `${e.message} (Zwischenzeitlich nicht mehr aktiv; Meldung nachgeholt.)` : e.message), '']),
        'Normale Fehler werden alle 30 Minuten gebündelt, solange sie bestehen. Hinweise und Entwarnungen sowie Erinnerungen an harte Fehler werden täglich zusammengefasst.',
        'Details finden Sie in Ihrem NexoWatt EOS.'];
      await this.deliver(to, subject, body.join('\n'), batch);
    } catch (_error) { await this.status('Benachrichtigungsprüfung oder geschütztes Versandprotokoll nicht verfügbar.'); }
    finally { this.busy = false; }
  }
  /**
   * Ablauf und Zusammenhang: Übersetzt EMS-, Modul-, Geräte- und Ladepunkt-Diagnosen in Ereignisse mit stabilen IDs. Reguläre Ladepausen sollen keine Störung werden; bei einer ausgefallenen übergeordneten Quelle werden Folgeereignisse unterdrückt statt falsche Entwarnungen erzeugt.
   */
  async collect(categories) {
    const a = this.adapter, now = this.now(), events = [];
    const read = async id => { const s = await a.getStateAsync(id); return s?.val; };
    const add = (id, category, title, message, persistMs = 60000, severity = 'warning') => events.push({ id, category, title, message, persistMs, severity });
    const retain = prefix => { for (const [id, record] of this.policy.records) if (id.startsWith(prefix) && record.active) events.push({ ...record.meta, suppressed: true }); };
    const last = Number(await read('ems.core.lastTickStart'));
    const engineStalled = a.config?.ems?.enabled !== false && last > 0 && now - last > 120000;
    if (categories.has('system')) {
      // Ein gemeinsames Mesh-Ereignis vermeidet eine Mail pro ausgefallenem Haus.
      const meshEvent = a._meshCoordinator?.notificationEvent?.();
      if (meshEvent) add('mesh:control', 'system', meshEvent.title, meshEvent.message, meshEvent.severity === 'critical' ? 0 : 60000, meshEvent.severity);
      const archiveEvent = a._meshCoordinator?.energy?.notificationEvent?.();
      if (archiveEvent) add('mesh:archive', 'system', archiveEvent.title, archiveEvent.message, 60000, archiveEvent.severity);

      if (a.config?.ems?.enabled !== false && a._nwEmsInitError) add('ems:init', 'system', 'Energiemanagement konnte nicht starten', 'Die Regelung konnte nicht initialisiert werden. Bitte die EOS-Diagnose prüfen.', 0, 'critical');
      if (engineStalled) add('ems:stalled', 'system', 'Energieregelung antwortet nicht', 'Der Regelzyklus wurde seit über zwei Minuten nicht mehr ausgeführt.', 0, 'critical');
      const diag = a.emsEngine?.mm?.lastTickDiag;
      if (a.config?.ems?.enabled !== false && diag && now - diag.ts < 120000) {
        for (const m of (diag.results || [])) if (m.enabled === true && m.ok === false && MODULES.has(m.key)) {
          add(`module:${m.key}`, 'system', `EOS-Modul ausgefallen: ${m.key}`, 'Das aktive Regelungsmodul meldet einen Fehler oder antwortet nicht. Bitte die EOS-Diagnose prüfen.', 0, 'critical');
        }
      }
      const error = await a.getStateAsync('ems.core.lastTickError');
      if (error?.val && now - Number(error.ts) < 120000 && !engineStalled) add('ems:error', 'system', 'Fehler im Energiemanagement', 'Der laufende Regelzyklus meldet einen Fehler. Bitte die EOS-Diagnose prüfen.', 0, 'critical');
    }
    const downInstances = new Set();
    if (categories.has('system') || categories.has('communications')) {
      await a._notifyRefreshWatchedInstances(false);
      for (const inst of (a._notify.watchedInstances?.instances || []).slice(0, 128)) {
        const instance = await a.getForeignObjectAsync(`system.adapter.${inst}`);
        if (!instance || instance.common?.enabled === false) continue;
        const alive = await a.getForeignStateAsync(`system.adapter.${inst}.alive`);
        const conn = await a.getForeignStateAsync(`${inst}.info.connection`);
        if (alive?.val === false || conn?.val === false) {
          downInstances.add(inst);
          const category = alive?.val === false && categories.has('system') ? 'system' : 'communications';
          if (categories.has(category)) add(`adapter:${inst}`, category, `Verbindung ausgefallen: ${inst}`, 'Eine für die Anlage verwendete Datenquelle ist ausgefallen oder meldet einen Verbindungsverlust.', 0, alive?.val === false ? 'critical' : 'warning');
        }
      }
    }
    const sourceDown = id => {
      let source = String(id || '');
      const aliases = a._notify.watchedInstances?.aliasTargets || {};
      for (let n = 0; n < 16 && aliases[source]; n++) source = aliases[source];
      return Array.from(downInstances).some(inst => source.startsWith(inst + '.'));
    };
    if (categories.has('inverters')) {
      await a._notifyRefreshNwDevicesCache(false);
      for (const d of (a._notify.nwDevices?.pvInverters || []).slice(0, 128)) {
        if (!d.dp?.connected) continue;
        if (sourceDown(d.dp.connected)) { retain(`inverter:${d.id}`); continue; }
        const state = await a.getForeignStateAsync(d.dp.connected);
        if (!state) { retain(`inverter:${d.id}`); continue; }
        // Connection flags can legitimately be event-driven; an old true is not an outage.
        if (state?.val === false || state?.val === 0) add(`inverter:${d.id}`, 'inverters', `Wechselrichter nicht erreichbar: ${d.name}`, 'Der Geräteadapter meldet eine unterbrochene Verbindung.', 300000);
      }
    }
    if (categories.has('communications') && !engineStalled) {
      const dp = a.emsEngine?.dp;
      const entry = dp?.entries?.get('grid.powerW');
      if (entry?.objectId && !sourceDown(entry.objectId) && dp.getAgeMs('grid.powerW') > 300000) {
        add('grid:meter', 'communications', 'Netzmessung liefert keine aktuellen Werte', 'Die für die Regelung verwendete Netzmessung ist seit über fünf Minuten nicht aktuell.', 0, 'critical');
      }
    }
    if (engineStalled) { retain('lp:'); retain('module:'); retain('grid:meter'); retain('storage:'); }
    if (!engineStalled && (categories.has('system') || categories.has('communications'))) {
      const state = await a.getStateAsync('storageFarm.storagesStatusJson');
      if (state && now - Number(state.ts) < 120000) {
        let rows = [];
        try { rows = JSON.parse(String(state.val || '[]')); } catch (_error) { retain('storage:'); }
        for (const row of (Array.isArray(rows) ? rows : []).slice(0, 128)) {
          const id = `storage:${safeId(row.dispatchKey || row.name)}`;
          if (sourceDown(row.signedPowerId || row.chargePowerId || row.socId)) { retain(id); continue; }
          if (categories.has('system') && row.dispatchBlockedReasons?.includes('fault_active')) {
            add(id, 'system', `Speicher meldet eine Störung: ${row.name}`, 'Der konfigurierte Speicher meldet einen aktiven Gerätefehler.', 0, 'critical');
          } else if (categories.has('communications') && (row.state === 'offline' || row.degradedReason === 'stale')) {
            add(id, 'communications', `Speicher nicht erreichbar: ${row.name}`, 'Der konfigurierte Speicher meldet einen Verbindungsverlust oder veraltete Betriebsdaten.');
          }
        }
      } else retain('storage:');
    }
    const cm = a.config?.chargingManagement;
    if (!engineStalled && cm?.enabled !== false && (categories.has('charging') || categories.has('communications'))) {
      for (const w of (cm?.wallboxes || []).slice(0, 128)) {
        if (w.enabled === false || !w.key) continue;
        const base = `chargingManagement.wallboxes.${safeId(w.key)}`;
        const fields = ['online', 'faultActive', 'faultReason', 'userEnabled', 'userStationEnabled', 'vehiclePlugged', 'vehicleDemandConfirmed', 'targetPowerW', 'actualPowerW', 'meterStale', 'statusClass', 'reason', 'hardwareCommandState', 'applyStatus'];
        const values = await Promise.all(fields.map(f => read(`${base}.${f}`)));
        const s = Object.fromEntries(fields.map((f, i) => [f, values[i]]));
        const label = String(w.name || w.key);
        if ([w.onlineId, w.powerId, w.statusId].some(sourceDown) || s.online == null) { retain(`lp:${w.key}:`); continue; }
        if (categories.has('communications') && s.online === false) {
          add(`lp:${w.key}:offline`, 'communications', `Ladepunkt nicht erreichbar: ${label}`, 'Die Verbindung zur Ladestation ist unterbrochen.'); retain(`lp:${w.key}:fault`); retain(`lp:${w.key}:interrupted`); continue;
        }
        if (categories.has('charging') && s.online === true && s.faultActive === true) {
          add(`lp:${w.key}:fault`, 'charging', `Ladestation meldet eine Störung: ${label}`, 'Die Station meldet einen bestätigten Fehler. Bitte den Ladepunkt prüfen.', 0, 'critical'); retain(`lp:${w.key}:interrupted`); retain(`lp:${w.key}:write`); continue;
        }
        if (categories.has('communications') && s.online === true && s.meterStale === true && (s.vehiclePlugged === true || Number(s.targetPowerW) > 0)) {
          add(`lp:${w.key}:stale`, 'communications', `Ladedaten fehlen: ${label}`, 'Die Station ist erreichbar, liefert aber keine ausreichend aktuellen Leistungsdaten.', 180000); retain(`lp:${w.key}:interrupted`); continue;
        }
        if (categories.has('charging') && s.online === true && s.applyStatus === 'ocpp-zero-held-not-stopped') {
          add(`lp:${w.key}:stop`, 'charging', `Ladestopp nicht bestätigt: ${label}`, 'Die Station bestätigt den geforderten Ladestopp nicht. Bitte den Ladepunkt unmittelbar prüfen.', 0, 'critical'); continue;
        }
        if (!categories.has('charging') || s.userEnabled === false || s.userStationEnabled === false || s.online !== true) continue;
        if (/failed|error|rejected|timeout/i.test(String(s.hardwareCommandState || ''))
          || /write_failed|executor_error|ocpp-command-not-confirmed|no_dp_registry/.test(String(s.applyStatus || ''))) {
          add(`lp:${w.key}:write`, 'charging', `Ladebefehl fehlgeschlagen: ${label}`, 'Die Station hat einen Ladebefehl nicht erfolgreich bestätigt.', 120000); continue;
        }
        const normalPause = /finish|complete|suspend|available|disconnected|idle/i.test(String(s.statusClass || ''))
          || /phase.*switch|cooldown|no.demand|no.vehicle|user|rfid|budget|peak|safety|pv.*wait|pause/i.test(String(s.reason || ''));
        if (s.vehiclePlugged === true && s.vehicleDemandConfirmed === true && Number(s.targetPowerW) >= 1000
          && Number.isFinite(s.actualPowerW) && s.actualPowerW < 100 && s.meterStale === false && !normalPause) {
          add(`lp:${w.key}:interrupted`, 'charging', `Ladung bleibt aus: ${label}`, 'Trotz freigegebener Ladeleistung und bestätigtem Ladebedarf fließt seit mindestens einer Minute kein Ladestrom. Möglicher Ladeabbruch oder fehlgeschlagener Ladestart.', 180000, 'warning');
        }
      }
    }
    if (categories.has('grid')) {
      const action = String(await read('gridConstraints.zeroExport.action') || '');
      if (/failsafe/i.test(action)) add('grid:failsafe', 'grid', 'Netzregelung im Sicherheitsbetrieb', 'Die Netzregelung meldet einen Kommunikations- oder Sicherheitszustand. Bitte die EOS-Diagnose prüfen.', 0, 'critical');
    }
    return events;
  }
  /**
   * Ablauf und Zusammenhang: Markiert den Dienst als beendet und schließt den SMTP-Transport beim Adapter-Unload. Spätere Versandversuche werden dadurch abgewehrt.
   */
  close() { this.closed = true; this.transport?.close(); this.transport = null; }
}
module.exports = { NotificationMail, normalizeConfig, validAddress, smtpError, FROM };
