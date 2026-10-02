/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/www/logic.ts
 * Quell-Hash: sha256:3e81ce23d904390f502d2e85cc8613b64d54c9fc390de1dca632c4bec2178466
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für www/logic.js.
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
 * Aufgabe: Stellt die NexoLogic-Konfiguration und die damit verbundenen Browser-Bedienaktionen bereit.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/www/logic.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Executable TypeScript source: www/logic.js
 *
 * Zweck:
 * Diese Datei ist ab 0.7.131 die kanonische TypeScript-Quelle der produktiven
 * Adapter-/Frontend-Runtime-Datei `www/logic.js`.
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
 * NexoWatt Detail-Kommentar (DE)
 * Zweck dieser Ergänzung:
 * - Jede relevante Funktion, Methode, Route und UI-Ereignisbindung erhält einen eigenen Erklärungskommentar.
 * - Die Kommentare beschreiben Aufgabe, Daten-/API-Zusammenhang und TypeScript-Migrationshinweise.
 * - Es wurde keine Programmlogik geändert; diese Datei wurde nur für Wartbarkeit und spätere Typisierung dokumentiert.
 */

/**
 * Datei: www/logic.js
 * Rolle im Projekt: NexoLogic-Frontend.
 * Zweck: Stellt den visuellen Logik-Editor für Automatisierungen bereit.
 * Wartung: Die folgenden Abschnitts-Kommentare erklären die einzelnen Code-Teile.
 * TypeScript-Plan: Beim nächsten fachlichen Umbau werden diese Blöcke schrittweise in .ts/.tsx überführt.
 */
/**
 * NexoWatt Code-Kommentar (DE)
 * Zweck: NexoLogic-Editor für Endkunden, Installer und Admin: visuelle Logikblöcke, Verbindungen und Speicherung der Automationslogik.
 * Zusammenhänge:
 * - Spricht mit /api/logic/* in main.js.
 * - Runtime-Ausführung erfolgt über ems/nexologic-engine.js.
 * Wartungshinweise:
 * - Endkunden dürfen SmartHome-Logiken erstellen und koppeln. EMS, Lizenz und Simulation bleiben separat geschützt.
 */

/* NexoLogic – Node/Graph Logik-Editor (Basis) */

// -----------------------------
// Helpers
// -----------------------------
const nwLE = {
  cfg: null,
  graph: null,
  graphId: null,
  lib: null,
  el: {},

  zoom: 1,

  selectedNodeId: null,
  dragging: null,
  connecting: null,
  paletteDragType: null,
  lastPaletteDropAt: 0,
  dirty: false,
  lastSaveOk: true,

  // Undo/Redo, lokaler Entwurf und schreibfreie Browser-Simulation.
  history: {
    undo: [],
    redo: [],
    lastSerialized: '',
    suppress: false,
    timer: null,
    maxEntries: 60,
  },
  draft: {
    timer: null,
    lastSavedAt: 0,
    restored: false,
  },
  simulation: {
    active: false,
    running: false,
    timer: null,
    nowMs: Date.now(),
    lastEvalMs: null,
    initialized: false,
    inputs: {},
    inputTypes: {},
    nodeState: {},
    outputs: {},
    traces: [],
    maxTrace: 240,
    inputSignature: '',
  },

  // SmartHome scenes for scene-trigger block
  sceneOptions: [],
};


/**
 * Hält die Desktop-Arbeitsfläche exakt innerhalb des sichtbaren Browser-Viewports.
 * Die frühere feste 68-px-Annahme konnte je nach Headerhöhe dazu führen, dass die
 * unteren Scrollleisten hinter der Fensterkante lagen. Die echte Topbarhöhe wird
 * deshalb als CSS-Variable veröffentlicht und bei Resize/Zoom nachgeführt.
 */
function nwSyncLogicViewportMetrics() {
  try {
    const topbar = document.querySelector('header.topbar');
    const topbarHeight = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 68;
    document.documentElement.style.setProperty('--nw-logic-topbar-h', `${Math.max(0, topbarHeight)}px`);
  } catch (_e) {
    // CSS-Fallback bleibt aktiv.
  }
}

function nwInstallLogicViewportSizing() {
  nwSyncLogicViewportMetrics();
  try {
    const topbar = document.querySelector('header.topbar');
    if (topbar && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        nwSyncLogicViewportMetrics();
        try { nwUpdateAllWirePaths(); } catch (_e) {}
      });
      observer.observe(topbar);
      nwLE.viewportObserver = observer;
    }
  } catch (_e) {}
  window.addEventListener('resize', nwSyncLogicViewportMetrics, { passive: true });
  try {
    if (window.visualViewport) window.visualViewport.addEventListener('resize', nwSyncLogicViewportMetrics, { passive: true });
  } catch (_e) {}
}

/**
 * Code-Teil: Arrow-Funktion `nwClamp`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: nwClamp
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const nwClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/**
 * Code-Teil: nwNow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const nwNow = () => Date.now();
/**
 * Code-Teil: nwUuid
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const nwUuid = (pref) => {
  const r = Math.random().toString(16).slice(2);
  return `${pref}_${nwNow().toString(16)}_${r}`;
};

/**
 * Code-Teil: Arrow-Funktion `nwSafeStr`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: nwSafeStr
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const nwSafeStr = (v) => (v === undefined || v === null) ? '' : String(v);

function nwEscapeHtml(value) {
  return nwSafeStr(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Code-Teil: nwBool
 * Zweck: Kapselt einen klar abgegrenzten Verarbeitungsschritt innerhalb dieser Datei.
 * Zusammenhang: Gehört zu Web-Frontend (statische Kunden-/Installer-Seite im Adapter-Webserver) und wird von benachbarten UI-/API-/EMS-Bausteinen genutzt.
 * Wartung/TypeScript: Änderungen an Signatur oder Rückgabe können abhängige Aufrufer beeinflussen; Aufrufstellen mitprüfen. Beim TS-Umbau Parameter, Rückgabe und genutzte State-/Config-Objekte explizit typisieren.
 */
const nwBool = (v, def = false) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (!s) return def;
    if (['1','true','yes','ja','on','an'].includes(s)) return true;
    if (['0','false','no','nein','off','aus'].includes(s)) return false;
  }
  return def;
};

/**
 * Code-Teil: Arrow-Funktion `nwNum`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
const nwNum = (v, def = 0) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : def;
  }
  return def;
};

/**
 * Code-Teil: Arrow-Funktion `nwJsonClone`
 * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
 * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
 * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
 */
