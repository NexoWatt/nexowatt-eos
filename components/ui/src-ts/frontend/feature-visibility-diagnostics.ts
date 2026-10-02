/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Bereitet Abweichungen der Feature-Sichtbarkeit für Diagnose und Nachvollziehbarkeit auf.
 * Daten und Wirkung: Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.
 * Bei Änderungen: DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/frontend/feature-visibility-diagnostics.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
/**
 * Datei: src-ts/frontend/feature-visibility-diagnostics.ts
 *
 * Zweck:
 * Bereitet die spätere Diagnose der kundenseitigen Feature-Sichtbarkeit im Frontend vor.
 *
 * Zusammenhang:
 * Nach mehreren UI-Fixes müssen wir nachvollziehen können, warum EVCS, Speicherfarm,
 * SmartHome, Wetter oder KI-Berater sichtbar oder unsichtbar sind. Diese Datei ist ein
 * reiner TypeScript-Helfer ohne DOM-Zugriff und wird als MJS-Spiegel gebaut, aber in
 * 0.7.68 noch nicht produktiv vom Browser geladen.
 *
 * Wichtig:
 * Diese Diagnose darf keine Feature-Flags setzen. Sie erklärt nur die Entscheidung,
 * damit spätere TypeScript-Migrationen nicht wieder Funktionen anzeigen, die in der
 * Kundenanlage gar nicht vorhanden sind.
 */

/** Fachlicher Name eines Features im Kundenfrontend. */
export type CustomerFeatureName = 'evcs' | 'storageFarm' | 'smartHome' | 'weather' | 'aiAdvisor';

/** Vereinfachter Sichtbarkeitszustand, der aus Frontend-/Backend-Helfern kommen kann. */
export interface CustomerFeatureVisibilitySnapshot {
  readonly hasEvcs: boolean;
  readonly hasStorageFarm: boolean;
  readonly hasSmartHome: boolean;
  readonly hasWeather: boolean;
  readonly hasAiAdvisor: boolean;
}

/** Zusatzdaten, mit denen die Diagnose begründen kann, warum ein Feature sichtbar/unsichtbar ist. */
export interface CustomerFeatureDiagnosticsInput {
  readonly visibility: CustomerFeatureVisibilitySnapshot;
  readonly evcsEnabled?: boolean;
  readonly evcsProofCount?: number;
  readonly storageFarmEnabled?: boolean;
  readonly storageFarmProofCount?: number;
  readonly smartHomeEnabled?: boolean;
  readonly weatherEnabled?: boolean;
  readonly weatherHasData?: boolean;
  readonly aiAdvisorInstalled?: boolean;
  readonly aiAdvisorCustomerEnabled?: boolean;
}

/** Einzelne Diagnosezeile für Debug-Ausgaben oder spätere UI-Hinweise. */
export interface CustomerFeatureDiagnostic {
  readonly feature: CustomerFeatureName;
  readonly visible: boolean;
  readonly reasonDe: string;
  readonly safeToShow: boolean;
}

/**
 * Code-Teil: countIsPositive
 *
 * Zweck:
 * Normalisiert optionale Zählwerte für Nachweise, z. B. Anzahl echter Ladepunkt-DPs.
 *
 * Zusammenhang:
 * EVCS und Speicherfarm dürfen nicht durch alte Flags sichtbar werden. Ein positiver
 * Nachweiszähler ist eine zusätzliche Erklärung, ersetzt aber nicht die eigentliche
 * Sichtbarkeitsentscheidung aus `visibility`.
 */
