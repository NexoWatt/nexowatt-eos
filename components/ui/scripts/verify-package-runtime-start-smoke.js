#!/usr/bin/env node
'use strict';

/**
 * RC49: Paket-/Startketten-Smoke-Test.
 *
 * Prüft ohne installierte Entwicklungsabhängigkeiten:
 * - Syntax aller ausgelieferten JS-/MJS-Dateien,
 * - Auflösbarkeit aller statischen relativen require()-Pfade,
 * - Laden der zentralen EMS-/§14a-Modulkette,
 * - Konstruktion von main.js mit neutralen Stubs nur für externe Pakete.
 *
 * Aufruf im Projekt:
 *   node scripts/verify-package-runtime-start-smoke.js
 * Aufruf gegen ein frisch entpacktes npm-Paket:
 *   node scripts/verify-package-runtime-start-smoke.js --root /pfad/package
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { EventEmitter } = require('node:events');
const { spawnSync } = require('node:child_process');

function fail(message) {
  console.error(`[package-runtime-start-smoke] ERROR: ${message}`);
  process.exit(1);
}

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const root = path.resolve(argument('--root', path.resolve(__dirname, '..')));
const packageFile = path.join(root, 'package.json');
if (!fs.existsSync(packageFile)) fail(`package.json fehlt unter ${root}`);
const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
const explicitFiles = Array.isArray(pkg.files) && pkg.files.length
  ? pkg.files.map((item) => String(item || '').replace(/\\/g, '/')).filter(Boolean)
  : [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'build-ts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

let shippedFiles;
if (explicitFiles.length) {
  shippedFiles = [packageFile, ...explicitFiles.map((rel) => path.join(root, rel))];
  for (const file of shippedFiles) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      fail(`Ausgelieferte Pflichtdatei fehlt: ${path.relative(root, file)}`);
    }
  }
} else {
  shippedFiles = walk(root);
}

// Bei einem Repository-Smoke mit package.json#files darf eine relative Runtime-
// Abhängigkeit nicht nur zufällig im Arbeitsverzeichnis liegen: Sie muss selbst
// Teil des auszuliefernden Pakets sein. So werden fehlende neue Services bereits
// vor npm pack erkannt und nicht erst nach der Installation beim Adapterstart.
const shippedFileSet = new Set(shippedFiles.map((file) => path.resolve(file)));

const jsFiles = shippedFiles.filter((file) => /\.(?:c?js|mjs)$/i.test(file));
for (const file of jsFiles) {
  const check = require('./check-javascript-syntax.cjs').checkJavaScriptSyntax(file);
  if (check.status !== 0) {
    fail(`Syntaxfehler in ${path.relative(root, file)}:\n${check.stderr || check.stdout || ''}`);
  }
}

function resolveRelative(fromFile, request) {
  const base = path.resolve(path.dirname(fromFile), request);
  const candidates = [base, `${base}.js`, `${base}.json`, `${base}.cjs`, `${base}.mjs`, path.join(base, 'index.js'), path.join(base, 'index.json')];
  return candidates.find((candidate) => {
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) return false;
    return explicitFiles.length === 0 || shippedFileSet.has(path.resolve(candidate));
  }) || null;
}

const missing = [];
const requirePattern = /\brequire\s*\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g;
for (const file of jsFiles.filter((item) => !/\.mjs$/i.test(item))) {
  const text = fs.readFileSync(file, 'utf8');
  requirePattern.lastIndex = 0;
  let match;
  while ((match = requirePattern.exec(text))) {
    const request = match[2];
    if (!resolveRelative(file, request)) {
      missing.push(`${path.relative(root, file)} -> ${request}`);
    }
  }
}
if (missing.length) fail(`Nicht auflösbare lokale require()-Pfade:\n${missing.join('\n')}`);

for (const rel of [
  'lib/ts-mirrors/ems/para14a/para14a-constraint.js',
  'ems/services/para14a-eebus-api.js',
  'ems/services/safety-envelope.js',
  'ems/services/netoperator-canonical-model.js',
  'ems/services/netoperator-driver-registry.js',
  'ems/services/netoperator-modbus-tcp.js',
  'ems/modules/netoperator-interface.js',
  'ems/modules/para14a.js',
  'ems/modules/charging-management.js',
  'ems/modules/core-limits.js',
  'ems/module-manager.js',
  'ems/engine.js',
]) {
  const file = path.join(root, rel);
  try {
    require(file);
  } catch (error) {
    fail(`Zentrale Runtime-Datei lässt sich nicht laden: ${rel}\n${error && error.stack ? error.stack : error}`);
  }
}

// main.js benötigt im echten Betrieb externe npm-Pakete. Für diesen isolierten
// Paket-Smoke werden ausschließlich diese externen Pakete neutral gestubbt;
// lokale/relative Module laufen weiterhin durch den echten Node-Loader.
class FakeAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.name = String(options.name || 'nexowatt-ui');
    this.namespace = `${this.name}.0`;
    this.instance = 0;
    this.config = options.config && typeof options.config === 'object' ? options.config : {};
    this.log = options.log || { silly() {}, debug() {}, info() {}, warn() {}, error() {} };
  }
  setTimeout(handler, ms, ...args) { return setTimeout(handler, ms, ...args); }
  clearTimeout(timer) { clearTimeout(timer); }
  setInterval(handler, ms, ...args) { return setInterval(handler, ms, ...args); }
  clearInterval(timer) { clearInterval(timer); }
}

function genericExternalStub() {
  const fn = function stub() { return proxy; };
  const proxy = new Proxy(fn, {
    get(_target, key) {
      if (key === 'then') return undefined;
      if (key === 'default') return proxy;
      if (key === 'json' || key === 'urlencoded' || key === 'static') return () => (_req, _res, next) => { if (typeof next === 'function') next(); };
      if (key === Symbol.toStringTag) return 'ExternalStub';
      return proxy;
    },
    construct() { return proxy; },
    apply() { return proxy; },
  });
  return proxy;
}

const originalLoad = Module._load;
const builtins = new Set(Module.builtinModules.concat(Module.builtinModules.map((name) => `node:${name}`)));
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '@iobroker/adapter-core') return { Adapter: FakeAdapter };
  if (request.startsWith('.') || path.isAbsolute(request) || builtins.has(request)) {
    return originalLoad.call(this, request, parent, isMain);
  }
  try {
    return originalLoad.call(this, request, parent, isMain);
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') return genericExternalStub();
    throw error;
  }
};

try {
  const factory = require(path.join(root, 'main.js'));
  assert.equal(typeof factory, 'function', 'main.js muss im Require-Betrieb eine Factory exportieren');
  const instance = factory({ config: {} });
  assert.ok(instance, 'main.js-Factory muss eine Adapterinstanz erzeugen');
  assert.ok(instance._para14aEebusApi, '§14a-EEBUS-API muss bereits im Konstruktor angelegt werden');
  assert.equal(typeof instance.onUnload, 'function');
} catch (error) {
  fail(`main.js-/EMS-Startkette konnte aus dem Paket nicht konstruiert werden:\n${error && error.stack ? error.stack : error}`);
} finally {
  Module._load = originalLoad;
}

console.log(`[package-runtime-start-smoke] OK: ${jsFiles.length} JS/MJS-Dateien syntaktisch geprüft, relative require()-Pfade vollständig und main.js-/EMS-/§14a-Startkette konstruierbar.`);