/**
 * Code-Teil: nwJsonClone
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
const nwJsonClone = (o) => {
  try { return JSON.parse(JSON.stringify(o)); } catch (_e) { return null; }
};

// -----------------------------
// Editor-Historie und lokaler Entwurf
// -----------------------------
function nwSerializeEditorConfig(cfg) {
  try { return JSON.stringify(cfg || {}); } catch (_e) { return ''; }
}

function nwUpdateHistoryButtons() {
  const h = nwLE.history || {};
  if (nwLE.el.undoBtn) nwLE.el.undoBtn.disabled = !Array.isArray(h.undo) || h.undo.length <= 1;
  if (nwLE.el.redoBtn) nwLE.el.redoBtn.disabled = !Array.isArray(h.redo) || h.redo.length === 0;
}

function nwHistorySnapshot(label) {
  const cfg = nwJsonClone(nwLE.cfg || nwDefaultGraph()) || nwDefaultGraph();
  return {
    label: String(label || 'Änderung'),
    at: Date.now(),
    graphId: nwLE.graphId || (nwLE.graph && nwLE.graph.id) || 'main',
    cfg,
    serialized: nwSerializeEditorConfig(cfg),
  };
}

function nwHistoryReset(label = 'Geladen') {
  const snapshot = nwHistorySnapshot(label);
  nwLE.history.undo = [snapshot];
  nwLE.history.redo = [];
  nwLE.history.lastSerialized = snapshot.serialized;
  if (nwLE.history.timer) {
    clearTimeout(nwLE.history.timer);
    nwLE.history.timer = null;
  }
  nwUpdateHistoryButtons();
}

function nwHistoryCommit(label = 'Änderung') {
  if (nwLE.history.suppress) return;
  if (nwLE.history.timer) {
    clearTimeout(nwLE.history.timer);
    nwLE.history.timer = null;
  }
  const snapshot = nwHistorySnapshot(label);
  if (!snapshot.serialized || snapshot.serialized === nwLE.history.lastSerialized) {
    nwUpdateHistoryButtons();
    return;
  }
  nwLE.history.undo = Array.isArray(nwLE.history.undo) ? nwLE.history.undo : [];
  nwLE.history.undo.push(snapshot);
  const max = Math.max(10, Number(nwLE.history.maxEntries) || 60);
  if (nwLE.history.undo.length > max) nwLE.history.undo.splice(0, nwLE.history.undo.length - max);
  nwLE.history.redo = [];
  nwLE.history.lastSerialized = snapshot.serialized;
  nwUpdateHistoryButtons();
}

function nwHistoryScheduleCommit(label = 'Änderung') {
  if (nwLE.history.suppress) return;
  if (nwLE.history.timer) clearTimeout(nwLE.history.timer);
  nwLE.history.timer = setTimeout(() => nwHistoryCommit(label), 180);
}

function nwHistoryApply(snapshot, statusText) {
  if (!snapshot || !snapshot.cfg) return;
  nwLE.history.suppress = true;
  try {
    nwLE.cfg = nwEnsureConfigDefaults(nwJsonClone(snapshot.cfg) || nwDefaultGraph());
    nwLE.selectedNodeId = null;
    nwRenderGraphSelector();
    nwSelectGraph(snapshot.graphId || 'main', { skipRender: true });
    nwRenderGraph();
    nwRenderInspector();
    nwLE.history.lastSerialized = nwSerializeEditorConfig(nwLE.cfg);
    nwLE.dirty = true;
    nwSetStatus(statusText || 'Änderung wiederhergestellt.', false);
    nwScheduleLocalDraft();
    if (nwLE.simulation.active) nwSimReset(false);
  } finally {
    nwLE.history.suppress = false;
  }
  nwUpdateHistoryButtons();
}

function nwUndo() {
  nwHistoryCommit('Änderung');
  if (!Array.isArray(nwLE.history.undo) || nwLE.history.undo.length <= 1) return;
  const current = nwLE.history.undo.pop();
  nwLE.history.redo = Array.isArray(nwLE.history.redo) ? nwLE.history.redo : [];
  nwLE.history.redo.push(current);
  nwHistoryApply(nwLE.history.undo[nwLE.history.undo.length - 1], 'Rückgängig ausgeführt.');
}

function nwRedo() {
  if (!Array.isArray(nwLE.history.redo) || !nwLE.history.redo.length) return;
  const snapshot = nwLE.history.redo.pop();
  nwLE.history.undo = Array.isArray(nwLE.history.undo) ? nwLE.history.undo : [];
  nwLE.history.undo.push(snapshot);
  nwHistoryApply(snapshot, 'Wiederholen ausgeführt.');
}

function nwDraftStorageKey() {
  return 'nexowatt-eos.nexologic.local-draft.v1';
}

function nwUpdateDraftStatus(text) {
  if (nwLE.el.draftStatus) nwLE.el.draftStatus.textContent = String(text || '');
}

function nwWriteLocalDraftNow() {
  if (nwLE.history.suppress) return;
  if (nwLE.draft.timer) {
    clearTimeout(nwLE.draft.timer);
    nwLE.draft.timer = null;
  }
  try {
    const payload = {
      schemaVersion: 1,
      savedAt: Date.now(),
      graphId: nwLE.graphId || 'main',
      cfg: nwJsonClone(nwLE.cfg || nwDefaultGraph()),
    };
    localStorage.setItem(nwDraftStorageKey(), JSON.stringify(payload));
    nwLE.draft.lastSavedAt = payload.savedAt;
    nwUpdateDraftStatus('Entwurf lokal gesichert');
  } catch (_e) {
    nwUpdateDraftStatus('Lokaler Entwurf nicht verfügbar');
  }
}

function nwScheduleLocalDraft() {
  if (nwLE.history.suppress) return;
  if (nwLE.draft.timer) clearTimeout(nwLE.draft.timer);
  nwLE.draft.timer = setTimeout(() => nwWriteLocalDraftNow(), 550);
}

function nwClearLocalDraft() {
  if (nwLE.draft.timer) {
    clearTimeout(nwLE.draft.timer);
    nwLE.draft.timer = null;
  }
  try { localStorage.removeItem(nwDraftStorageKey()); } catch (_e) {}
  nwUpdateDraftStatus('');
}

function nwMaybeRestoreLocalDraft(serverCfg) {
  try {
    const raw = localStorage.getItem(nwDraftStorageKey());
    if (!raw) return serverCfg;
    const draft = JSON.parse(raw);
    if (!draft || draft.schemaVersion !== 1 || !draft.cfg || typeof draft.cfg !== 'object') return serverCfg;
    const draftSerialized = nwSerializeEditorConfig(draft.cfg);
    const serverSerialized = nwSerializeEditorConfig(serverCfg);
    if (!draftSerialized || draftSerialized === serverSerialized) {
      localStorage.removeItem(nwDraftStorageKey());
      return serverCfg;
    }
    const serverUpdatedAt = Number(serverCfg && serverCfg.updatedAt) || 0;
    const draftSavedAt = Number(draft.savedAt) || 0;
    if (serverUpdatedAt > 0 && draftSavedAt <= serverUpdatedAt) return serverCfg;
    if (draftSavedAt > 0 && (Date.now() - draftSavedAt) > 14 * 24 * 3600_000) return serverCfg;
    const restore = confirm('Es gibt einen neueren lokal gesicherten NexoLogic-Entwurf. Soll er wiederhergestellt werden?');
    if (!restore) return serverCfg;
    nwLE.graphId = draft.graphId || nwLE.graphId || 'main';
    nwLE.draft.restored = true;
    nwUpdateDraftStatus('Lokalen Entwurf wiederhergestellt');
    return nwEnsureConfigDefaults(draft.cfg);
  } catch (_e) {
    return serverCfg;
  }
}

const NW_LE_NODE_W = 240;
const NW_LE_NODE_DROP_OFFSET_Y = 24;
const NW_LE_NODE_H_ESTIMATE = 150;
const NW_LE_NODE_GAP_X = 110;
const NW_LE_NODE_GAP_Y = 24;

// -----------------------------
// Geordnete Spuren und automatische Anordnung
// -----------------------------
function nwNodeLane(type) {
  const def = nwLE.lib && nwLE.lib.byType ? nwLE.lib.byType[type] : null;
  if (type === 'scene_trigger' || type === 'dp_out') return 'output';
  if (def && def.category === 'Eingänge') return 'input';
  if (def && def.category === 'Ausgänge') return 'output';
  return 'logic';
}

function nwEstimatedNodeHeight(type) {
  const def = nwLE.lib && nwLE.lib.byType ? nwLE.lib.byType[type] : null;
  if (!def) return NW_LE_NODE_H_ESTIMATE;
  const inputCount = Array.isArray(def.inputs) ? def.inputs.length : 0;
  const outputCount = Array.isArray(def.outputs) ? def.outputs.length : 0;
  const portRows = Math.max(1, inputCount, outputCount);
  // Reserve enthält auch die im Testmodus eingeblendeten Live-Wert-Badges.
  // Dadurch bleibt die Auto-Anordnung beim Öffnen der Simulation überlappungsfrei.
  const liveRows = Math.max(1, Math.ceil(Math.max(1, outputCount) / 2));
  return Math.max(NW_LE_NODE_H_ESTIMATE, 65 + portRows * 36 + liveRows * 28 + 20);
}

function nwLaneBounds(g = nwLE.graph) {
  const w = Math.max(2400, Number(g && g.board && g.board.w) || 2400);
  const input = { left: 60, right: 360 };
  const output = { left: Math.max(1660, w - 360), right: w - 60 };
  const logic = { left: input.right + 90, right: output.left - 90 };
  return { w, input, logic, output };
}

function nwUpdateLaneGuides() {
  const g = nwLE.graph;
  const board = nwLE.el.board;
  if (!g || !board) return;
  const bounds = nwLaneBounds(g);
  const rows = [
    ['input', bounds.input, 'EINGÄNGE'],
    ['logic', bounds.logic, 'LOGIK / FUNKTION'],
    ['output', bounds.output, 'AUSGÄNGE'],
  ];
  for (const [lane, range, label] of rows) {
    const el = board.querySelector(`.nw-le__lane[data-lane="${lane}"]`);
    if (!el) continue;
    el.style.left = `${Math.round(range.left)}px`;
    el.style.width = `${Math.max(120, Math.round(range.right - range.left))}px`;
    el.setAttribute('aria-label', label);
  }
}

function nwNodeRectsOverlap(a, b) {
  return !(a.x + a.w + NW_LE_NODE_GAP_X <= b.x || b.x + b.w + NW_LE_NODE_GAP_X <= a.x || a.y + a.h + NW_LE_NODE_GAP_Y <= b.y || b.y + b.h + NW_LE_NODE_GAP_Y <= a.y);
}

function nwFindFreeLanePosition(type, g = nwLE.graph) {
  if (!g) return { x: 80, y: 80 };
  nwEnsureGraphDefaults(g);
  const lane = nwNodeLane(type);
  const bounds = nwLaneBounds(g);
  const existing = (g.nodes || []).map((node) => ({
    x: Number(node.x) || 0,
    y: Number(node.y) || 0,
    w: NW_LE_NODE_W,
    h: nwEstimatedNodeHeight(node.type),
  }));

  let columns = [];
  if (lane === 'input') columns = [bounds.input.left + 20];
  else if (lane === 'output') columns = [bounds.output.left + 20];
  else {
    const usable = Math.max(NW_LE_NODE_W, bounds.logic.right - bounds.logic.left - NW_LE_NODE_W);
    const colCount = Math.max(1, Math.min(4, Math.floor(usable / (NW_LE_NODE_W + NW_LE_NODE_GAP_X)) + 1));
    const spacing = colCount > 1 ? usable / (colCount - 1) : 0;
    columns = Array.from({ length: colCount }, (_v, idx) => bounds.logic.left + idx * spacing);
  }

  for (let row = 0; row < 120; row += 1) {
    for (let col = 0; col < columns.length; col += 1) {
      const candidate = {
        x: Math.round(columns[col]),
        y: 72 + row * (NW_LE_NODE_H_ESTIMATE + 34),
        w: NW_LE_NODE_W,
        h: nwEstimatedNodeHeight(type),
      };
      if (!existing.some((rect) => nwNodeRectsOverlap(candidate, rect))) {
        const neededH = candidate.y + candidate.h + 120;
        if (neededH > Number(g.board.h || 0)) g.board.h = Math.max(1400, neededH);
        return nwClampNodePosition(candidate.x, candidate.y, g);
      }
    }
  }
  g.board.h = Math.max(1400, Number(g.board.h || 1400) + 500);
  return nwClampNodePosition(columns[0] || 80, Number(g.board.h) - 420, g);
}

function nwScrollNodeIntoView(node) {
  const wrap = nwLE.el.boardWrap;
  if (!wrap || !node) return;
  const z = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);
  const left = Math.max(0, Number(node.x) * z - Math.max(30, (wrap.clientWidth - NW_LE_NODE_W * z) / 2));
  const top = Math.max(0, Number(node.y) * z - Math.max(30, (wrap.clientHeight - nwEstimatedNodeHeight(node.type) * z) / 2));
  try { wrap.scrollTo({ left, top, behavior: 'smooth' }); }
  catch (_e) { wrap.scrollLeft = left; wrap.scrollTop = top; }
}

function nwAutoLayoutGraph() {
  const g = nwLE.graph;
  if (!g) return;
  nwEnsureGraphDefaults(g);
  const nodes = Array.isArray(g.nodes) ? g.nodes.filter(Boolean) : [];
  if (!nodes.length) {
    nwSetStatus('Keine Bausteine zum Anordnen.', false);
    return;
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const parents = new Map(nodes.map((node) => [node.id, []]));
  const children = new Map(nodes.map((node) => [node.id, []]));
  for (const link of (g.links || [])) {
    const from = link && link.from && nodeMap.get(link.from.node);
    const to = link && link.to && nodeMap.get(link.to.node);
    if (!from || !to) continue;
    parents.get(to.id).push(from.id);
    children.get(from.id).push(to.id);
  }

  const depth = new Map();
  for (const node of nodes) {
    const lane = nwNodeLane(node.type);
    if (lane === 'input') depth.set(node.id, 0);
    else depth.set(node.id, 1);
  }
  for (let pass = 0; pass < nodes.length + 2; pass += 1) {
    let changed = false;
    for (const node of nodes) {
      if (nwNodeLane(node.type) !== 'logic') continue;
      const p = parents.get(node.id) || [];
      if (!p.length) continue;
      const next = Math.max(1, ...p.map((id) => (depth.get(id) || 0) + 1));
      if (next !== depth.get(node.id)) { depth.set(node.id, next); changed = true; }
    }
    if (!changed) break;
  }

  const isolated = nodes.filter((node) => nwNodeLane(node.type) === 'logic' && !(parents.get(node.id) || []).length && !(children.get(node.id) || []).length);
  isolated.sort((a, b) => (Number(a.y) || 0) - (Number(b.y) || 0));
  isolated.forEach((node, idx) => depth.set(node.id, 1 + (idx % 3)));

  const logicNodes = nodes.filter((node) => nwNodeLane(node.type) === 'logic');
  const maxLogicDepth = Math.max(1, ...logicNodes.map((node) => depth.get(node.id) || 1));
  const boardW = Math.max(2400, 1160 + maxLogicDepth * 360);
  const groups = new Map();
  const keyFor = (node) => {
    const lane = nwNodeLane(node.type);
    if (lane === 'input') return 'input';
    if (lane === 'output') return 'output';
    return `logic-${Math.max(1, depth.get(node.id) || 1)}`;
  };
  for (const node of nodes) {
    const key = keyFor(node);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => ((Number(a.y) || 0) - (Number(b.y) || 0)) || String(a.label || a.id).localeCompare(String(b.label || b.id)));
  }

  const inputX = 80;
  const outputX = boardW - NW_LE_NODE_W - 80;
  const logicLeft = 500;
  const logicRight = outputX - 380;
  const xForDepth = (d) => maxLogicDepth <= 1
    ? Math.round((logicLeft + logicRight) / 2)
    : Math.round(logicLeft + ((d - 1) / (maxLogicDepth - 1)) * Math.max(0, logicRight - logicLeft));

  let maxBottom = 1400;
  for (const [key, list] of groups.entries()) {
    let x = inputX;
    if (key === 'output') x = outputX;
    else if (key.startsWith('logic-')) x = xForDepth(Number(key.slice(6)) || 1);
    let y = 78;
    list.forEach((node) => {
      node.x = x;
      node.y = y;
      y += nwEstimatedNodeHeight(node.type) + 42;
    });
    maxBottom = Math.max(maxBottom, y + 80);
  }

  g.board = g.board || {};
  g.board.w = boardW;
  g.board.h = Math.max(1400, maxBottom);
  nwRenderGraph();
  if (nwLE.selectedNodeId) nwSelectNode(nwLE.selectedNodeId);
  nwMarkDirty('Auto-Anordnung');
  nwSetStatus('Bausteine automatisch nach Eingängen, Logik und Ausgängen angeordnet.', true);
}

// -----------------------------
// Schreibfreie NexoLogic-Browser-Simulation
// -----------------------------
function nwSimBool(value, def = false) {
  if (value === undefined || value === null || value === '') return def;
  return nwBool(value, def);
}

function nwSimNum(value, def = 0) {
  if (value === undefined || value === null || value === '') return def;
  return nwNum(value, def);
}

function nwSimValueKey(value) {
  try { return JSON.stringify(value); } catch (_e) { return String(value); }
}

function nwSimFormatValue(value) {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'EIN' : 'AUS';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'ungültig';
    return String(Math.round(value * 1000) / 1000);
  }
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch (_e) { return '[Objekt]'; }
  }
  return String(value);
}

function nwSimTrace(node, message, level = 'info') {
  const sim = nwLE.simulation;
  const row = {
    at: sim.nowMs,
    nodeId: node && node.id ? node.id : '',
    nodeLabel: node ? String(node.label || (nwLE.lib.byType[node.type] && nwLE.lib.byType[node.type].name) || node.id || '') : '',
    level,
    message: String(message || ''),
  };
  sim.traces.push(row);
  if (sim.traces.length > sim.maxTrace) sim.traces.splice(0, sim.traces.length - sim.maxTrace);
}

function nwSimDefaultInput(node) {
  const params = node && node.params ? node.params : {};
  const cast = String(params.cast || 'auto').toLowerCase();
  const fallback = params.fallbackValue;
  if (cast === 'bool' || cast === 'boolean') return fallback === '' || fallback === undefined ? false : nwSimBool(fallback, false);
  if (cast === 'string' || cast === 'text') return fallback === undefined || fallback === null ? '' : String(fallback);
  const n = nwSimNum(fallback, NaN);
  return Number.isFinite(n) ? n : 0;
}

function nwSimDefaultInputType(node) {
  const cast = String(node && node.params && node.params.cast || 'auto').toLowerCase();
  if (cast === 'bool' || cast === 'boolean') return 'bool';
  if (cast === 'string' || cast === 'text') return 'string';
  if (cast === 'number') return 'number';
  const fallback = node && node.params ? node.params.fallbackValue : undefined;
  if (typeof fallback === 'boolean') return 'bool';
  if (typeof fallback === 'string' && fallback.trim() && !Number.isFinite(Number(fallback.replace(',', '.')))) return 'string';
  return 'number';
}

function nwSimEnsureInputs() {
  const g = nwLE.graph;
  if (!g) return;
  for (const node of (g.nodes || [])) {
    if (!node || node.type !== 'dp_in') continue;
    if (!Object.prototype.hasOwnProperty.call(nwLE.simulation.inputs, node.id)) nwLE.simulation.inputs[node.id] = nwSimDefaultInput(node);
    if (!nwLE.simulation.inputTypes[node.id]) nwLE.simulation.inputTypes[node.id] = nwSimDefaultInputType(node);
  }
}

function nwSimStopTimer() {
  if (nwLE.simulation.timer) {
    clearInterval(nwLE.simulation.timer);
    nwLE.simulation.timer = null;
  }
  nwLE.simulation.running = false;
}

function nwSimSetRunning(running) {
  const sim = nwLE.simulation;
  nwSimStopTimer();
  sim.running = !!running;
  if (sim.running) {
    sim.timer = setInterval(() => {
      if (!sim.active) return nwSimStopTimer();
      sim.nowMs += 250;
      nwSimEvaluate('Lauf');
    }, 250);
  }
  nwRenderSimulationPanel();
}

function nwSimParseTimeToMin(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function nwSimParseDays(value) {
  const map = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 7 };
  const out = new Set();
  String(value || '').split(/[,;\s]+/).filter(Boolean).forEach((part) => {
    const key = part.trim().toLowerCase();
    if (map[key]) out.add(map[key]);
    else {
      const n = Number(key);
      if (n >= 1 && n <= 7) out.add(n);
    }
  });
  return out;
}

function nwSimEdgeFired(state, input, edge, initializing) {
  const now = nwSimBool(input, false);
  const prev = nwSimBool(state.prev, false);
  state.prev = now;
  if (initializing) return false;
  if (edge === 'falling') return prev && !now;
  if (edge === 'both') return prev !== now;
  return !prev && now;
}

function nwSimComputeNode(node, inp, state, ctx) {
  const params = node.params || {};
  const type = String(node.type || '');
  const now = ctx.nowMs;
  const dtMs = Math.max(0, ctx.dtMs || 0);
  const initializing = !!ctx.initializing;
  const enabledDefault = (value) => value === undefined ? true : nwSimBool(value, true);
  const out = {};

  if (node.enabled === false) return out;

  switch (type) {
    case 'dp_in':
      out.out = nwLE.simulation.inputs[node.id];
      break;
    case 'const': {
      const vt = String(params.valueType || 'number').toLowerCase();
      if (vt === 'bool' || vt === 'boolean') out.out = nwSimBool(params.value, false);
      else if (vt === 'string' || vt === 'text') out.out = params.value === undefined || params.value === null ? '' : String(params.value);
      else out.out = nwSimNum(params.value, 0);
      break;
    }
    case 'not': out.out = !nwSimBool(inp.in, false); break;
    case 'and': out.out = nwSimBool(inp.a, false) && nwSimBool(inp.b, false); break;
    case 'or': out.out = nwSimBool(inp.a, false) || nwSimBool(inp.b, false); break;
    case 'xor': out.out = nwSimBool(inp.a, false) !== nwSimBool(inp.b, false); break;
    case 'toggle': {
      if (state.value === undefined) state.value = nwSimBool(params.init, false);
      if (nwSimEdgeFired(state, inp.trig, String(params.edge || 'rising').toLowerCase(), initializing)) state.value = !state.value;
      out.out = !!state.value;
      break;
    }
    case 'rs': {
      if (state.q === undefined) state.q = nwSimBool(params.init, false);
      const r = nwSimBool(inp.r, false);
      const s = nwSimBool(inp.s, false);
      if (r && s) state.q = String(params.priority || 'r').toLowerCase() === 's';
      else if (r) state.q = false;
      else if (s) state.q = true;
      out.q = !!state.q;
      break;
    }
    case 'edge': {
      const current = nwSimBool(inp.in, false);
      const prev = nwSimBool(state.prev, false);
      if (!initializing) {
        if (!prev && current) state.risingUntil = now + 100;
        if (prev && !current) state.fallingUntil = now + 100;
      }
      state.prev = current;
      out.rising = Number(state.risingUntil || 0) > now;
      out.falling = Number(state.fallingUntil || 0) > now;
      break;
    }
    case 'edge_rising':
    case 'edge_falling':
    case 'edge_both': {
      const edge = type === 'edge_falling' ? 'falling' : type === 'edge_both' ? 'both' : 'rising';
      if (nwSimEdgeFired(state, inp.in, edge, initializing)) state.until = now + 100;
      out.out = Number(state.until || 0) > now;
      break;
    }
    case 'cmp': {
      const mode = String(params.mode || 'auto').toLowerCase();
      let a = inp.a;
      let b = inp.b;
      if (mode === 'number') { a = nwSimNum(a, 0); b = nwSimNum(b, 0); }
      else if (mode === 'bool') { a = nwSimBool(a, false); b = nwSimBool(b, false); }
      else if (mode === 'string' || mode === 'text') { a = a == null ? '' : String(a); b = b == null ? '' : String(b); }
      else {
        const an = nwSimNum(a, NaN); const bn = nwSimNum(b, NaN);
        if (Number.isFinite(an) && Number.isFinite(bn)) { a = an; b = bn; }
        else { a = a == null ? '' : String(a); b = b == null ? '' : String(b); }
      }
      const op = String(params.op || '==');
      if (op === '!=') out.out = a !== b;
      else if (op === '>') out.out = a > b;
      else if (op === '>=') out.out = a >= b;
      else if (op === '<') out.out = a < b;
      else if (op === '<=') out.out = a <= b;
      else out.out = a === b;
      break;
    }
    case 'hyst': {
      if (state.value === undefined) state.value = nwSimBool(params.init, false);
      const v = nwSimNum(inp.in, 0);
      if (v >= nwSimNum(params.on, 60)) state.value = true;
      if (v <= nwSimNum(params.off, 55)) state.value = false;
      out.out = !!state.value;
      break;
    }
    case 'add': out.out = nwSimNum(inp.a, 0) + nwSimNum(inp.b, 0); break;
    case 'sub': out.out = nwSimNum(inp.a, 0) - nwSimNum(inp.b, 0); break;
    case 'mul': out.out = nwSimNum(inp.a, 0) * nwSimNum(inp.b, 0); break;
    case 'div': {
      const b = nwSimNum(inp.b, 0);
      out.out = Math.abs(b) < 1e-12 ? nwSimNum(params.div0, 0) : nwSimNum(inp.a, 0) / b;
      break;
    }
    case 'minmax': {
      const a = nwSimNum(inp.a, 0); const b = nwSimNum(inp.b, 0);
      out.min = Math.min(a, b); out.max = Math.max(a, b); break;
    }
    case 'clamp': out.out = nwClamp(nwSimNum(inp.in, 0), Math.min(nwSimNum(params.min, 0), nwSimNum(params.max, 100)), Math.max(nwSimNum(params.min, 0), nwSimNum(params.max, 100))); break;
    case 'scale': {
      let inMin = nwSimNum(params.inMin, 0); let inMax = nwSimNum(params.inMax, 100);
      let outMin = nwSimNum(params.outMin, 0); let outMax = nwSimNum(params.outMax, 100);
      const preset = String(params.preset || 'custom');
      if (preset === '255_to_100') { inMin = 0; inMax = 255; outMin = 0; outMax = 100; }
      if (preset === '100_to_255') { inMin = 0; inMax = 100; outMin = 0; outMax = 255; }
      if (preset === '10v_to_100') { inMin = 0; inMax = 10; outMin = 0; outMax = 100; }
      if (preset === '100_to_10v') { inMin = 0; inMax = 100; outMin = 0; outMax = 10; }
      const x = nwSimNum(inp.in, 0);
      const ratio = inMax === inMin ? 0 : (x - inMin) / (inMax - inMin);
      let y = outMin + ratio * (outMax - outMin);
      if (nwSimBool(params.clamp, true)) y = nwClamp(y, Math.min(outMin, outMax), Math.max(outMin, outMax));
      const precision = nwClamp(Math.round(nwSimNum(params.precision, 2)), 0, 6);
      out.out = Math.round(y * (10 ** precision)) / (10 ** precision);
      break;
    }
    case 'rt_2p': {
      const enabled = enabledDefault(inp.enable);
      const ist = nwSimNum(inp.ist, NaN); const soll = nwSimNum(inp.soll, NaN);
      const delta = Number.isFinite(ist) && Number.isFinite(soll) ? soll - ist : 0;
      if (state.value === undefined) { state.value = nwSimBool(params.init, false); state.lastChange = now; }
      if (!enabled || !Number.isFinite(ist) || !Number.isFinite(soll)) state.value = false;
      else {
        const mode = String(params.mode || 'heat').toLowerCase();
        const band = Math.max(0, nwSimNum(params.band, .3));
        let want = !!state.value;
        if (!state.value) want = mode === 'cool' ? ist >= soll + band : ist <= soll - band;
        else want = mode === 'cool' ? !(ist <= soll - band) : !(ist >= soll + band);
        if (want !== state.value) {
          const minMs = want ? Math.max(0, nwSimNum(params.minOffMs, 0)) : Math.max(0, nwSimNum(params.minOnMs, 0));
          if (now - Number(state.lastChange || 0) >= minMs) { state.value = want; state.lastChange = now; }
        }
      }
      out.out = !!state.value; out.delta = delta; break;
    }
    case 'rt_p': {
      const enabled = enabledDefault(inp.enable);
      const ist = nwSimNum(inp.ist, NaN); const soll = nwSimNum(inp.soll, NaN);
      const delta = Number.isFinite(ist) && Number.isFinite(soll) ? soll - ist : 0;
      const lo = Math.min(nwSimNum(params.outMin, 0), nwSimNum(params.outMax, 100));
      const hi = Math.max(nwSimNum(params.outMin, 0), nwSimNum(params.outMax, 100));
      let err = delta;
      if (Math.abs(err) < Math.max(0, nwSimNum(params.deadband, .2))) err = 0;
      if (String(params.mode || 'heat').toLowerCase() === 'cool') err = -err;
      const precision = nwClamp(Math.round(nwSimNum(params.precision, 1)), 0, 4);
      const y = !enabled || !Number.isFinite(ist) || !Number.isFinite(soll) ? lo : nwClamp(err * Math.max(0, nwSimNum(params.kp, 30)), lo, hi);
      out.out = Math.round(y * (10 ** precision)) / (10 ** precision); out.delta = delta; break;
    }
    case 'rt_pi': {
      const enabled = enabledDefault(inp.enable);
      const reset = nwSimBool(inp.reset, false);
      const ist = nwSimNum(inp.ist, NaN); const soll = nwSimNum(inp.soll, NaN);
      const delta = Number.isFinite(ist) && Number.isFinite(soll) ? soll - ist : 0;
      const lo = Math.min(nwSimNum(params.outMin, 0), nwSimNum(params.outMax, 100));
      const hi = Math.max(nwSimNum(params.outMin, 0), nwSimNum(params.outMax, 100));
      if (!Number.isFinite(state.iTerm)) state.iTerm = 0;
      if (reset) state.iTerm = 0;
      if (!enabled || !Number.isFinite(ist) || !Number.isFinite(soll)) {
        if (nwSimBool(params.resetOnDisable, true)) state.iTerm = 0;
        out.out = lo; out.delta = delta; out.p = 0; out.i = state.iTerm; break;
      }
      let err = delta;
      if (Math.abs(err) < Math.max(0, nwSimNum(params.deadband, .2))) err = 0;
      if (String(params.mode || 'heat').toLowerCase() === 'cool') err = -err;
      const kp = Math.max(0, nwSimNum(params.kp, 30));
      const ti = Math.max(1, nwSimNum(params.ti, 600));
      const p = err * kp;
      const prevI = state.iTerm;
      let nextI = prevI + (kp / ti) * err * Math.min(3600, dtMs / 1000);
      nextI = nwClamp(nextI, -10000, 10000);
      let raw = p + nextI;
      let y = nwClamp(raw, lo, hi);
      if (nwSimBool(params.antiWindup, true) && raw !== y && ((raw > hi && err > 0) || (raw < lo && err < 0))) { nextI = prevI; raw = p + nextI; y = nwClamp(raw, lo, hi); }
      state.iTerm = nextI;
      const precision = nwClamp(Math.round(nwSimNum(params.precision, 1)), 0, 4);
      const f = 10 ** precision;
      out.out = Math.round(y * f) / f; out.delta = Math.round(delta * f) / f; out.p = Math.round(p * f) / f; out.i = Math.round(nextI * f) / f; break;
    }
    case 'pwm': {
      const enabled = enabledDefault(inp.enable);
      const period = nwClamp(Math.round(nwSimNum(params.periodMs, 600000)), 1000, 86400000);
      const duty = nwClamp(nwSimNum(inp.in, 0), 0, 100);
      if (!Number.isFinite(state.cycleStart) || state.period !== period || state.duty !== duty) state.cycleStart = now;
      state.period = period; state.duty = duty;
      out.out = enabled && duty > 0 && (duty >= 100 || ((now - state.cycleStart) % period) < period * duty / 100);
      break;
    }
    case 'season_switch': {
      if (state.summer === undefined) state.summer = String(params.init || 'winter').toLowerCase() === 'summer';
      if (enabledDefault(inp.enable)) {
        if (String(params.mode || 'auto').toLowerCase() === 'manual') state.summer = nwSimBool(inp.summerIn, false);
        else {
          const t = nwSimNum(inp.tOut, NaN);
          if (Number.isFinite(t) && t >= nwSimNum(params.summerOn, 18)) state.summer = true;
          if (Number.isFinite(t) && t <= nwSimNum(params.winterOn, 15)) state.summer = false;
        }
      }
      out.out = state.summer ? inp.summerVal : inp.winterVal; out.summer = !!state.summer; out.winter = !state.summer; break;
    }
    case 'window_lock': {
      const enabled = enabledDefault(inp.enable);
      const windowOpen = nwSimBool(params.invertWindow, false) ? !nwSimBool(inp.window, false) : nwSimBool(inp.window, false);
      if (state.blocked === undefined) state.blocked = false;
      if (!enabled) { state.blocked = false; state.pendingAt = null; }
      else if (windowOpen) {
        state.releaseAt = null;
        const delay = Math.max(0, nwSimNum(params.openDelayMs, 0));
        if (!state.blocked && !Number.isFinite(state.pendingAt)) state.pendingAt = now + delay;
        if (!state.blocked && now >= Number(state.pendingAt || 0)) state.blocked = true;
      } else {
        state.pendingAt = null;
        const delay = Math.max(0, nwSimNum(params.closeDelayMs, 0));
        if (state.blocked && !Number.isFinite(state.releaseAt)) state.releaseAt = now + delay;
        if (state.blocked && now >= Number(state.releaseAt || 0)) state.blocked = false;
        if (!state.blocked) state.releaseAt = null;
      }
      out.blocked = !!state.blocked; out.out = state.blocked ? nwSimBool(params.blockOut, false) : nwSimBool(inp.in, false); break;
    }
    case 'heating_curve': {
      const enabled = enabledDefault(inp.enable);
      const tOut = nwSimNum(inp.tOut, NaN);
      const room = nwSimNum(inp.room, NaN);
      const minFlow = Math.min(nwSimNum(params.minFlow, 20), nwSimNum(params.maxFlow, 60));
      const maxFlow = Math.max(nwSimNum(params.minFlow, 20), nwSimNum(params.maxFlow, 60));
      let shift = nwSimNum(params.shift, 0);
      if (Number.isFinite(room) && nwSimNum(params.roomGain, 0) !== 0) shift += (room - nwSimNum(params.roomRef, 20)) * nwSimNum(params.roomGain, 0);
      let y = minFlow;
      if (enabled && Number.isFinite(tOut)) {
        if (String(params.model || '2point').toLowerCase() === 'slope') y = nwSimNum(params.level, 20) + nwSimNum(params.slope, 1.2) * (nwSimNum(params.roomRef, 20) - tOut);
        else {
          const ow = nwSimNum(params.tOutWarm, 20), fw = nwSimNum(params.tFlowWarm, 25), oc = nwSimNum(params.tOutCold, -10), fc = nwSimNum(params.tFlowCold, 50);
          if (ow === oc) y = fw;
          else if (tOut >= ow) y = fw;
          else if (tOut <= oc) y = fc;
          else y = fw + ((tOut - ow) / (oc - ow)) * (fc - fw);
        }
        y += shift;
      }
      y = nwClamp(y, minFlow, maxFlow);
      const precision = nwClamp(Math.round(nwSimNum(params.precision, 1)), 0, 3); const f = 10 ** precision;
      out.out = Math.round(y * f) / f; out.active = enabled && Number.isFinite(tOut); break;
    }
    case 'mixer_2p': {
      const enabled = enabledDefault(inp.enable);
      const ist = nwSimNum(inp.ist, NaN); const soll = nwSimNum(inp.soll, NaN);
      const delta = Number.isFinite(ist) && Number.isFinite(soll) ? soll - ist : 0;
      const band = Math.max(0, nwSimNum(params.band, .5));
      const pulse = nwClamp(Math.round(nwSimNum(params.pulseMs, 1500)), 50, 60000);
      const pause = nwClamp(Math.round(nwSimNum(params.pauseMs, 3000)), 0, 60000);
      let action = null;
      if (enabled && Number.isFinite(ist) && Number.isFinite(soll)) action = delta > band ? 'open' : delta < -band ? 'close' : null;
      if (Number(state.pulseUntil || 0) <= now) state.action = null;
      if (action && !state.action && now >= Number(state.pauseUntil || 0)) { state.action = action; state.pulseUntil = now + pulse; state.pauseUntil = state.pulseUntil + pause; }
      let open = state.action === 'open' && now < Number(state.pulseUntil || 0);
      let close = state.action === 'close' && now < Number(state.pulseUntil || 0);
      if (nwSimBool(params.invert, false)) [open, close] = [close, open];
      out.open = open; out.close = close; out.delta = delta; break;
    }
    case 'delay_on': {
      const input = nwSimBool(inp.in, false); const ms = Math.max(0, nwSimNum(params.ms, 1000));
      if (!input) state.since = null;
      else if (!Number.isFinite(state.since)) state.since = now;
      out.out = input && now - Number(state.since || now) >= ms; break;
    }
    case 'delay_off':
    case 'after_run': {
      const input = nwSimBool(inp.in, false); const ms = Math.max(0, nwSimNum(params.ms, 1000));
      if (state.value === undefined || initializing) {
        state.value = input;
        state.prev = input;
        state.offAt = null;
      } else {
        const prev = nwSimBool(state.prev, false);
        if (input) {
          state.value = true;
          state.offAt = null;
        } else if (prev && !input) {
          state.offAt = now + ms;
        }
        if (!input && Number.isFinite(state.offAt) && now >= state.offAt) {
          state.value = false;
          state.offAt = null;
        }
        state.prev = input;
      }
      out.out = !!state.value;
      break;
    }
    case 'pulse':
    case 'staircase': {
      const edge = String(params.edge || 'rising').toLowerCase();
      if (nwSimEdgeFired(state, inp.trig, edge, initializing)) state.until = now + Math.max(10, nwSimNum(params.ms, type === 'staircase' ? 60000 : 1000));
      out.out = now < Number(state.until || 0); break;
    }
    case 'pulse_extend': {
      const input = nwSimBool(inp.in, false); const ms = Math.max(0, nwSimNum(params.ms, 1000));
      const prev = nwSimBool(state.prev, false); state.prev = input;
      if (input) { state.until = null; out.out = true; }
      else { if (prev && !input) state.until = now + ms; out.out = now < Number(state.until || 0); }
      break;
    }
    case 'schedule': {
      const enabled = enabledDefault(inp.enable); const holiday = nwSimBool(inp.holiday, false);
      const days = nwSimParseDays(params.days || 'Mo,Di,Mi,Do,Fr,Sa,So');
      const from = nwSimParseTimeToMin(params.from || '00:00'); const to = nwSimParseTimeToMin(params.to || '23:59');
      let active = false;
      if (enabled && days.size && from !== null && to !== null) {
        const d = new Date(now); let day = d.getDay() || 7; const holidayMode = String(params.holidayMode || 'asSunday').toLowerCase();
        if (holiday && holidayMode === 'off') active = false;
        else {
          if (holiday && (holidayMode === 'assunday' || holidayMode === 'as_sunday')) day = 7;
          const minute = d.getHours() * 60 + d.getMinutes();
          if (from <= to) active = days.has(day) && minute >= from && minute < to;
          else { const prevDay = day === 1 ? 7 : day - 1; active = (minute >= from && days.has(day)) || (minute < to && days.has(prevDay)); }
        }
      }
      out.out = active; break;
    }
    case 'impulse_counter': {
      if (!Number.isFinite(state.count)) state.count = nwSimNum(params.init, 0);
      const trig = nwSimBool(inp.trig, false), reset = nwSimBool(inp.reset, false);
      if (!initializing && !nwSimBool(state.prevReset, false) && reset) state.count = nwSimNum(params.init, 0);
      if (!initializing && !nwSimBool(state.prevTrig, false) && trig) state.count += nwSimNum(params.step, 1);
      state.prevTrig = trig; state.prevReset = reset;
      if (nwSimBool(params.clamp, false)) state.count = nwClamp(state.count, nwSimNum(params.min, -1e9), nwSimNum(params.max, 1e9));
      out.out = state.count; break;
    }
    case 'counter': {
      if (!Number.isFinite(state.count)) state.count = nwSimNum(params.init, 0);
      const up = nwSimBool(inp.up, false), down = nwSimBool(inp.down, false), reset = nwSimBool(inp.reset, false);
      if (!initializing && !nwSimBool(state.prevReset, false) && reset) state.count = nwSimNum(params.init, 0);
      if (!initializing && !nwSimBool(state.prevUp, false) && up) state.count += nwSimNum(params.step, 1);
      if (!initializing && !nwSimBool(state.prevDown, false) && down) state.count -= nwSimNum(params.step, 1);
      state.prevUp = up; state.prevDown = down; state.prevReset = reset;
      if (nwSimBool(params.clamp, false)) state.count = nwClamp(state.count, nwSimNum(params.min, -1e9), nwSimNum(params.max, 1e9));
      out.out = state.count; break;
    }
    case 'runtime_hours': {
      if (!Number.isFinite(state.totalMs)) state.totalMs = nwSimNum(params.initHours, 0) * 3600000;
      const run = nwSimBool(inp.run, false), reset = nwSimBool(inp.reset, false);
      if (!initializing && !nwSimBool(state.prevReset, false) && reset) state.totalMs = nwSimNum(params.initHours, 0) * 3600000;
      if (run) state.totalMs += dtMs;
      state.prevReset = reset; state.prevRun = run;
      const precision = nwClamp(Math.round(nwSimNum(params.precision, 2)), 0, 4); const f = 10 ** precision;
      out.out = Math.round((state.totalMs / 3600000) * f) / f; break;
    }
    case 'scene_trigger': {
      const edge = String(params.edge || 'rising').toLowerCase();
      const trigger = nwSimBool(inp.trig, false);
      const fire = nwSimEdgeFired(state, trigger, edge, initializing);
      if (fire) nwSimTrace(node, `Würde Szene ${params.sceneId || params.dpId || 'ohne Ziel'} auslösen (nur Testmodus).`, 'action');
      out.out = trigger;
      break;
    }
    case 'dp_out': {
      const value = inp.in;
      const key = nwSimValueKey(value);
      if (!initializing && key !== state.lastValueKey) nwSimTrace(node, `Würde ${params.dpId || 'nicht zugeordneten Datenpunkt'} = ${nwSimFormatValue(value)} schreiben (nur Testmodus).`, 'action');
      state.lastValueKey = key;
      break;
    }
    default:
      nwSimTrace(node, `Bausteintyp ${type} wird im Testmodus noch nicht ausgewertet.`, 'warn');
      break;
  }
  return out;
}

function nwSimTopologicalOrder(g) {
  const nodes = (g && Array.isArray(g.nodes)) ? g.nodes.filter(Boolean) : [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const next = new Map(nodes.map((node) => [node.id, []]));
  for (const link of (g.links || [])) {
    if (!link || !link.from || !link.to || !nodeMap.has(link.from.node) || !nodeMap.has(link.to.node)) continue;
    indegree.set(link.to.node, (indegree.get(link.to.node) || 0) + 1);
    next.get(link.from.node).push(link.to.node);
  }
  const queue = nodes.filter((node) => (indegree.get(node.id) || 0) === 0).sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0) || (Number(a.y) || 0) - (Number(b.y) || 0));
  const order = [];
  while (queue.length) {
    const node = queue.shift(); order.push(node);
    for (const id of next.get(node.id) || []) {
      indegree.set(id, (indegree.get(id) || 0) - 1);
      if ((indegree.get(id) || 0) === 0) queue.push(nodeMap.get(id));
    }
    queue.sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0) || (Number(a.y) || 0) - (Number(b.y) || 0));
  }
  const remaining = nodes.filter((node) => !order.some((row) => row.id === node.id));
  return { order: order.concat(remaining), cycle: remaining.length > 0 };
}

function nwSimEvaluate(reason = 'Schritt') {
  const sim = nwLE.simulation;
  const g = nwLE.graph;
  if (!sim.active || !g) return;
  nwSimEnsureInputs();
  const previous = sim.outputs || {};
  const nextOutputs = {};
  const { order, cycle } = nwSimTopologicalOrder(g);
  const links = Array.isArray(g.links) ? g.links : [];
  const initializing = !sim.initialized;
  const dtMs = sim.lastEvalMs === null ? 0 : Math.max(0, sim.nowMs - sim.lastEvalMs);

  if (cycle && !sim.cycleWarned) {
    nwSimTrace(null, 'Der Graph enthält eine Rückkopplung. Die Simulation wertet die verbleibenden Bausteine in ihrer sichtbaren Reihenfolge aus.', 'warn');
    sim.cycleWarned = true;
  }

  for (const node of order) {
    const def = nwLE.lib.byType[node.type];
    if (!def) continue;
    const inp = {};
    for (const port of (def.inputs || [])) {
      const link = links.find((row) => row && row.to && row.to.node === node.id && row.to.port === port.key);
      inp[port.key] = link && nextOutputs[link.from.node] && Object.prototype.hasOwnProperty.call(nextOutputs[link.from.node], link.from.port)
        ? nextOutputs[link.from.node][link.from.port]
        : link && previous[link.from.node] && Object.prototype.hasOwnProperty.call(previous[link.from.node], link.from.port)
          ? previous[link.from.node][link.from.port]
          : undefined;
    }
    const state = sim.nodeState[node.id] || {};
    const result = nwSimComputeNode(node, inp, state, { nowMs: sim.nowMs, dtMs, initializing, reason });
    sim.nodeState[node.id] = state;
    nextOutputs[node.id] = result || {};

    if (!initializing) {
      const before = previous[node.id] || {};
      const keys = new Set([...Object.keys(before), ...Object.keys(result || {})]);
      const changes = [];
      for (const key of keys) {
        if (nwSimValueKey(before[key]) !== nwSimValueKey(result && result[key])) changes.push(`${key}: ${nwSimFormatValue(result && result[key])}`);
      }
      if (changes.length && node.type !== 'dp_out' && node.type !== 'scene_trigger') nwSimTrace(node, changes.join(' · '), 'value');
    }
  }

  sim.outputs = nextOutputs;
  sim.initialized = true;
  sim.lastEvalMs = sim.nowMs;
  nwUpdateSimulationVisuals();
  nwRenderSimulationPanel();
}

function nwSimAdvance(ms, reason) {
  if (!nwLE.simulation.active) nwOpenSimulation();
  nwLE.simulation.nowMs += Math.max(0, Number(ms) || 0);
  nwSimEvaluate(reason || `+${ms} ms`);
}

function nwSimReset(render = true) {
  nwSimStopTimer();
  const sim = nwLE.simulation;
  sim.nowMs = Date.now();
  sim.lastEvalMs = null;
  sim.initialized = false;
  sim.nodeState = {};
  sim.outputs = {};
  sim.traces = [];
  sim.cycleWarned = false;
  sim.inputSignature = '';
  nwSimEnsureInputs();
  nwSimTrace(null, 'Testmodus zurückgesetzt. Es werden keine Hardware-Datenpunkte beschrieben.', 'info');
  nwSimEvaluate('Initialisierung');
  if (render) nwRenderSimulationPanel(true);
}

function nwOpenSimulation() {
  const sim = nwLE.simulation;
  sim.active = true;
  if (nwLE.el.simPanel) {
    nwLE.el.simPanel.classList.remove('hidden');
    nwLE.el.simPanel.setAttribute('aria-hidden', 'false');
  }
  if (nwLE.el.simBtn) nwLE.el.simBtn.classList.add('is-active');
  document.body.classList.add('nw-le-simulation-open');
  if (!sim.initialized) nwSimReset(false);
  nwRenderSimulationPanel(true);
  nwUpdateSimulationVisuals();
}

function nwCloseSimulation() {
  nwSimStopTimer();
  nwLE.simulation.active = false;
  if (nwLE.el.simPanel) {
    nwLE.el.simPanel.classList.add('hidden');
    nwLE.el.simPanel.setAttribute('aria-hidden', 'true');
  }
  if (nwLE.el.simBtn) nwLE.el.simBtn.classList.remove('is-active');
  document.body.classList.remove('nw-le-simulation-open');
  nwUpdateSimulationVisuals();
}

function nwRenderSimulationInputs(force = false) {
  const host = nwLE.el.simInputs;
  const g = nwLE.graph;
  if (!host || !g) return;
  const nodes = (g.nodes || []).filter((node) => node && node.type === 'dp_in');
  const signature = nodes.map((node) => `${node.id}:${node.label}:${node.params && node.params.cast}`).join('|');
  if (!force && signature === nwLE.simulation.inputSignature) return;
  nwLE.simulation.inputSignature = signature;
  host.innerHTML = '';
  if (!nodes.length) {
    host.innerHTML = '<div class="nw-le-sim__empty">Noch kein DP-Eingang vorhanden. Füge links einen DP-Eingang hinzu.</div>';
    return;
  }
  nwSimEnsureInputs();
  for (const node of nodes) {
    const row = document.createElement('div');
    row.className = 'nw-le-sim__input-row';
    const type = nwLE.simulation.inputTypes[node.id] || nwSimDefaultInputType(node);
    const value = nwLE.simulation.inputs[node.id];
    row.innerHTML = `
      <div class="nw-le-sim__input-name"><strong>${nwEscapeHtml(node.label || 'DP Eingang')}</strong><span>${nwEscapeHtml(node.params && node.params.dpId || 'nicht zugeordnet')}</span></div>
      <select class="nw-config-input nw-le-sim__type" data-sim-type="${nwEscapeHtml(node.id)}" ${String(node.params && node.params.cast || 'auto').toLowerCase() !== 'auto' ? 'disabled' : ''}>
        <option value="bool" ${type === 'bool' ? 'selected' : ''}>Bool</option>
        <option value="number" ${type === 'number' ? 'selected' : ''}>Zahl</option>
        <option value="string" ${type === 'string' ? 'selected' : ''}>Text</option>
      </select>
      <div class="nw-le-sim__input-control" data-sim-control="${nwEscapeHtml(node.id)}"></div>
    `;
    host.appendChild(row);
    const typeSelect = row.querySelector('[data-sim-type]');
    const control = row.querySelector('[data-sim-control]');
    const renderControl = () => {
      const activeType = nwLE.simulation.inputTypes[node.id] || 'number';
      control.innerHTML = '';
      if (activeType === 'bool') {
        const label = document.createElement('label'); label.className = 'nw-le-sim__bool';
        const input = document.createElement('input'); input.type = 'checkbox'; input.checked = nwSimBool(nwLE.simulation.inputs[node.id], false);
        const span = document.createElement('span'); span.textContent = input.checked ? 'EIN' : 'AUS';
        input.addEventListener('change', () => { nwLE.simulation.inputs[node.id] = input.checked; span.textContent = input.checked ? 'EIN' : 'AUS'; nwSimEvaluate('Eingang geändert'); });
        label.append(input, span); control.appendChild(label);
      } else {
        const input = document.createElement('input'); input.className = 'nw-config-input'; input.type = activeType === 'number' ? 'number' : 'text'; input.value = nwLE.simulation.inputs[node.id] === undefined ? '' : String(nwLE.simulation.inputs[node.id]);
        input.addEventListener('input', () => { nwLE.simulation.inputs[node.id] = activeType === 'number' ? nwSimNum(input.value, 0) : input.value; nwSimEvaluate('Eingang geändert'); });
        control.appendChild(input);
      }
    };
    if (typeSelect) typeSelect.addEventListener('change', () => {
      nwLE.simulation.inputTypes[node.id] = typeSelect.value;
      nwLE.simulation.inputs[node.id] = typeSelect.value === 'bool' ? false : typeSelect.value === 'string' ? '' : 0;
      renderControl();
      nwSimEvaluate('Eingangstyp geändert');
    });
    renderControl();
  }
}

function nwRenderSimulationTrace() {
  const host = nwLE.el.simTrace;
  if (!host) return;
  host.innerHTML = '';
  const rows = nwLE.simulation.traces.slice(-120).reverse();
  if (!rows.length) {
    host.innerHTML = '<div class="nw-le-sim__empty">Noch keine Trace-Einträge.</div>';
    return;
  }
  for (const row of rows) {
    const el = document.createElement('div');
    el.className = `nw-le-sim__trace-row is-${row.level || 'info'}`;
    const time = new Date(row.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `<span class="nw-le-sim__trace-time">${time}</span><span class="nw-le-sim__trace-node">${nwEscapeHtml(row.nodeLabel || 'System')}</span><span class="nw-le-sim__trace-message">${nwEscapeHtml(row.message)}</span>`;
    host.appendChild(el);
  }
}

function nwRenderSimulationPanel(forceInputs = false) {
  const sim = nwLE.simulation;
  if (nwLE.el.simClock) nwLE.el.simClock.textContent = new Date(sim.nowMs).toLocaleString();
  if (nwLE.el.simRun) nwLE.el.simRun.textContent = sim.running ? 'Pause' : 'Start';
  if (nwLE.el.simStatus) nwLE.el.simStatus.textContent = sim.running ? 'läuft' : sim.active ? 'bereit' : 'aus';
  nwRenderSimulationInputs(forceInputs);
  nwRenderSimulationTrace();
}

function nwUpdateSimulationVisuals() {
  const board = nwLE.el.board;
  const sim = nwLE.simulation;
  if (!board) return;
  board.classList.toggle('is-simulation-active', !!sim.active);
  for (const nodeEl of board.querySelectorAll('.nw-le-node')) {
    const nodeId = nodeEl.dataset.nodeId;
    const node = nwFindNode(nodeId);
    const def = node && nwLE.lib.byType[node.type];
    const values = sim.outputs[nodeId] || {};
    const host = nodeEl.querySelector('.nw-le-node__sim-values');
    nodeEl.classList.toggle('is-simulating', !!sim.active);
    if (!host) continue;
    if (!sim.active || !def) { host.innerHTML = ''; continue; }
    const badges = [];
    for (const port of (def.outputs || [])) badges.push(`<span class="nw-le-node__sim-value" data-kind="${typeof values[port.key]}"><b>${nwEscapeHtml(port.label || port.key)}</b> ${nwEscapeHtml(nwSimFormatValue(values[port.key]))}</span>`);
    if (node.type === 'dp_out') badges.push(`<span class="nw-le-node__sim-value is-action"><b>Test</b> ${nwEscapeHtml(nwSimFormatValue((() => { const link=(nwLE.graph.links||[]).find(l=>l.to&&l.to.node===node.id&&l.to.port==='in'); return link&&sim.outputs[link.from.node] ? sim.outputs[link.from.node][link.from.port] : undefined; })()))}</span>`);
    host.innerHTML = badges.join('');
  }
  nwUpdateAllWirePaths();
}

/**
 * Code-Teil: nwGetBoardPointFromClient
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetBoardPointFromClient(clientX, clientY) {
  const board = nwLE.el.board;
  if (!board) return null;
  const boardRect = board.getBoundingClientRect();
  const z = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);
  return {
    x: (clientX - boardRect.left) / z,
    y: (clientY - boardRect.top) / z,
  };
}
/**
 * Code-Teil: nwClampNodePosition
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwClampNodePosition(x, y, g = nwLE.graph) {
  const boardW = Math.max(800, Number(g && g.board && g.board.w) || 2400);
  const boardH = Math.max(600, Number(g && g.board && g.board.h) || 1400);
  return {
    x: nwClamp(nwNum(x, 0), 0, Math.max(0, boardW - NW_LE_NODE_W)),
    y: nwClamp(nwNum(y, 0), 0, Math.max(0, boardH - 40)),
  };
}
/**
 * Code-Teil: nwReadPaletteBlockType
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwReadPaletteBlockType(ev) {
  try {
    const dt = ev && ev.dataTransfer;
    const raw = dt ? (dt.getData('application/x-nexologic-block') || dt.getData('text/plain') || '') : '';
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.type) return String(parsed.type);
      } catch (_e) {
        return String(raw);
      }
    }
  } catch (_e) {}
  return nwSafeStr(nwLE.paletteDragType || '');
}
/**
 * Code-Teil: nwSetStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetStatus(text, ok = true) {
  const el = nwLE.el.status;
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#9ca3af' : '#ff6b6b';
}

// -----------------------------
// Logic Library (Basis‑Bausteine)
// -----------------------------
/**
 * Code-Teil: nwBuildLogicLibrary
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwBuildLogicLibrary() {
  // Port type: bool|number|any
  const LIB = [
    // --- Inputs
    {
      type: 'dp_in',
      name: 'DP Eingang',
      category: 'Eingänge',
      icon: '⭳',
      inputs: [],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'any' }],
      params: [
        { key: 'dpId', label: 'Datenpunkt', kind: 'dp', placeholder: 'z.B. knx.0.xxx.yyy' },
        { key: 'cast', label: 'Typ', kind: 'select', options: [
          { value: 'auto', label: 'Auto' },
          { value: 'bool', label: 'Bool' },
          { value: 'number', label: 'Zahl' },
          { value: 'string', label: 'Text' },
        ] },
        { key: 'invalidPolicy', label: 'Bei ungültigem Wert', kind: 'select', options: [
          { value: 'block', label: 'Graphzweig sperren (sicher)' },
          { value: 'hold', label: 'Letzten gültigen Wert halten' },
          { value: 'fallback', label: 'Ersatzwert verwenden' },
        ] },
        { key: 'fallbackValue', label: 'Ersatzwert', kind: 'text', placeholder: 'nur bei Ersatzwert' },
        { key: 'maxAgeMs', label: 'Max. Alter (ms)', kind: 'number', placeholder: '0 = nicht zeitlich prüfen' },
        { key: 'acceptBadQuality', label: 'Datenpunkt-Qualitätsfehler akzeptieren', kind: 'select', options: [
          { value: 'false', label: 'Nein (empfohlen)' },
          { value: 'true', label: 'Ja' },
        ] },
      ],
      defaults: { dpId: '', cast: 'auto', invalidPolicy: 'block', fallbackValue: '', maxAgeMs: 0, acceptBadQuality: 'false' },
    },
    {
      type: 'const',
      name: 'Konstante',
      category: 'Eingänge',
      icon: '⦿',
      inputs: [],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'any' }],
      params: [
        { key: 'valueType', label: 'Typ', kind: 'select', options: [
          { value: 'number', label: 'Zahl' },
          { value: 'bool', label: 'Bool' },
          { value: 'string', label: 'Text' },
        ] },
        { key: 'value', label: 'Wert', kind: 'text', placeholder: '0' },
      ],
      defaults: { valueType: 'number', value: '0' },
    },

    // --- Logic
    {
      type: 'and',
      name: 'UND',
      category: 'Logik',
      icon: '∧',
      inputs: [
        { key: 'a', label: 'A', dataType: 'bool' },
        { key: 'b', label: 'B', dataType: 'bool' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [],
      defaults: {},
    },
    {
      type: 'or',
      name: 'ODER',
      category: 'Logik',
      icon: '∨',
      inputs: [
        { key: 'a', label: 'A', dataType: 'bool' },
        { key: 'b', label: 'B', dataType: 'bool' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [],
      defaults: {},
    },
    {
      type: 'xor',
      name: 'XOR',
      category: 'Logik',
      icon: '⊕',
      inputs: [
        { key: 'a', label: 'A', dataType: 'bool' },
        { key: 'b', label: 'B', dataType: 'bool' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [],
      defaults: {},
    },
    {
      type: 'not',
      name: 'NICHT',
      category: 'Logik',
      icon: '¬',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [],
      defaults: {},
    },
    {
      type: 'toggle',
      name: 'Toggle (T‑FlipFlop)',
      category: 'Logik',
      icon: '⇄',
      inputs: [{ key: 'trig', label: 'Trig', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'edge', label: 'Flanke', kind: 'select', options: [
          { value: 'rising', label: 'steigend' },
          { value: 'falling', label: 'fallend' },
          { value: 'both', label: 'beide' },
        ] },
        { key: 'init', label: 'Startwert', kind: 'select', options: [
          { value: 'false', label: 'Aus' },
          { value: 'true', label: 'Ein' },
        ] },
        { key: 'persistState', label: 'Zustand nach Neustart wiederherstellen', kind: 'select', options: [
          { value: 'true', label: 'Ja' }, { value: 'false', label: 'Nein' },
        ] },
      ],
      defaults: { edge: 'rising', init: 'false', persistState: 'true' },
    },
    {
      type: 'rs',
      name: 'RS‑FlipFlop',
      category: 'Logik',
      icon: 'RS',
      inputs: [
        { key: 'r', label: 'R', dataType: 'bool' },
        { key: 's', label: 'S', dataType: 'bool' },
      ],
      outputs: [{ key: 'q', label: 'Q', dataType: 'bool' }],
      params: [
        { key: 'priority', label: 'Priorität', kind: 'select', options: [
          { value: 'r', label: 'R hat Vorrang' },
          { value: 's', label: 'S hat Vorrang' },
        ] },
        { key: 'init', label: 'Startwert', kind: 'select', options: [
          { value: 'false', label: 'Aus' },
          { value: 'true', label: 'Ein' },
        ] },
      ],
      defaults: { priority: 'r', init: 'false' },
    },
    {
      type: 'edge',
      name: 'Flanke',
      category: 'Logik',
      icon: '↗',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [
        { key: 'rising', label: '↑', dataType: 'bool' },
        { key: 'falling', label: '↓', dataType: 'bool' },
      ],
      params: [],
      defaults: {},
    },

    {
      type: 'edge_rising',
      name: 'Flanke steigend',
      category: 'Logik',
      icon: '↑',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Impuls', dataType: 'bool' }],
      params: [],
      defaults: {},
    },
    {
      type: 'edge_falling',
      name: 'Flanke fallend',
      category: 'Logik',
      icon: '↓',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Impuls', dataType: 'bool' }],
      params: [],
      defaults: {},
    },
    {
      type: 'edge_both',
      name: 'Flanke (beide)',
      category: 'Logik',
      icon: '↕',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Impuls', dataType: 'bool' }],
      params: [],
      defaults: {},
    },

    // --- Compare
    {
      type: 'cmp',
      name: 'Vergleich',
      category: 'Vergleich',
      icon: '≷',
      inputs: [
        { key: 'a', label: 'A', dataType: 'any' },
        { key: 'b', label: 'B', dataType: 'any' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'op', label: 'Operator', kind: 'select', options: [
          { value: '==', label: '==' },
          { value: '!=', label: '!=' },
          { value: '>', label: '>' },
          { value: '>=', label: '>=' },
          { value: '<', label: '<' },
          { value: '<=', label: '<=' },
        ] },
        { key: 'mode', label: 'Modus', kind: 'select', options: [
          { value: 'auto', label: 'Auto' },
          { value: 'number', label: 'Zahl' },
          { value: 'string', label: 'Text' },
          { value: 'bool', label: 'Bool' },
        ] },
      ],
      defaults: { op: '==', mode: 'auto' },
    },
    {
      type: 'hyst',
      name: 'Hysterese',
      category: 'Vergleich',
      icon: '≃',
      inputs: [
        { key: 'in', label: 'Ein', dataType: 'number' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'on', label: 'Ein ab', kind: 'number', placeholder: 'z.B. 60' },
        { key: 'off', label: 'Aus ab', kind: 'number', placeholder: 'z.B. 55' },
        { key: 'init', label: 'Startwert', kind: 'select', options: [
          { value: 'false', label: 'Aus' },
          { value: 'true', label: 'Ein' },
        ] },
      ],
      defaults: { on: 60, off: 55, init: 'false' },
    },

    // --- Math
    {
      type: 'add',
      name: 'Addieren',
      category: 'Mathe',
      icon: '+',
      inputs: [
        { key: 'a', label: 'A', dataType: 'number' },
        { key: 'b', label: 'B', dataType: 'number' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'number' }],
      params: [],
      defaults: {},
    },
    {
      type: 'sub',
      name: 'Subtrahieren',
      category: 'Mathe',
      icon: '−',
      inputs: [
        { key: 'a', label: 'A', dataType: 'number' },
        { key: 'b', label: 'B', dataType: 'number' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'number' }],
      params: [],
      defaults: {},
    },
    {
      type: 'mul',
      name: 'Multiplizieren',
      category: 'Mathe',
      icon: '×',
      inputs: [
        { key: 'a', label: 'A', dataType: 'number' },
        { key: 'b', label: 'B', dataType: 'number' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'number' }],
      params: [],
      defaults: {},
    },
    {
      type: 'div',
      name: 'Dividieren',
      category: 'Mathe',
      icon: '÷',
      inputs: [
        { key: 'a', label: 'A', dataType: 'number' },
        { key: 'b', label: 'B', dataType: 'number' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'number' }],
      params: [
        { key: 'div0', label: 'Bei ÷0', kind: 'number', placeholder: '0' },
      ],
      defaults: { div0: 0 },
    },
    {
      type: 'minmax',
      name: 'Min/Max',
      category: 'Mathe',
      icon: '⇵',
      inputs: [
        { key: 'a', label: 'A', dataType: 'number' },
        { key: 'b', label: 'B', dataType: 'number' },
      ],
      outputs: [
        { key: 'min', label: 'Min', dataType: 'number' },
        { key: 'max', label: 'Max', dataType: 'number' },
      ],
      params: [],
      defaults: {},
    },
    {
      type: 'clamp',
      name: 'Begrenzen',
      category: 'Mathe',
      icon: '⟂',
      inputs: [
        { key: 'in', label: 'Ein', dataType: 'number' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'number' }],
      params: [
        { key: 'min', label: 'Min', kind: 'number', placeholder: '0' },
        { key: 'max', label: 'Max', kind: 'number', placeholder: '100' },
      ],
      defaults: { min: 0, max: 100 },
    },

    // --- Konvertierung
    {
      type: 'scale',
      name: 'Skalierung/Mapping',
      category: 'Konvertierung',
      icon: '↔',
      inputs: [
        { key: 'in', label: 'Ein', dataType: 'number' },
      ],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'number' }],
      params: [
        { key: 'preset', label: 'Preset', kind: 'select', options: [
          { value: 'custom', label: 'Benutzerdefiniert' },
          { value: '255_to_100', label: '0..255 → 0..100 %' },
          { value: '100_to_255', label: '0..100 % → 0..255' },
          { value: '10v_to_100', label: '0..10 V → 0..100 %' },
          { value: '100_to_10v', label: '0..100 % → 0..10 V' },
        ] },
        { key: 'inMin', label: 'In Min', kind: 'number', placeholder: '0' },
        { key: 'inMax', label: 'In Max', kind: 'number', placeholder: '100' },
        { key: 'outMin', label: 'Out Min', kind: 'number', placeholder: '0' },
        { key: 'outMax', label: 'Out Max', kind: 'number', placeholder: '100' },
        { key: 'clamp', label: 'Begrenzen', kind: 'select', options: [
          { value: 'true', label: 'Ja' },
          { value: 'false', label: 'Nein' },
        ] },
        { key: 'precision', label: 'Nachkommastellen', kind: 'number', placeholder: '2' },
      ],
      defaults: { preset: 'custom', inMin: 0, inMax: 100, outMin: 0, outMax: 100, clamp: 'true', precision: 2 },
    },

    // --- Regelung / Klima
    {
      type: 'rt_2p',
      name: 'Raumtemperaturregler (2‑Punkt)',
      category: 'Regelung',
      icon: '🌡',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'ist', label: 'Ist', dataType: 'number' },
        { key: 'soll', label: 'Soll', dataType: 'number' },
      ],
      outputs: [
        { key: 'out', label: 'Aus', dataType: 'bool' },
        { key: 'delta', label: 'ΔT', dataType: 'number' },
      ],
      params: [
        { key: 'mode', label: 'Modus', kind: 'select', options: [
          { value: 'heat', label: 'Heizen' },
          { value: 'cool', label: 'Kühlen' },
        ] },
        { key: 'band', label: 'Hysterese (K)', kind: 'number', placeholder: '0,3' },
        { key: 'minOnMs', label: 'Min. EIN (ms)', kind: 'number', placeholder: '0' },
        { key: 'minOffMs', label: 'Min. AUS (ms)', kind: 'number', placeholder: '0' },
        { key: 'init', label: 'Start', kind: 'select', options: [
          { value: 'false', label: 'Aus' },
          { value: 'true', label: 'Ein' },
        ] },
        { key: 'persistState', label: 'Reglerzustand nach Neustart wiederherstellen', kind: 'select', options: [
          { value: 'true', label: 'Ja' }, { value: 'false', label: 'Nein' },
        ] },
      ],
      defaults: { mode: 'heat', band: 0.3, minOnMs: 0, minOffMs: 0, init: 'false', persistState: 'true' },
    },
    {
      type: 'rt_p',
      name: 'Raumtemperaturregler (P)',
      category: 'Regelung',
      icon: '📈',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'ist', label: 'Ist', dataType: 'number' },
        { key: 'soll', label: 'Soll', dataType: 'number' },
      ],
      outputs: [
        { key: 'out', label: 'Stellwert (%)', dataType: 'number' },
        { key: 'delta', label: 'ΔT', dataType: 'number' },
      ],
      params: [
        { key: 'mode', label: 'Modus', kind: 'select', options: [
          { value: 'heat', label: 'Heizen' },
          { value: 'cool', label: 'Kühlen' },
        ] },
        { key: 'kp', label: 'Kp (%/K)', kind: 'number', placeholder: '30' },
        { key: 'deadband', label: 'Totband (K)', kind: 'number', placeholder: '0,2' },
        { key: 'outMin', label: 'Min (%)', kind: 'number', placeholder: '0' },
        { key: 'outMax', label: 'Max (%)', kind: 'number', placeholder: '100' },
        { key: 'precision', label: 'Nachkommastellen', kind: 'number', placeholder: '1' },
      ],
      defaults: { mode: 'heat', kp: 30, deadband: 0.2, outMin: 0, outMax: 100, precision: 1 },
    },
    {
      type: 'pwm',
      name: 'PWM (Zeitproportional)',
      category: 'Regelung',
      icon: '〰',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'in', label: 'Stellwert (%)', dataType: 'number' },
      ],
      outputs: [
        { key: 'out', label: 'Aus', dataType: 'bool' },
      ],
      params: [
        { key: 'periodMs', label: 'Periode (ms)', kind: 'number', placeholder: '600000' },
        { key: 'minPulseMs', label: 'Min. Puls (ms)', kind: 'number', placeholder: '2000' },
      ],
      defaults: { periodMs: 600000, minPulseMs: 2000 },
    },


    {
      type: 'rt_pi',
      name: 'Raumtemperaturregler (PI)',
      category: 'Regelung',
      icon: '🌀',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'ist', label: 'Ist', dataType: 'number' },
        { key: 'soll', label: 'Soll', dataType: 'number' },
        { key: 'reset', label: 'Reset', dataType: 'bool' },
      ],
      outputs: [
        { key: 'out', label: 'Stellwert (%)', dataType: 'number' },
        { key: 'delta', label: 'ΔT', dataType: 'number' },
        { key: 'p', label: 'P', dataType: 'number' },
        { key: 'i', label: 'I', dataType: 'number' },
      ],
      params: [
        { key: 'mode', label: 'Modus', kind: 'select', options: [
          { value: 'heat', label: 'Heizen' },
          { value: 'cool', label: 'Kühlen' },
        ] },
        { key: 'kp', label: 'Kp (%/K)', kind: 'number', placeholder: '30' },
        { key: 'ti', label: 'Ti (s)', kind: 'number', placeholder: '600' },
        { key: 'cycleMs', label: 'Regelzyklus (ms)', kind: 'number', placeholder: '10000' },
        { key: 'deadband', label: 'Totband (K)', kind: 'number', placeholder: '0,2' },
        { key: 'outMin', label: 'Min (%)', kind: 'number', placeholder: '0' },
        { key: 'outMax', label: 'Max (%)', kind: 'number', placeholder: '100' },
        { key: 'antiWindup', label: 'Anti‑Windup', kind: 'select', options: [
          { value: 'true', label: 'Ja' },
          { value: 'false', label: 'Nein' },
        ] },
        { key: 'resetOnDisable', label: 'I‑Anteil bei AUS zurücksetzen', kind: 'select', options: [
          { value: 'true', label: 'Ja' },
          { value: 'false', label: 'Nein' },
        ] },
        { key: 'precision', label: 'Nachkommastellen', kind: 'number', placeholder: '1' },
      ],
      defaults: { mode: 'heat', kp: 30, ti: 600, cycleMs: 10000, deadband: 0.2, outMin: 0, outMax: 100, antiWindup: 'true', resetOnDisable: 'true', precision: 1 },
    },

    {
      type: 'season_switch',
      name: 'Sommer/Winter Umschalter',
      category: 'Regelung',
      icon: '☀️',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'tOut', label: 'Außen (°C)', dataType: 'number' },
        { key: 'summerIn', label: 'Sommer (manuell)', dataType: 'bool' },
        { key: 'winterVal', label: 'Winter‑Wert', dataType: 'any' },
        { key: 'summerVal', label: 'Sommer‑Wert', dataType: 'any' },
      ],
      outputs: [
        { key: 'out', label: 'Aus', dataType: 'any' },
        { key: 'summer', label: 'Sommer', dataType: 'bool' },
        { key: 'winter', label: 'Winter', dataType: 'bool' },
      ],
      params: [
        { key: 'mode', label: 'Modell', kind: 'select', options: [
          { value: 'auto', label: 'Auto (Außentemperatur)' },
          { value: 'manual', label: 'Manuell (Sommer‑Input)' },
        ] },
        { key: 'summerOn', label: 'Sommer ab (°C)', kind: 'number', placeholder: '18' },
        { key: 'winterOn', label: 'Winter ab (°C)', kind: 'number', placeholder: '15' },
        { key: 'init', label: 'Startmodus', kind: 'select', options: [
          { value: 'winter', label: 'Winter' },
          { value: 'summer', label: 'Sommer' },
        ] },
      ],
      defaults: { mode: 'auto', summerOn: 18, winterOn: 15, init: 'winter' },
    },

    {
      type: 'window_lock',
      name: 'Fensterkontakt‑Sperre',
      category: 'Regelung',
      icon: '🪟',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'in', label: 'Ein', dataType: 'bool' },
        { key: 'window', label: 'Fenster offen', dataType: 'bool' },
      ],
      outputs: [
        { key: 'out', label: 'Aus', dataType: 'bool' },
        { key: 'blocked', label: 'Gesperrt', dataType: 'bool' },
      ],
      params: [
        { key: 'invertWindow', label: 'Fenster‑Signal invertieren', kind: 'select', options: [
          { value: 'false', label: 'Nein' },
          { value: 'true', label: 'Ja' },
        ] },
        { key: 'openDelayMs', label: 'Sperre nach (ms)', kind: 'number', placeholder: '0' },
        { key: 'closeDelayMs', label: 'Freigabe nach (ms)', kind: 'number', placeholder: '0' },
        { key: 'blockOut', label: 'Ausgang bei Sperre', kind: 'select', options: [
          { value: 'false', label: 'Aus (false)' },
          { value: 'true', label: 'Ein (true)' },
        ] },
      ],
      defaults: { invertWindow: 'false', openDelayMs: 0, closeDelayMs: 0, blockOut: 'false' },
    },

    {
      type: 'heating_curve',
      name: 'Heizkurve (Vorlauf‑Soll)',
      category: 'Regelung',
      icon: '🔥',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'tOut', label: 'Außen (°C)', dataType: 'number' },
        { key: 'room', label: 'Raum‑Soll (°C)', dataType: 'number' },
      ],
      outputs: [
        { key: 'out', label: 'Vorlauf‑Soll (°C)', dataType: 'number' },
        { key: 'active', label: 'Aktiv', dataType: 'bool' },
      ],
      params: [
        { key: 'model', label: 'Modell', kind: 'select', options: [
          { value: '2point', label: '2‑Punkt (linear)' },
          { value: 'slope', label: 'Steigung/Niveau' },
        ] },

        { key: 'tOutWarm', label: 'Außen warm (°C)', kind: 'number', placeholder: '20' },
        { key: 'tFlowWarm', label: 'Vorlauf warm (°C)', kind: 'number', placeholder: '25' },
        { key: 'tOutCold', label: 'Außen kalt (°C)', kind: 'number', placeholder: '-10' },
        { key: 'tFlowCold', label: 'Vorlauf kalt (°C)', kind: 'number', placeholder: '50' },

        { key: 'slope', label: 'Steigung', kind: 'number', placeholder: '1,2' },
        { key: 'level', label: 'Niveau (°C)', kind: 'number', placeholder: '20' },

        { key: 'shift', label: 'Parallel‑Shift (°C)', kind: 'number', placeholder: '0' },
        { key: 'roomRef', label: 'Referenz Raum (°C)', kind: 'number', placeholder: '20' },
        { key: 'roomGain', label: 'Raum‑Einfluss (°C/K)', kind: 'number', placeholder: '0' },

        { key: 'minFlow', label: 'Min Vorlauf (°C)', kind: 'number', placeholder: '20' },
        { key: 'maxFlow', label: 'Max Vorlauf (°C)', kind: 'number', placeholder: '60' },

        { key: 'precision', label: 'Nachkommastellen', kind: 'number', placeholder: '1' },
      ],
      defaults: { model: '2point', tOutWarm: 20, tFlowWarm: 25, tOutCold: -10, tFlowCold: 50, slope: 1.2, level: 20, shift: 0, roomRef: 20, roomGain: 0, minFlow: 20, maxFlow: 60, precision: 1 },
    },

    {
      type: 'mixer_2p',
      name: 'Mischer‑Regler (2‑Punkt)',
      category: 'Regelung',
      icon: '🛠',
      inputs: [
        { key: 'enable', label: 'Freigabe', dataType: 'bool' },
        { key: 'ist', label: 'Ist (°C)', dataType: 'number' },
        { key: 'soll', label: 'Soll (°C)', dataType: 'number' },
      ],
      outputs: [
        { key: 'open', label: 'Auf', dataType: 'bool' },
        { key: 'close', label: 'Zu', dataType: 'bool' },
        { key: 'delta', label: 'ΔT', dataType: 'number' },
      ],
      params: [
        { key: 'band', label: 'Totband (K)', kind: 'number', placeholder: '0,5' },
        { key: 'pulseMs', label: 'Impuls (ms)', kind: 'number', placeholder: '1500' },
        { key: 'pauseMs', label: 'Pause (ms)', kind: 'number', placeholder: '3000' },
        { key: 'invert', label: 'Richtung invertieren', kind: 'select', options: [
          { value: 'false', label: 'Nein' },
          { value: 'true', label: 'Ja' },
        ] },
      ],
      defaults: { band: 0.5, pulseMs: 1500, pauseMs: 3000, invert: 'false' },
    },

    // --- Time
    {
      type: 'delay_on',
      name: 'Verzögerung EIN',
      category: 'Zeit',
      icon: '⏱',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'ms', label: 'Delay (ms)', kind: 'number', placeholder: '1000' },
      ],
      defaults: { ms: 1000 },
    },
    {
      type: 'delay_off',
      name: 'Verzögerung AUS',
      category: 'Zeit',
      icon: '⏱',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'ms', label: 'Delay (ms)', kind: 'number', placeholder: '1000' },
      ],
      defaults: { ms: 1000 },
    },
    {
      type: 'pulse',
      name: 'Impuls',
      category: 'Zeit',
      icon: '⚡',
      inputs: [{ key: 'trig', label: 'Trig', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'ms', label: 'Impuls (ms)', kind: 'number', placeholder: '500' },
        { key: 'edge', label: 'Flanke', kind: 'select', options: [
          { value: 'rising', label: 'steigend' },
          { value: 'falling', label: 'fallend' },
          { value: 'both', label: 'beide' },
        ] },
      ],
      defaults: { ms: 500, edge: 'rising' },
    },
    {
      type: 'staircase',
      name: 'Treppenlicht',
      category: 'Zeit',
      icon: '💡',
      inputs: [{ key: 'trig', label: 'Trig', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'ms', label: 'Zeit (ms)', kind: 'number', placeholder: '60000' },
        { key: 'edge', label: 'Flanke', kind: 'select', options: [
          { value: 'rising', label: 'steigend' },
          { value: 'falling', label: 'fallend' },
          { value: 'both', label: 'beide' },
        ] },
      ],
      defaults: { ms: 60000, edge: 'rising' },
    },
    {
      type: 'after_run',
      name: 'Nachlauf',
      category: 'Zeit',
      icon: '⏳',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'ms', label: 'Nachlauf (ms)', kind: 'number', placeholder: '1000' },
      ],
      defaults: { ms: 1000 },
    },
    {
      type: 'pulse_extend',
      name: 'Impulsverlängerer',
      category: 'Zeit',
      icon: '⏱',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'ms', label: 'Verlängerung (ms)', kind: 'number', placeholder: '1000' },
      ],
      defaults: { ms: 1000 },
    },

    // --- Zeitprogramme
    {
      type: 'schedule',
      name: 'Zeitprogramm',
      category: 'Zeitprogramme',
      icon: '🗓',
      inputs: [
        { key: 'enable', label: 'Enable', dataType: 'bool' },
        { key: 'holiday', label: 'Feiertag (A)', dataType: 'bool' },
      ],
      outputs: [{ key: 'out', label: 'Aktiv', dataType: 'bool' }],
      params: [
        { key: 'days', label: 'Tage', kind: 'days' },
        { key: 'from', label: 'Von', kind: 'time', placeholder: '00:00' },
        { key: 'to', label: 'Bis', kind: 'time', placeholder: '23:59' },
        { key: 'holidayMode', label: 'Feiertag', kind: 'select', options: [
          { value: 'asSunday', label: 'wie Sonntag (DE Standard)' },
          { value: 'ignore', label: 'ignorieren' },
          { value: 'off', label: 'aus (ST aktiv)' },
        ] },
      ],
      defaults: { days: 'Mo,Di,Mi,Do,Fr,Sa,So', from: '00:00', to: '23:59', holidayMode: 'asSunday' },
    },

    // --- Zähler
    {
      type: 'impulse_counter',
      name: 'Impulszähler',
      category: 'Zähler',
      icon: '#',
      inputs: [
        { key: 'trig', label: 'Trig', dataType: 'bool' },
        { key: 'reset', label: 'Reset', dataType: 'bool' },
      ],
      outputs: [{ key: 'out', label: 'Zähler', dataType: 'number' }],
      params: [
        { key: 'step', label: 'Schritt', kind: 'number', placeholder: '1' },
        { key: 'init', label: 'Startwert', kind: 'number', placeholder: '0' },
        { key: 'clamp', label: 'Begrenzen', kind: 'select', options: [
          { value: 'false', label: 'Nein' },
          { value: 'true', label: 'Ja' },
        ] },
        { key: 'min', label: 'Min', kind: 'number', placeholder: '0' },
        { key: 'max', label: 'Max', kind: 'number', placeholder: '100' },
      ],
      defaults: { step: 1, init: 0, clamp: 'false', min: 0, max: 100 },
    },
    {
      type: 'counter',
      name: 'Zähler (Up/Down)',
      category: 'Zähler',
      icon: '±',
      inputs: [
        { key: 'up', label: 'Up', dataType: 'bool' },
        { key: 'down', label: 'Down', dataType: 'bool' },
        { key: 'reset', label: 'Reset', dataType: 'bool' },
      ],
      outputs: [{ key: 'out', label: 'Zähler', dataType: 'number' }],
      params: [
        { key: 'step', label: 'Schritt', kind: 'number', placeholder: '1' },
        { key: 'init', label: 'Startwert', kind: 'number', placeholder: '0' },
        { key: 'clamp', label: 'Begrenzen', kind: 'select', options: [
          { value: 'false', label: 'Nein' },
          { value: 'true', label: 'Ja' },
        ] },
        { key: 'min', label: 'Min', kind: 'number', placeholder: '0' },
        { key: 'max', label: 'Max', kind: 'number', placeholder: '100' },
      ],
      defaults: { step: 1, init: 0, clamp: 'false', min: 0, max: 100 },
    },
    {
      type: 'runtime_hours',
      name: 'Betriebsstunden',
      category: 'Zähler',
      icon: '⌛',
      inputs: [
        { key: 'run', label: 'Run', dataType: 'bool' },
        { key: 'reset', label: 'Reset', dataType: 'bool' },
      ],
      outputs: [{ key: 'out', label: 'h', dataType: 'number' }],
      params: [
        { key: 'initHours', label: 'Start (h)', kind: 'number', placeholder: '0' },
        { key: 'precision', label: 'Nachkommastellen', kind: 'number', placeholder: '2' },
        { key: 'persistState', label: 'Zustand nach Neustart wiederherstellen', kind: 'select', options: [
          { value: 'true', label: 'Ja' }, { value: 'false', label: 'Nein' },
        ] },
      ],
      defaults: { initHours: 0, precision: 2, persistState: 'true' },
    },

    // --- SmartHome
    {
      type: 'scene_trigger',
      name: 'Szene auslösen',
      category: 'SmartHome',
      icon: '▶',
      inputs: [{ key: 'trig', label: 'Trig', dataType: 'bool' }],
      outputs: [{ key: 'out', label: 'Aus', dataType: 'bool' }],
      params: [
        { key: 'sceneId', label: 'Szene', kind: 'scene' },
        { key: 'edge', label: 'Flanke', kind: 'select', options: [
          { value: 'rising', label: 'steigend' },
          { value: 'falling', label: 'fallend' },
          { value: 'both', label: 'beide' },
        ] },
        { key: 'payload', label: 'Wert', kind: 'select', options: [
          { value: 'true', label: 'true' },
          { value: '1', label: '1' },
          { value: '0', label: '0' },
          { value: 'false', label: 'false' },
        ] },
        { key: 'pulseMs', label: 'Rücksetzen (ms)', kind: 'number', placeholder: '0' },
        { key: 'dpId', label: 'Fallback DP', kind: 'dp', placeholder: 'optional' },
        { key: 'readbackId', label: 'Readback DP', kind: 'dp', placeholder: 'optional' },
        { key: 'requireReadback', label: 'Readback erforderlich', kind: 'select', options: [
          { value: 'false', label: 'Nein' }, { value: 'true', label: 'Ja' },
        ] },
        { key: 'readbackMaxAgeMs', label: 'Max. Readback-Alter (ms)', kind: 'number', placeholder: '15000' },
        { key: 'ackTimeoutMs', label: 'Readback-Timeout (ms)', kind: 'number', placeholder: '5000' },
        { key: 'retryDelayMs', label: 'Wiederholung nach (ms)', kind: 'number', placeholder: '3000' },
        { key: 'maxRetries', label: 'Max. Wiederholungen', kind: 'number', placeholder: '0' },
        { key: 'faultLockMs', label: 'Fehlerverriegelung (ms)', kind: 'number', placeholder: '60000' },
        { key: 'leaseMs', label: 'Aktor-Lease (ms)', kind: 'number', placeholder: '60000' },
      ],
      defaults: { sceneId: '', edge: 'rising', payload: 'true', pulseMs: 0, dpId: '', readbackId: '', requireReadback: 'false', readbackMaxAgeMs: 15000, ackTimeoutMs: 5000, retryDelayMs: 3000, maxRetries: 0, faultLockMs: 60000, leaseMs: 60000, autoRetry: 'false' },
    },

    // --- Output
    {
      type: 'dp_out',
      name: 'DP Ausgang',
      category: 'Ausgänge',
      icon: '⭱',
      inputs: [{ key: 'in', label: 'Ein', dataType: 'any' }],
      outputs: [],
      params: [
        { key: 'dpId', label: 'Datenpunkt', kind: 'dp', placeholder: 'z.B. knx.0.xxx.yyy' },
        { key: 'ack', label: 'Ack', kind: 'select', options: [
          { value: 'false', label: 'ack=false (schreiben)' },
          { value: 'true', label: 'ack=true (nur spiegeln)' },
        ] },
        { key: 'minIntervalMs', label: 'Min. Schreibabstand (ms)', kind: 'number', placeholder: '100' },
        { key: 'readbackId', label: 'Readback DP', kind: 'dp', placeholder: 'optional; sonst Ziel-DP' },
        { key: 'requireReadback', label: 'Readback erforderlich', kind: 'select', options: [
          { value: 'false', label: 'Nein' }, { value: 'true', label: 'Ja' },
        ] },
        { key: 'readbackTolerance', label: 'Readback-Toleranz', kind: 'number', placeholder: '1' },
        { key: 'readbackMaxAgeMs', label: 'Max. Readback-Alter (ms)', kind: 'number', placeholder: '15000' },
        { key: 'ackTimeoutMs', label: 'ACK-/Readback-Timeout (ms)', kind: 'number', placeholder: '5000' },
        { key: 'retryDelayMs', label: 'Wiederholung nach (ms)', kind: 'number', placeholder: '3000' },
        { key: 'maxRetries', label: 'Max. Wiederholungen', kind: 'number', placeholder: '3' },
        { key: 'faultLockMs', label: 'Fehlerverriegelung (ms)', kind: 'number', placeholder: '60000' },
        { key: 'leaseMs', label: 'Aktor-Lease (ms)', kind: 'number', placeholder: '60000' },
        { key: 'releaseOnIdle', label: 'Bei 0/false an Automatik zurückgeben', kind: 'select', options: [
          { value: 'true', label: 'Ja' }, { value: 'false', label: 'Nein' },
        ] },
        { key: 'deactivateMode', label: 'Bei Deaktivieren/Löschen', kind: 'select', options: [
          { value: 'safe', label: 'Sicheren Ruhewert schreiben' },
          { value: 'hold', label: 'Letzten Wert halten' },
        ] },
        { key: 'stopValue', label: 'Sicherer Ruhewert', kind: 'text', placeholder: 'Standard: false bzw. 0' },
        { key: 'budgetMode', label: 'Zentrales EMS-Budget', kind: 'select', options: [
          { value: 'none', label: 'Kein Budget / normaler DP' },
          { value: 'pv', label: 'PV-Grant' },
          { value: 'total', label: 'Gesamt-/Netz-Grant' },
        ] },
        { key: 'budgetPowerW', label: 'Budget-Leistung (W)', kind: 'number', placeholder: '0 = numerischen Eingang verwenden' },
        { key: 'budgetAction', label: 'Bei zu wenig Budget', kind: 'select', options: [
          { value: 'gate', label: 'Aus/0 bis voller Bedarf verfügbar' },
          { value: 'clamp', label: 'Numerischen Leistungswert begrenzen' },
        ] },
        { key: 'budgetPriority', label: 'Budget-Priorität', kind: 'number', placeholder: '900' },
      ],
      defaults: { dpId: '', ack: 'false', minIntervalMs: 100, readbackId: '', requireReadback: 'false', readbackTolerance: 1, readbackMaxAgeMs: 15000, ackTimeoutMs: 5000, retryDelayMs: 3000, maxRetries: 3, faultLockMs: 60000, leaseMs: 60000, releaseOnIdle: 'true', deactivateMode: 'safe', stopValue: '', budgetMode: 'none', budgetPowerW: 0, budgetAction: 'gate', budgetPriority: 900, autoRetry: 'true' },
    },
  ];

  // Index by type
  const byType = {};
  for (const it of LIB) byType[it.type] = it;
  return { list: LIB, byType };
}


// -----------------------------
// Load/Save API
// -----------------------------
/**
 * Code-Teil: nwFetchConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwFetchConfig() {
  try {
    const res = await fetch('/api/logic/editor');
    const json = await res.json();
    if (!json || json.ok !== true) throw new Error(json && json.error ? json.error : 'API error');
    return json.config;
  } catch (e) {
    nwSetStatus('Konfiguration konnte nicht geladen werden.', false);
    console.warn('logic editor: fetch config failed', e);
    return null;
  }
}
/**
 * Code-Teil: nwSaveConfig
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwSaveConfig(cfg) {
  try {
    const res = await fetch('/api/logic/editor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: cfg }),
    });
    const json = await res.json();
    if (!json || json.ok !== true) {
      const details = json && Array.isArray(json.issues) && json.issues.length
        ? ` ${json.issues.map((row) => row && row.message ? row.message : '').filter(Boolean).join(' | ')}`
        : '';
      throw new Error((json && json.error ? json.error : 'API error') + details);
    }
    return json;
  } catch (e) {
    console.warn('logic editor: save failed', e);
    return { ok: false, error: (e && e.message) ? e.message : String(e) };
  }
}


// -----------------------------
// Graph Model (single "main" graph)
// -----------------------------
/**
 * Code-Teil: nwDefaultGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDefaultGraph() {
  return {
    version: 1,
    graphs: [
      {
        id: 'main',
        name: 'Hauptlogik',
        enabled: true,
        board: { w: 2400, h: 1400 },
        nodes: [],
        links: [],
      }
    ],
  };
}
/**
 * Code-Teil: nwEnsureConfigDefaults
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureConfigDefaults(cfg) {
  if (!cfg || typeof cfg !== 'object') cfg = {};
  if (!Array.isArray(cfg.graphs)) cfg.graphs = [];
  if (!cfg.graphs.length) cfg.graphs = nwDefaultGraph().graphs;
  if (!cfg.version) cfg.version = 1;
  return cfg;
}
/**
 * Code-Teil: nwGetGraphById
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetGraphById(cfg, id) {
  cfg = nwEnsureConfigDefaults(cfg);
  const graphs = cfg.graphs;
  let g = null;
  if (id) g = graphs.find(x => x && x.id === id);
  if (!g) g = graphs.find(x => x && x.id === 'main') || graphs[0];
  if (!g) {
    cfg.graphs = nwDefaultGraph().graphs;
    g = cfg.graphs[0];
  }
  return g;
}
/**
 * Code-Teil: nwGetMainGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwGetMainGraph(cfg) {
  return nwGetGraphById(cfg, 'main');
}
/**
 * Code-Teil: nwRenderGraphSelector
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderGraphSelector() {
  const sel = nwLE.el.graphSelect;
  if (!sel) return;
  const cfg = nwEnsureConfigDefaults(nwLE.cfg || {});
  sel.innerHTML = '';
  const graphs = Array.isArray(cfg.graphs) ? cfg.graphs : [];
  for (const g of graphs) {
    if (!g || typeof g !== 'object') continue;
    const opt = document.createElement('option');
    opt.value = g.id;
    const dis = (g.enabled === false);
    const name = g.name || g.id || 'Logik';
    opt.textContent = dis ? `${name} (deaktiviert)` : name;
    sel.appendChild(opt);
  }
  if (nwLE.graphId) sel.value = nwLE.graphId;
}
/**
 * Code-Teil: nwUpdateGraphControls
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwUpdateGraphControls() {
  const g = nwLE.graph;
  const chk = nwLE.el.graphEnabled;
  if (chk) chk.checked = !(g && g.enabled === false);
}
/**
 * Code-Teil: nwSelectGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSelectGraph(id, opts = {}) {
  const cfg = nwEnsureConfigDefaults(nwLE.cfg || {});
  const g = nwGetGraphById(cfg, id);
  nwLE.cfg = cfg;
  nwLE.graph = g;
  nwLE.graphId = g && g.id ? g.id : null;
  try { if (nwLE.graphId) localStorage.setItem('nwLE.graphId', nwLE.graphId); } catch {}

  nwEnsureGraphDefaults(g);
  nwRenderGraphSelector();
  nwUpdateGraphControls();

  if (!opts || opts.skipRender !== true) {
    nwRenderGraph();
  }
  if (nwLE.simulation.active && !nwLE.history.suppress) nwSimReset(false);
}
/**
 * Code-Teil: nwAddGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddGraph() {
  const cfg = nwEnsureConfigDefaults(nwLE.cfg || {});
  const name = (prompt('Name der neuen Logikseite:', 'Neue Logik') || '').trim();
  if (!name) return;
  let id = nwUuid('g');
  // ensure unique
  const ids = new Set(cfg.graphs.map(x => x && x.id).filter(Boolean));
  while (ids.has(id)) id = nwUuid('g');
  const g = {
    id,
    name,
    enabled: true,
    board: { w: 2400, h: 1400 },
    nodes: [],
    links: [],
  };
  cfg.graphs.push(g);
  nwLE.cfg = cfg;
  nwSelectGraph(id);
  nwMarkDirty();
}
/**
 * Code-Teil: nwDuplicateGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDuplicateGraph() {
  const cfg = nwEnsureConfigDefaults(nwLE.cfg || {});
  const src = nwLE.graph;
  if (!src) return;
  let id = nwUuid('g');
  const ids = new Set(cfg.graphs.map(x => x && x.id).filter(Boolean));
  while (ids.has(id)) id = nwUuid('g');
  const copy = nwJsonClone(src);
  copy.id = id;
  copy.name = `${src.name || 'Logik'} (Kopie)`;
  if (copy.enabled === undefined) copy.enabled = true;
  cfg.graphs.push(copy);
  nwLE.cfg = cfg;
  nwSelectGraph(id);
  nwMarkDirty();
}
/**
 * Code-Teil: nwRenameGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenameGraph() {
  const g = nwLE.graph;
  if (!g) return;
  const name = (prompt('Neuer Name der Logikseite:', g.name || g.id || '') || '').trim();
  if (!name) return;
  g.name = name;
  nwRenderGraphSelector();
  nwMarkDirty();
}
/**
 * Code-Teil: nwDeleteGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDeleteGraph() {
  const cfg = nwEnsureConfigDefaults(nwLE.cfg || {});
  if (!Array.isArray(cfg.graphs) || cfg.graphs.length <= 1) {
    alert('Mindestens eine Logikseite muss vorhanden sein.');
    return;
  }
  const g = nwLE.graph;
  if (!g) return;
  if (!confirm(`Logikseite "${g.name || g.id}" wirklich löschen?`)) return;
  const idx = cfg.graphs.findIndex(x => x && x.id === g.id);
  if (idx < 0) return;
  cfg.graphs.splice(idx, 1);
  nwLE.cfg = cfg;
  const next = cfg.graphs[Math.min(idx, cfg.graphs.length - 1)];
  nwSelectGraph(next && next.id ? next.id : 'main');
  nwMarkDirty();
}
/**
 * Code-Teil: nwMarkDirty
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwMarkDirty(label = 'Änderung') {
  nwLE.dirty = true;
  nwSetStatus('Ungespeichert…', false);
  nwHistoryScheduleCommit(label);
  nwScheduleLocalDraft();
  if (nwLE.simulation.active) {
    nwLE.simulation.inputSignature = '';
    nwSimEvaluate('Graph geändert');
  }
}


// -----------------------------
// Rendering
// -----------------------------
/**
 * Code-Teil: nwClearBoard
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwClearBoard() {
  const board = nwLE.el.board;
  if (!board) return;
  if (nwLE.connecting) nwCancelConnect();
  [...board.querySelectorAll('.nw-le-node')].forEach(n => n.remove());
  // clear wires
  const svg = nwLE.el.wires;
  if (svg) svg.innerHTML = '';
}
/**
 * Code-Teil: nwEnsureBoardSize
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureBoardSize() {
  const g = nwLE.graph;
  if (!g) return;
  const board = nwLE.el.board;
  if (!board) return;

  const w = Math.max(800, Number(g.board && g.board.w) || 2400);
  const h = Math.max(600, Number(g.board && g.board.h) || 1400);

  const z = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);
  nwLE.zoom = z;

  const scale = nwLE.el.boardScale;
  if (scale) {
    scale.style.width = `${Math.round(w * z)}px`;
    scale.style.height = `${Math.round(h * z)}px`;
  }

  board.style.width = `${w}px`;
  board.style.height = `${h}px`;
  board.style.transform = `scale(${z})`;

  const svg = nwLE.el.wires;
  if (svg) {
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  nwUpdateLaneGuides();
  nwUpdateZoomLabel();
}
/**
 * Code-Teil: nwUpdateZoomLabel
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwUpdateZoomLabel() {
  const el = nwLE.el.zoomLabel;
  if (!el) return;
  const z = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);
  el.textContent = `${Math.round(z * 100)}%`;
}
/**
 * Code-Teil: nwSetZoom
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetZoom(newZoom, opts = {}) {
  const wrap = nwLE.el.boardWrap;
  const g = nwLE.graph;
  const w = Math.max(800, Number(g && g.board && g.board.w) || 2400);
  const h = Math.max(600, Number(g && g.board && g.board.h) || 1400);

  const oldZ = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);
  const z = nwClamp(nwNum(newZoom, 1), 0.4, 2.5);
  if (Math.abs(z - oldZ) < 0.001) return;

  // keep visual center stable
  let cx = 0, cy = 0;
  if (wrap) {
    cx = (wrap.scrollLeft + (wrap.clientWidth / 2)) / oldZ;
    cy = (wrap.scrollTop + (wrap.clientHeight / 2)) / oldZ;
  }

  nwLE.zoom = z;
  try { localStorage.setItem('nwLE.zoom', String(z)); } catch {}

  nwEnsureBoardSize();
  nwUpdateAllWirePaths();

  if (wrap) {
    const nx = cx * z - (wrap.clientWidth / 2);
    const ny = cy * z - (wrap.clientHeight / 2);
    wrap.scrollLeft = Math.max(0, nx);
    wrap.scrollTop = Math.max(0, ny);
  }

  // ensure fit bounds
  const scale = nwLE.el.boardScale;
  if (scale) {
    scale.style.width = `${Math.round(w * z)}px`;
    scale.style.height = `${Math.round(h * z)}px`;
  }
}
/**
 * Code-Teil: nwZoomIn
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwZoomIn() {
  nwSetZoom(nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5) + 0.1);
}
/**
 * Code-Teil: nwZoomOut
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwZoomOut() {
  nwSetZoom(nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5) - 0.1);
}
/**
 * Code-Teil: nwZoomReset
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwZoomReset() {
  nwSetZoom(1);
}
/**
 * Code-Teil: nwZoomFit
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwZoomFit() {
  const wrap = nwLE.el.boardWrap;
  const g = nwLE.graph;
  if (!wrap || !g) return;
  const w = Math.max(800, Number(g.board && g.board.w) || 2400);
  const h = Math.max(600, Number(g.board && g.board.h) || 1400);
  const zx = (wrap.clientWidth - 24) / w;
  const zy = (wrap.clientHeight - 24) / h;
  const z = Math.min(zx, zy);
  nwSetZoom(z);
}
/**
 * Code-Teil: nwRenderPalette
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderPalette() {
  const wrap = nwLE.el.palette;
  if (!wrap) return;
  wrap.innerHTML = '';
  /**
   * Code-Teil: palKey
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const palKey = (cat) => `nwLE.pal.collapsed.${encodeURIComponent(String(cat || ''))}`;
  /**
   * Code-Teil: palGetCollapsed
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const palGetCollapsed = (cat) => {
    try {
      const v = localStorage.getItem(palKey(cat));
      if (v === '1') return true;
      if (v === '0') return false;
    } catch (_e) {}
    // Default: nur die wichtigsten Ordner offen lassen
    return !(['Eingänge', 'Logik'].includes(String(cat || '')));
  };
  /**
   * Code-Teil: Arrow-Funktion `palSetCollapsed`
   * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: palSetCollapsed
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const palSetCollapsed = (cat, collapsed) => {
    try { localStorage.setItem(palKey(cat), collapsed ? '1' : '0'); } catch (_e) {}
  };

  const groups = {};
  for (const it of nwLE.lib.list) {
    const cat = it.category || 'Sonstiges';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(it);
  }
  const cats = Object.keys(groups);
  const order = ['Eingänge','Logik','Vergleich','Mathe','Konvertierung','Regelung','Zeit','Zeitprogramme','Zähler','SmartHome','Ausgänge'];
  cats.sort((a,b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  for (const cat of cats) {
    const collapsed = palGetCollapsed(cat);

    const folder = document.createElement('button');
    folder.type = 'button';
    folder.className = 'nw-le__palette-folder';
    folder.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    folder.innerHTML = `
      <span class="nw-le__palette-folder-left">
        <span class="nw-le__palette-folder-arrow">▸</span>
        <span class="nw-le__palette-folder-title">${nwSafeStr(cat)}</span>
      </span>
      <span class="nw-le__palette-folder-count">${groups[cat].length}</span>
    `;

    const groupWrap = document.createElement('div');
    groupWrap.className = 'nw-le__palette-group';
    if (collapsed) groupWrap.classList.add('is-collapsed');

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an folder. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    folder.addEventListener('click', () => {
      const isCollapsed = groupWrap.classList.toggle('is-collapsed');
      folder.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      palSetCollapsed(cat, isCollapsed);
    });

    wrap.appendChild(folder);

    for (const it of groups[cat]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nw-le__palette-item';
      btn.draggable = true;
      btn.dataset.blockType = it.type;
      btn.innerHTML = `<span class="nw-le__palette-icon">${it.icon || ''}</span><span>${it.name}</span>`;
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', (e) => {
        if ((nwNow() - nwNum(nwLE.lastPaletteDropAt, 0)) < 250) {
          e.preventDefault();
          return;
        }
        nwAddNode(it.type);
      });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragstart' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('dragstart', (e) => {
        const payload = JSON.stringify({ type: it.type });
        nwLE.paletteDragType = it.type;
        btn.classList.add('is-dragging');
        try {
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('application/x-nexologic-block', payload);
          e.dataTransfer.setData('text/plain', payload);
        } catch (_e) {}
      });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragend' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('dragend', () => {
        btn.classList.remove('is-dragging');
        nwLE.paletteDragType = null;
        if (nwLE.el.boardWrap) nwLE.el.boardWrap.classList.remove('is-drag-over');
      });
      groupWrap.appendChild(btn);
    }

    wrap.appendChild(groupWrap);
  }
}
/**
 * Code-Teil: nwRenderGraph
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderGraph() {
  nwClearBoard();
  nwEnsureBoardSize();
  const g = nwLE.graph;
  if (!g) return;

  // nodes
  for (const node of (g.nodes || [])) {
    nwRenderNode(node);
  }

  // wires
  nwRenderAllWires();
  nwUpdateLaneGuides();
  if (nwLE.simulation.active) nwUpdateSimulationVisuals();
}
/**
 * Code-Teil: nwRenderNode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderNode(node) {
  const g = nwLE.graph;
  const board = nwLE.el.board;
  if (!board || !node) return;

  const def = nwLE.lib.byType[node.type];
  if (!def) return;

  const el = document.createElement('div');
  const lane = nwNodeLane(node.type);
  el.className = `nw-le-node nw-le-node--lane-${lane}`;
  el.dataset.nodeId = node.id;
  el.style.left = `${Math.round(Number(node.x) || 40)}px`;
  el.style.top = `${Math.round(Number(node.y) || 40)}px`;

  if (node.id === nwLE.selectedNodeId) el.classList.add('is-selected');
  if (node.enabled === false) el.classList.add('is-disabled');

  const title = nwSafeStr(node.label || def.name);

  el.innerHTML = `
    <div class="nw-le-node__hdr">
      <div class="nw-le-node__hdr-left">
        <span class="nw-le-node__icon">${def.icon || ''}</span>
        <span class="nw-le-node__title">${title}</span>
      </div>
      <div class="nw-le-node__hdr-actions">
        <button type="button" class="nw-le-node__btn" data-act="del" title="Löschen">✕</button>
      </div>
    </div>
    <div class="nw-le-node__body">
      <div class="nw-le-node__ports nw-le-node__ports--in"></div>
      <div class="nw-le-node__ports nw-le-node__ports--out"></div>
    </div>
    <div class="nw-le-node__sim-values" aria-live="polite"></div>
  `;

  // select
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an el. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  el.addEventListener('mousedown', (e) => {
    // don't start dragging on port clicks
    const port = e.target && e.target.closest && e.target.closest('.nw-le-port');
    const btn = e.target && e.target.closest && e.target.closest('button');
    if (port) return;
    if (btn) return;
    nwSelectNode(node.id);
  });

  // drag
  const hdr = el.querySelector('.nw-le-node__hdr');
  if (hdr) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an hdr. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    hdr.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      nwSelectNode(node.id);
      const rect = el.getBoundingClientRect();
      nwLE.dragging = {
        nodeId: node.id,
        startX: e.clientX,
        startY: e.clientY,
        baseLeft: rect.left,
        baseTop: rect.top,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
    });
  }

  // delete
  const del = el.querySelector('button[data-act="del"]');
  if (del) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an del. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    del.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      nwDeleteNode(node.id);
    });
  }

  // ports
  const inWrap = el.querySelector('.nw-le-node__ports--in');
  const outWrap = el.querySelector('.nw-le-node__ports--out');
  /**
   * Code-Teil: Arrow-Funktion `mkPort`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkPort
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkPort = (dir, p) => {
    const d = document.createElement('div');
    d.className = `nw-le-port nw-le-port--${dir}`;
    d.dataset.nodeId = node.id;
    d.dataset.portKey = p.key;
    d.dataset.portDir = dir;
    d.dataset.portType = nwSafeStr(p && p.dataType ? p.dataType : 'any');
    d.tabIndex = 0;
    d.setAttribute('role', 'button');
    d.setAttribute('aria-label', `${dir === 'out' ? 'Ausgang' : 'Eingang'} ${nwSafeStr(p.label || p.key)} verbinden`);
    d.title = dir === 'out'
      ? 'Klicken oder ziehen, danach passenden Eingang auswählen.'
      : 'Hier ablegen oder klicken, um die Verbindung abzuschließen.';
    d.innerHTML = `
      <span class="nw-le-port__dot"></span>
      <span class="nw-le-port__label">${p.label || p.key}</span>
    `;

    // connect: start from output only
    if (dir === 'out') {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousedown' an d. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      d.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        nwStartConnect(node.id, p.key);
      });
      d.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        nwStartConnect(node.id, p.key);
      });
    }
    if (dir === 'in') {
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseup' an d. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      d.addEventListener('mouseup', (e) => {
        if (!nwLE.connecting) return;
        e.preventDefault();
        e.stopPropagation();
        nwFinishConnect(node.id, p.key);
      });
      // Zusätzlich zur Drag-Verbindung funktioniert bewusst auch
      // „Ausgang anklicken → Eingang anklicken“. Das ist auf Desktop-Rechnern
      // präziser und verhindert Probleme durch kleine Port-Hitboxen.
      d.addEventListener('click', (e) => {
        if (!nwLE.connecting) return;
        e.preventDefault();
        e.stopPropagation();
        nwFinishConnect(node.id, p.key);
      });
      d.addEventListener('keydown', (e) => {
        if (!nwLE.connecting || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        e.stopPropagation();
        nwFinishConnect(node.id, p.key);
      });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'contextmenu' an d. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      d.addEventListener('contextmenu', (e) => {
        const removed = nwRemoveLinksToInput(node.id, p.key);
        if (!removed) return;
        e.preventDefault();
        e.stopPropagation();
      });
    }
    return d;
  };

  (def.inputs || []).forEach(p => inWrap && inWrap.appendChild(mkPort('in', p)));
  (def.outputs || []).forEach(p => outWrap && outWrap.appendChild(mkPort('out', p)));

  board.appendChild(el);
  if (nwLE.simulation.active) nwUpdateSimulationVisuals();
}
/**
 * Code-Teil: nwRenderAllWires
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderAllWires() {
  const svg = nwLE.el.wires;
  if (!svg) return;
  svg.innerHTML = '';

  const g = nwLE.graph;
  const links = (g && Array.isArray(g.links)) ? g.links : [];
  for (const l of links) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(167,196,0,0.65)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('class', 'nw-le-wire');
    path.dataset.linkId = l.id;
    svg.appendChild(path);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('class', 'nw-le-wire-value');
    label.dataset.linkId = l.id;
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    svg.appendChild(label);
  }
  nwUpdateAllWirePaths();
}
/**
 * Code-Teil: nwUpdateAllWirePaths
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwUpdateAllWirePaths() {
  const svg = nwLE.el.wires;
  const board = nwLE.el.board;
  if (!svg || !board) return;

  const boardRect = board.getBoundingClientRect();
  const z = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);

  /**
   * Code-Teil: Arrow-Funktion `getPortPos`
   * Zweck: liest/ermittelt Werte und kapselt Fallback- oder Mapping-Logik.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: getPortPos
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const getPortPos = (nodeId, portKey, dir) => {
    const el = board.querySelector(`.nw-le-port[data-node-id="${CSS.escape(nodeId)}"][data-port-key="${CSS.escape(portKey)}"][data-port-dir="${dir}"] .nw-le-port__dot`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: ((r.left + r.width/2) - boardRect.left) / z,
      y: ((r.top + r.height/2) - boardRect.top) / z,
    };
  };

  /**
   * Code-Teil: Arrow-Funktion `mkPath`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkPath
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkPath = (a, b) => {
    const dx = Math.max(40, Math.abs(b.x - a.x) * 0.45);
    const c1 = { x: a.x + dx, y: a.y };
    const c2 = { x: b.x - dx, y: b.y };
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };

  const g = nwLE.graph;
  const links = (g && Array.isArray(g.links)) ? g.links : [];
  for (const l of links) {
    const p = svg.querySelector(`path[data-link-id="${CSS.escape(l.id)}"]`);
    if (!p) continue;
    const a = getPortPos(l.from && l.from.node, l.from && l.from.port, 'out');
    const b = getPortPos(l.to && l.to.node, l.to && l.to.port, 'in');
    if (!a || !b) {
      p.setAttribute('d', '');
      continue;
    }
    p.setAttribute('d', mkPath(a, b));
    const label = svg.querySelector(`text.nw-le-wire-value[data-link-id="${CSS.escape(l.id)}"]`);
    const value = nwLE.simulation.active && nwLE.simulation.outputs[l.from && l.from.node]
      ? nwLE.simulation.outputs[l.from.node][l.from && l.from.port]
      : undefined;
    p.classList.toggle('is-sim-true', nwLE.simulation.active && value === true);
    p.classList.toggle('is-sim-false', nwLE.simulation.active && value === false);
    p.classList.toggle('is-sim-number', nwLE.simulation.active && typeof value === 'number');
    if (label) {
      label.setAttribute('x', String((a.x + b.x) / 2));
      label.setAttribute('y', String((a.y + b.y) / 2 - 10));
      label.textContent = nwLE.simulation.active ? nwSimFormatValue(value) : '';
      label.classList.toggle('is-visible', !!nwLE.simulation.active);
    }
  }

  // preview wire
  if (nwLE.connecting && nwLE.connecting.previewPath) {
    const l = nwLE.connecting;
    const a = getPortPos(l.fromNodeId, l.fromPortKey, 'out');
    if (a && l.mouse) {
      l.previewPath.setAttribute('d', mkPath(a, l.mouse));
    }
  }
}


// -----------------------------
// Selection & Inspector
// -----------------------------
/**
 * Code-Teil: nwSelectNode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSelectNode(nodeId) {
  nwLE.selectedNodeId = nodeId;
  // update class
  const board = nwLE.el.board;
  if (board) {
    [...board.querySelectorAll('.nw-le-node')].forEach(n => {
      n.classList.toggle('is-selected', n.dataset.nodeId === nodeId);
    });
  }
  nwRenderInspector();
}
/**
 * Code-Teil: nwFindNode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFindNode(nodeId) {
  const g = nwLE.graph;
  const nodes = (g && Array.isArray(g.nodes)) ? g.nodes : [];
  return nodes.find(n => n && n.id === nodeId) || null;
}
/**
 * Code-Teil: nwRenderInspector
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderInspector() {
  const wrap = nwLE.el.inspector;
  if (!wrap) return;

  const node = nwFindNode(nwLE.selectedNodeId);
  if (!node) {
    wrap.innerHTML = `
      <div class="muted" style="font-size:0.85rem;line-height:1.4;">
        Kein Baustein ausgewählt.<br/>
        <span style="opacity:0.9;">Tipp: Baustein anklicken – dann können Name & Parameter bearbeitet werden.</span>
      </div>
    `;
    return;
  }

  const def = nwLE.lib.byType[node.type];
  if (!def) {
    wrap.innerHTML = `<div class="muted">Unbekannter Baustein‑Typ: ${nwSafeStr(node.type)}</div>`;
    return;
  }

  const params = node.params || {};

  /**
   * Code-Teil: Arrow-Funktion `mkRow`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkRow
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkRow = (label, html) => {
    const d = document.createElement('div');
    d.className = 'nw-le__inspector-row';
    d.innerHTML = `
      <div class="nw-le__inspector-label">${label}</div>
      <div class="nw-le__inspector-field">${html}</div>
    `;
    return d;
  };

  wrap.innerHTML = '';

  // Title
  const head = document.createElement('div');
  head.className = 'nw-le__inspector-head';
  head.innerHTML = `
    <div style="display:flex;gap:10px;align-items:center;">
      <div class="nw-le__inspector-icon">${def.icon || ''}</div>
      <div>
        <div style="font-weight:700;">${nwSafeStr(def.name)}</div>
        <div class="muted" style="font-size:0.8rem;">Typ: <span style="opacity:0.9;">${nwSafeStr(def.type)}</span></div>
      </div>
    </div>
  `;
  wrap.appendChild(head);

  // Enabled
  {
    const checked = node.enabled !== false;
    const row = mkRow('Aktiv', `<label class="switch"><input id="nw-le-insp-enabled" type="checkbox" ${checked ? 'checked' : ''}><span></span></label>`);
    wrap.appendChild(row);
    setTimeout(() => {
      const inp = document.getElementById('nw-le-insp-enabled');
      if (inp) {
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('change', () => {
          node.enabled = !!inp.checked;
          const board = nwLE.el.board;
          const el = board && board.querySelector(`.nw-le-node[data-node-id="${CSS.escape(node.id)}"]`);
          if (el) el.classList.toggle('is-disabled', node.enabled === false);
          nwMarkDirty();
        });
      }
    }, 0);
  }

  // Label
  {
    const row = mkRow('Name', `<input id="nw-le-insp-label" class="nw-config-input" value="${nwSafeStr(node.label || '')}" placeholder="${nwSafeStr(def.name)}"/>`);
    wrap.appendChild(row);
    setTimeout(() => {
      const inp = document.getElementById('nw-le-insp-label');
      if (inp) {
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        inp.addEventListener('input', () => {
          node.label = inp.value;
          const board = nwLE.el.board;
          const el = board && board.querySelector(`.nw-le-node[data-node-id="${CSS.escape(node.id)}"] .nw-le-node__title`);
          if (el) el.textContent = nwSafeStr(node.label || def.name);
          nwMarkDirty();
        });
      }
    }, 0);
  }

  // Params
  for (const p of (def.params || [])) {
    const key = p.key;
    const val = (params && Object.prototype.hasOwnProperty.call(params, key)) ? params[key] : (def.defaults ? def.defaults[key] : '');

    if (p.kind === 'dp') {
      const html = `
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="nw-le-insp-${key}" class="nw-config-input" value="${nwSafeStr(val)}" placeholder="${nwSafeStr(p.placeholder || '')}" style="flex:1;"/>
          <button id="nw-le-insp-${key}-pick" class="nw-config-btn nw-config-btn--ghost" type="button">…</button>
        </div>
      `;
      wrap.appendChild(mkRow(p.label, html));

      setTimeout(() => {
        const inp = document.getElementById(`nw-le-insp-${key}`);
        const pick = document.getElementById(`nw-le-insp-${key}-pick`);
        if (inp) {
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          inp.addEventListener('input', () => {
            node.params = node.params || {};
            node.params[key] = inp.value;
            nwMarkDirty();
          });
        }
        if (pick) {
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an pick. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          pick.addEventListener('click', async () => {
            const picked = await nwOpenDpPicker(nwSafeStr(inp && inp.value));
            if (picked !== null && picked !== undefined) {
              node.params = node.params || {};
              node.params[key] = picked;
              if (inp) inp.value = picked;
              nwMarkDirty();
            }
          });
        }
      }, 0);
      continue;
    }

    if (p.kind === 'scene') {
      const scenes = Array.isArray(nwLE.sceneOptions) ? nwLE.sceneOptions : [];
      const opts = [
        '<option value="">— wählen —</option>',
        ...scenes.map(s => `<option value="${String(s.value)}" ${String(s.value)===String(val) ? 'selected' : ''}>${s.label}</option>`),
      ].join('');
      const html = `<select id="nw-le-insp-${key}" class="nw-config-input">${opts}</select>`;
      wrap.appendChild(mkRow(p.label, html));
      setTimeout(() => {
        const inp = document.getElementById(`nw-le-insp-${key}`);
        if (inp) {
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          inp.addEventListener('change', () => {
            node.params = node.params || {};
            node.params[key] = inp.value;
            nwMarkDirty();
          });
        }
      }, 0);
      continue;
    }

    if (p.kind === 'time') {
      const html = `<input id="nw-le-insp-${key}" class="nw-config-input" type="time" value="${nwSafeStr(val)}" placeholder="${nwSafeStr(p.placeholder || '')}"/>`;
      wrap.appendChild(mkRow(p.label, html));
      setTimeout(() => {
        const inp = document.getElementById(`nw-le-insp-${key}`);
        if (inp) {
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          inp.addEventListener('input', () => {
            node.params = node.params || {};
            node.params[key] = inp.value;
            nwMarkDirty();
          });
        }
      }, 0);
      continue;
    }

    if (p.kind === 'days') {
      // Val: "Mo,Di,Mi,Do,Fr,Sa,So" oder "1,2,3"
      const dayList = [
        { n: 1, label: 'Mo' },
        { n: 2, label: 'Di' },
        { n: 3, label: 'Mi' },
        { n: 4, label: 'Do' },
        { n: 5, label: 'Fr' },
        { n: 6, label: 'Sa' },
        { n: 7, label: 'So' },
      ];
      const map = { mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 7 };
      const cur = new Set();
      try {
        const parts = nwSafeStr(val).split(/[,; ]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
        for (const p2 of parts) {
          if (map[p2]) cur.add(map[p2]);
          else {
            const nn = parseInt(p2, 10);
            if (Number.isFinite(nn) && nn >= 1 && nn <= 7) cur.add(nn);
          }
        }
      } catch (e) {}
      const chips = dayList.map(d => {
        const checked = cur.has(d.n) ? 'checked' : '';
        return `<label style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(0,0,0,.15);cursor:pointer;user-select:none;">
          <input type="checkbox" data-day="${d.n}" ${checked} style="accent-color:#22c55e;"/>
          <span>${d.label}</span>
        </label>`;
      }).join('');

      const html = `<div id="nw-le-insp-${key}" style="display:flex;flex-wrap:wrap;gap:8px;">${chips}</div>`;
      wrap.appendChild(mkRow(p.label, html));

      setTimeout(() => {
        const host = document.getElementById(`nw-le-insp-${key}`);
        if (!host) return;
        /**
         * Code-Teil: Arrow-Funktion `update`
         * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
         * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
         * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
         */
        /**
         * Code-Teil: update
         * Zweck: Aktualisiert Runtime-Zustand, UI oder veröffentlichte Daten.
         * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
         * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
         */
        const update = () => {
          const boxes = host.querySelectorAll('input[type=checkbox][data-day]');
          const sel = [];
          boxes.forEach(b => { if (b.checked) sel.push(parseInt(b.getAttribute('data-day'), 10)); });
          sel.sort((a,b)=>a-b);
          const str = sel.map(n => dayList.find(d => d.n === n)?.label).filter(Boolean).join(',');
          node.params = node.params || {};
          node.params[key] = str;
          nwMarkDirty();
        };
        // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an host. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
        host.addEventListener('change', update);
      }, 0);

      continue;
    }

    if (p.kind === 'select') {
      const opts = (p.options || []).map(o => `<option value="${String(o.value)}" ${String(o.value)===String(val) ? 'selected' : ''}>${o.label}</option>`).join('');
      const html = `<select id="nw-le-insp-${key}" class="nw-config-input">${opts}</select>`;
      wrap.appendChild(mkRow(p.label, html));
      setTimeout(() => {
        const inp = document.getElementById(`nw-le-insp-${key}`);
        if (inp) {
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'change' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          inp.addEventListener('change', () => {
            node.params = node.params || {};
            node.params[key] = inp.value;
            nwMarkDirty();
          });
        }
      }, 0);
      continue;
    }

    if (p.kind === 'number') {
      const html = `<input id="nw-le-insp-${key}" class="nw-config-input" type="number" value="${nwSafeStr(val)}" placeholder="${nwSafeStr(p.placeholder || '')}"/>`;
      wrap.appendChild(mkRow(p.label, html));
      setTimeout(() => {
        const inp = document.getElementById(`nw-le-insp-${key}`);
        if (inp) {
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          inp.addEventListener('input', () => {
            node.params = node.params || {};
            node.params[key] = nwNum(inp.value, 0);
            nwMarkDirty();
          });
        }
      }, 0);
      continue;
    }

    // text (default)
    {
      const html = `<input id="nw-le-insp-${key}" class="nw-config-input" value="${nwSafeStr(val)}" placeholder="${nwSafeStr(p.placeholder || '')}"/>`;
      wrap.appendChild(mkRow(p.label, html));
      setTimeout(() => {
        const inp = document.getElementById(`nw-le-insp-${key}`);
        if (inp) {
          // Ereignis-Kommentar: Bindet das UI-Ereignis 'input' an inp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
          inp.addEventListener('input', () => {
            node.params = node.params || {};
            node.params[key] = inp.value;
            nwMarkDirty();
          });
        }
      }, 0);
    }
  }
}


