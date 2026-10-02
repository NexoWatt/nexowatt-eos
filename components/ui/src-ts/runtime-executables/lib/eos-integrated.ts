// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Feste Grenzen des integrierten EOS-Inbetriebnahmeprofils.
 * Daten und Wirkung: Liest ausschließlich root-geschützte TLS-Dateien, verweigert
 * Geräteschreibbefehle und bildet kurzlebige zentrale Lizenzberechtigungen ab.
 * Bei Änderungen: TLS-Dateirechte, echte TLS-Sockets, Lease-Ablauf und Schreibsperren gemeinsam prüfen.
 * Sicherheit: Kein Konfigurationsschalter kann HTTP oder Gerätesteuerung aktivieren.
 * Verknüpfung: docs/security/EOS_UI_INTEGRATED_DE.md
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { X509Certificate, createPrivateKey, createPublicKey, timingSafeEqual, createHash, randomBytes, pbkdf2 } = require('node:crypto');
const { isIP } = require('node:net');
const { createLicenseGuard } = require('../packages/eos-license-client');
const CERTIFICATE_PATH = '/etc/nexowatt-eos/web/ui.crt';
const PRIVATE_KEY_PATH = '/etc/nexowatt-eos/web/ui.key';
const CONTROL_STATUS = 'Inbetriebnahme/Testprofil – Gerätesteuerung noch gesperrt';

/** Begrenzt Dateiinhalt und verweigert Links, fremde Eigentümer und Schreibrechte. */
function readProtectedFile(filename, isPrivate, boundary = '/') {
  const absolute = path.resolve(filename);
  if (filename !== absolute || !absolute.startsWith(path.resolve(boundary) + (boundary === '/' ? '' : '/'))) throw new Error('EOS_TLS_PATH');
  let cursor = path.dirname(absolute);
  for (;;) {
    const st = fs.lstatSync(cursor);
    if (!st.isDirectory() || st.uid !== 0 || (st.mode & 0o022)) throw new Error('EOS_TLS_DIRECTORY');
    if (cursor === boundary) break;
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error('EOS_TLS_BOUNDARY');
    cursor = parent;
  }
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.uid !== 0 || st.nlink !== 1 || st.size < 32 || st.size > 65536
      || (st.mode & 0o022) || (isPrivate && (st.mode & 0o007))) throw new Error('EOS_TLS_FILE');
    const data = fs.readFileSync(fd);
    if (data.length !== st.size) throw new Error('EOS_TLS_CHANGED');
    return data;
  } finally { fs.closeSync(fd); }
}

