// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Liest den nicht geheimen Status des getrennten Betriebssystem-Updaters für angemeldete EOS-Benutzer.
 * Daten und Wirkung: Öffnet nur eine feste root-geschützte JSON-Datei, begrenzt die Lesemenge und gibt ausschließlich geprüfte Statusfelder zurück; führt keine Kommandos aus.
 * Bei Änderungen: Vertrag, Vertrauenspfad, Uhrzeitfehler, Fehlzustände und Authentifizierung der HTTP-Route gemeinsam prüfen.
 * Verknüpfung: docs/security/EOS_OS_UPDATE_STATUS_DE.md
 */
'use strict';
const fs = require('node:fs');
const STATUS_PATH = '/var/lib/nexowatt-eos-os-updates/status.json';
const ANCESTORS = ['/', '/var', '/var/lib', '/var/lib/nexowatt-eos-os-updates'];
const MAX_BYTES = 65536;
const MAX_AGE_SECONDS = 129600;
const FUTURE_TOLERANCE_MS = 300000;
const ERROR_CODES = new Set(['configuration-invalid', 'prerequisite-missing', 'unsupported-host', 'apt-refresh-failed',
  'upgrade-failed', 'upgrade-interrupted', 'upgrade-timeout', 'pending-scan-failed', 'inventory-failed', 'status-write-failed', 'internal-error']);
