/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt typisierte Normalisierungs- und Hilfsschritte, die der Adapter-Kern über erzeugte JavaScript-Spiegel verwendet.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/backend/main-runtime/main-runtime-helpers.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */

/**
 * Datei: src-ts/backend/main-runtime/main-runtime-helpers.ts
 *
 * Zweck:
 * Erste echte TypeScript-Auslagerung kleiner, risikoarmer main.js-Helfer.
 *
 * Zusammenhang:
 * main.js bleibt aktuell weiterhin der produktive Adapter-Einstiegspunkt. Diese Datei
 * enthält bewusst nur kleine, isolierte Regeln, die später komplett aus main.js
 * herausgezogen werden können: Lizenz-Platzhalter, info.connection-Schreibplan und
 * einfache API-/Settings-Wertnormalisierung.
 *
 * Wichtig:
 * Diese Helfer dürfen keine EMS-Regelungslogik enthalten. Sie sollen den Einstieg in
 * die produktive TypeScript-Nutzung absichern, ohne Energiefluss, Heizstab, History
 * oder KI fachlich zu verändern.
 */

export interface InfoConnectionStateUpdate {
  readonly id: 'info.connection';
  readonly value: boolean;
  readonly ack: true;
  readonly ts: number;
  readonly reason: string;
}

export type NormalizedApiPrimitive = string | number | boolean | null;

export interface NormalizedApiSetValue {
  readonly value: NormalizedApiPrimitive;
  readonly valueType: 'string' | 'number' | 'boolean' | 'null';
  readonly wasStringBoolean: boolean;
}

/**
 * Code-Teil: normalizeLicenseKeyInput
 *
 * Zweck:
 * Wandelt beliebige Eingaben aus Admin/UI/API in einen getrimmten String um.
 *
 * Zusammenhang:
 * main.js nutzt diese Normalisierung beim Lesen und Speichern des Lizenzschlüssels.
 * Dadurch wird später vermieden, dass mehrere Stellen unterschiedliche Whitespace- oder
 * Null-Regeln verwenden.
 */
export function normalizeLicenseKeyInput(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input).trim();
}

/**
 * Code-Teil: normalizeLicenseKeyForComparison
 *
 * Zweck:
 * Erzeugt die technische Vergleichsform eines Lizenzschlüssels.
 *
 * Zusammenhang:
 * Die alte JavaScript-Logik in main.js nutzt dieselbe Regel: nur A-Z/0-9 bleiben
 * erhalten und alles wird großgeschrieben. So bleiben bestehende Lizenzprüfungen
 * kompatibel.
 */
