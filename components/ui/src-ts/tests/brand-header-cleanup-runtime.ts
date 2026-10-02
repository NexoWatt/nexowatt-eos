declare const require: (id: string) => any;
declare const __dirname: string;
declare const console: { log(message?: unknown, ...optionalParams: unknown[]): void };

const fs = require('fs');
const path = require('path');

/**
 * Datei: src-ts/tests/brand-header-cleanup-runtime.ts
 *
 * Zweck:
 * Prüft den Branding-Schritt vollständig aus TypeScript: Die sichtbare
 * Topbar-Marke muss „NexoWatt EOS“ heißen. Der fachliche Begriff EMS bleibt
 * in Modulnamen/Statuskarten erlaubt, aber nicht mehr als Produktzusatz in der
 * oberen Marke.
 */
const root: string = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readJson<T>(rel: string): T {
  return JSON.parse(read(rel)) as T;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function listHtmlFiles(): string[] {
  return fs.readdirSync(path.join(root, 'www'))
    .filter((name: string) => name.endsWith('.html'))
    .map((name: string) => 'www/' + name)
    .sort();
}

function runBrandHeaderCleanupTest(): void {
  const pkg = readJson<{ version?: string }>('package.json');
  const lock = readJson<{ version?: string; packages?: Record<string, { version?: string }> }>('package-lock.json');
  const io = readJson<{ common?: { version?: string; news?: Record<string, unknown> } }>('io-package.json');
  const manifest = readJson<{ name?: string; short_name?: string; version?: string }>('www/manifest.webmanifest');

  const expectedVersion = String(pkg.version || '');
  assert(pkg.version === expectedVersion, `package.json muss Version ${expectedVersion} haben.`);
  assert(lock.version === expectedVersion, `package-lock.json muss Version ${expectedVersion} haben.`);
  assert(lock.packages?.['']?.version === expectedVersion, `package-lock root package muss Version ${expectedVersion} haben.`);
  assert(io.common?.version === expectedVersion, `io-package.json common.version muss ${expectedVersion} sein.`);
  assert(Boolean(io.common?.news?.[expectedVersion]), `io-package.json common.news braucht einen ${expectedVersion}-Eintrag.`);
  assert(Object.keys(io.common?.news ?? {}).length <= 7, 'io-package.json common.news darf maximal 7 Einträge haben.');
  assert(manifest.version === expectedVersion, `manifest.webmanifest muss Version ${expectedVersion} haben.`);
  assert(manifest.name === 'NexoWatt EOS', 'manifest.webmanifest name muss NexoWatt EOS sein.');
  assert(manifest.short_name === 'NexoWatt EOS', 'manifest.webmanifest short_name muss NexoWatt EOS sein.');

  const oldBrowserTitle = new RegExp('<title>NexoWatt EMS\\b');
  const oldPwaTitle = new RegExp('apple-mobile-web-app-title"\\s+content="NexoWatt EMS"');

  for (const rel of listHtmlFiles()) {
    const html = read(rel);
    assert(!html.includes('<h1>NexoWatt EMS</h1>'), `${rel} darf oben nicht mehr „NexoWatt EMS“ anzeigen.`);
    assert(!oldBrowserTitle.test(html), `${rel} darf im Browser-Titel nicht mehr mit „NexoWatt EMS“ beginnen.`);
    assert(!oldPwaTitle.test(html), `${rel} darf den PWA-Titel nicht mehr als „NexoWatt EMS“ setzen.`);
  }

  assert(read('www/index.html').includes('<h1>NexoWatt EOS</h1>'), 'LIVE-Topbar muss „NexoWatt EOS“ anzeigen.');
  assert(read('src-ts/runtime-executables/www/app.ts').includes('function nwNormalizeBrandHeader'), 'app.ts muss den TS-Branding-Normalizer enthalten.');
  assert(read('src-ts/runtime-executables/www/nw-shell.ts').includes('function nwNormalizeBrandHeader'), 'nw-shell.ts muss den TS-Branding-Normalizer enthalten.');
  assert(read('src-ts/runtime-executables/www/cockpit-shell.ts').includes('function nwNormalizeBrandHeader'), 'cockpit-shell.ts muss den TS-Branding-Normalizer enthalten.');
  // Der Service-Worker-Cache wird bewusst monoton hochgezählt und ist nicht
  // mehr direkt aus der SemVer-Patchnummer ableitbar. Wichtig ist deshalb,
  // dass kanonische TS-Quelle und generiertes JS exakt denselben gültigen
  // Cache-Namen verwenden; so vermeiden wir bei Hotfix-Reihen Kollisionen mit
  // bereits ausgelieferten Browser-Caches.
  const swTs = read('src-ts/runtime-executables/www/sw.ts');
  const swJs = read('www/sw.js');
  const cacheMatch = swTs.match(/nexowatt-cache-v\d+/);
  assert(Boolean(cacheMatch), 'Service-Worker-TS-Quelle braucht einen versionierten NexoWatt-Cache-Namen.');
  const expectedCacheName = String(cacheMatch?.[0] || '');
  assert(swJs.includes(expectedCacheName), `Generierter Service Worker muss ${expectedCacheName} nutzen.`);
}

runBrandHeaderCleanupTest();
console.log('[ts-brand-header-cleanup] OK: Topbar zeigt NexoWatt EOS, Version/Manifest/Cache sind konsistent.');
