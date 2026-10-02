declare const require: (id: string) => any;
declare const __dirname: string;
declare const console: { log(message?: unknown, ...optionalParams: unknown[]): void };

const fs = require('fs');
const path = require('path');

/**
 * Datei: src-ts/tests/app-center-install-colors-runtime.ts
 *
 * Zweck:
 * Sichert den App-Center-Polish ab: In den App-Karten darf `Installiert = Nein`
 * nicht mehr wie ein positiver grüner Status wirken. Nur der Installiert-Nein-Button
 * bekommt die rote Statusfarbe; normale Aktiv-Aus-Toggles bleiben davon getrennt.
 *
 * Zusätzlich prüft dieser Test die npm-Publish-Vorbereitung: TypeScript muss als echte
 * devDependency vorhanden sein, damit Windows-/CI-Systeme den lokalen `tsc` für
 * `npm run publish:check` installieren können.
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

function runAppCenterInstallColorTest(): void {
  const pkg = readJson<{
    version?: string;
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
    xDevDependenciesForDevelopmentOnly?: Record<string, string>;
  }>('package.json');
  const lock = readJson<{
    version?: string;
    packages?: Record<string, { version?: string; devDependencies?: Record<string, string>; resolved?: string }>;
  }>('package-lock.json');
  const publishPlan = readJson<{ commands?: unknown }>('scripts/publish-check-plan.json');
  const publishCommands: string[] = Array.isArray(publishPlan.commands)
    ? publishPlan.commands.map((command) => String(command || '').trim().replace(/\s+/g, ' '))
    : [];

  const expectedVersion = String(pkg.version || '');
  assert(pkg.version === expectedVersion, `package.json muss Version ${expectedVersion} haben.`);
  assert(lock.version === expectedVersion, `package-lock.json muss Version ${expectedVersion} haben.`);
  assert(lock.packages?.['']?.version === expectedVersion, `package-lock root package muss Version ${expectedVersion} haben.`);

  assert(Boolean(pkg.devDependencies?.typescript), 'package.json braucht typescript als echte devDependency.');
  assert(Boolean(pkg.devDependencies?.['@types/node']), 'package.json braucht @types/node als echte devDependency.');
  assert(!pkg.xDevDependenciesForDevelopmentOnly, 'package.json darf die Entwicklungsdeps nicht nur unter xDevDependenciesForDevelopmentOnly verstecken.');
  assert(Boolean(lock.packages?.['']?.devDependencies?.typescript), 'package-lock root package braucht typescript als devDependency.');
  assert(!read('package-lock.json').includes('applied-caas-gateway'), 'package-lock.json darf keine internen Registry-URLs enthalten.');

  const ts = read('src-ts/runtime-executables/www/ems-apps.ts');
  const js = read('www/ems-apps.js');
  const css = read('www/styles.css');

  assert(ts.includes("toggleKind = ''"), 'ems-apps.ts muss Toggle-Arten für App-Center-Status unterscheiden.');
  // Netzlimits ist eine dauerhaft installierte Safety-App. Der Test prüft deshalb
  // semantisch die Toggle-Art und erlaubt die explizite `grid ? true : state`-Härtung,
  // statt eine veraltete Quelltextzeile wortwörtlich zu verlangen.
  const installedToggle = /mkToggle\(idInstalled,\s*'Installiert',\s*(?:app\.id\s*===\s*'grid'\s*\?\s*true\s*:\s*)?st\.installed,\s*app\.mandatory,\s*'Ja',\s*'Nein',\s*'installed'\)/;
  const enabledToggle = /mkToggle\(idEnabled,\s*'Aktiv',\s*(?:app\.id\s*===\s*'grid'\s*\?\s*true\s*:\s*)?st\.enabled,\s*app\.mandatory\s*\|\|\s*!st\.installed,\s*'An',\s*'Aus',\s*'enabled'\)/;
  assert(installedToggle.test(ts), 'Installiert-Toggle muss als installed markiert werden.');
  assert(enabledToggle.test(ts), 'Aktiv-Toggle muss separat als enabled markiert werden.');
  assert(js.includes('nw-app-toggle--${toggleKind}'), 'Generiertes www/ems-apps.js muss die Toggle-Art-Klasse enthalten.');
  assert(installedToggle.test(js), 'Generiertes www/ems-apps.js muss Installiert als installed markieren.');

  assert(css.includes('App-Center: nicht installierte Apps'), 'styles.css muss den App-Center-Farbblock enthalten.');
  assert(css.includes('.nw-toggle[data-toggle-kind="installed"] button[data-value="false"].active'), 'styles.css muss nur Installiert-Nein gezielt rot färben.');
  assert(css.includes('255,75,66'), 'styles.css muss für Installiert-Nein rote Statusfarben nutzen.');
  assert(!css.includes('.nw-toggle[data-toggle-kind="enabled"] button[data-value="false"].active'), 'Aktiv-Aus darf nicht versehentlich als roter Installiert-Nein-Status definiert sein.');

  assert(Boolean(pkg.scripts?.['test:app-center-install-colors']?.includes('tsconfig.app-center-install-colors.json')), 'package.json braucht das App-Center-Farbgate.');
  assert(publishCommands.includes('npm run test:app-center-install-colors'), 'publish-check-plan muss das App-Center-Farbgate enthalten.');
}

runAppCenterInstallColorTest();
console.log('[ts-app-center-install-colors] OK: App-Center zeigt Installiert=Nein rot und npm-Publish-DevDependencies sind korrekt.');
