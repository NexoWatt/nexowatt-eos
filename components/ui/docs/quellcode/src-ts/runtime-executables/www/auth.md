# src-ts/runtime-executables/www/auth.ts

Verbindet Browser-Anmeldung und Sitzungsstatus mit den Autorisierungs-Endpunkten des Backends.

**Daten und Wirkung:** Verbindet die in dieser Datei sichtbaren Browser-Eingaben, Anzeigeelemente und API-/Hilfsaufrufe. Der Backend-Pfad entscheidet weiterhin über Berechtigungen und zulässige Schreibwirkungen.

**Bei Änderungen:** DOM-/API-Verträge und Rollenrechte mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.

[Originalquelle](../../../../../src-ts/runtime-executables/www/auth.ts) · [Gesamtübersicht](../../../../QUELLCODE_VERKNUEPFUNGEN_DE.md)

## Direkte Verknüpfungen

Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.

| Import | Aufgelöste Datei |
| --- | --- |
| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |

**Direkt importiert von:**

Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.

## Funktionen und Methoden

Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.

| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |
| --- | --- | --- |
| [`isProtectedPage`](../../../../../src-ts/runtime-executables/www/auth.ts#L111) | – | requiredPageCapability |
| [`setBackgroundLocked`](../../../../../src-ts/runtime-executables/www/auth.ts#L120) | locked | Array.from, body.classList.toggle, child.getAttribute, child.removeAttribute, child.setAttribute, lockedBackground.delete, lockedBackground.get, lockedBackground.has, lockedBackground.set |
| [`releaseMandatoryLock`](../../../../../src-ts/runtime-executables/www/auth.ts#L154) | – | setBackgroundLocked |
| [`requiredPageCapability`](../../../../../src-ts/runtime-executables/www/auth.ts#L160) | – | String, document.body.getAttribute |
| [`protectedPageLocked`](../../../../../src-ts/runtime-executables/www/auth.ts#L164) | – | hasCapability, requiredPageCapability |
| [`setProtectedPagePending`](../../../../../src-ts/runtime-executables/www/auth.ts#L170) | active | document.documentElement.classList.toggle |
| [`hasCapability`](../../../../../src-ts/runtime-executables/www/auth.ts#L183) | capabilities, cap | Array.isArray, String, caps.includes |
| [`adminUrl`](../../../../../src-ts/runtime-executables/www/auth.ts#L194) | – | String |
| [`ensureStyles`](../../../../../src-ts/runtime-executables/www/auth.ts#L209) | – | document.createElement, document.getElementById, document.head.appendChild |
| [`ensureOverlay`](../../../../../src-ts/runtime-executables/www/auth.ts#L239) | – | actions.appendChild, btnEl.addEventListener, cancelEl.addEventListener, dlg.appendChild, dlg.setAttribute, document.addEventListener, document.body.appendChild, document.createElement, ensureStyles, localStorage.getItem, overlayEl.addEventListener, overlayEl.appendChild, passEl.addEventListener, passwordRows.push (weitere in der Quelle) |
| [`doLogin`](../../../../../src-ts/runtime-executables/www/auth.ts#L341) | – | String, changeOwnPassword, hasCapability, hideOverlay, login, releaseMandatoryLock, requiredPageCapability, setMsg, setProtectedPagePending, showPasswordChange, window.location.reload |
| [`setMsg`](../../../../../src-ts/runtime-executables/www/auth.ts#L468) | text | String |
| [`showOverlay`](../../../../../src-ts/runtime-executables/www/auth.ts#L477) | message, options | String, ensureOverlay, isProtectedPage, overlayEl.classList.add, passEl.focus, setBackgroundLocked, setMsg, setPasswordMode, showPasswordChange, userEl.focus |
| [`hideOverlay`](../../../../../src-ts/runtime-executables/www/auth.ts#L499) | – | overlayEl.classList.remove, protectedPageLocked, setBackgroundLocked, setMsg |
| [`renderPageLock`](../../../../../src-ts/runtime-executables/www/auth.ts#L517) | message | String, adminBtn.addEventListener, document.getElementById, document.querySelector, loginBtn.addEventListener |
| [`updateConfigNavigation`](../../../../../src-ts/runtime-executables/www/auth.ts#L538) | info | Array.isArray, caps.includes, document.querySelectorAll, element.getAttribute, element.style.removeProperty |
| [`refreshConfigNavigation`](../../../../../src-ts/runtime-executables/www/auth.ts#L551) | knownStrictStatus | ORIG_FETCH, document.querySelector, response.json, updateConfigNavigation |
| [`refreshStatus`](../../../../../src-ts/runtime-executables/www/auth.ts#L567) | – | Array.isArray, ORIG_FETCH, String, hasCapability, isProtectedPage, j.capabilities.slice, overlayEl.classList.contains, r.json, refreshConfigNavigation, releaseMandatoryLock, requiredPageCapability, setBackgroundLocked, setProtectedPagePending, showOverlay (weitere in der Quelle) |
| [`login`](../../../../../src-ts/runtime-executables/www/auth.ts#L636) | user, password | JSON.stringify, ORIG_FETCH, Object.assign, String, localStorage.setItem, refreshStatus, setMsg, window.dispatchEvent |
| [`logout`](../../../../../src-ts/runtime-executables/www/auth.ts#L672) | – | ORIG_FETCH, Object.assign, refreshStatus, window.dispatchEvent, window.location.reload |
| [`updateHeader`](../../../../../src-ts/runtime-executables/www/auth.ts#L687) | – | box.appendChild, box.remove, btn.addEventListener, change.addEventListener, document.createElement, document.getElementById, document.querySelector, header.appendChild |
| [`setPasswordMode`](../../../../../src-ts/runtime-executables/www/auth.ts#L735) | enabled | – |
| [`showPasswordChange`](../../../../../src-ts/runtime-executables/www/auth.ts#L744) | required | ensureOverlay, overlayEl.classList.add, overlayEl.classList.contains, passEl.focus, setBackgroundLocked, setMsg, setPasswordMode |
| [`changeOwnPassword`](../../../../../src-ts/runtime-executables/www/auth.ts#L757) | – | Array.from, JSON.stringify, ORIG_FETCH, refreshStatus, releaseMandatoryLock, setMsg, setPasswordMode, showOverlay |
| [`requireCapability`](../../../../../src-ts/runtime-executables/www/auth.ts#L845) | capability, options | String, hasCapability, overlayEl.classList.remove, refreshStatus, releaseMandatoryLock, setBackgroundLocked, setProtectedPagePending, showOverlay, showPasswordChange |
| [`getState`](../../../../../src-ts/runtime-executables/www/auth.ts#L879) | – | Object.assign |
| [`hasCapability`](../../../../../src-ts/runtime-executables/www/auth.ts#L882) | cap | hasCapability |
| [`showLogin`](../../../../../src-ts/runtime-executables/www/auth.ts#L883) | msg, options | showOverlay |
| [`changePassword`](../../../../../src-ts/runtime-executables/www/auth.ts#L885) | – | showPasswordChange |
