/**
 * AUTO-GENERATED FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/frontend/customer-feature-visibility.ts
 * Quell-Hash: sha256:617bc0875d03644f7810c6dc02547845f1779922b9df391a99db072edb1726ba
 * Erzeugung: npm run sync:ts-frontend-mirrors
 *
 * Zweck:
 * Diese Datei ist ein browsernaher JavaScript-Modulspiegel der TypeScript-Quelle.
 * Diese Datei kann produktiv importiert werden, wenn der zugehörige Browsercode
 * bereits auf den jeweiligen TS-Helfer umgestellt wurde.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/frontend/*.ts vornehmen.
 * 2. npm run sync:ts-frontend-mirrors ausführen.
 * 3. npm run test:ts-frontend-mirrors prüfen.
 */
/** Prüft, ob ein optionaler Datenpunkttext wirklich belegt ist. */
function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
/**
 * Code-Teil: hasRealEvcsProof
 *
 * Zweck:
 * Erkennt, ob ein Ladepunkt wirklich existiert.
 *
 * Zusammenhang:
 * Wird später für LIVE-Dashboard, History, EVCS-Tab und Hamburger-Menü genutzt.
 *
 * Wichtig:
 * Ein alter 0-W-State oder ein altes Flag reicht nicht. EVCS darf im Kundenfrontend
 * nur sichtbar werden, wenn ein echter Mess- oder Steuer-Datenpunkt vorhanden ist.
 */
export function hasRealEvcsProof(proof) {
    if (!proof)
        return false;
    if (proof.hasAnyRealDatapoint)
        return true;
    return hasText(proof.measuredPowerDp) || hasText(proof.controlDp);
}
/**
 * Code-Teil: hasRealStorageFarmProof
 *
 * Zweck:
 * Erkennt, ob ein Speicherfarm-Speicher wirklich konfiguriert ist.
 *
 * Zusammenhang:
 * Späterer gemeinsamer Check für Topbar, Menü und Speicherfarm-Seite.
 *
 * Wichtig:
 * Eine Speicherfarm darf nicht allein durch alte Runtime-States sichtbar werden.
 */
export function hasRealStorageFarmProof(proof) {
    if (!proof)
        return false;
    if (proof.hasAnyRealDatapoint)
        return true;
    return hasText(proof.socDp) || hasText(proof.chargeDp) || hasText(proof.dischargeDp) || hasText(proof.signedPowerDp);
}
/**
 * Code-Teil: decideEvcsVisibility
 *
 * Zweck:
 * Baut die EVCS-Einzelentscheidung inklusive Grund.
 *
 * Zusammenhang:
 * Diese Funktion ist später wichtig, damit History und LIVE-Dashboard nicht wieder
 * Ladepunkte anzeigen, obwohl in der Anlage keine Wallbox installiert ist.
 */
export function decideEvcsVisibility(input) {
    const hasEvcs = (input.evcsProofs ?? []).some(hasRealEvcsProof);
    return hasEvcs
        ? { key: 'evcs', visible: true, reason: 'evcs-real-datapoint', hint: 'EVCS sichtbar: mindestens ein echter Ladepunkt-Datenpunkt ist konfiguriert.' }
        : { key: 'evcs', visible: false, reason: 'evcs-no-real-datapoint', hint: 'EVCS ausgeblendet: keine echte Wallbox-/Ladepunkt-Konfiguration vorhanden.' };
}
/**
 * Code-Teil: decideStorageFarmVisibility
 *
 * Zweck:
 * Baut die Speicherfarm-Einzelentscheidung inklusive Grund.
 *
 * Zusammenhang:
 * Schützt Kundenanlagen ohne Speicherfarm vor falschem Speicherfarm-Reiter und
 * falschen Farm-Hinweisen im Kundenfrontend.
 */
export function decideStorageFarmVisibility(input) {
    if (input.storageFarmEnabled !== true) {
        return { key: 'storageFarm', visible: false, reason: 'farm-disabled', hint: 'Speicherfarm ausgeblendet: Feature ist im Installer nicht aktiv.' };
    }
    const realFarmCount = (input.storageFarmProofs ?? []).filter(hasRealStorageFarmProof).length;
    return realFarmCount >= 2
        ? { key: 'storageFarm', visible: true, reason: 'farm-real-storage', hint: 'Speicherfarm sichtbar: mindestens zwei echte Farmspeicher sind konfiguriert.' }
        : { key: 'storageFarm', visible: false, reason: 'farm-no-real-storage', hint: 'Speicherfarm ausgeblendet: weniger als zwei echte Farmspeicher-Datenpunkte vorhanden.' };
}
/**
 * Code-Teil: decideSmartHomeVisibility
 * Zweck: Kapselt den SmartHome-Schalter in eine begründete Einzelentscheidung.
 */
