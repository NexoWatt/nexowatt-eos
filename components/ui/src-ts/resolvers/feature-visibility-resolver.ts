/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Ermittelt die sichtbaren Funktionen aus Konfiguration und Feature-Daten statt aus zufällig vorhandenen Alt-States.
 * Daten und Wirkung: Verarbeitet die in den TypeScript-Signaturen beschriebenen Eingaben. Ergebnisse gehen über die Export-/Import-Verknüpfungen an Aufrufer; erzeugte JavaScript-Spiegel werden aus dieser Quelle gebaut.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/resolvers/feature-visibility-resolver.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
import type { EvcsPresenceProof, FeatureVisibilityState, StorageFarmPresenceProof } from '../contracts/features';

/**
 * Datei: src-ts/resolvers/feature-visibility-resolver.ts
 *
 * Zweck:
 * Zentrale TypeScript-Vorbereitung für die Feature-Sichtbarkeit im Kundenfrontend.
 *
 * Zusammenhang:
 * In den letzten UI-Versionen wurden teilweise Funktionen angezeigt, obwohl sie in der
 * Kundenanlage nicht vorhanden waren. Dieser Resolver bündelt die spätere einheitliche
 * Regel für `www/app.js`, `www/history.js`, `www/cockpit-shell.js`, `storagefarm.html`
 * und backendnahe `/api/state`-Ableitungen.
 *
 * Wichtig:
 * Diese Datei ist in 0.7.68 noch nicht produktiv verdrahtet. Sie ist der gemeinsame
 * TypeScript-Vertrag, damit Frontend- und Backend-Vorbereitung nicht auseinanderlaufen.
 */

/** Gemeinsame Eingabe für die Feature-Sichtbarkeit. */
export interface FeatureVisibilityResolverInput {
  /** Feature-Flag aus Installer/App-Center: EVCS grundsätzlich aktiv. */
  readonly evcsEnabled?: boolean | undefined;
  /** Ladepunkt-Nachweise. Nur echte Mess-/Steuer-DPs dürfen EVCS sichtbar machen. */
  readonly evcsProofs?: ReadonlyArray<EvcsPresenceProof | undefined> | undefined;
  /** Feature-Flag aus Installer/App-Center: Speicherfarm grundsätzlich aktiv. */
  readonly storageFarmEnabled?: boolean | undefined;
  /** Farmspeicher-Nachweise. Nur echte Speicher-DPs dürfen die Farm sichtbar machen. */
  readonly storageFarmProofs?: ReadonlyArray<StorageFarmPresenceProof | undefined> | undefined;
  /** SmartHome ist ein einfaches aktiv/inaktiv Feature. */
  readonly smartHomeEnabled?: boolean | undefined;
  /** Wetter-App ist aktiv. */
  readonly weatherEnabled?: boolean | undefined;
  /** Wetterdaten sind wirklich vorhanden. Ohne Daten keine Wetterkarte anzeigen. */
  readonly weatherHasData?: boolean | undefined;
  /** KI-Berater-App ist installiert/aktiviert. */
  readonly aiAdvisorAppEnabled?: boolean | undefined;
  /** Alias für Frontend-Vorbereitung: KI-Berater installiert. */
  readonly aiAdvisorInstalled?: boolean | undefined;
  /** Kundenschalter in Einstellungen. false blendet KI-Berater aus. */
  readonly aiAdvisorCustomerEnabled?: boolean | undefined;
}

/** Prüft, ob ein optionales DP-Feld wirklich Text enthält. */
function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Code-Teil: hasRealEvcsPresenceProof
 *
 * Zweck:
 * Prüft, ob ein Ladepunkt wirklich vorhanden ist.
 *
 * Zusammenhang:
 * Diese Regel schützt Dashboard, History, Menü und EVCS-Seite davor, eine Wallbox zu
 * zeigen, wenn nur alte Default-States oder Flags existieren.
 *
 * Wichtig:
 * Ein reines Feature-Flag reicht nicht. Sichtbar wird EVCS nur bei einem echten
 * Mess- oder Steuer-Datenpunkt oder einem expliziten Nachweis `hasAnyRealDatapoint`.
 */
export function hasRealEvcsPresenceProof(proof: EvcsPresenceProof | undefined): boolean {
  if (!proof) return false;
  if (proof.hasAnyRealDatapoint === true) return true;
  return hasText(proof.measuredPowerDp) || hasText(proof.controlDp);
}

/**
 * Code-Teil: hasRealStorageFarmPresenceProof
 *
 * Zweck:
 * Prüft, ob ein Speicherfarm-Speicher wirklich konfiguriert ist.
 *
 * Zusammenhang:
 * Die Speicherfarm darf nur sichtbar werden, wenn der Installer sie aktiviert hat und
 * mindestens zwei Farmspeicher echte SoC-/Leistungs-Datenpunkte besitzen.
 */
export function hasRealStorageFarmPresenceProof(proof: StorageFarmPresenceProof | undefined): boolean {
  if (!proof) return false;
  if (proof.hasAnyRealDatapoint === true) return true;
  return hasText(proof.socDp) || hasText(proof.chargeDp) || hasText(proof.dischargeDp) || hasText(proof.signedPowerDp);
}

/**
 * Code-Teil: deriveCustomerFeatureVisibility
 *
 * Zweck:
 * Leitet die finale Sichtbarkeit der Kundenfunktionen aus Flags und Nachweisen ab.
 *
 * Regeln:
 * - EVCS benötigt Aktivierung plus echten Ladepunktnachweis.
 * - Speicherfarm benötigt Aktivierung plus echten Farmspeicher-Nachweis.
 * - Wetter benötigt Aktivierung und vorhandene Wetterdaten.
 * - KI-Berater benötigt aktive App und darf vom Kunden nicht ausgeschaltet sein.
 *
 * TypeScript-Ziel:
 * Diese Funktion ist später die gemeinsame Quelle für die verstreuten UI-Checks.
 */
export function deriveCustomerFeatureVisibility(input: FeatureVisibilityResolverInput): FeatureVisibilityState {
  const hasEvcs = input.evcsEnabled === true && (input.evcsProofs ?? []).some(hasRealEvcsPresenceProof);
  const hasStorageFarm = input.storageFarmEnabled === true && (input.storageFarmProofs ?? []).filter(hasRealStorageFarmPresenceProof).length >= 2;
  const aiInstalled = input.aiAdvisorAppEnabled === true || input.aiAdvisorInstalled === true;

  return {
    hasEvcs,
    hasStorageFarm,
    hasSmartHome: input.smartHomeEnabled === true,
    hasWeather: input.weatherEnabled === true && input.weatherHasData === true,
    hasAiAdvisor: aiInstalled && input.aiAdvisorCustomerEnabled !== false,
  };
}