// -----------------------------
// Node operations
// -----------------------------
/**
 * Code-Teil: nwAddNode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwAddNode(type, opts = {}) {
  const def = nwLE.lib.byType[type];
  if (!def) return;
  const g = nwLE.graph;
  if (!g) return;

  const wrap = nwLE.el.boardWrap;

  let autoPlaced = true;
  let pos = nwFindFreeLanePosition(type, g);

  if (Number.isFinite(Number(opts && opts.x)) && Number.isFinite(Number(opts && opts.y))) {
    autoPlaced = false;
    pos = nwClampNodePosition(Number(opts.x), Number(opts.y), g);
  }

  const node = {
    id: nwUuid('n'),
    type,
    label: def.name,
    enabled: true,
    x: pos.x,
    y: pos.y,
    params: nwJsonClone(def.defaults) || {},
  };
  g.nodes = Array.isArray(g.nodes) ? g.nodes : [];
  g.nodes.push(node);
  nwRenderNode(node);
  nwUpdateAllWirePaths();
  nwSelectNode(node.id);
  nwMarkDirty(`Baustein ${def.name} hinzugefügt`);
  if (autoPlaced && wrap) requestAnimationFrame(() => nwScrollNodeIntoView(node));
}
/**
 * Code-Teil: nwDeleteNode
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDeleteNode(nodeId) {
  const g = nwLE.graph;
  if (!g) return;

  g.nodes = (Array.isArray(g.nodes) ? g.nodes : []).filter(n => n && n.id !== nodeId);
  g.links = (Array.isArray(g.links) ? g.links : []).filter(l => {
    const a = l && l.from && l.from.node === nodeId;
    const b = l && l.to && l.to.node === nodeId;
    return !(a || b);
  });

  if (nwLE.selectedNodeId === nodeId) nwLE.selectedNodeId = null;

  const board = nwLE.el.board;
  if (board) {
    const el = board.querySelector(`.nw-le-node[data-node-id="${CSS.escape(nodeId)}"]`);
    if (el) el.remove();
  }
  nwRenderAllWires();
  nwRenderInspector();
  nwMarkDirty();
}


// -----------------------------
// Connections
// -----------------------------
/**
 * Code-Teil: nwRemoveLinksWhere
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRemoveLinksWhere(predicate) {
  const g = nwLE.graph;
  if (!g) return 0;

  g.links = Array.isArray(g.links) ? g.links : [];
  const before = g.links.length;
  g.links = g.links.filter(l => !predicate(l));
  const removed = before - g.links.length;
  if (removed > 0) {
    nwRenderAllWires();
    nwMarkDirty();
  }
  return removed;
}
/**
 * Code-Teil: nwRemoveLinkById
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRemoveLinkById(linkId) {
  if (!linkId) return 0;
  return nwRemoveLinksWhere(l => l && l.id === linkId);
}
/**
 * Code-Teil: nwRemoveLinksToInput
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRemoveLinksToInput(nodeId, portKey) {
  if (!nodeId || !portKey) return 0;
  return nwRemoveLinksWhere(l => l && l.to && l.to.node === nodeId && l.to.port === portKey);
}
/**
 * Code-Teil: nwFindLinkIdNearClientPoint
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwFindLinkIdNearClientPoint(clientX, clientY) {
  const svg = nwLE.el.wires;
  if (!svg) return null;
  const point = nwGetBoardPointFromClient(clientX, clientY);
  if (!point) return null;

  const z = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);
  const threshold = 12 / z;
  let bestId = null;
  let bestDistSq = threshold * threshold;

  const paths = svg.querySelectorAll('path[data-link-id]');
  for (const path of paths) {
    const linkId = path.dataset && path.dataset.linkId;
    if (!linkId) continue;

    let total = 0;
    try {
      total = path.getTotalLength();
    } catch (_e) {
      total = 0;
    }
    if (!Number.isFinite(total) || total <= 0) continue;

    const step = Math.max(8, Math.min(18, total / 24));
    for (let pos = 0; pos <= total; pos += step) {
      const sample = path.getPointAtLength(Math.min(pos, total));
      const dx = sample.x - point.x;
      const dy = sample.y - point.y;
      const d2 = (dx * dx) + (dy * dy);
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestId = linkId;
      }
    }

    const tail = path.getPointAtLength(total);
    const dx = tail.x - point.x;
    const dy = tail.y - point.y;
    const d2 = (dx * dx) + (dy * dy);
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      bestId = linkId;
    }
  }

  return bestId;
}
/**
 * Code-Teil: nwStartConnect
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwStartConnect(fromNodeId, fromPortKey) {
  const svg = nwLE.el.wires;
  if (!svg) return;

  // Ein erneuter Klick auf denselben Ausgang beendet den Verbindungsmodus.
  if (nwLE.connecting
      && nwLE.connecting.fromNodeId === fromNodeId
      && nwLE.connecting.fromPortKey === fromPortKey) {
    nwCancelConnect();
    nwSetStatus('Verbindung abgebrochen.', true);
    return;
  }
  if (nwLE.connecting) nwCancelConnect();

  // preview path
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'rgba(255,255,255,0.35)');
  p.setAttribute('stroke-width', '2');
  p.setAttribute('stroke-dasharray', '6 6');
  p.setAttribute('class', 'nw-le-wire nw-le-wire--preview');
  svg.appendChild(p);

  nwLE.connecting = {
    fromNodeId,
    fromPortKey,
    previewPath: p,
    mouse: null,
  };
  nwApplyConnectVisualState();
  nwUpdateAllWirePaths();
  nwSetStatus('Ausgang gewählt – passenden Eingang anklicken oder die Linie dorthin ziehen.', true);
}
/**
 * Code-Teil: nwFinishConnect
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwLogicPortType(nodeId, portKey, direction) {
  const graph = nwLE.graph;
  const node = graph && Array.isArray(graph.nodes) ? graph.nodes.find((row) => row && row.id === nodeId) : null;
  // RC43 verwendete hier irrtümlich `nwLE.library`, obwohl die Bibliothek
  // im Editorzustand als `nwLE.lib` geführt wird. Dadurch brach jeder
  // Verbindungsabschluss mit einem JavaScript-Fehler ab.
  const byType = nwLE.lib && nwLE.lib.byType ? nwLE.lib.byType : null;
  const def = node && byType ? byType[node.type] : null;
  const ports = def ? (direction === 'out' ? def.outputs : def.inputs) : [];
  const port = Array.isArray(ports) ? ports.find((row) => row && row.key === portKey) : null;
  return port && port.dataType ? String(port.dataType) : 'any';
}

function nwApplyConnectVisualState() {
  const board = nwLE.el.board;
  if (!board) return;
  const c = nwLE.connecting;
  board.classList.toggle('is-connecting', !!c);
  const fromType = c ? nwLogicPortType(c.fromNodeId, c.fromPortKey, 'out') : 'any';
  for (const port of board.querySelectorAll('.nw-le-port')) {
    port.classList.remove('is-connect-source', 'is-connect-target', 'is-connect-incompatible');
    if (!c) continue;
    const nodeId = String(port.dataset.nodeId || '');
    const portKey = String(port.dataset.portKey || '');
    const dir = String(port.dataset.portDir || '');
    if (dir === 'out' && nodeId === c.fromNodeId && portKey === c.fromPortKey) {
      port.classList.add('is-connect-source');
      continue;
    }
    if (dir !== 'in') continue;
    const toType = nwLogicPortType(nodeId, portKey, 'in');
    const compatible = fromType === 'any' || toType === 'any' || fromType === toType;
    port.classList.add(compatible ? 'is-connect-target' : 'is-connect-incompatible');
  }
}

function nwClearConnectPreview(connection) {
  const c = connection || nwLE.connecting;
  try { if (c && c.previewPath) c.previewPath.remove(); } catch (_e) {}
  nwLE.connecting = null;
  nwApplyConnectVisualState();
  nwUpdateAllWirePaths();
}

function nwWouldCreateLogicCycle(graph, fromNodeId, toNodeId) {
  if (!graph || fromNodeId === toNodeId) return true;
  const adj = new Map();
  for (const node of Array.isArray(graph.nodes) ? graph.nodes : []) if (node && node.id) adj.set(node.id, []);
  for (const link of Array.isArray(graph.links) ? graph.links : []) {
    const from = link && link.from ? String(link.from.node || '') : '';
    const to = link && link.to ? String(link.to.node || '') : '';
    if (adj.has(from) && adj.has(to)) adj.get(from).push(to);
  }
  if (adj.has(fromNodeId) && adj.has(toNodeId)) adj.get(fromNodeId).push(toNodeId);
  const stack = [toNodeId];
  const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (id === fromNodeId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) || []) stack.push(next);
  }
  return false;
}

function nwFinishConnect(toNodeId, toPortKey) {
  const c = nwLE.connecting;
  if (!c) return;
  const g = nwLE.graph;
  if (!g) {
    nwClearConnectPreview(c);
    return;
  }

  const from = { node: c.fromNodeId, port: c.fromPortKey };
  const to = { node: toNodeId, port: toPortKey };
  const fromType = nwLogicPortType(from.node, from.port, 'out');
  const toType = nwLogicPortType(to.node, to.port, 'in');
  if (fromType !== 'any' && toType !== 'any' && fromType !== toType) {
    nwClearConnectPreview(c);
    nwSetStatus(`Verbindung nicht möglich: ${fromType} passt nicht zu ${toType}.`, false);
    return;
  }
  if (nwWouldCreateLogicCycle(g, from.node, to.node)) {
    nwClearConnectPreview(c);
    nwSetStatus('Logikschleifen sind im stabilen Betriebsmodus nicht zulässig.', false);
    return;
  }

  // remove existing link to this input (one input = one source)
  g.links = Array.isArray(g.links) ? g.links : [];
  g.links = g.links.filter(l => !(l && l.to && l.to.node === to.node && l.to.port === to.port));

  const duplicate = g.links.some((link) => link
    && link.from && link.to
    && link.from.node === from.node && link.from.port === from.port
    && link.to.node === to.node && link.to.port === to.port);
  if (!duplicate) g.links.push({ id: nwUuid('l'), from, to });
  nwClearConnectPreview(c);
  nwRenderAllWires();
  nwMarkDirty();
  nwSetStatus('Verbindung erstellt. Zum Übernehmen bitte speichern.', true);
}
/**
 * Code-Teil: nwCancelConnect
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCancelConnect() {
  const c = nwLE.connecting;
  if (!c) return;
  nwClearConnectPreview(c);
}


// -----------------------------
// DP Picker (Suche + NexoWatt-EOS-Datenpunktstruktur)
// -----------------------------
/**
 * Code-Teil: nwOpenModal
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
  modalEl.setAttribute('aria-hidden', 'false');
}
/**
 * Code-Teil: nwCloseModal
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCloseModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  modalEl.setAttribute('aria-hidden', 'true');
}
/**
 * Code-Teil: nwFetchJson
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwFetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.ok !== true) {
    throw new Error(json && json.error ? json.error : `HTTP ${res.status}`);
  }
  return json;
}
/**
 * Code-Teil: nwDpSearch
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDpSearch(q) {
  const qs = encodeURIComponent(nwSafeStr(q || '').trim());
  const url = `/api/smarthome/dpsearch?q=${qs}&limit=500`;
  const json = await nwFetchJson(url);
  return Array.isArray(json.results) ? json.results : [];
}
/**
 * Code-Teil: nwDpTree
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwDpTree(prefix) {
  const pre = encodeURIComponent(nwSafeStr(prefix || '').trim());
  const url = `/api/object/tree?prefix=${pre}`;
  const json = await nwFetchJson(url);
  return Array.isArray(json.children) ? json.children : [];
}
/**
 * Code-Teil: nwDpParentPrefix
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDpParentPrefix(id) {
  const parts = nwSafeStr(id || '').trim().split('.').filter(Boolean);
  if (parts.length <= 1) return '';
  parts.pop();
  return parts.join('.');
}
/**
 * Code-Teil: nwDpMetaText
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDpMetaText(it) {
  const metaBits = [];
  if (it && it.name) metaBits.push(String(it.name));
  if (it && it.role) metaBits.push(String(it.role));
  if (it && it.type) metaBits.push(String(it.type));
  if (it && it.unit) metaBits.push(String(it.unit));
  return metaBits.join(' • ');
}
/**
 * Code-Teil: nwCreateDpResultRow
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCreateDpResultRow(primary, meta, onActivate) {
  const row = document.createElement('div');
  row.className = 'nw-dp-result';
  row.tabIndex = (typeof onActivate === 'function') ? 0 : -1;

  const idEl = document.createElement('div');
  idEl.className = 'nw-dp-result__id';
  idEl.textContent = nwSafeStr(primary);
  row.appendChild(idEl);

  const metaEl = document.createElement('div');
  metaEl.className = 'nw-dp-result__meta';
  metaEl.textContent = nwSafeStr(meta || '');
  row.appendChild(metaEl);

  if (typeof onActivate === 'function') {
    /**
     * Code-Teil: Arrow-Funktion `activate`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: activate
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const activate = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      onActivate();
    };
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an row. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    row.addEventListener('click', activate);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an row. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') activate(e);
    });
  }

  return row;
}
/**
 * Code-Teil: nwRenderDpResults
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderDpResults(list, onPick) {
  const wrap = nwLE.el.dpResults;
  if (!wrap) return;
  wrap.innerHTML = '';

  if (!Array.isArray(list) || list.length <= 0) {
    wrap.innerHTML = '<div class="nw-config-empty">Keine Treffer.</div>';
    return;
  }

  for (const it of list) {
    const id = nwSafeStr(it && it.id);
    if (!id) continue;
    const meta = nwDpMetaText(it);
    wrap.appendChild(nwCreateDpResultRow(id, meta, () => onPick(id)));
  }

  if (!wrap.children.length) {
    wrap.innerHTML = '<div class="nw-config-empty">Keine Treffer.</div>';
  }
}
/**
 * Code-Teil: nwRenderDpBreadcrumb
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwRenderDpBreadcrumb(prefix, onNavigate) {
  const wrap = nwLE.el.dpBreadcrumb;
  if (!wrap) return;
  wrap.innerHTML = '';

  const parts = nwSafeStr(prefix || '').split('.').filter(Boolean);

  /**
   * Code-Teil: Arrow-Funktion `mkCrumb`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkCrumb
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkCrumb = (label, nextPrefix, clickable) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nw-dp-crumb' + (clickable ? '' : ' nw-dp-crumb--active');
    btn.textContent = label;
    if (!clickable) {
      btn.disabled = true;
      return btn;
    }
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', () => onNavigate(nextPrefix));
    return btn;
  };

  /**
   * Code-Teil: Arrow-Funktion `mkSep`
   * Zweck: stellt Objekte/States/Strukturen sicher, ohne bestehende Konfiguration unnötig zu überschreiben.
   * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
   * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
   */
  /**
   * Code-Teil: mkSep
   * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
   * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
   * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
   */
  const mkSep = () => {
    const sep = document.createElement('span');
    sep.className = 'nw-dp-sep';
    sep.textContent = '›';
    return sep;
  };

  wrap.appendChild(mkCrumb('Start', '', parts.length > 0));

  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    acc = acc ? `${acc}.${part}` : part;
    wrap.appendChild(mkSep());
    wrap.appendChild(mkCrumb(part, acc, i < (parts.length - 1)));
  }
}
/**
 * Code-Teil: nwOpenDpPicker
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenDpPicker(initialQuery) {
  return new Promise((resolve) => {
    const modal = nwLE.el.dpModal;
    const qInp = nwLE.el.dpQ;
    const btn = nwLE.el.dpSearch;
    const closeBtn = nwLE.el.dpClose;
    const rootBtn = nwLE.el.dpRoot;
    const upBtn = nwLE.el.dpUp;
    const treeWrap = nwLE.el.dpTree;
    const resultsWrap = nwLE.el.dpResults;
    const breadcrumbWrap = nwLE.el.dpBreadcrumb;
    if (!modal || !qInp || !btn || !closeBtn || !rootBtn || !upBtn || !treeWrap || !resultsWrap || !breadcrumbWrap) {
      return resolve(null);
    }

    let done = false;
    let treePrefix = nwDpParentPrefix(initialQuery);
    const pickerToken = nwUuid('dp_picker');
    nwLE.dpPickerToken = pickerToken;

    /**
     * Code-Teil: Arrow-Funktion `isAlive`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: isAlive
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const isAlive = () => !done && nwLE.dpPickerToken === pickerToken;
    /**
     * Code-Teil: finish
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const finish = (val) => {
      if (done) return;
      done = true;
      if (nwLE.dpPickerToken === pickerToken) nwLE.dpPickerToken = null;
      nwCloseModal(modal);
      cleanup();
      resolve(val);
    };

    /**
     * Code-Teil: Arrow-Funktion `setTreeMessage`
     * Zweck: schreibt Werte in ioBroker-States, DOM-Felder oder lokale Laufzeitstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: setTreeMessage
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setTreeMessage = (html) => {
      if (!treeWrap || !isAlive()) return;
      treeWrap.innerHTML = html;
    };
    /**
     * Code-Teil: setResultsMessage
     * Zweck: Setzt Werte im DOM, Cache, State oder in der Konfiguration.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const setResultsMessage = (html) => {
      if (!resultsWrap || !isAlive()) return;
      resultsWrap.innerHTML = html;
    };

    /**
     * Code-Teil: Arrow-Funktion `openPrefix`
     * Zweck: steuert sichtbare UI-Zustände, Dialoge, Menüs oder Panels.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: openPrefix
     * Zweck: Öffnet Dialoge/Seiten/Popovers.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const openPrefix = (nextPrefix) => {
      treePrefix = nwSafeStr(nextPrefix || '').trim();
      refreshTree().catch(() => {});
    };
    /**
     * Code-Teil: onPick
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const onPick = (id) => finish(id);

    /**
     * Code-Teil: Arrow-Funktion `upOne`
     * Zweck: enthält eine fachliche Teilfunktion dieser Datei und sollte beim TypeScript-Umbau gezielt typisiert werden.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: upOne
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const upOne = () => {
      if (!treePrefix) return;
      const parts = treePrefix.split('.').filter(Boolean);
      parts.pop();
      treePrefix = parts.join('.');
    };

    /**
     * Code-Teil: Arrow-Funktion `renderTree`
     * Zweck: rendert sichtbare UI-/Diagramm-Elemente aus bereits normalisierten Daten.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: renderTree
     * Zweck: Erzeugt oder aktualisiert sichtbare UI-Ausgabe.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const renderTree = (children) => {
      if (!treeWrap || !isAlive()) return;
      treeWrap.innerHTML = '';
      if (upBtn) upBtn.disabled = !treePrefix;
      if (rootBtn) rootBtn.disabled = !treePrefix;

      if (treePrefix) {
        treeWrap.appendChild(nwCreateDpResultRow('..', 'Eine Ebene zurück', () => {
          upOne();
          refreshTree().catch(() => {});
        }));
      }

      if (!Array.isArray(children) || children.length <= 0) {
        if (treeWrap.children.length <= 0) {
          treeWrap.innerHTML = '<div class="nw-config-empty">Keine Einträge.</div>';
        }
        return;
      }

      for (const ch of children) {
        if (!ch) continue;
        const id = nwSafeStr(ch.id || ch.label);
        if (!id) continue;

        if (ch.hasChildren) {
          const metaBits = [];
          metaBits.push(ch.isState ? 'Ordner + Datenpunkt' : 'Ordner');
          if (ch.name) metaBits.push(String(ch.name));
          const meta = metaBits.join(' • ');
          treeWrap.appendChild(nwCreateDpResultRow(id, meta, () => openPrefix(id)));
          continue;
        }

        if (ch.isState) {
          const meta = nwDpMetaText(ch) || 'Datenpunkt';
          treeWrap.appendChild(nwCreateDpResultRow(id, meta, () => onPick(id)));
          continue;
        }

        treeWrap.appendChild(nwCreateDpResultRow(id, '', null));
      }

      if (!treeWrap.children.length) {
        treeWrap.innerHTML = '<div class="nw-config-empty">Keine Einträge.</div>';
      }
    };

    /**
     * Code-Teil: Arrow-Funktion `refreshTree`
     * Zweck: überträgt neue Werte in UI/States oder synchronisiert interne Datenstrukturen.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: refreshTree
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const refreshTree = async () => {
      nwRenderDpBreadcrumb(treePrefix, openPrefix);
      setTreeMessage('<div class="nw-config-empty">Ordner werden geladen…</div>');
      try {
        const children = await nwDpTree(treePrefix);
        if (!isAlive()) return;
        nwRenderDpBreadcrumb(treePrefix, openPrefix);
        renderTree(children);
      } catch (e) {
        if (!isAlive()) return;
        nwRenderDpBreadcrumb(treePrefix, openPrefix);
        setTreeMessage(`<div class="nw-config-empty" style="color:#ff6b6b;">Fehler: ${nwSafeStr(e && e.message)}</div>`);
        if (upBtn) upBtn.disabled = !treePrefix;
        if (rootBtn) rootBtn.disabled = !treePrefix;
      }
    };

    /**
     * Code-Teil: Arrow-Funktion `onSearch`
     * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: onSearch
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const onSearch = async () => {
      const q = nwSafeStr(qInp.value || '').trim();
      if (!q) {
        setResultsMessage('<div class="nw-config-empty">Suchbegriff eingeben…</div>');
        return;
      }
      setResultsMessage('<div class="nw-config-empty">Suche läuft…</div>');
      try {
        const list = await nwDpSearch(q);
        if (!isAlive()) return;
        nwRenderDpResults(list, onPick);
      } catch (e) {
        if (!isAlive()) return;
        setResultsMessage(`<div class="nw-config-empty" style="color:#ff6b6b;">Fehler: ${nwSafeStr(e && e.message)}</div>`);
      }
    };

    /**
     * Code-Teil: Arrow-Funktion `onClose`
     * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: onClose
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const onClose = () => finish(null);
    /**
     * Code-Teil: onBg
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const onBg = (e) => { if (e.target === modal) finish(null); };
    /**
     * Code-Teil: onKey
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const onKey = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSearch().catch(() => {});
      }
      if (e.key === 'Escape') finish(null);
    };
    /**
     * Code-Teil: Arrow-Funktion `onRoot`
     * Zweck: behandelt ein Ereignis oder einen API-/UI-Callback.
     * Zusammenhang: Hängt an DOM-IDs, /api/state, /config und den vom Backend veröffentlichten States; Änderungen müssen mit main.js/ems/* abgestimmt bleiben.
     * TypeScript-Hinweis: Beim TypeScript-Umbau Parameter, Rückgabewert und verwendete State-/Config-Struktur explizit typisieren.
     */
    /**
     * Code-Teil: onRoot
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const onRoot = () => openPrefix('');
    /**
     * Code-Teil: onUp
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const onUp = () => {
      upOne();
      refreshTree().catch(() => {});
    };
    /**
     * Code-Teil: cleanup
     * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
     * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
     * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
     */
    const cleanup = () => {
      try { btn.removeEventListener('click', onSearch); } catch (_e) {}
      try { closeBtn.removeEventListener('click', onClose); } catch (_e2) {}
      try { rootBtn.removeEventListener('click', onRoot); } catch (_e3) {}
      try { upBtn.removeEventListener('click', onUp); } catch (_e4) {}
      try { modal.removeEventListener('click', onBg); } catch (_e5) {}
      try { qInp.removeEventListener('keydown', onKey); } catch (_e6) {}
    };

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    btn.addEventListener('click', onSearch);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an closeBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    closeBtn.addEventListener('click', onClose);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an rootBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    rootBtn.addEventListener('click', onRoot);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an upBtn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    upBtn.addEventListener('click', onUp);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an modal. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    modal.addEventListener('click', onBg);
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an qInp. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    qInp.addEventListener('keydown', onKey);

    qInp.value = nwSafeStr(initialQuery || '');
    setResultsMessage(qInp.value.trim() ? '<div class="nw-config-empty">Suche wird vorbereitet…</div>' : '<div class="nw-config-empty">Suchbegriff eingeben…</div>');
    setTreeMessage('<div class="nw-config-empty">Ordner werden geladen…</div>');
    nwRenderDpBreadcrumb(treePrefix, openPrefix);
    if (upBtn) upBtn.disabled = !treePrefix;
    if (rootBtn) rootBtn.disabled = !treePrefix;

    nwOpenModal(modal);
    setTimeout(() => { try { qInp.focus(); qInp.select(); } catch (_e) {} }, 0);

    refreshTree().catch(() => {});

    if (qInp.value && qInp.value.trim().length >= 2) {
      onSearch().catch(() => {});
    }
  });
}