const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
const count = value => value === null || (Number.isSafeInteger(value) && value >= 0 && value <= 1000000);
const triState = value => ['required', 'not-required', 'unknown'].includes(value);
const nullableBoolean = value => value === null || typeof value === 'boolean';
function timestamp(value, nullable = false) {
  if (nullable && value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}
const unavailable = availability => ({ schemaVersion: 1, availability, health: 'warning', summary: null });

/**
 * Prüft die benötigten v1-Felder typstreng; Paketlisten, Pfade, Fehlermeldungen
 * und frei formulierte Herstellerdaten verlassen diese Vertrauensgrenze nicht.
 * Frische wird gegen die lokale Serverzeit berechnet, niemals vom Browser behauptet.
 */
function sanitizeStatus(data, now = Date.now()) {
  if (!record(data) || data.schemaVersion !== 1 || !timestamp(data.generatedAt, data.state === 'never-run')
    || !['running', 'ok', 'attention', 'error', 'never-run', 'disabled'].includes(data.state)
    || !timestamp(data.lastAttemptAt, true) || !timestamp(data.lastSuccessAt, true)
    || !(data.lastError === null || (record(data.lastError) && ERROR_CODES.has(data.lastError.code)))
    || !record(data.freshness) || data.freshness.maxAgeSeconds !== MAX_AGE_SECONDS
    || !record(data.policy) || typeof data.policy.automatic !== 'boolean' || data.policy.rebootAutomatic !== false
    || ![null, '12', '13'].includes(data.policy.debianMajor) || typeof data.policy.serviceRestartsPossible !== 'boolean'
    || !record(data.timers) || !nullableBoolean(data.timers.enabled) || !nullableBoolean(data.timers.active) || !timestamp(data.timers.checkedAt, true)
    || !record(data.pending) || !count(data.pending.securityCount) || !count(data.pending.heldSecurityCount) || !count(data.pending.blockedSecurityCount)
    || !record(data.activation) || !triState(data.activation.state) || !count(data.activation.serviceRestartCount) || !count(data.activation.sessionRestartCount)
    || !record(data.reboot) || !triState(data.reboot.state)
    || !record(data.coverage) || !['complete-for-configured-origins', 'gap', 'unknown'].includes(data.coverage.state)
    || !Array.isArray(data.coverage.gaps) || data.coverage.gaps.length > 100
    || !data.coverage.gaps.every(value => typeof value === 'string' && value.length <= 256)) return unavailable('invalid');
  const times = [data.generatedAt, data.lastAttemptAt, data.lastSuccessAt, data.timers.checkedAt].filter(value => value !== null).map(Date.parse);
  if (times.some(time => time > now + FUTURE_TOLERANCE_MS)) return unavailable('future');
  if (Date.parse(data.lastSuccessAt) > Date.parse(data.lastAttemptAt)
    || Date.parse(data.lastAttemptAt) > Date.parse(data.generatedAt) + FUTURE_TOLERANCE_MS
    || Date.parse(data.timers.checkedAt) > Date.parse(data.generatedAt) + FUTURE_TOLERANCE_MS) return unavailable('invalid');
  const stale = data.state !== 'never-run' && (now - Date.parse(data.generatedAt) > MAX_AGE_SECONDS * 1000
    || data.timers.checkedAt === null || now - Date.parse(data.timers.checkedAt) > MAX_AGE_SECONDS * 1000);
  const healthy = !stale && data.state === 'ok' && data.lastError === null
    && data.lastAttemptAt !== null && data.lastSuccessAt !== null
    && now - Date.parse(data.lastSuccessAt) <= MAX_AGE_SECONDS * 1000
    && ['12', '13'].includes(data.policy.debianMajor) && data.policy.automatic && data.timers.enabled === true && data.timers.active === true
    && data.pending.securityCount === 0 && data.pending.heldSecurityCount === 0 && data.pending.blockedSecurityCount === 0
    && data.activation.state === 'not-required' && data.activation.serviceRestartCount === 0 && data.activation.sessionRestartCount === 0
    && data.reboot.state === 'not-required'
    && data.coverage.state === 'complete-for-configured-origins' && data.coverage.gaps.length === 0;
  return {
    schemaVersion: 1, availability: stale ? 'stale' : 'available', health: healthy ? 'ok' : 'warning',
    summary: {
      generatedAt: data.generatedAt, state: data.state, lastAttemptAt: data.lastAttemptAt, lastSuccessAt: data.lastSuccessAt,
      errorCode: data.lastError?.code || null,
      policy: { automatic: data.policy.automatic, rebootAutomatic: false, debianMajor: data.policy.debianMajor, serviceRestartsPossible: data.policy.serviceRestartsPossible },
      timers: { enabled: data.timers.enabled, active: data.timers.active, checkedAt: data.timers.checkedAt },
      pending: { securityCount: data.pending.securityCount, heldSecurityCount: data.pending.heldSecurityCount, blockedSecurityCount: data.pending.blockedSecurityCount },
      activation: { state: data.activation.state, serviceRestartCount: data.activation.serviceRestartCount, sessionRestartCount: data.activation.sessionRestartCount },
      reboot: { state: data.reboot.state }, coverage: { state: data.coverage.state, gapCount: data.coverage.gaps.length },
    },
  };
}

/**
 * Nur root kann den Pfad samt Vorfahren verändern. O_NOFOLLOW verweigert Links;
 * O_NONBLOCK verhindert Hängen an manipulierten FIFOs vor der Dateitypprüfung.
 * Ein fester Puffer begrenzt auch bei einer während des Lesens wachsenden Datei.
 * Der Updater muss atomar ersetzen; unvollständige/gleichzeitig geänderte Daten
 * werden als ungültig angezeigt. Kein Schreibzugriff und keine Shell.
 */
async function readStatusFile() {
  for (const directory of ANCESTORS) {
    const info = await fs.promises.lstat(directory);
    if (!info.isDirectory() || info.uid !== 0 || (info.mode & 0o022)) throw new Error('untrusted-directory');
  }
  const handle = await fs.promises.open(STATUS_PATH, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.uid !== 0 || before.nlink !== 1 || (before.mode & 0o022)
      || before.size < 2 || before.size > MAX_BYTES) throw new Error('untrusted-file');
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    const after = await handle.stat();
    if (length !== before.size || length > MAX_BYTES || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) throw new Error('changed-file');
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length)));
  } finally { await handle.close(); }
}

// Ein geteilter Lesevorgang plus kurzer Cache begrenzen I/O bei vielen Sitzungen.
// Authentifizierung bleibt je HTTP-Anfrage vorgeschaltet; Frische wird erneut geprüft.
let cached = null;
let cachedAt = 0;
let inFlight = null;
async function getOsUpdateStatus() {
  if (!inFlight && (!cached || Date.now() - cachedAt >= 5000 || Date.now() < cachedAt)) {
    inFlight = readStatusFile().then(data => { cached = { data }; }, () => { cached = { unavailable: true }; })
      .finally(() => { cachedAt = Date.now(); inFlight = null; });
  }
  if (inFlight) await inFlight;
  return cached?.unavailable ? unavailable('unavailable') : sanitizeStatus(cached?.data);
}
module.exports = { getOsUpdateStatus, sanitizeStatus, readStatusFile };