function countIsPositive(value: unknown): boolean {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

/**
 * Code-Teil: diagnostic
 *
 * Zweck:
 * Baut eine einzelne Diagnosezeile mit einheitlicher Struktur.
 *
 * Zusammenhang:
 * Die Runtime soll später nicht überall eigene Textbausteine für Sichtbarkeitsgründe
 * zusammenbauen. Dieser Helper hält das Format zentral und typisiert.
 */
function diagnostic(feature: CustomerFeatureName, visible: boolean, reasonDe: string): CustomerFeatureDiagnostic {
  return { feature, visible, reasonDe, safeToShow: visible };
}

/**
 * Code-Teil: buildCustomerFeatureDiagnostics
 *
 * Zweck:
 * Erzeugt verständliche deutsche Diagnosezeilen zur Feature-Sichtbarkeit.
 *
 * Zusammenhang:
 * Diese Funktion ist der nächste sichere Schritt nach den Frontend-MJS-Spiegeln: Sie
 * kann später im App-Center oder Debugbereich anzeigen, warum z. B. EVCS oder Farm
 * nicht erscheint, ohne die eigentliche Dashboard-Logik zu verändern.
 *
 * Wichtig:
 * `visible` kommt aus dem bereits berechneten Sichtbarkeitszustand. Diese Funktion
 * entscheidet nicht neu, sondern erklärt nur. Dadurch bleibt sie risikoarm.
 */
export function buildCustomerFeatureDiagnostics(input: CustomerFeatureDiagnosticsInput): CustomerFeatureDiagnostic[] {
  const v = input.visibility;
  const evcsProofs = countIsPositive(input.evcsProofCount);
  const farmProofs = countIsPositive(input.storageFarmProofCount);

  return [
    diagnostic(
      'evcs',
      v.hasEvcs,
      v.hasEvcs
        ? 'EVCS sichtbar: Feature aktiv und mindestens ein echter Ladepunkt-Datenpunkt ist vorhanden.'
        : input.evcsEnabled === true && !evcsProofs
          ? 'EVCS ausgeblendet: Feature ist zwar aktiv, aber es wurde kein echter Ladepunkt-Datenpunkt nachgewiesen.'
          : 'EVCS ausgeblendet: keine aktive Wallbox-Konfiguration für diese Kundenanlage.'
    ),
    diagnostic(
      'storageFarm',
      v.hasStorageFarm,
      v.hasStorageFarm
        ? 'Speicherfarm sichtbar: Farm aktiv und mindestens zwei echte Farmspeicher sind nachgewiesen.'
        : input.storageFarmEnabled === true && !farmProofs
          ? 'Speicherfarm ausgeblendet: Feature ist aktiv, aber es wurde kein echter Farmspeicher-Datenpunkt nachgewiesen.'
          : 'Speicherfarm ausgeblendet: keine aktive Speicherfarm für diese Kundenanlage.'
    ),
    diagnostic(
      'smartHome',
      v.hasSmartHome,
      v.hasSmartHome
        ? 'SmartHome sichtbar: SmartHome ist im Installer aktiviert.'
        : 'SmartHome ausgeblendet: SmartHome ist für diese Anlage nicht aktiviert.'
    ),
    diagnostic(
      'weather',
      v.hasWeather,
      v.hasWeather
        ? 'Wetter sichtbar: Wetter-App aktiv und Wetterdaten vorhanden.'
        : input.weatherEnabled === true && input.weatherHasData !== true
          ? 'Wetter ausgeblendet: Wetter-App aktiv, aber es liegen noch keine Wetterdaten vor.'
          : 'Wetter ausgeblendet: Wetter-App nicht aktiv.'
    ),
    diagnostic(
      'aiAdvisor',
      v.hasAiAdvisor,
      v.hasAiAdvisor
        ? 'KI-Berater sichtbar: App aktiv und Kundenschalter nicht ausgeschaltet.'
        : input.aiAdvisorInstalled === true && input.aiAdvisorCustomerEnabled === false
          ? 'KI-Berater ausgeblendet: Kunde hat den Berater in den Einstellungen ausgeschaltet.'
          : 'KI-Berater ausgeblendet: KI-Berater-App ist nicht aktiv installiert.'
    ),
  ];
}

/**
 * Code-Teil: featureVisibilitySummaryText
 *
 * Zweck:
 * Baut eine kompakte Textzusammenfassung für spätere Debug-/Statusanzeigen.
 *
 * Zusammenhang:
 * Dieser Text kann später im App-Center oder in Diagnose-States verwendet werden, ohne
 * dass dort erneut Feature-Sichtbarkeitslogik geschrieben werden muss.
 */
export function featureVisibilitySummaryText(diagnostics: ReadonlyArray<CustomerFeatureDiagnostic>): string {
  const visible = diagnostics.filter((item) => item.visible).map((item) => item.feature);
  const hidden = diagnostics.filter((item) => !item.visible).map((item) => item.feature);
  return `sichtbar: ${visible.length ? visible.join(', ') : 'keine'} | ausgeblendet: ${hidden.length ? hidden.join(', ') : 'keine'}`;
}