export function normalizeLicenseKeyForComparison(input: unknown): string {
  return normalizeLicenseKeyInput(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Code-Teil: isMaskedLicenseKeyInput
 *
 * Zweck:
 * Erkennt maskierte Lizenz-Platzhalter aus ioBroker/Admin.
 *
 * Zusammenhang:
 * Bei protected/encrypted Feldern kann der Admin Platzhalter wie "********" oder
 * "protected" liefern. Diese Werte dürfen niemals als echter Lizenzschlüssel
 * gespeichert werden und dürfen auch keine vorhandene Lizenz überschreiben.
 *
 * Wichtig:
 * Echte NexoWatt-Schlüssel mit NW1/NW1T-Präfix werden ausdrücklich nicht als Maske
 * behandelt, selbst wenn sie Sonderzeichen/Leerzeichen in der Eingabe hatten.
 */
export function isMaskedLicenseKeyInput(input: unknown): boolean {
  const raw = normalizeLicenseKeyInput(input);
  if (!raw) return false;
  const normalized = normalizeLicenseKeyForComparison(raw);
  if (/^NW1(T)?[0-9A-Z]+$/.test(normalized)) return false;
  if (/^[*•·xX_\-.\s]+$/.test(raw) && raw.replace(/\s+/g, '').length >= 3) return true;
  if (/^(hidden|protected|encrypted|password|secret|redacted|undefined|null)$/i.test(raw)) return true;
  if (/^\*{3,}/.test(raw) || /\*{3,}$/.test(raw)) return true;
  if (/^\$\/?[a-z0-9_-]*:/i.test(raw)) return true;
  const compactRaw = raw.replace(/\s+/g, '').toLowerCase();
  if (compactRaw.startsWith('{"encrypted":')) return true;
  return false;
}

/**
 * Code-Teil: normalizeLicenseKeyForStorage
 *
 * Zweck:
 * Bereitet eine Lizenz-Eingabe zum Speichern vor.
 *
 * Zusammenhang:
 * main.js kann diesen Helfer verwenden, bevor native.licenseKey oder config.licenseKey
 * überschrieben wird. Maskierte Werte liefern bewusst einen leeren String zurück.
 */
export function normalizeLicenseKeyForStorage(input: unknown): string {
  const raw = normalizeLicenseKeyInput(input);
  if (!raw) return '';
  if (isMaskedLicenseKeyInput(raw)) return '';
  return raw;
}

/**
 * Code-Teil: buildInfoConnectionStateUpdate
 *
 * Zweck:
 * Erstellt einen typisierten Schreibplan für info.connection.
 *
 * Zusammenhang:
 * main.js setzt info.connection beim Webserverstart, Heartbeat, Serverfehler und
 * Unload. Dieser Helfer kapselt den reinen Datenvertrag, damit später die verstreute
 * Connection-Logik in ein eigenes TS-Modul ausgelagert werden kann.
 */
export function buildInfoConnectionStateUpdate(online: unknown, reason: unknown = '', ts: number = Date.now()): InfoConnectionStateUpdate {
  return {
    id: 'info.connection',
    value: online === true,
    ack: true,
    ts: Number.isFinite(Number(ts)) ? Number(ts) : Date.now(),
    reason: normalizeLicenseKeyInput(reason),
  };
}

/**
 * Code-Teil: normalizeApiSetPrimitive
 *
 * Zweck:
 * Normalisiert einfache Werte aus /api/set, ohne 0 oder false zu verlieren.
 *
 * Zusammenhang:
 * main.js verarbeitet viele Kundeneinstellungen über /api/set. Dieser Helfer ist der
 * erste kleine Baustein, damit false/0/leere Werte später nicht durch Truthy-/Falsy-
 * Logik verfälscht werden.
 */
export function normalizeApiSetPrimitive(input: unknown): NormalizedApiSetValue {
  if (input === null || input === undefined) return { value: null, valueType: 'null', wasStringBoolean: false };
  if (typeof input === 'boolean') return { value: input, valueType: 'boolean', wasStringBoolean: false };
  if (typeof input === 'number') return { value: Number.isFinite(input) ? input : null, valueType: Number.isFinite(input) ? 'number' : 'null', wasStringBoolean: false };
  const raw = String(input).trim();
  const low = raw.toLowerCase();
  if (['true', '1', 'on', 'yes', 'ja', 'an'].includes(low)) return { value: true, valueType: 'boolean', wasStringBoolean: true };
  if (['false', '0', 'off', 'no', 'nein', 'aus'].includes(low)) return { value: false, valueType: 'boolean', wasStringBoolean: true };
  const n = Number(raw.replace(',', '.'));
  if (raw !== '' && Number.isFinite(n) && /^-?\d+(?:[\.,]\d+)?$/.test(raw)) return { value: n, valueType: 'number', wasStringBoolean: false };
  return { value: raw, valueType: 'string', wasStringBoolean: false };
}


export type ApiStateShadowValueType = 'null' | 'undefined' | 'boolean' | 'number' | 'string' | 'object' | 'array';

export interface ApiStateShadowEntry {
  readonly key: string;
  readonly hasValue: boolean;
  readonly valueType: ApiStateShadowValueType;
  readonly isZero: boolean;
  readonly isFalse: boolean;
  readonly ts: number | null;
  readonly lc: number | null;
  readonly ack: boolean | null;
  readonly rawShape: 'state-object' | 'plain-value' | 'missing';
}

export interface ApiStateShadowSnapshot {
  readonly ok: boolean;
  readonly generatedAt: number;
  readonly keyCount: number;
  readonly entriesChecked: number;
  readonly zeroValueKeys: readonly string[];
  readonly falseValueKeys: readonly string[];
  readonly missingValueKeys: readonly string[];
  readonly invalidEntryKeys: readonly string[];
  readonly sampleKeys: readonly string[];
  readonly warnings: readonly string[];
}

export interface ApiSetShadowInput {
  readonly scope: unknown;
  readonly key: unknown;
  readonly value: unknown;
}

export interface ApiSetShadowPlan {
  readonly ok: boolean;
  readonly generatedAt: number;
  readonly scope: string;
  readonly key: string;
  readonly normalized: NormalizedApiSetValue;
  readonly targetStateId: string;
  readonly blocked: boolean;
  readonly reason: string;
  readonly writeKind: 'settings-local' | 'installer-config' | 'rfid' | 'ems' | 'generic';
}

/**
 * Code-Teil: apiStateValueType
 *
 * Zweck:
 * Ermittelt den stabilen Typ eines Wertes aus dem `/api/state`-Cache.
 *
 * Zusammenhang:
 * `/api/state` ist die zentrale Datenquelle für LIVE, History, Settings und viele
 * Unterseiten. Beim späteren TypeScript-Umbau darf `0`, `false` und `null` nicht
 * durch einfache Truthy-/Falsy-Logik verfälscht werden. Dieser Helfer bildet die
 * Basis für den Shadow-Vergleich, ohne die produktive API-Antwort zu verändern.
 */
export function apiStateValueType(value: unknown): ApiStateShadowValueType {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'boolean' || t === 'number' || t === 'string' || t === 'object') return t as ApiStateShadowValueType;
  return 'object';
}

/**
 * Code-Teil: normalizeApiStateShadowEntry
 *
 * Zweck:
 * Normalisiert einen einzelnen Eintrag aus dem `stateCache` für die TS-Shadow-Diagnose.
 *
 * Zusammenhang:
 * Die produktive `/api/state`-Route gibt aktuell weiterhin das originale `stateCache`
 * Objekt zurück. Diese Funktion baut nur eine typisierte Kontrollsicht daneben. So
 * können wir später sicher prüfen, ob der TS-Helfer dieselbe Semantik einhält.
 *
 * Wichtig:
 * - `0` ist ein gültiger Wert.
 * - `false` ist ein gültiger Wert.
 * - Ein State-Objekt kann `value` oder legacy-artig `val` enthalten.
 */
export function normalizeApiStateShadowEntry(key: string, raw: unknown): ApiStateShadowEntry {
  const k = normalizeLicenseKeyInput(key);
  if (raw === null || raw === undefined) {
    return { key: k, hasValue: false, valueType: 'undefined', isZero: false, isFalse: false, ts: null, lc: null, ack: null, rawShape: 'missing' };
  }
  const obj = (typeof raw === 'object' && !Array.isArray(raw)) ? raw as Record<string, unknown> : null;
  const hasValue = obj ? (Object.prototype.hasOwnProperty.call(obj, 'value') || Object.prototype.hasOwnProperty.call(obj, 'val')) : true;
  const value = obj ? (Object.prototype.hasOwnProperty.call(obj, 'value') ? obj.value : obj.val) : raw;
  const tsRaw = obj ? Number(obj.ts) : NaN;
  const lcRaw = obj ? Number(obj.lc) : NaN;
  const ackRaw = obj ? obj.ack : null;
  return {
    key: k,
    hasValue,
    valueType: apiStateValueType(value),
    isZero: value === 0,
    isFalse: value === false,
    ts: Number.isFinite(tsRaw) ? tsRaw : null,
    lc: Number.isFinite(lcRaw) ? lcRaw : null,
    ack: typeof ackRaw === 'boolean' ? ackRaw : null,
    rawShape: obj ? 'state-object' : 'plain-value',
  };
}

/**
 * Code-Teil: buildApiStateShadowSnapshot
 *
 * Zweck:
 * Baut eine kompakte Diagnose-Zusammenfassung für `/api/state`, ohne die API-Antwort
 * zu verändern.
 *
 * Zusammenhang:
 * 0.7.99 bereitet die spätere Migration von `/api/state` vor. Die JavaScript-Route
 * bleibt produktiv; dieser Snapshot zeigt nur, ob der TS-Helfer die kritischen Werte
 * korrekt erkennt. Besonders wichtig sind `0 W` und `false`, weil diese Werte früher
 * mehrfach versehentlich als fehlend interpretiert wurden.
 */
export function buildApiStateShadowSnapshot(stateCache: unknown, sampleLimit = 20): ApiStateShadowSnapshot {
  const cache = (stateCache && typeof stateCache === 'object') ? stateCache as Record<string, unknown> : {};
  const keys = Object.keys(cache).sort();
  const zeroValueKeys: string[] = [];
  const falseValueKeys: string[] = [];
  const missingValueKeys: string[] = [];
  const invalidEntryKeys: string[] = [];
  const warnings: string[] = [];

  for (const key of keys) {
    const entry = normalizeApiStateShadowEntry(key, cache[key]);
    if (entry.isZero) zeroValueKeys.push(key);
    if (entry.isFalse) falseValueKeys.push(key);
    if (!entry.hasValue) missingValueKeys.push(key);
    if (!entry.key) invalidEntryKeys.push(key);
    if (entry.valueType === 'undefined') invalidEntryKeys.push(key);
  }

  if (invalidEntryKeys.length) warnings.push(`${invalidEntryKeys.length} Einträge ohne klaren Wert erkannt.`);
  if (missingValueKeys.length) warnings.push(`${missingValueKeys.length} Einträge ohne value/val-Feld erkannt.`);

  return {
    ok: invalidEntryKeys.length === 0,
    generatedAt: Date.now(),
    keyCount: keys.length,
    entriesChecked: keys.length,
    zeroValueKeys: zeroValueKeys.slice(0, sampleLimit),
    falseValueKeys: falseValueKeys.slice(0, sampleLimit),
    missingValueKeys: missingValueKeys.slice(0, sampleLimit),
    invalidEntryKeys: invalidEntryKeys.slice(0, sampleLimit),
    sampleKeys: keys.slice(0, Math.max(0, sampleLimit)),
    warnings,
  };
}

/**
 * Code-Teil: buildApiSetShadowPlan
 *
 * Zweck:
 * Erstellt einen typisierten Shadow-Schreibplan für `/api/set`.
 *
 * Zusammenhang:
 * Die produktive `/api/set`-Route bleibt in JavaScript. Dieser Helfer läuft nur
 * parallel und dokumentiert, wie TypeScript denselben Schreibwunsch später bewerten
 * würde. Dadurch können wir sehen, ob `false`, `0`, Zahlen und Strings gleich
 * behandelt werden, bevor wir die Route produktiv umstellen.
 */
export function buildApiSetShadowPlan(scopeInput: unknown | ApiSetShadowInput, keyInput?: unknown, valueInput?: unknown): ApiSetShadowPlan {
  const maybeInput = (scopeInput && typeof scopeInput === 'object' && !Array.isArray(scopeInput)) ? scopeInput as Partial<ApiSetShadowInput> : null;
  const scopeRaw = maybeInput && keyInput === undefined ? maybeInput.scope : scopeInput;
  const keyRaw = maybeInput && keyInput === undefined ? maybeInput.key : keyInput;
  const valueRaw = maybeInput && keyInput === undefined ? maybeInput.value : valueInput;
  const scope = normalizeLicenseKeyInput(scopeRaw);
  const key = normalizeLicenseKeyInput(keyRaw);
  const normalized = normalizeApiSetPrimitive(valueRaw);
  const blocked = scope === 'settings' && key === 'peakShavingEnabled';
  let writeKind: ApiSetShadowPlan['writeKind'] = 'generic';
  if (scope === 'settings') writeKind = 'settings-local';
  else if (scope === 'installer') writeKind = 'installer-config';
  else if (scope === 'rfid') writeKind = 'rfid';
  else if (scope === 'ems') writeKind = 'ems';
  const targetStateId = scope && key ? `${scope}.${key}` : '';
  return {
    ok: !!(scope && key) && !blocked,
    generatedAt: Date.now(),
    scope,
    key,
    normalized,
    targetStateId,
    blocked,
    reason: blocked ? 'settings.peakShavingEnabled is installer-only' : (scope && key ? 'shadow-only' : 'bad-request'),
    writeKind,
  };
}


export interface ApiStateShadowComparison {
  readonly ok: boolean;
  readonly snapshot: ApiStateShadowSnapshot;
  readonly mismatchCount: number;
  readonly mismatches: readonly string[];
}

/**
 * Code-Teil: compareApiStateShadow
 *
 * Zweck:
 * Baut für `/api/state` einen TypeScript-Shadow-Vergleich, ohne die produktive
 * API-Antwort zu verändern. Die Funktion nutzt bewusst den vorhandenen Snapshot-
 * Helfer, damit es nur eine fachliche 0/false/empty-Wert-Auswertung gibt.
 *
 * Zusammenhang:
 * main.js ruft diesen Helfer in 0.7.99 nur diagnostisch auf. Die Frontend-Antwort
 * bleibt weiterhin `this.stateCache` aus der bestehenden JavaScript-Runtime.
 */
export function compareApiStateShadow(stateCache: unknown, _now: number = Date.now()): ApiStateShadowComparison {
  const snapshot = buildApiStateShadowSnapshot(stateCache);
  const mismatches: string[] = [];
  if (!snapshot.ok) mismatches.push(...snapshot.warnings);
  if (snapshot.keyCount > 0 && snapshot.entriesChecked === 0) mismatches.push('StateCache enthält Keys, aber keine geprüften Einträge.');
  return {
    ok: mismatches.length === 0,
    snapshot,
    mismatchCount: mismatches.length,
    mismatches,
  };
}
