// @runtime-transpile
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Verwaltet Übersetzungstexte und Sprachanwendung im Browser.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/nw-i18n.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/nw-i18n.js
 *
 * Zweck:
 * Zentraler Sprachvertrag für die NexoWatt-Weboberflächen. Die Sprache wird aus
 * der ioBroker-/EOS-Systemsprache übernommen, ohne die Marktlogik mit der
 * Oberflächensprache zu vermischen. Deutsch bleibt der sichere Fallback.
 */
'use strict';

(function initNexoWattI18nRuntime(global: any) {
  type AnyRecord = Record<string, any>;
  if (!global || global.NexoWattI18n) return;

  const SUPPORTED_LANGUAGES = new Set(['de', 'nl', 'en']);
  const DEFAULT_LANGUAGE = 'de';
  const POLL_INTERVAL_MS = 3000;
  const CATALOG_VERSION = '0.8.201';
  const TEXT_ATTRS = ['title', 'aria-label', 'placeholder'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT', 'SVG', 'PATH']);

  const sourceTextByNode = new WeakMap();
  const renderedTextByNode = new WeakMap();
  const sourceAttrsByElement = new WeakMap();
  const renderedAttrsByElement = new WeakMap();
  type LocaleSubscriber = (detail: Record<string, any>) => void;
  type CompiledPattern = { regex: RegExp; target: string };

  const subscribers = new Set<LocaleSubscriber>();

  let currentLanguage = DEFAULT_LANGUAGE;
  let currentLocaleTag = 'de-DE';
  let currentCountry = 'DE';
  let currentCountryProfile: Record<string, any> = {};
  let currentLocaleSource = 'fallback';
  let currentCatalog: Record<string, any> = { meta: {}, messages: {}, text: {}, patterns: [] };
  let compiledPatterns: CompiledPattern[] = [];
  let observer: MutationObserver | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let initialized = false;
  let refreshRunning = false;
  let marketApplyQueued = false;
  let broadcastChannel: BroadcastChannel | null = null;

  function normalizeLanguage(raw: any) {
    const value = String(raw || '').trim().toLowerCase().replace('_', '-');
    const short = value.split('-')[0] || DEFAULT_LANGUAGE;
    return SUPPORTED_LANGUAGES.has(short) ? short : DEFAULT_LANGUAGE;
  }

  function normalizeCountry(raw: any) {
    return String(raw || '').trim().toUpperCase() === 'NL' ? 'NL' : 'DE';
  }

  function localeTagForLanguage(language: any) {
    const lang = normalizeLanguage(language);
    if (lang === 'nl') return 'nl-NL';
    if (lang === 'en') return 'en-GB';
    return 'de-DE';
  }

  async function fetchJson(url: any) {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function loadCatalog(language: any) {
    const lang = normalizeLanguage(language);
    try {
      const data = await fetchJson(`/static/i18n/${encodeURIComponent(lang)}.json?v=${encodeURIComponent(CATALOG_VERSION)}`);
      return (data && typeof data === 'object') ? data : { meta: {}, messages: {}, text: {}, patterns: [] };
    } catch (_e) {
      if (lang !== DEFAULT_LANGUAGE) {
        try {
          const fallback = await fetchJson(`/static/i18n/${DEFAULT_LANGUAGE}.json?v=${encodeURIComponent(CATALOG_VERSION)}`);
          return (fallback && typeof fallback === 'object') ? fallback : { meta: {}, messages: {}, text: {}, patterns: [] };
        } catch (_e2) {}
      }
      return { meta: {}, messages: {}, text: {}, patterns: [] };
    }
  }

  function compilePatterns(catalog: any) {
    const rows = Array.isArray(catalog && catalog.patterns) ? catalog.patterns : [];
    compiledPatterns = rows.map((row: any) => {
      try {
        const source = String(row && row.source || '');
        if (!source) return null;
        return { regex: new RegExp(source, 'u'), target: String(row && row.target || '') };
      } catch (_e) {
        return null;
      }
    }).filter(Boolean);
  }

  function interpolate(value: any, params: any) {
    let text = String(value == null ? '' : value);
    const p = params && typeof params === 'object' ? params : {};
    for (const [key, val] of Object.entries(p)) {
      text = text.replace(new RegExp(`\\{${String(key).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\}`, 'g'), String(val == null ? '' : val));
    }
    return text;
  }

  function t(key: any, params: any, fallback: any) {
    const messages = currentCatalog && currentCatalog.messages && typeof currentCatalog.messages === 'object'
      ? currentCatalog.messages as Record<string, any>
      : {} as Record<string, any>;
    const value = Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] : (fallback !== undefined ? fallback : key);
    return interpolate(value, params);
  }

  function translateTrimmedText(trimmed: any) {
    if (!trimmed || currentLanguage === DEFAULT_LANGUAGE) return trimmed;
    const normalized = String(trimmed).replace(/\s+/g, ' ').trim();
    const map = currentCatalog && currentCatalog.text && typeof currentCatalog.text === 'object'
      ? currentCatalog.text as Record<string, any>
      : {} as Record<string, any>;
    if (Object.prototype.hasOwnProperty.call(map, normalized)) return String(map[normalized]);
    for (const row of compiledPatterns) {
      if (row.regex.test(normalized)) return normalized.replace(row.regex, row.target);
    }
    return trimmed;
  }

  function translateRawText(raw: any) {
    const input = String(raw == null ? '' : raw);
    if (!input.trim() || currentLanguage === DEFAULT_LANGUAGE) return input;
    const leading = (input.match(/^\s*/) || [''])[0];
    const trailing = (input.match(/\s*$/) || [''])[0];
    const core = input.slice(leading.length, input.length - trailing.length);
    const translated = translateTrimmedText(core);
    return `${leading}${translated}${trailing}`;
  }

  function shouldSkipNode(node: any) {
    const parent = node && node.parentElement;
    if (!parent) return false;
    if (SKIP_TAGS.has(parent.tagName)) return true;
    if (parent.closest && parent.closest('[data-nw-i18n-ignore="true"]')) return true;
    return false;
  }

  function translateTextNode(node: any, captureSource: any) {
    if (!node || node.nodeType !== Node.TEXT_NODE || shouldSkipNode(node)) return;
    const current = String(node.nodeValue == null ? '' : node.nodeValue);
    if (captureSource || !sourceTextByNode.has(node)) sourceTextByNode.set(node, current);
    const source = String(sourceTextByNode.get(node) == null ? '' : sourceTextByNode.get(node));
    const desired = translateRawText(source);
    if (current !== desired) {
      renderedTextByNode.set(node, desired);
      node.nodeValue = desired;
    } else {
      renderedTextByNode.set(node, desired);
    }
  }

  function getAttrStore(map: any, element: any) {
    let store = map.get(element);
    if (!store) {
      store = new Map();
      map.set(element, store);
    }
    return store;
  }

  function translateAttribute(element: any, attr: any, captureSource: any) {
    if (!element || !element.getAttribute || !element.hasAttribute(attr)) return;
    if (element.closest && element.closest('[data-nw-i18n-ignore="true"]')) return;
    const sourceStore = getAttrStore(sourceAttrsByElement, element);
    const renderedStore = getAttrStore(renderedAttrsByElement, element);
    const current = String(element.getAttribute(attr) || '');
    if (captureSource || !sourceStore.has(attr)) sourceStore.set(attr, current);
    const source = String(sourceStore.get(attr) || '');
    const desired = translateRawText(source);
    if (current !== desired) element.setAttribute(attr, desired);
    renderedStore.set(attr, desired);
  }

  function applyDataI18n(element: any) {
    if (!element || !element.getAttribute) return;
    const key = element.getAttribute('data-i18n');
    if (key) {
      const fallback = element.getAttribute('data-i18n-fallback') || element.textContent || key;
      const desired = t(key, null, fallback);
      if (element.textContent !== desired) element.textContent = desired;
    }
    for (const attr of TEXT_ATTRS) {
      const attrKey = element.getAttribute(`data-i18n-${attr}`);
      if (!attrKey) continue;
      const fallback = element.getAttribute(attr) || attrKey;
      const desired = t(attrKey, null, fallback);
      if (element.getAttribute(attr) !== desired) element.setAttribute(attr, desired);
    }
  }

  function applyTranslations(root: any, captureSource: any = false) {
    const scope = root && root.nodeType ? root : document;
    if (scope.nodeType === Node.TEXT_NODE) {
      translateTextNode(scope, captureSource);
      return;
    }
    if (scope.nodeType === Node.ELEMENT_NODE) {
      applyDataI18n(scope);
      for (const attr of TEXT_ATTRS) translateAttribute(scope, attr, captureSource);
    }
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      translateTextNode(textNode, captureSource);
      textNode = walker.nextNode();
    }
    if (scope.querySelectorAll) {
      const elements = scope.querySelectorAll('[data-i18n], [data-i18n-title], [data-i18n-aria-label], [data-i18n-placeholder], [title], [aria-label], [placeholder]');
      for (const element of elements) {
        applyDataI18n(element);
        for (const attr of TEXT_ATTRS) translateAttribute(element, attr, captureSource);
      }
    }
    queueMarketProfileApply();
  }

  function setMarketHidden(element: any, hidden: any) {
    if (!element || !element.classList) return;
    element.classList.toggle('nw-market-hidden', !!hidden);
    element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
  }

  function applyMarketProfile() {
    marketApplyQueued = false;
    const html = document.documentElement;
    if (html) {
      html.setAttribute('lang', currentLanguage);
      html.dataset.nwLanguage = currentLanguage;
      html.dataset.nwLocale = currentLocaleTag;
      html.dataset.nwCountry = currentCountry;
      html.dataset.nwI18nReady = 'true';
    }

    const languageDisplay = document.getElementById('countryProfileLanguageDisplay');
    if (languageDisplay && 'value' in languageDisplay) {
      languageDisplay.value = currentLanguage === 'nl'
        ? 'Nederlands (nl)'
        : (currentLanguage === 'en' ? 'English (en)' : 'Deutsch (de)');
    }

    const isNl = currentCountry === 'NL';
    document.querySelectorAll('[data-nw-market="DE"]').forEach((el: any) => setMarketHidden(el, isNl));
    document.querySelectorAll('[data-nw-market="NL"]').forEach((el: any) => setMarketHidden(el, !isNl));

    const deOnlySelectors = [
      '#ems14aRow',
      '#para14aShortWrap',
      '[data-tab="para14a"]',
      '[data-tabpanel="para14a"]',
      '[data-app="para14a"]',
    ];
    for (const selector of deOnlySelectors) {
      document.querySelectorAll(selector).forEach((el: any) => setMarketHidden(el, isNl));
    }
  }

  function queueMarketProfileApply() {
    if (marketApplyQueued) return;
    marketApplyQueued = true;
    Promise.resolve().then(applyMarketProfile);
  }

  function notifyLanguageChange(previousLanguage: any) {
    const detail = {
      language: currentLanguage,
      previousLanguage,
      locale: currentLocaleTag,
      country: currentCountry,
      countryProfile: currentCountryProfile,
      source: currentLocaleSource,
    };
    try { global.dispatchEvent(new CustomEvent('nexowatt:languagechange', { detail })); } catch (_e) {}
    for (const fn of subscribers) {
      try { fn(detail); } catch (_e) {}
    }
    try {
      if (broadcastChannel) broadcastChannel.postMessage({ type: 'language', detail });
    } catch (_e) {}
  }

  async function activateLocale(payload: any, force: any = false) {
    const locale = payload && payload.locale && typeof payload.locale === 'object' ? payload.locale : (payload || {});
    const profile = payload && payload.countryProfile && typeof payload.countryProfile === 'object' ? payload.countryProfile : {};
    const nextLanguage = normalizeLanguage(locale.htmlLang || locale.language || profile.effectiveLanguage || DEFAULT_LANGUAGE);
    const nextCountry = normalizeCountry(profile.country || locale.country || 'DE');
    const nextLocaleTag = localeTagForLanguage(nextLanguage);
    const changed = force || nextLanguage !== currentLanguage || nextCountry !== currentCountry;
    const previousLanguage = currentLanguage;

    currentCountry = nextCountry;
    currentCountryProfile = profile;
    currentLocaleSource = String(locale.source || profile.languageSource || 'system.config.common.language');
    try {
      global.__nwLocale = Object.assign({}, locale, {
        language: nextLanguage,
        htmlLang: nextLanguage,
        localeTag: nextLocaleTag,
        country: nextCountry,
        source: currentLocaleSource,
      });
      global.__nwCountryProfile = Object.assign({}, profile, { country: nextCountry });
    } catch (_e) {}

    if (nextLanguage !== currentLanguage || force) {
      currentCatalog = await loadCatalog(nextLanguage);
      currentLanguage = nextLanguage;
      currentLocaleTag = nextLocaleTag;
      compilePatterns(currentCatalog);
    } else {
      currentLocaleTag = nextLocaleTag;
    }

    if (changed) {
      applyTranslations(document, false);
      notifyLanguageChange(previousLanguage);
    } else {
      queueMarketProfileApply();
    }
    return changed;
  }

  async function refreshLocale(force: any = false) {
    if (refreshRunning) return false;
    refreshRunning = true;
    try {
      let payload = null;
      try {
        payload = await fetchJson(`/api/locale?ts=${Date.now()}`);
      } catch (_e) {
        const config = await fetchJson(`/config?localeOnly=1&ts=${Date.now()}`);
        payload = { locale: config && config.locale, countryProfile: config && config.countryProfile };
      }
      return await activateLocale(payload || {}, force);
    } catch (_e) {
      if (!initialized) await activateLocale({ locale: { language: document.documentElement.lang || navigator.language || DEFAULT_LANGUAGE }, countryProfile: { country: 'DE' } }, true);
      return false;
    } finally {
      refreshRunning = false;
    }
  }

  function startObserver() {
    if (observer || !document.documentElement) return;
    observer = new MutationObserver((mutations: any) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          const node = mutation.target;
          const rendered = renderedTextByNode.get(node);
          if (rendered === node.nodeValue) continue;
          translateTextNode(node, true);
          continue;
        }
        if (mutation.type === 'attributes') {
          const element = mutation.target;
          const attr = mutation.attributeName;
          if (!TEXT_ATTRS.includes(attr)) continue;
          const renderedStore = renderedAttrsByElement.get(element);
          if (renderedStore && renderedStore.get(attr) === element.getAttribute(attr)) continue;
          translateAttribute(element, attr, true);
          continue;
        }
        for (const node of mutation.addedNodes || []) applyTranslations(node, true);
      }
      queueMarketProfileApply();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TEXT_ATTRS,
    });
  }

  function ensureStyle() {
    if (document.getElementById('nwI18nRuntimeStyle')) return;
    const style = document.createElement('style');
    style.id = 'nwI18nRuntimeStyle';
    style.textContent = '.nw-market-hidden{display:none!important;}';
    (document.head || document.documentElement).appendChild(style);
  }

  function formatNumber(value: any, options: any) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value == null ? '—' : value);
    try { return new Intl.NumberFormat(currentLocaleTag, options || {}).format(n); } catch (_e) { return String(n); }
  }

  function formatDate(value: any, options: any) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    try { return new Intl.DateTimeFormat(currentLocaleTag, options || {}).format(date); } catch (_e) { return date.toISOString(); }
  }

  function subscribe(fn: LocaleSubscriber) {
    if (typeof fn !== 'function') return () => {};
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  async function setLanguageForPreview(language: any) {
    const lang = normalizeLanguage(language);
    await activateLocale({ locale: { language: lang, htmlLang: lang, source: 'preview' }, countryProfile: currentCountryProfile }, true);
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    ensureStyle();
    startObserver();
    applyTranslations(document, true);
    try {
      if ('BroadcastChannel' in global) {
        broadcastChannel = new BroadcastChannel('nexowatt-system-language');
        broadcastChannel.addEventListener('message', (event: any) => {
          if (event && event.data && event.data.type === 'language') refreshLocale(false).catch(() => {});
        });
      }
    } catch (_e) {}
    await refreshLocale(true);
    pollTimer = global.setInterval(() => refreshLocale(false).catch(() => {}), POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshLocale(false).catch(() => {});
    });
  }

  global.NexoWattI18n = {
    init,
    refresh: refreshLocale,
    apply: applyTranslations,
    t,
    translateText: translateRawText,
    language: () => currentLanguage,
    localeTag: () => currentLocaleTag,
    country: () => currentCountry,
    countryProfile: () => currentCountryProfile,
    localeSource: () => currentLocaleSource,
    formatNumber,
    formatDate,
    subscribe,
    setLanguageForPreview,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window);
