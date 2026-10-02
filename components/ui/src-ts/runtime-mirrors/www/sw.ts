// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: www/sw.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * www/sw.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: 9e74296d13d8b2afd3b933538157224388dc12989703870e59f0363b9aad39d2
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/sw.ts
 * Quell-Hash: sha256:9eb27973acc0f7d1adfd0c4e1257e6e005e542f72e5dad7b6867ba9e3fcc4690
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/sw.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Speichert ausschließlich öffentliche statische EOS-Assets; geschützte Seiten und Daten erfordern stets eine aktuelle Serverantwort.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/sw.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/sw.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/sw.js`.
 *
 * Build-Regel:
 * `npm run sync:ts-runtime-executables` erzeugt daraus die auslieferbare
 * JavaScript-Datei. Änderungen an der Runtime sollen hier vorgenommen werden;
 * die JS-Datei ist nur noch Build-Artefakt für Node.js/ioBroker bzw. den Browser.
 *
 * Sicherheit:
 * Der Inhalt basiert auf der bisher produktiven JavaScript-Runtime und bleibt
 * vorübergehend mit `@ts-nocheck` ausführbar. Fachliche TS-Helfer wie EVCS,
 * Energiefluss, Core-Limits und Heizstab bleiben die bereits typisierten Quellen.
 */

/**
 * Datei: www/sw.js
 * Rolle im Projekt: Service Worker.
 * Zweck: PWA-Cache für öffentliche Assets ohne Offline-Zugriff auf geschützte Seiten oder Daten.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: Service Worker/PWA-Cache: legt fest, welche UI-Dateien offline bzw. schneller geladen werden.
 * Zusammenhänge:
 * - Cache-Version muss bei jedem Frontend-Release erhöht werden.
 * - Greift auf Dateien aus www/ zu.
 * Wartungshinweise:
 * - Fehlerhafte Cache-Listen können alte UI-Dateien ausliefern; nach Änderungen immer Cache-Version erhöhen.
 */

// EOS-AUTH-CACHE-01: protected pages and data always revalidate on the server.
// Increment this version when migrating an earlier, more permissive cache policy.
const CACHE_NAME = 'nexowatt-cache-v520';

/** Only inert public files can survive a session change; never HTML or JSON. */
function isPublicAsset(url) {
  return url.origin === self.location.origin && !url.search
    && (['/favicon.ico', '/apple-touch-icon.png'].includes(url.pathname)
      || /^\/(?:static|assets)\/.*\.(?:js|mjs|css|png|ico|svg|jpg|jpeg|webp|woff2?)$/i.test(url.pathname));
}

/** No protected pre-cache: installation also succeeds on the login screen. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

/** Remove earlier EOS caches before taking control, including old HTML/JSON. */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('nexowatt-cache-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

/**
 * Same-origin GETs outside the public asset contract are network-only, with no
 * HTTP-cache or CacheStorage fallback. An offline response cannot impersonate a
 * previously authenticated page. Writes and SSE retain their native transport.
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname === '/events') return;
/**
 * Code-Teil: offline
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
  const offline = () => new Response('', { status: 503, statusText: 'Offline',
    headers: { 'Cache-Control': 'no-store' } });

  if (!isPublicAsset(url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(offline));
    return;
  }

  // Network-first keeps shipped assets current. Only successful, unredirected
  // same-origin assets enter this version's cache; an auth error never does.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(req, { cache: 'no-store' });
      if (response.ok && response.type === 'basic' && !response.redirected) {
        await cache.put(req, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      return await cache.match(req) || offline();
    }
  })());
});
