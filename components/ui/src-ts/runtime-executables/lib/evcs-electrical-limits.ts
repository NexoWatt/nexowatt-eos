// @ts-nocheck
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Prüft explizite Strom-/Leistungsgrenzen je Ladepunkt und trennt DC-Ausgangsstrom von AC-Netzstrom.
 * Daten und Wirkung: Erhält Ladepunkt-Konfiguration und Messprobe; liefert geprüfte Grenzen. Unvollständige Grenzen sperren die Freigabe. DC-Ausgangsstrom benötigt die passende Spannungsbasis; AC-Netzstrom ist davon getrennt.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/evcs-electrical-limits.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/** Shared installer/runtime contract for explicit per-connector electrical limits. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NexoWattEvcsElectricalLimits = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Ablauf und Zusammenhang: Akzeptiert ausschließlich endliche positive Zahlen. Fehlende Werte werden als null zurückgegeben und dürfen nicht stillschweigend als gültige elektrische Grenze gelten.
   */
  function positive(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  /**
   * Ablauf und Zusammenhang: Wählt anhand vorhandener Sollwert-Datenpunkte und ausdrücklicher Vorgabe zwischen Strom in A und Leistung in W. Bei DC wird ein explizit gewählter, aber fehlender Steuerpfad nicht durch den anderen Pfad ersetzt.
   */
  function resolveEvcsControlBasis(row) {
    const r = row || {};
    const hasA = !!String(r.setCurrentAId || r.setAKey || '').trim();
    const hasW = !!String(r.setPowerWId || r.setWKey || '').trim();
    const dc = String(r.chargerType || '').toLowerCase() === 'dc';
    const preference = String(r.controlBasis || r.controlPreference || 'auto').toLowerCase();
    if (['currenta', 'current', 'a'].includes(preference)) return hasA ? 'currentA' : (hasW && !dc ? 'powerW' : 'none');
    if (['powerw', 'power', 'w'].includes(preference)) return hasW ? 'powerW' : (hasA && !dc ? 'currentA' : 'none');
    return dc ? (hasW ? 'powerW' : (hasA ? 'currentA' : 'none')) : (hasA ? 'currentA' : (hasW ? 'powerW' : 'none'));
  }

  /**
   * Ablauf und Zusammenhang: Prüft die Pflichtgrenzen passend zum gewählten Steuerpfad und liefert Fehlertexte statt Hardwarebefehlen. Derselbe Vertrag wird in Einrichtung und Laufzeit verwendet, damit eine unvollständige Konfiguration nicht nur optisch beanstandet wird.
   */
  function validateEvcsElectricalConfig(row) {
    const r = row || {};
    const dc = String(r.chargerType || '').toLowerCase() === 'dc';
    const basis = resolveEvcsControlBasis(r);
    const minA = positive(r.minA !== undefined ? r.minA : r.minCurrentA);
    const maxA = positive(r.maxA !== undefined ? r.maxA : r.maxCurrentA);
    const minW = positive(r.minPowerW);
    const maxW = positive(r.maxPowerW);
    const currentPair = minA !== null && maxA !== null && minA <= maxA;
    const powerPair = minW !== null && maxW !== null && minW <= maxW;
    const currentReference = String(r.dcCurrentReference || '').trim().toLowerCase();
    const errors = [];
    if (basis === 'none') errors.push('Ein passender Sollstrom- oder Sollleistungs-Datenpunkt muss zugeordnet sein.');
    if (dc && basis === 'powerW' && !powerPair) errors.push('DC-Leistungssteuerung benötigt Min. und Max. Leistung in W (0 < Min. ≤ Max.).');
    if (dc && basis === 'currentA' && !currentPair) errors.push('DC-Stromsteuerung benötigt Min. und Max. Strom in A (0 < Min. ≤ Max.).');
    if (!dc && !currentPair && !powerPair) errors.push('Min. und Max. Strom in A oder Min. und Max. Leistung in W sind erforderlich (0 < Min. ≤ Max.).');
    if (minA !== null && maxA !== null && minA > maxA) errors.push('Mindeststrom darf den Maximalstrom nicht überschreiten.');
    if (minW !== null && maxW !== null && minW > maxW) errors.push('Mindestleistung darf die Maximalleistung nicht überschreiten.');
    for (const field of ['minCurrentA', 'maxCurrentA', 'minA', 'maxA', 'minPowerW', 'maxPowerW']) {
      if (r[field] !== undefined && r[field] !== null && String(r[field]).trim() !== '' && (!Number.isFinite(Number(r[field])) || Number(r[field]) < 0)) errors.push(`Ungültiger Grenzwert: ${field}.`);
    }
    if (dc && basis === 'currentA') {
      if (!['ac-input', 'dc-output'].includes(currentReference)) errors.push('Bei DC-Stromsteuerung den Strombezug wählen: AC-Netzeingang oder DC-Ladeausgang.');
      if (currentReference === 'dc-output' && !String(r.dcVoltageId || '').trim()) errors.push('DC-Ladestrom benötigt einen Datenpunkt für die aktuelle DC-Ausgangsspannung in V.');
    }
    return { valid: errors.length === 0, errors, basis, dc, currentReference, minA, maxA, minW, maxW, currentPair, powerPair };
  }

  /**
   * Ablauf und Zusammenhang: Berechnet die DC-Leistungsgrenzen aus Strom oder Leistung und quantisiert auf zulässige Schritte. DC-Ausgangsstrom verwendet eine frische plausible DC-Spannung; AC-Eingangsstrom verwendet Netzphasen und Netzspannung. Ungültige Kombinationen liefern keine positive Leistungsfreigabe.
   */
  function resolveDcElectricalLimits(row, sample) {
    const r = row || {};
    const check = validateEvcsElectricalConfig(r);
    const gridPhases = Number(r.phases) === 1 ? 1 : 3;
    const voltage = positive(r.voltageV) || 230;
    const outputCurrent = check.basis === 'currentA' && check.currentReference === 'dc-output';
    const measuredV = positive(sample && sample.voltageV);
    const voltageValid = !outputCurrent || !!(sample && sample.fresh === true && measuredV !== null && measuredV >= 50 && measuredV <= 1500);
    const factorWPerA = check.basis !== 'currentA' ? 0 : (outputCurrent ? (voltageValid ? measuredV : 0) : gridPhases * voltage);
    let minPowerW = check.basis === 'powerW' ? (check.minW || 0) : (check.minA || 0) * factorWPerA;
    let maxPowerW = check.basis === 'powerW' ? (check.maxW || 0) : (check.maxA || 0) * factorWPerA;
    if (check.basis === 'currentA') {
      if (check.minW !== null) minPowerW = Math.max(minPowerW, check.minW);
      if (check.maxW !== null) maxPowerW = Math.min(maxPowerW, check.maxW);
    }
    const stepA = positive(r.stepA) || 0.1;
    const stepW = positive(r.stepW) || 1;
    const minA = check.basis === 'currentA' && factorWPerA > 0
      ? Math.ceil((minPowerW / factorWPerA - 1e-9) / stepA) * stepA : 0;
    const maxA = check.basis === 'currentA' && factorWPerA > 0
      ? Math.floor((maxPowerW / factorWPerA + 1e-9) / stepA) * stepA : 0;
    if (check.basis === 'currentA') {
      minPowerW = minA * factorWPerA;
      maxPowerW = maxA * factorWPerA;
    } else {
      minPowerW = Math.ceil((minPowerW - 1e-9) / stepW) * stepW;
      maxPowerW = Math.floor((maxPowerW + 1e-9) / stepW) * stepW;
    }
    const errors = check.errors.slice();
    if (!voltageValid) errors.push('DC-Ausgangsspannung fehlt, ist veraltet oder unplausibel; Stromvorgabe bleibt 0 A.');
    if (minPowerW > maxPowerW) errors.push('Die kombinierten Strom- und Leistungsgrenzen lassen keine sichere Ladestufe zu.');
    const valid = check.valid && voltageValid && minPowerW > 0 && maxPowerW >= minPowerW;
    return {
      ...check, valid, errors, gridPhases, factorWPerA,
      controlPhases: outputCurrent ? 1 : gridPhases,
      controlVoltageV: outputCurrent ? (measuredV || 0) : voltage,
      minPowerW: valid ? minPowerW : 0, maxPowerW: valid ? maxPowerW : 0,
      minA, maxA,
    };
  }

  return { resolveEvcsControlBasis, validateEvcsElectricalConfig, resolveDcElectricalLimits };
});
