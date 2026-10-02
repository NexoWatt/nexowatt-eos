#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'www', 'nw-i18n.js'), 'utf8');
const nlCatalog = JSON.parse(fs.readFileSync(path.join(root, 'www', 'i18n', 'nl.json'), 'utf8'));
const deCatalog = JSON.parse(fs.readFileSync(path.join(root, 'www', 'i18n', 'de.json'), 'utf8'));

class ClassList {
  constructor() { this.values = new Set(); }
  toggle(name, enabled) { if (enabled) this.values.add(name); else this.values.delete(name); }
  contains(name) { return this.values.has(name); }
}
class FakeText {
  constructor(value) { this.nodeType = 3; this.nodeValue = value; this.parentElement = null; }
}
class FakeElement {
  constructor(tagName = 'div', attrs = {}) {
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map(Object.entries(attrs).map(([k, v]) => [k, String(v)]));
    this.childNodes = [];
    this.parentElement = null;
    this.classList = new ClassList();
    this.dataset = {};
    this.style = {};
    this.value = '';
    this.id = attrs.id || '';
  }
  appendChild(node) { node.parentElement = this; this.childNodes.push(node); return node; }
  get textContent() { return this.childNodes.map((node) => node.nodeType === 3 ? node.nodeValue : node.textContent).join(''); }
  set textContent(value) { this.childNodes = []; this.appendChild(new FakeText(String(value))); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === 'id') this.id = String(value); }
  hasAttribute(name) { return this.attributes.has(name); }
  closest(selector) {
    if (selector === '[data-nw-i18n-ignore="true"]') {
      let cur = this;
      while (cur) { if (cur.getAttribute && cur.getAttribute('data-nw-i18n-ignore') === 'true') return cur; cur = cur.parentElement; }
    }
    return null;
  }
  querySelectorAll() { return allElements(this).slice(1); }
}
function allNodes(rootNode, out = []) {
  out.push(rootNode);
  for (const child of rootNode.childNodes || []) allNodes(child, out);
  return out;
}
function allElements(rootNode) { return allNodes(rootNode).filter((node) => node.nodeType === 1); }
function matches(element, selector) {
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  const attr = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
  if (attr) return element.hasAttribute(attr[1]) && (attr[2] === undefined || element.getAttribute(attr[1]) === attr[2]);
  return false;
}

const html = new FakeElement('html');
const head = html.appendChild(new FakeElement('head'));
const body = html.appendChild(new FakeElement('body'));
const system = body.appendChild(new FakeElement('div'));
system.appendChild(new FakeText('Systemstatus'));
const grid = body.appendChild(new FakeElement('div'));
grid.appendChild(new FakeText('Netzbezug'));
const deOnly = body.appendChild(new FakeElement('section', { id: 'ems14aRow', 'data-nw-market': 'DE' }));
deOnly.appendChild(new FakeText('Netzsteuerung (§14a)'));
const languageDisplay = body.appendChild(new FakeElement('input', { id: 'countryProfileLanguageDisplay' }));

const document = {
  nodeType: 9,
  childNodes: [html],
  readyState: 'complete',
  documentElement: html,
  head,
  body,
  visibilityState: 'visible',
  addEventListener() {},
  getElementById(id) { return allElements(html).find((el) => el.id === id) || null; },
  createElement(tag) { return new FakeElement(tag); },
  createTreeWalker(scope) {
    const texts = allNodes(scope).filter((node) => node.nodeType === 3);
    let index = 0;
    return { nextNode() { return texts[index++] || null; } };
  },
  querySelectorAll(selector) {
    const selectors = String(selector).split(',').map((s) => s.trim()).filter(Boolean);
    return allElements(html).filter((element) => selectors.some((sel) => matches(element, sel)));
  },
};
FakeElement.prototype.querySelectorAll = function querySelectorAll(selector) {
  const selectors = String(selector).split(',').map((s) => s.trim()).filter(Boolean);
  return allElements(this).slice(1).filter((element) => selectors.some((sel) => matches(element, sel)));
};

class MutationObserver { observe() {} disconnect() {} }
class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
class BroadcastChannel { addEventListener() {} postMessage() {} close() {} }

const sandbox = {
  window: null,
  document,
  navigator: { language: 'de-DE' },
  Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
  NodeFilter: { SHOW_TEXT: 4 },
  MutationObserver,
  CustomEvent,
  BroadcastChannel,
  fetch: async (url) => {
    const value = String(url);
    if (value.startsWith('/api/locale')) return { ok: true, json: async () => ({ locale: { language: 'nl', htmlLang: 'nl', source: 'system.config.common.language' }, countryProfile: { country: 'NL', supportsParagraph14a: false } }) };
    if (value.includes('/i18n/nl.json')) return { ok: true, json: async () => nlCatalog };
    if (value.includes('/i18n/de.json')) return { ok: true, json: async () => deCatalog };
    throw new Error(`unexpected fetch ${value}`);
  },
  setInterval: () => 1,
  clearInterval() {},
  setTimeout,
  clearTimeout,
  console,
  Intl,
  Date,
  Promise,
  Map,
  Set,
  WeakMap,
  RegExp,
  String,
  Number,
  Object,
  Array,
  Math,
  JSON,
  encodeURIComponent,
};
sandbox.window = sandbox;
sandbox.addEventListener = () => {};
sandbox.dispatchEvent = () => true;

(async () => {
  vm.runInNewContext(runtime, sandbox, { filename: 'www/nw-i18n.js' });
  await new Promise((resolve) => setTimeout(resolve, 30));

  const errors = [];
  if (system.textContent !== 'Systeemstatus') errors.push(`Systemstatus blieb ${system.textContent}`);
  if (grid.textContent !== 'Netafname') errors.push(`Netzbezug blieb ${grid.textContent}`);
  if (html.getAttribute('lang') !== 'nl') errors.push(`html.lang=${html.getAttribute('lang')}`);
  if (!deOnly.classList.contains('nw-market-hidden')) errors.push('DE-only §14a-Element wurde im NL-Markt nicht verborgen.');
  if (languageDisplay.value !== 'Nederlands (nl)') errors.push(`Sprachanzeige=${languageDisplay.value}`);
  if (!sandbox.NexoWattI18n || sandbox.NexoWattI18n.localeTag() !== 'nl-NL') errors.push('Locale-API meldet nicht nl-NL.');

  await sandbox.NexoWattI18n.setLanguageForPreview('de');
  if (system.textContent !== 'Systemstatus') errors.push(`Rückwechsel auf DE scheiterte: ${system.textContent}`);
  if (grid.textContent !== 'Netzbezug') errors.push(`Rückwechsel Netzbezug scheiterte: ${grid.textContent}`);

  if (errors.length) {
    for (const error of errors) console.error(`[system-language-i18n-runtime] ERROR: ${error}`);
    process.exit(1);
  }
  console.log('[system-language-i18n-runtime] OK: Live-Wechsel DE↔NL, Locale und NL-Marktgating funktionieren.');
})().catch((error) => {
  console.error('[system-language-i18n-runtime] ERROR:', error && error.stack ? error.stack : error);
  process.exit(1);
});