/** Validiert Schlüsselzuordnung und aktuelle Zertifikatsgültigkeit vor dem Listener. */
function validateTlsMaterial(cert, key) {
  const leaf = new X509Certificate(cert);
  const now = Date.now();
  if (Date.parse(leaf.validFrom) > now || Date.parse(leaf.validTo) <= now || leaf.ca) throw new Error('EOS_TLS_CERTIFICATE');
  const publicDer = leaf.publicKey.export({ type: 'spki', format: 'der' });
  const keyDer = createPublicKey(createPrivateKey(key)).export({ type: 'spki', format: 'der' });
  if (publicDer.length !== keyDer.length || !timingSafeEqual(publicDer, keyDer)) throw new Error('EOS_TLS_KEY_MISMATCH');
  return { cert, key, minVersion: 'TLSv1.3', maxVersion: 'TLSv1.3', honorCipherOrder: true, handshakeTimeout: 5000 };
}
function loadUiTlsOptions() {
  return validateTlsMaterial(readProtectedFile(CERTIFICATE_PATH, false), readProtectedFile(PRIVATE_KEY_PATH, true));
}
function listenerConfiguration(config = {}) {
  const bind = config.ip || config.bind || '0.0.0.0';
  const port = config.port === undefined ? 8188 : config.port;
  if (typeof bind !== 'string' || !isIP(bind) || !Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('EOS_LISTENER_CONFIG');
  if (config.eosLicenseAdminInstance !== undefined && config.eosLicenseAdminInstance !== 'eos-admin.0') throw new Error('EOS_LICENSE_TARGET');
  return { bind, port };
}
function blocked() { return Object.assign(new Error('EOS_TEST_CONTROL_BLOCKED'), { code: 'EOS_TEST_CONTROL_BLOCKED' }); }
/** Verpflichtender Passwortwechsel gehört zur Kontorevision, nie zu Browser-Rechten. */
function passwordChangeRequired(object, user) {
  if (user === 'admin') return false; // Service credential is root-provisioned; no installer setup grant.
  const native = object && object.native || {};
  const account = native.nexowattEosAccount || {};
  return native.nexowattPasswordChangeRequired === true || native.eosPasswordChangeRequired === true
    || native.nexowattFirstLoginPending === true || native.eosFirstLoginRequired === true || account.forcePasswordChange === true
    || !(account.passwordInitialized === true || Number(account.passwordSetupVersion || account.passwordInitializationVersion || 0) >= 1);
}
function accountRevision(user, object) {
  if (!object || object.type !== 'user' || object.common?.enabled !== true
    || typeof object.common.password !== 'string' || !object.common.password) return null;
  return createHash('sha256').update(JSON.stringify([user, object.common.password,
    passwordChangeRequired(object, user), object.native?.nexowattEosAccount || null])).digest('hex');
}
/** Begrenzt neue Passphrasen ohne vorgeschriebene Zeichenklassen. */
function validAccountPassword(value) {
  return typeof value === 'string' && Array.from(value).length >= 15
    && Array.from(value).length <= 128 && Buffer.byteLength(value, 'utf8') <= 256
    && !/[\u0000-\u001f\u007f]/u.test(value);
}
/**
 * Einziger Ausnahme-Writer für eigene Kontopasswörter im Previewprofil.
 * Der HTTP-Aufrufer liefert ausschließlich die bereits authentifizierte Identität.
 * Es werden nur Passwort/Einrichtungsmetadaten erweitert, niemals Rollen oder
 * enabled überschrieben. Zwei KDF-Aufträge und ein Auftrag pro Konto begrenzen Last.
 * Die Controller-Objekt-API bietet hier kein CAS: unmittelbar vor/nach Schreiben
 * wird erneut geprüft; konkurrierende administrative Resets sind zu koordinieren.
 */
let accountKdfPending = 0;
async function withAccountKdfBudget(operation) {
  if (accountKdfPending >= 2) throw new Error('EOS_PASSWORD_BUSY');
  accountKdfPending++;
  try { return await operation(); } finally { accountKdfPending--; }
}
function createAccountPasswordWriter(adapter) {
  const extend = adapter.extendForeignObjectAsync.bind(adapter);
  const activeUsers = new Set();
  let pending = 0;
  return async (user, expectedRevision, password, authorize) => {
    if (typeof user !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(user)
      || !/^[a-f0-9]{64}$/.test(expectedRevision || '') || !validAccountPassword(password)
      || typeof authorize !== 'function') throw new Error('EOS_PASSWORD_INPUT');
    if (pending >= 2 || activeUsers.has(user)) throw new Error('EOS_PASSWORD_BUSY');
    pending++; activeUsers.add(user);
    try {
      const id = 'system.user.' + user;
      if (accountRevision(user, await adapter.getForeignObjectAsync(id)) !== expectedRevision) throw new Error('EOS_ACCOUNT_CHANGED');
      const salt = randomBytes(16).toString('hex');
      const derived = await withAccountKdfBudget(() => new Promise((resolve, reject) => pbkdf2(password, salt, 600000, 256, 'sha256', (error, value) => error ? reject(error) : resolve(value))));
      const hash = 'pbkdf2$600000$' + derived.toString('hex') + '$' + salt;
      if (accountRevision(user, await adapter.getForeignObjectAsync(id)) !== expectedRevision || !await authorize()) throw new Error('EOS_ACCOUNT_CHANGED');
      await extend(id, { common: { password: hash }, native: {
        nexowattPasswordChangeRequired: false, eosPasswordChangeRequired: false,
        nexowattFirstLoginPending: false, eosFirstLoginRequired: false,
        nexowattEosAccount: { passwordInitialized: true, passwordSetupVersion: 1, passwordInitializationVersion: 1,
          passwordlessFirstLoginAllowed: false, forcePasswordChange: false },
      } });
      const current = await adapter.getForeignObjectAsync(id);
      if (current?.common?.enabled !== true || current.common.password !== hash || passwordChangeRequired(current, user)) throw new Error('EOS_ACCOUNT_CHANGED');
    } finally { pending--; activeUsers.delete(user); }
  };
}

/**
 * Sicherheitsgrenze für diesen Teststand, kein Sandbox-Versprechen gegen fremden JS-Code.
 * Verweigert sämtliche fremden State-/Objektänderungen und aktive Adapterkommandos.
 * Eigene States und zentraler Lizenz-Messageboxverkehr bleiben möglich.
 */
function installPreviewWriteBoundary(adapter) {
  Object.defineProperty(adapter, '_nwChangeOwnAccountPassword', { value: createAccountPasswordWriter(adapter), writable: false, configurable: false });
  const denyAsync = async () => { throw blocked(); };
  const denyCallback = (...args) => {
    const callback = args.at(-1);
    if (typeof callback === 'function') { queueMicrotask(() => callback(blocked())); return; }
    throw blocked();
  };
  // js-controller initializes own defaults through its foreign-state API. Permit
  // only acknowledged own observations on that path; never command writes. Capture
  // namespace and implementations before installing the immutable wrappers.
  const ownPrefix = adapter.namespace === 'nexowatt-ui.0' ? adapter.namespace + '.' : null;
  const ownObservation = (id, state) => !!ownPrefix && typeof id === 'string'
    && id.startsWith(ownPrefix) && id.length > ownPrefix.length
    && state !== null && typeof state === 'object' && !Array.isArray(state)
    && state.ack === true;
  for (const stem of ['setForeignState', 'setForeignStateChanged', 'setForeignObject', 'setForeignObjectNotExists', 'extendForeignObject', 'delForeignState', 'delForeignObject']) {
    const ownState = stem === 'setForeignState' || stem === 'setForeignStateChanged';
    const original = typeof adapter[stem] === 'function' ? adapter[stem].bind(adapter) : null;
    const originalAsync = typeof adapter[stem + 'Async'] === 'function' ? adapter[stem + 'Async'].bind(adapter) : null;
    Object.defineProperty(adapter, stem, { writable: false, configurable: false, value(...args) {
      if (ownState && original && ownObservation(args[0], args[1])) return original(...args);
      return denyCallback(...args);
    } });
    Object.defineProperty(adapter, stem + 'Async', { writable: false, configurable: false, async value(...args) {
      if (ownState && originalAsync && ownObservation(args[0], args[1])) return await originalAsync(...args);
      return await denyAsync();
    } });
  }
  const originalSend = adapter.sendTo.bind(adapter);
  Object.defineProperty(adapter, 'sendTo', { writable: false, configurable: false, value(target, command, message, callback) {
    if (target !== 'eos-admin.0' || command !== 'eos.license.check') return denyCallback(callback);
    return originalSend(target, command, message, callback);
  } });
  Object.defineProperty(adapter, 'sendToAsync', { writable: false, configurable: false, async value(target, command, message) {
    if (target !== 'eos-admin.0' || command !== 'eos.license.check') throw blocked();
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('EOS_LICENSE_TIMEOUT')), 2000);
      try { originalSend(target, command, message, response => { clearTimeout(timer); resolve(response); }); }
      catch (error) { clearTimeout(timer); reject(error); }
    });
  } });
  Object.defineProperty(adapter, 'sendToHost', { value: denyCallback, writable: false, configurable: false });
  Object.defineProperty(adapter, 'sendToHostAsync', { value: denyAsync, writable: false, configurable: false });
  adapter._nwIntegratedPreview = true;
}

/** Kurzlebige Freigabe ohne Token/UUID/Schlüsselkopie; keine Offline-Freigabe. */
function makeLicenseClient(adapter) {
  return createLicenseGuard(adapter, { adminInstance: 'eos-admin.0', feature: 'energy', onLost() {
    adapter._nwLicenseOk = false;
    adapter._nwLicenseInfo = { ok: false, type: 'central', edition: 'none', msg: 'Zentrale Lizenzfreigabe nicht verfügbar.' };
    adapter._nwSseGuard?.closeAll('license-unavailable');
    // Der Teststand startet keine Geräte-Regelung und sendet hier keine Sollwerte.
  } });
}
module.exports = { CERTIFICATE_PATH, PRIVATE_KEY_PATH, CONTROL_STATUS, readProtectedFile,
  validateTlsMaterial, loadUiTlsOptions, listenerConfiguration, installPreviewWriteBoundary, makeLicenseClient,
  passwordChangeRequired, accountRevision, validAccountPassword, createAccountPasswordWriter, withAccountKdfBudget };