// -----------------------------
// Import/Export
// -----------------------------
/**
 * Code-Teil: nwOpenImport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenImport() {
  const modal = nwLE.el.importModal;
  const t = nwLE.el.importText;
  if (!modal || !t) return;
  t.value = '';
  nwOpenModal(modal);
  setTimeout(() => { try { t.focus(); } catch (_e) {} }, 0);
}
/**
 * Code-Teil: nwCloseImport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCloseImport() {
  nwCloseModal(nwLE.el.importModal);
}
/**
 * Code-Teil: nwApplyImport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwApplyImport() {
  const t = nwLE.el.importText;
  if (!t) return;
  const raw = t.value || '';
  let cfg = null;
  try {
    cfg = JSON.parse(raw);
  } catch (e) {
    alert('Ungültiges JSON');
    return;
  }
  nwLE.cfg = nwEnsureConfigDefaults(cfg);
  // nach Import auf "main" (oder erste Seite) springen
  nwRenderGraphSelector();
  nwSelectGraph('main', { skipRender: true });
  nwRenderGraph();
  nwRenderInspector();
  nwMarkDirty();
  nwCloseImport();
}
/**
 * Code-Teil: nwOpenExport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenExport() {
  const modal = nwLE.el.exportModal;
  const t = nwLE.el.exportText;
  if (!modal || !t) return;
  const cfg = nwLE.cfg || nwDefaultGraph();
  t.value = JSON.stringify(cfg, null, 2);
  nwOpenModal(modal);
}
/**
 * Code-Teil: nwCloseExport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCloseExport() {
  nwCloseModal(nwLE.el.exportModal);
}
/**
 * Code-Teil: nwDownloadExport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwDownloadExport() {
  const cfg = nwLE.cfg || nwDefaultGraph();
  const json = JSON.stringify(cfg, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexologic-export-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


// -----------------------------
// Backup / Restore (wie App-Center)
// -----------------------------
/**
 * Code-Teil: nwSetBackupStatus
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwSetBackupStatus(msg, type) {
  const el = nwLE.el.backupStatus;
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = (type === 'error') ? '#fca5a5' : '';
}
/**
 * Code-Teil: nwOpenBackup
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwOpenBackup() {
  nwSetBackupStatus('', null);
  nwOpenModal(nwLE.el.backupModal);
}
/**
 * Code-Teil: nwCloseBackup
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwCloseBackup() {
  nwCloseModal(nwLE.el.backupModal);
}
/**
 * Code-Teil: nwBackupExport
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwBackupExport() {
  nwSetBackupStatus('Exportiere Backup …', null);
  const res = await fetch('/api/installer/backup/export', { cache: 'no-store' });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : 'Backup export fehlgeschlagen');
  const payload = data.payload || {};
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexowatt-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  nwSetBackupStatus('Backup exportiert ✅', null);
}
/**
 * Code-Teil: nwBackupImportFromFile
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwBackupImportFromFile(file, mode) {
  if (!file) return;
  nwSetBackupStatus('Importiere Backup …', null);
  const txt = await file.text();
  const payload = JSON.parse(txt);
  const res = await fetch('/api/installer/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: mode || 'merge', payload }),
  });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : 'Backup import fehlgeschlagen');
  nwSetBackupStatus('Backup importiert ✅ (bitte Seite neu laden)', null);
}
/**
 * Code-Teil: nwBackupRestoreFromUserdata
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwBackupRestoreFromUserdata() {
  if (!confirm('Wirklich Restore aus 0_userdata durchführen? (überschreibt die aktuelle Konfiguration)')) return;
  nwSetBackupStatus('Lade Backup aus 0_userdata …', null);
  const res = await fetch('/api/installer/backup/userdata', { cache: 'no-store' });
  const data = await res.json();
  if (!data || !data.ok) throw new Error((data && data.error) ? data.error : '0_userdata Restore fehlgeschlagen');

  const payload = data.payload || {};
  const res2 = await fetch('/api/installer/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'replace', payload }),
  });
  const data2 = await res2.json();
  if (!data2 || !data2.ok) throw new Error((data2 && data2.error) ? data2.error : 'Restore import fehlgeschlagen');
  nwSetBackupStatus('Restore durchgeführt ✅ (bitte Seite neu laden)', null);
}


// -----------------------------
// Normalize
// -----------------------------
/**
 * Code-Teil: nwEnsureGraphDefaults
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwEnsureGraphDefaults(g) {
  if (!g || typeof g !== 'object') return;
  if (!g.id) g.id = 'main';
  if (!g.name) g.name = 'Hauptlogik';
  if (g.enabled === undefined) g.enabled = true;
  if (!g.board || typeof g.board !== 'object') g.board = { w: 2400, h: 1400 };
  if (!Array.isArray(g.nodes)) g.nodes = [];
  if (!Array.isArray(g.links)) g.links = [];

  // ensure each node has params
  for (const n of g.nodes) {
    if (!n || typeof n !== 'object') continue;
    const def = nwLE.lib.byType[n.type];
    if (!def) continue;
    if (!n.id) n.id = nwUuid('n');
    if (n.enabled === undefined) n.enabled = true;
    if (n.x === undefined) n.x = 40;
    if (n.y === undefined) n.y = 40;
    if (!n.label) n.label = def.name;
    if (!n.params || typeof n.params !== 'object') n.params = {};
    for (const [k, v] of Object.entries(def.defaults || {})) {
      if (n.params[k] === undefined) n.params[k] = v;
    }
  }

  // ensure each link has id
  for (const l of g.links) {
    if (!l || typeof l !== 'object') continue;
    if (!l.id) l.id = nwUuid('l');
  }
}


// -----------------------------
// Global events (drag, connect)
// -----------------------------
/**
 * Code-Teil: nwInstallGlobalHandlers
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwInstallGlobalHandlers() {
  // dragging nodes
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mousemove' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('mousemove', (e) => {
    if (nwLE.dragging) {
      const d = nwLE.dragging;
      const g = nwLE.graph;
      if (!g) return;
      const node = g.nodes.find(n => n.id === d.nodeId);
      if (!node) return;
      const board = nwLE.el.board;
      if (!board) return;

      const boardRect = board.getBoundingClientRect();
      const z = nwClamp(nwNum(nwLE.zoom, 1), 0.4, 2.5);
      const x = (e.clientX - boardRect.left - d.offsetX) / z;
      const y = (e.clientY - boardRect.top - d.offsetY) / z;
      const pos = nwClampNodePosition(x, y, g);

      node.x = pos.x;
      node.y = pos.y;

      const el = document.querySelector(`.nw-le-node[data-node-id="${CSS.escape(node.id)}"]`);
      if (el) {
        el.style.left = `${Math.round(node.x)}px`;
        el.style.top = `${Math.round(node.y)}px`;
      }

      nwUpdateAllWirePaths();
      nwMarkDirty();
    }

    // connecting preview
    if (nwLE.connecting) {
      const point = nwGetBoardPointFromClient(e.clientX, e.clientY);
      if (!point) return;
      nwLE.connecting.mouse = point;
      nwUpdateAllWirePaths();
    }
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'mouseup' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('mouseup', () => {
    if (nwLE.dragging) nwLE.dragging = null;
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragend' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('dragend', () => {
    if (nwLE.el.boardWrap) nwLE.el.boardWrap.classList.remove('is-drag-over');
    nwLE.paletteDragType = null;
  });

  // Ereignis-Kommentar: Bindet das UI-Ereignis 'keydown' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (nwLE.connecting) {
        nwCancelConnect();
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // delete selected node (unless typing)
      const t = e.target;
      const isTyping = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (!isTyping && nwLE.selectedNodeId) {
        nwDeleteNode(nwLE.selectedNodeId);
      }
    }
    const target = e.target;
    const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    if (!isTyping && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) nwRedo(); else nwUndo();
    } else if (!isTyping && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      nwRedo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      nwHandleSave();
    }
    if (!isTyping && e.key === 'F9') {
      e.preventDefault();
      if (nwLE.simulation.active) nwCloseSimulation(); else nwOpenSimulation();
    }
  });

  // Ctrl/Cmd + Mausrad zum Zoomen
  const wrap = nwLE.el.boardWrap;
  if (wrap) {
    // Ereignis-Kommentar: Bindet das UI-Ereignis 'wheel' an wrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    wrap.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (e.deltaY > 0) {
        nwZoomOut();
      } else {
        nwZoomIn();
      }
    }, { passive: false });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'dragover' an wrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    wrap.addEventListener('dragover', (e) => {
      const type = nwReadPaletteBlockType(e);
      if (!type || !nwLE.lib || !nwLE.lib.byType || !nwLE.lib.byType[type]) return;
      e.preventDefault();
      try { if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; } catch (_e) {}
      wrap.classList.add('is-drag-over');
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'drop' an wrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    wrap.addEventListener('drop', (e) => {
      const type = nwReadPaletteBlockType(e);
      wrap.classList.remove('is-drag-over');
      if (!type || !nwLE.lib || !nwLE.lib.byType || !nwLE.lib.byType[type]) return;
      e.preventDefault();
      const point = nwGetBoardPointFromClient(e.clientX, e.clientY);
      if (!point) return;
      nwLE.lastPaletteDropAt = nwNow();
      nwAddNode(type, {
        x: point.x - (NW_LE_NODE_W / 2),
        y: point.y - NW_LE_NODE_DROP_OFFSET_Y,
      });
    });

    // Ereignis-Kommentar: Bindet das UI-Ereignis 'contextmenu' an wrap. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
    wrap.addEventListener('contextmenu', (e) => {
      const linkId = nwFindLinkIdNearClientPoint(e.clientX, e.clientY);
      if (!linkId) return;
      e.preventDefault();
      nwRemoveLinkById(linkId);
    });
  }
}


// -----------------------------
// Toolbar actions
// -----------------------------
/**
 * Code-Teil: nwHandleSave
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwHandleSave() {
  // Clone so we don't mutate the live object while saving
  const cfg = nwEnsureConfigDefaults(nwJsonClone(nwLE.cfg || nwDefaultGraph()));

  // bump version
  cfg.version = (typeof cfg.version === 'number' ? cfg.version : 0) + 1;
  cfg.updatedAt = Date.now();

  nwSetStatus('Speichern…');
  const res = await nwSaveConfig(cfg);
  if (res && res.ok) {
    nwLE.cfg = nwEnsureConfigDefaults(res.config || cfg);

    // restore selected page
    const keepId = nwLE.graphId || (nwLE.graph && nwLE.graph.id) || 'main';
    nwSelectGraph(keepId, { skipRender: true });
    nwRenderGraph();
    nwRenderInspector();

    nwLE.dirty = false;
    nwClearLocalDraft();
    nwHistoryReset('Gespeichert');
    nwSetStatus(`Gespeichert (v${nwLE.cfg.version || '?'}) ✅`, true);
  } else {
    nwSetStatus(`Speichern fehlgeschlagen: ${nwSafeStr(res && res.error)}`, false);
  }
}
/**
 * Code-Teil: nwHandleNew
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
function nwHandleNew() {
  nwLE.cfg = nwEnsureConfigDefaults(nwDefaultGraph());
  nwLE.selectedNodeId = null;
  nwRenderGraphSelector();
  nwSelectGraph('main', { skipRender: true });
  nwRenderGraph();
  nwRenderInspector();
  nwMarkDirty();
}



// -----------------------------
// Init
// -----------------------------
/**
 * Code-Teil: nwInitLogicEditor
 * Zweck: Kapselt einen lokalen Verarbeitungsschritt, damit Aufrufer nicht direkt in Detaildaten eingreifen.
 * Zusammenhang: Teil von Adapter-/Frontend-Code; Aufrufstellen und abhängige States/APIs beim Ändern mitprüfen.
 * TypeScript: Parameter, Rückgabewert und verwendete Config-/State-Objekte später explizit typisieren.
 */