export function decideSmartHomeVisibility(input) {
    return input.smartHomeEnabled === true
        ? { key: 'smartHome', visible: true, reason: 'smarthome-enabled', hint: 'SmartHome sichtbar: Feature ist im Installer aktiviert.' }
        : { key: 'smartHome', visible: false, reason: 'smarthome-disabled', hint: 'SmartHome ausgeblendet: Feature ist nicht aktiviert.' };
}
/**
 * Code-Teil: decideWeatherVisibility
 * Zweck: Wetter wird nur sichtbar, wenn Feature aktiv und Daten vorhanden sind.
 */
export function decideWeatherVisibility(input) {
    if (input.weatherEnabled !== true) {
        return { key: 'weather', visible: false, reason: 'weather-disabled', hint: 'Wetter ausgeblendet: Wetter-App ist deaktiviert.' };
    }
    return input.weatherHasData === true
        ? { key: 'weather', visible: true, reason: 'weather-enabled-with-data', hint: 'Wetter sichtbar: Wetter-App ist aktiv und Daten sind vorhanden.' }
        : { key: 'weather', visible: false, reason: 'weather-no-data', hint: 'Wetter ausgeblendet: Wetter-App ist aktiv, aber es liegen noch keine Daten vor.' };
}
/**
 * Code-Teil: decideAiAdvisorVisibility
 * Zweck: KI-Berater nur anzeigen, wenn App aktiv und Kundenschalter nicht aus ist.
 */
export function decideAiAdvisorVisibility(input) {
    if (input.aiAdvisorInstalled !== true) {
        return { key: 'aiAdvisor', visible: false, reason: 'ai-not-installed', hint: 'KI-Berater ausgeblendet: App ist nicht aktiv/installiert.' };
    }
    return input.aiAdvisorCustomerEnabled === false
        ? { key: 'aiAdvisor', visible: false, reason: 'ai-customer-disabled', hint: 'KI-Berater ausgeblendet: Kunde hat die Anzeige ausgeschaltet.' }
        : { key: 'aiAdvisor', visible: true, reason: 'ai-enabled', hint: 'KI-Berater sichtbar: App aktiv und Kundenschalter an.' };
}
/**
 * Code-Teil: explainCustomerFeatureVisibility
 *
 * Zweck:
 * Berechnet die Feature-Sichtbarkeit mit nachvollziehbaren Gründen.
 *
 * Zusammenhang:
 * Dieser erklärende Modus ist für die nächste sichere Migration wichtig. Bevor wir
 * `www/app.js` produktiv auf den TS-Helfer umstellen, können wir damit Tests und
 * Diagnoseausgaben gegen die vorhandene JS-Logik vergleichen.
 */
export function explainCustomerFeatureVisibility(input) {
    const decisions = [
        decideEvcsVisibility(input),
        decideStorageFarmVisibility(input),
        decideSmartHomeVisibility(input),
        decideWeatherVisibility(input),
        decideAiAdvisorVisibility(input),
    ];
    const visibility = {
        hasEvcs: decisions[0].visible,
        hasStorageFarm: decisions[1].visible,
        hasSmartHome: decisions[2].visible,
        hasWeather: decisions[3].visible,
        hasAiAdvisor: decisions[4].visible,
    };
    return { visibility, decisions };
}
/**
 * Code-Teil: buildCustomerFeatureVisibility
 *
 * Zweck:
 * Baut die kundenseitige Feature-Sichtbarkeit aus Nachweisen und Kundenschaltern.
 *
 * Zusammenhang:
 * Späterer Kandidat für die Migration verstreuter Checks aus `www/app.js`,
 * `www/cockpit-shell.js`, `www/history.js` und Unterseiten.
 */
export function buildCustomerFeatureVisibility(input) {
    return explainCustomerFeatureVisibility(input).visibility;
}
