#!/usr/bin/env node
'use strict';

/**
 * Prüft vor `npm publish`, ob die aktuelle Paketversion in der Ziel-Registry
 * bereits existiert. Der Guard arbeitet bewusst fail-closed: Nur eine eindeutige
 * HTTP-404-Antwort gilt als freie Version. Netzwerk-, TLS-, Auth- oder Registry-
 * Fehler brechen den Publish ab, statt einen möglicherweise doppelten Release zu
 * riskieren.
 */
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageName = String(process.env.NEXOWATT_NPM_PACKAGE || pkg.name || '').trim();
const version = String(process.env.NEXOWATT_NPM_VERSION || pkg.version || '').trim();
const registry = String(process.env.NEXOWATT_NPM_REGISTRY || 'https://registry.npmjs.org').trim();
const timeoutMs = Math.max(3000, Math.min(60000, Number(process.env.NEXOWATT_NPM_TIMEOUT_MS || 15000) || 15000));

if (!packageName || !version) {
  console.error('[npm-version-free] ERROR: Paketname oder Version fehlt in package.json.');
  process.exit(1);
}

let requestUrl;
try {
  const base = new URL(registry.endsWith('/') ? registry : `${registry}/`);
  requestUrl = new URL(`${encodeURIComponent(packageName)}/${encodeURIComponent(version)}`, base);
} catch (error) {
  console.error(`[npm-version-free] ERROR: Ungültige Registry-URL: ${registry}`);
  process.exit(1);
}

if (!['http:', 'https:'].includes(requestUrl.protocol)) {
  console.error(`[npm-version-free] ERROR: Nicht unterstütztes Registry-Protokoll: ${requestUrl.protocol}`);
  process.exit(1);
}
const transport = requestUrl.protocol === 'https:' ? https : http;
const request = transport.get(requestUrl, {
  headers: {
    accept: 'application/json',
    'user-agent': `NexoWatt-release-guard/${version}`,
  },
}, (response) => {
  // Antwortkörper vollständig konsumieren, damit der Socket sauber geschlossen
  // wird. Inhalt wird nicht benötigt; der HTTP-Status ist autoritativ.
  response.resume();

  if (response.statusCode === 404) {
    console.log(`[npm-version-free] OK: ${packageName}@${version} ist in ${requestUrl.origin} noch nicht veröffentlicht.`);
    process.exit(0);
  }

  if (response.statusCode >= 200 && response.statusCode < 300) {
    console.error(`[npm-version-free] ERROR: ${packageName}@${version} existiert bereits in ${requestUrl.origin}.`);
    console.error('[npm-version-free] Adapterversion erhöhen und alle Versionskennungen synchronisieren.');
    process.exit(1);
  }

  console.error(`[npm-version-free] ERROR: Registry-Prüfung nicht eindeutig (HTTP ${response.statusCode}). Publish wird sicherheitshalber blockiert.`);
  process.exit(1);
});

request.setTimeout(timeoutMs, () => {
  request.destroy(new Error(`Registry timeout after ${timeoutMs} ms`));
});

request.on('error', (error) => {
  console.error(`[npm-version-free] ERROR: Registry nicht sicher prüfbar: ${error && error.message ? error.message : error}`);
  console.error('[npm-version-free] Publish wird fail-closed blockiert; Registry/Netzwerk prüfen und erneut ausführen.');
  process.exit(1);
});
