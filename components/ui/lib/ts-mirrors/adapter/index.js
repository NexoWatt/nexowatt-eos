'use strict';

/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/adapter/index.ts
 * Quell-Hash: sha256:0b5f3fa4509b64bc5a5880fd5d415cf5ea4f001f3aa770232134ef593430877e
 * Erzeugung: npm run sync:ts-adapter-helpers
 *
 * Zweck:
 * Diese Datei ist der CommonJS-Spiegel eines adapter-nahen TypeScript-Helfers.
 * main.js darf diese Datei nur mit Fallback laden, damit die produktive Runtime
 * nicht von einem Migrationsartefakt abhängig wird.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bündelt die Exporte des Bereichs „src-ts/adapter“, damit dessen Aufrufer einen gemeinsamen Import-Einstieg verwenden können.
 * Daten und Wirkung: Verknüpft die unten sichtbaren Typen/Exporte mit ihren Importierenden. Die Gegenrichtung und die Originaldateien sind im Quellcode-Verzeichnis dokumentiert.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/adapter/index.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/adapter/index.ts
 *
 * Zweck:
 * Zentraler Exportpunkt für die TypeScript-Vorbereitung der Adapter-API-Schicht.
 *
 * Zusammenhang:
 * Alles unter `src-ts/adapter/*` gehört fachlich zu `main.js`: StateCache, HTTP-API,
 * Schreibpläne und `info.connection`. Produktive Runtime bleibt in 0.7.63 weiterhin JS.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsWrites = exports.connectionState = exports.apiSet = exports.apiState = exports.stateCache = void 0;
/**
 * Code-Teil: Adapter-API-Exportpunkt
 *
 * Zweck:
 * Bündelt die vorbereiteten TypeScript-Helfer für `main.js`, damit spätere Runtime-
 * Auslagerungen nur noch einen stabilen Importpfad benötigen.
 *
 * Zusammenhang:
 * Produktiv bleibt `main.js`; diese Datei definiert nur die spätere modulare Grenze.
 */
exports.stateCache = __importStar(require("./state-cache"));
exports.apiState = __importStar(require("./api-state"));
exports.apiSet = __importStar(require("./api-set"));
exports.connectionState = __importStar(require("./connection-state"));
exports.settingsWrites = __importStar(require("./settings-writes"));
