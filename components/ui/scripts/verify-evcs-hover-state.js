'use strict';
const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, '..', 'www', 'styles.css');
const css = fs.readFileSync(cssPath, 'utf8');
function must(pattern, msg) {
  if (!pattern.test(css)) {
    console.error('[evcs-hover-state] ERROR:', msg);
    process.exit(1);
  }
}
must(/NexoWatt 0\.8\.73 .*EVCS-Kacheln/s, '0.8.73 Kommentar für EVCS-Hover fehlt.');
must(/body\.nw-page-evcs\s+\.nw-evcs-page\s+\.nw-tile:not\(\.nw-tile--state-on\):hover[\s\S]*border-color:rgba\(255,255,255,\.075\) !important/s, 'Neutraler Hover für nicht aktive EVCS-Kacheln fehlt.');
must(/body\.nw-page-evcs\s+\.nw-evcs-page\s+\.nw-tile\.nw-tile--state-on[\s\S]*border-color:rgba\(0,230,118,\.88\) !important/s, 'Grüner Zustand nur für aktive EVCS-Kacheln fehlt.');
must(/body\.nw-page-evcs\s+\.nw-evcs-page\s+\.nw-tile,[\s\S]*transform:none !important/s, 'EVCS-Hover-Transform wurde nicht neutralisiert.');
console.log('[evcs-hover-state] OK: EVCS-Hover bleibt neutral; grün leuchtet nur bei aktivem Ladezustand.');
