#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.81: Speicher-Ladevorgaben duerfen nicht durch alte negative
 * Sollwerte weiterlaufen. PV-Laden wird hart durch RAW-Export begrenzt.
 */
const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) {
    console.error(`[storage-charge-demand-cap] FEHLT ${label}: ${needle}`);
    process.exit(1);
  }
}

for (const file of [
  'src-ts/runtime-executables/ems/modules/storage-control.ts',
  'src-ts/runtime-mirrors/ems/modules/storage-control.ts',
  'ems/modules/storage-control.js',
]) {
  must(file, 'let chargeDemandHardCapW = null;', 'Lade-Cap Laufzeitvariable');
  must(file, '0 W heißt dabei bewusst: diese Richtung jetzt stoppen.', '0-W-Stop-Kommentar');
  must(file, "'Tarif-Netzlade-Headroom-Cap'", 'Tarif-Netzlade-Cap');
  must(file, 'const pvTargetImportW = selfTargetGridW + extraBias;', 'PV-Cap nutzt das unverfaelschte NVP-Ziel ohne symmetrischen EVCS-Offset');
  must(file, 'const exportCtrlCapW = Math.max(0, currentChargeForBalancingW + exportCtrlW + pvTargetImportW);', 'PV-Cap nutzt laufende Ladung plus geglaetteten Exportwunsch');
  must(file, 'const exportRawCapW = exportRawW > 0', 'PV-Cap RAW-Export nutzt laufende Ladung plus aktuellen NVP-Export');
  must(file, 'const requestedChargeW = Math.max(0, -Number(pvBalance.targetW || 0));', 'PV-Ladewunsch stammt aus Istleistung plus NVP-Differenz');
  must(file, 'const pvRawChargeCapW = clamp(Math.min(requestedChargeW, exportCtrlCapW, exportRawCapW), 0, chargeLimitW);', 'PV-Wunsch wird durch RAW hart begrenzt');
  must(file, 'targetW = -pvRawChargeCapW;', 'PV-Zielwert nutzt harten RAW-Cap');
  must(file, "chargeDemandHardCapReason = zeEnabled ? 'Nulleinspeisung-NVP-Lade-Cap (aktuelle Ladung+Export)' : 'PV-NVP-Lade-Cap (aktuelle Ladung+Export)';", 'PV-NVP-Cap Diagnose mit laufender Ladung');
  must(file, "chargeDemandHardCapReason = 'Notstrom-Reserve-Lade-Cap';", 'Reserve-Lade-Cap');
  must(file, "chargeDemandHardCapReason = 'LSK-Refill-Lade-Cap';", 'LSK-Refill-Lade-Cap');
  must(file, 'if (_prevRampW < 0 && targetW >= _prevRampW) {', 'Laderuecknahme ohne Rampe');
  must(file, 'if (_reqW >= 0 && !deferEmptyChargeRequestToNvpBalancer) {', 'keine aktuelle Ladeanforderung stoppt Restladung ausser vor der finalen geschlossenen NVP-Berechnung');
  must(file, 'const deferEmptyChargeRequestToNvpBalancer = _reqW >= 0', 'Geschlossene Generic-/Farm-/Hersteller-NVP-Pfade duerfen nicht durch einen vorlaeufigen 0-W-Lade-Cap blockiert werden');
  must(file, 'Lade-Cap ${Math.round(capW)} W nach Rampe', 'harter Lade-Cap nach Rampe');
  must(file, 'speicher.regelung.chargeDemandCapW', 'Lade-Cap Diagnose-State');
  must(file, 'speicher.regelung.chargeDemandCapReason', 'Lade-Cap Diagnose-Grund');
}

console.log('[storage-charge-demand-cap] OK: Speicher-Ladevorgabe ist gegen alten Rampen-/Sollwert-Nachlauf abgesichert.');