async function nwInitLogicEditor() {
  nwInstallLogicViewportSizing();

  // Elements
  nwLE.el.boardWrap = document.getElementById('nw-le-board-wrap');
  nwLE.el.boardScale = document.getElementById('nw-le-board-scale');
  nwLE.el.board = document.getElementById('nw-le-board');
  nwLE.el.wires = document.getElementById('nw-le-wires');
  nwLE.el.palette = document.getElementById('nw-le-palette');
  nwLE.el.inspector = document.getElementById('nw-le-inspector');
  nwLE.el.status = document.getElementById('nw-le-status');
  nwLE.el.draftStatus = document.getElementById('nw-le-draft-status');
  nwLE.el.undoBtn = document.getElementById('nw-le-btn-undo');
  nwLE.el.redoBtn = document.getElementById('nw-le-btn-redo');
  nwLE.el.layoutBtn = document.getElementById('nw-le-btn-layout');
  nwLE.el.simBtn = document.getElementById('nw-le-btn-sim');
  nwLE.el.simPanel = document.getElementById('nw-le-sim-panel');
  nwLE.el.simClose = document.getElementById('nw-le-sim-close');
  nwLE.el.simRun = document.getElementById('nw-le-sim-run');
  nwLE.el.simStep = document.getElementById('nw-le-sim-step');
  nwLE.el.simPlus1s = document.getElementById('nw-le-sim-plus-1s');
  nwLE.el.simPlus1m = document.getElementById('nw-le-sim-plus-1m');
  nwLE.el.simReset = document.getElementById('nw-le-sim-reset');
  nwLE.el.simClearTrace = document.getElementById('nw-le-sim-clear-trace');
  nwLE.el.simClock = document.getElementById('nw-le-sim-clock');
  nwLE.el.simStatus = document.getElementById('nw-le-sim-status');
  nwLE.el.simInputs = document.getElementById('nw-le-sim-inputs');
  nwLE.el.simTrace = document.getElementById('nw-le-sim-trace');

  // Graph / Seiten
  nwLE.el.graphSelect = document.getElementById('nw-le-graph-select');
  nwLE.el.graphEnabled = document.getElementById('nw-le-graph-enabled');
  nwLE.el.graphAdd = document.getElementById('nw-le-graph-add');
  nwLE.el.graphDup = document.getElementById('nw-le-graph-dup');
  nwLE.el.graphRename = document.getElementById('nw-le-graph-rename');
  nwLE.el.graphDel = document.getElementById('nw-le-graph-del');

  // Zoom
  nwLE.el.zoomLabel = document.getElementById('nw-le-zoom-label');
  nwLE.el.zoomIn = document.getElementById('nw-le-zoom-in');
  nwLE.el.zoomOut = document.getElementById('nw-le-zoom-out');
  nwLE.el.zoomReset = document.getElementById('nw-le-zoom-reset');
  nwLE.el.zoomFit = document.getElementById('nw-le-zoom-fit');

  // modals
  nwLE.el.dpModal = document.getElementById('nw-le-dp-modal');
  nwLE.el.dpClose = document.getElementById('nw-le-dp-close');
  nwLE.el.dpQ = document.getElementById('nw-le-dp-q');
  nwLE.el.dpSearch = document.getElementById('nw-le-dp-search');
  nwLE.el.dpRoot = document.getElementById('nw-le-dp-root');
  nwLE.el.dpUp = document.getElementById('nw-le-dp-up');
  nwLE.el.dpBreadcrumb = document.getElementById('nw-le-dp-breadcrumb');
  nwLE.el.dpTree = document.getElementById('nw-le-dp-tree');
  nwLE.el.dpResults = document.getElementById('nw-le-dp-results');

  nwLE.el.importModal = document.getElementById('nw-le-import-modal');
  nwLE.el.importClose = document.getElementById('nw-le-import-close');
  nwLE.el.importCancel = document.getElementById('nw-le-import-cancel');
  nwLE.el.importApply = document.getElementById('nw-le-import-apply');
  nwLE.el.importText = document.getElementById('nw-le-import-text');

  nwLE.el.exportModal = document.getElementById('nw-le-export-modal');
  nwLE.el.exportClose = document.getElementById('nw-le-export-close');
  nwLE.el.exportOk = document.getElementById('nw-le-export-ok');
  nwLE.el.exportText = document.getElementById('nw-le-export-text');
  nwLE.el.exportDownload = document.getElementById('nw-le-export-download');

  // backup modal
  nwLE.el.backupModal = document.getElementById('nw-le-backup-modal');
  nwLE.el.backupClose = document.getElementById('nw-le-backup-close');
  nwLE.el.backupOk = document.getElementById('nw-le-backup-ok');
  nwLE.el.backupExport = document.getElementById('nw-le-backup-export');
  nwLE.el.backupImport = document.getElementById('nw-le-backup-import');
  nwLE.el.backupMode = document.getElementById('nw-le-backup-mode');
  nwLE.el.backupRestore = document.getElementById('nw-le-backup-restore');
  nwLE.el.backupStatus = document.getElementById('nw-le-backup-status');
  nwLE.el.backupFile = document.getElementById('nw-le-backup-file');

  // toolbar buttons
  const btnOverview = document.getElementById('nw-le-btn-overview');
  const btnNew = document.getElementById('nw-le-btn-new');
  const btnSave = document.getElementById('nw-le-btn-save');
  const btnExport = document.getElementById('nw-le-btn-export');
  const btnImport = document.getElementById('nw-le-btn-import');
  const btnBackup = document.getElementById('nw-le-btn-backup');
  const btnSmarthomeCfg = document.getElementById('nw-le-btn-smarthomecfg');

  if (nwLE.el.undoBtn) nwLE.el.undoBtn.addEventListener('click', () => nwUndo());
  if (nwLE.el.redoBtn) nwLE.el.redoBtn.addEventListener('click', () => nwRedo());
  if (nwLE.el.layoutBtn) nwLE.el.layoutBtn.addEventListener('click', () => nwAutoLayoutGraph());
  if (nwLE.el.simBtn) nwLE.el.simBtn.addEventListener('click', () => nwLE.simulation.active ? nwCloseSimulation() : nwOpenSimulation());
  if (nwLE.el.simClose) nwLE.el.simClose.addEventListener('click', () => nwCloseSimulation());
  if (nwLE.el.simRun) nwLE.el.simRun.addEventListener('click', () => nwSimSetRunning(!nwLE.simulation.running));
  if (nwLE.el.simStep) nwLE.el.simStep.addEventListener('click', () => nwSimAdvance(100, 'Einzelschritt'));
  if (nwLE.el.simPlus1s) nwLE.el.simPlus1s.addEventListener('click', () => nwSimAdvance(1000, '+1 Sekunde'));
  if (nwLE.el.simPlus1m) nwLE.el.simPlus1m.addEventListener('click', () => nwSimAdvance(60000, '+1 Minute'));
  if (nwLE.el.simReset) nwLE.el.simReset.addEventListener('click', () => nwSimReset());
  if (nwLE.el.simClearTrace) nwLE.el.simClearTrace.addEventListener('click', () => { nwLE.simulation.traces = []; nwRenderSimulationTrace(); });

  if (btnOverview) btnOverview.addEventListener('click', () => {
    // Prefer going back to the last same-origin page (e.g. SmartHome-Config).
    // If no safe referrer exists, fall back to the SmartHome configuration overview.
    try {
      const ref = String(document.referrer || '').trim();
      if (ref) {
        const u = new URL(ref, window.location.href);
        if (u.origin === window.location.origin && !u.pathname.endsWith('/logic.html')) {
          window.location.href = u.href;
          return;
        }
      }
    } catch (_e) {
      // ignore
    }
    try { window.location.href = 'smarthome-config.html'; } catch (_e2) {}
  });

  if (btnNew) btnNew.addEventListener('click', () => nwHandleNew());
  if (btnSave) btnSave.addEventListener('click', () => nwHandleSave());
  if (btnExport) btnExport.addEventListener('click', () => nwOpenExport());
  if (btnImport) btnImport.addEventListener('click', () => nwOpenImport());
  if (btnBackup) btnBackup.addEventListener('click', () => nwOpenBackup());
  if (btnSmarthomeCfg) btnSmarthomeCfg.addEventListener('click', () => {
    try { window.location.href = 'smarthome-config.html'; } catch (_e) {}
  });


  // graph controls
  if (nwLE.el.graphSelect) nwLE.el.graphSelect.addEventListener('change', (e) => {
    const v = (e.target && e.target.value) || '';
    if (v) nwSelectGraph(v);
  });
  if (nwLE.el.graphEnabled) nwLE.el.graphEnabled.addEventListener('change', () => {
    if (!nwLE.graph) return;
    nwLE.graph.enabled = !!nwLE.el.graphEnabled.checked;
    nwRenderGraphSelector();
    nwMarkDirty();
  });
  if (nwLE.el.graphAdd) nwLE.el.graphAdd.addEventListener('click', () => nwAddGraph());
  if (nwLE.el.graphDup) nwLE.el.graphDup.addEventListener('click', () => nwDuplicateGraph());
  if (nwLE.el.graphRename) nwLE.el.graphRename.addEventListener('click', () => nwRenameGraph());
  if (nwLE.el.graphDel) nwLE.el.graphDel.addEventListener('click', () => nwDeleteGraph());

  // zoom controls
  if (nwLE.el.zoomIn) nwLE.el.zoomIn.addEventListener('click', () => nwZoomIn());
  if (nwLE.el.zoomOut) nwLE.el.zoomOut.addEventListener('click', () => nwZoomOut());
  if (nwLE.el.zoomReset) nwLE.el.zoomReset.addEventListener('click', () => nwZoomReset());
  if (nwLE.el.zoomFit) nwLE.el.zoomFit.addEventListener('click', () => nwZoomFit());

  // import modal
  if (nwLE.el.importClose) nwLE.el.importClose.addEventListener('click', () => nwCloseImport());
  if (nwLE.el.importCancel) nwLE.el.importCancel.addEventListener('click', () => nwCloseImport());
  if (nwLE.el.importApply) nwLE.el.importApply.addEventListener('click', () => nwApplyImport());
  if (nwLE.el.importModal) nwLE.el.importModal.addEventListener('click', (e) => { if (e.target === nwLE.el.importModal) nwCloseImport(); });

  // export modal
  if (nwLE.el.exportClose) nwLE.el.exportClose.addEventListener('click', () => nwCloseExport());
  if (nwLE.el.exportOk) nwLE.el.exportOk.addEventListener('click', () => nwCloseExport());
  if (nwLE.el.exportDownload) nwLE.el.exportDownload.addEventListener('click', () => nwDownloadExport());
  if (nwLE.el.exportModal) nwLE.el.exportModal.addEventListener('click', (e) => { if (e.target === nwLE.el.exportModal) nwCloseExport(); });

  // backup modal
  if (nwLE.el.backupClose) nwLE.el.backupClose.addEventListener('click', () => nwCloseBackup());
  if (nwLE.el.backupOk) nwLE.el.backupOk.addEventListener('click', () => nwCloseBackup());
  if (nwLE.el.backupModal) nwLE.el.backupModal.addEventListener('click', (e) => { if (e.target === nwLE.el.backupModal) nwCloseBackup(); });
  if (nwLE.el.backupExport) nwLE.el.backupExport.addEventListener('click', async () => {
    try {
      await nwBackupExport();
    } catch (e) {
      nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
    }
  });
  if (nwLE.el.backupImport) nwLE.el.backupImport.addEventListener('click', () => {
    if (nwLE.el.backupFile) nwLE.el.backupFile.click();
  });
  if (nwLE.el.backupFile) nwLE.el.backupFile.addEventListener('change', async (ev) => {
    const file = ev && ev.target && ev.target.files ? ev.target.files[0] : null;
    ev.target.value = '';
    if (!file) return;
    const mode = nwLE.el.backupMode ? nwLE.el.backupMode.value : 'merge';
    try {
      await nwBackupImportFromFile(file, mode);
    } catch (e) {
      nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
    }
  });
  if (nwLE.el.backupRestore) nwLE.el.backupRestore.addEventListener('click', async () => {
    try {
      await nwBackupRestoreFromUserdata();
    } catch (e) {
      nwSetBackupStatus('Fehler: ' + (e && e.message ? e.message : String(e)), 'error');
    }
  });


  // logic lib
  nwLE.lib = nwBuildLogicLibrary();
  nwRenderPalette();

  // SmartHome Szenen (für "Szene auslösen")
  try {
    const r = await fetch('/api/logic/blocks');
    const j = await r.json();
    if (j && j.ok === true && Array.isArray(j.blocks)) {
      nwLE.sceneOptions = j.blocks
        .filter(b => b && b.type === 'scene')
        .map(b => ({ value: b.id, label: b.name || b.id }));
    }
  } catch (_e) {}

  // load config
  nwSetStatus('Lade…');
  const cfg = await nwFetchConfig();
  const serverCfg = nwEnsureConfigDefaults(cfg || nwDefaultGraph());
  nwLE.cfg = nwEnsureConfigDefaults(nwMaybeRestoreLocalDraft(serverCfg));

  // restore zoom / page selection
  try {
    const z = parseFloat(localStorage.getItem('nwLE.zoom') || '1');
    if (Number.isFinite(z)) nwLE.zoom = nwClamp(z, 0.4, 2.5);
    const gid = localStorage.getItem('nwLE.graphId');
    if (gid) nwLE.graphId = gid;
  } catch (e) {}

  nwRenderGraphSelector();
  nwSelectGraph(nwLE.graphId || 'main', { skipRender: true });

  nwRenderGraph();
  nwRenderInspector();
  nwLE.dirty = !!nwLE.draft.restored;
  nwHistoryReset(nwLE.draft.restored ? 'Entwurf wiederhergestellt' : 'Geladen');
  nwSetStatus(nwLE.draft.restored ? `Lokaler Entwurf bereit (Basis v${nwLE.cfg.version || 1})` : `Bereit (v${nwLE.cfg.version || 1})`, true);

  // global handlers
  nwInstallGlobalHandlers();

  // Update wires on resize
  // Ereignis-Kommentar: Bindet das UI-Ereignis 'resize' an window. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
  window.addEventListener('resize', () => {
    nwSyncLogicViewportMetrics();
    nwUpdateAllWirePaths();
  });
}


// Ereignis-Kommentar: Bindet das UI-Ereignis 'DOMContentLoaded' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
window.addEventListener('beforeunload', () => {
  nwSimStopTimer();
  if (nwLE.dirty) nwWriteLocalDraftNow();
});

document.addEventListener('DOMContentLoaded', () => {
  nwInitLogicEditor();
});


// -----------------------------
// Topbar menu + SmartHome menu visibility
// -----------------------------
(function(){
  const btn=document.getElementById('menuBtn');
  const dd=document.getElementById('menuDropdown');
  if(btn && dd){
    if (!btn.dataset.nwMenuBound) {
      // 0.8.21: Logic-Seite nutzt denselben Burger-Menü-Guard wie Live/EVCS.
      // Das verhindert doppelte Handler durch die später geladene Shell und hält
      // das Menü auch bei Klicks auf Button-Kindelemente offen.
      btn.dataset.nwMenuBound = 'logic';
      btn.dataset.nwAppMenu = '1';
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an btn. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      btn.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); dd.classList.toggle('hidden'); });
      // Ereignis-Kommentar: Bindet das UI-Ereignis 'click' an document. Beim Umbau prüfen, welche DOM-Elemente/States dadurch geändert werden.
      document.addEventListener('click', (e)=>{ const target = e && e.target; if(!dd.contains(target) && !btn.contains(target)) dd.classList.add('hidden'); });
      dd.addEventListener('click', (e)=> e.stopPropagation());
    }
  }
  fetch('/config', { cache: 'no-store' }).then(r=>r.json()).then(cfg=>{
    const sc = (cfg && cfg.settingsConfig) || {};
    const evcsAvailable = ((Number(sc.evcsConfiguredCount || 0) || (Array.isArray(sc.evcsList) ? sc.evcsList.filter(function(r){ if(!r || r.enabled === false) return false; return ['powerId','energyTotalId','energySessionId','statusId','activeId','onlineId','setCurrentAId','setPowerWId','enableWriteId','lockWriteId','rfidReadId','vehicleSocId'].some(function(k){ return String(r[k] || '').trim(); }); }).length : 0)) > 0);
    const c = evcsAvailable ? Math.max(0, Math.round(Number(sc.evcsCount) || 0)) : 0;
    const showEvcs = evcsAvailable && c >= 2;
    const l=document.getElementById('menuEvcsLink');
    if(l) l.classList.toggle('hidden', !showEvcs);
    const t=document.getElementById('tabEvcs');
    if(t) t.classList.toggle('hidden', !showEvcs);
    const sh = !!(cfg.featureVisibility && cfg.featureVisibility.hasSmartHome === true);
    const sl = document.getElementById('menuSmartHomeLink');
    if (sl) sl.classList.toggle('hidden', !sh);
    const st = document.getElementById('tabSmartHome');
    if (st) st.classList.toggle('hidden', !sh);
    const sf = !!(cfg.featureVisibility && cfg.featureVisibility.hasStorageFarm === true);
    const sfMenu = document.getElementById('menuStorageFarmLink');
    if (sfMenu) sfMenu.classList.toggle('hidden', !sf);
    const sfTab = document.getElementById('tabStorageFarm');
    if (sfTab) sfTab.classList.toggle('hidden', !sf);
  }).catch(()=>{});
})();
