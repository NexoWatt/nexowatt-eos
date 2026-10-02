## 1.0.21 - 2026-09-25 (Official Stable)

- Nulleinspeisung über die volle Kartenbreite: Grundeinstellungen, Wechselrichter direkt unter Netzlimits, kompakter Status und aufklappbare Feineinstellungen/Diagnose.
- PV-Istleistungs-Zuordnung beim Neuzeichnen/Speichern erhalten, Dezimalkomma und sichtbare Bias-/Totband-Vorgaben korrigiert; Legacy-Editor mit Runtime-Feldern verbunden.
- Wechselrichter-Bezugsleistungen und mehrdeutige Schreibziele prüfen; PV-Erzeugungsgrenze und Netzeinspeisegrenze klar unterscheiden. Deutsche Schritt-für-Schritt-Anleitung ergänzt.
- SmartHome-Einrichtung aus allgemeinen Einstellungen entfernt, ausschließlich im SmartHome-Bereich für Admin/Installateur. Normalisierte Static-HTML-Zugriffe ebenfalls durch Rollenprüfung geschützt; Kundenbedienung bleibt erhalten.
- HTTP-, Browser-, Formular- und Regelpfad-Regressionen erweitert; vollständige Repository-ZIP und schnelle geschützte npm-Publish-Kette beibehalten.

## 1.0.20 - 2026-09-24 (Official Stable)

- Aktive Nulleinspeisung erlaubt weiterhin Netzbezug innerhalb der Anlagen- und Ladepunktgrenzen. Freigegebene, frisch gemessene und vom Speicherregler bestätigte Batterieunterstützung wird an begrenzten Ladepunkten zusätzlich zu Netz und PV separat angerechnet; geschützte Ladepunkte erhalten keinen Batterieanteil.
- Hauslast und geschützte Verbraucher behalten Vorrang. Ein gemeinsames Batterie-Budget verhindert Mehrfachzuteilung; die gemessene Entladung wird nicht nochmals auf das Gesamtbudget aufgeschlagen. Veraltete Messungen oder entfallene Freigaben entziehen den Zusatzanteil bis zum finalen Writer.
- Min+PV und Auto ohne vorrangigen Tarif-/Zielentscheid verwenden Batterie nur zur Mindestleistungsstützung. Boost und entsprechende Normal-/Zielanforderungen dürfen mehr freigegebenen Speicheranteil nutzen. Keine batteriegestützte Phasen-Hochschaltung und kein Start unter dem technischen Minimum ohne bereits gemessene Unterstützung.
- Heizstab-Tarifbetrieb korrigiert: eine fehlende optionale Netzleistungsgrenze wird nicht mehr als 0 W interpretiert. Explizite Grenzen, reine PV-Regeln und übergeordnete Schutzfunktionen bleiben wirksam.
- Neue Quellen-, Mehr-Ladepunkt-, Regeltick-/Writer- und Heizstab-Regressionen dauerhaft in der vollständigen Prüfung eingebunden; die schnelle npm-Publish-Kette bleibt erhalten.

## 1.0.19 - 2026-09-24 (Official Stable)

- Netzanteil je Ladepunkt bei aktiver Nulleinspeisung statt fester Boost-Gesamtgrenze: zugeordnete, frische PV darf zusätzlich laden. Leer = keine zusätzliche Netzgrenze, 0 = nur PV. Gespeicherter Feldname `boostMaxPowerW` bleibt erhalten, seine Bedeutung wird ausdrücklich geändert.
- Auto lädt ohne vorrangiges Ziel, günstiges Tarifzeitfenster oder Betriebsstrategie mit Minimum plus PV. Tarif, Zielzeit und reine PV-Vorgaben bleiben erhalten; auch Min+PV und Such-/Haltefreigaben beachten die LP-Netzgrenze.
- Gemeinsame PV-Einmalverteilung, frische EV-Istwerte im Core und erneute Quellenprüfung vor dem Writer verhindern Doppelzuteilung, doppelten Netzabzug und Übernahme ausgefallener PV als Netzstrom.
- Phasenminimum, sichere 1p/3p-Umschaltung, DC-Grenzen, Stations-/NVP-/§14a-Schutz bleiben vorrangig. Neue Software-Regressionen einschließlich fehlender Messungen, Ziel-/Tarifwechsel und unverändertem Betrieb ohne Nulleinspeisung.

## 1.0.18 - 2026-09-24 (Official Stable)

- Laufende PV-Ladung bei Nulleinspeisung überbrückt kurze Defizite mit einem expliziten, gemeinsamen Netzbudget (Standard 600 W / 45 s), das bis in den finalen Writer verfolgt und nicht als PV gerechnet wird.
- Jeder beendete PV-Ladevorgang erhält im aktiven Nulleinspeisebetrieb eine Wiederanlaufsperre (Standard 180 s); geplante Phasenwechsel bleiben davon getrennt. Harte Grenzen, fehlende Messungen und Batterieentladung widerrufen Zusatzfreigaben.
- Maximale Boost-Gesamtleistung separat je Ladepunkt einstellbar. Leer übernimmt das bisherige Maximum, 0 sperrt Boost. AC-Mindestströme, Quantisierung, 1p/3p-Auswahl und DC-Minima bleiben maßgeblich.
- Konfigurationsbrücken, AppCenter, Diagnose und produktive Regelticks mit Wolken-/Neustart-/Phasenszenarien geprüft. Die schnelle npm-Prüfkette und getrennte Regeln für Min+PV bleiben erhalten.

## 1.0.17 - 2026-09-23 (Official Stable)

- Nulleinspeisung unter Netzlimits aktiviert eine gemeinsame PV-Strategie für Ladepunkte, Heizstäbe und direkt regelbare Speicher.
- Abgeregelte PV wird mit genau einer befristeten, energetisch begrenzten Prüflast erschlossen. Unbestätigte Leistung bleibt außerhalb des PV-Budgets; reale Messwerte, Gesamtbudget und Verbraucherprioritäten bleiben maßgeblich.
- AC-/DC-Mindestleistungen, vorhandene sichere AC-Phasenumschaltung, Heizstab-Stufen/Temperaturgrenzen und Speicher-SoC/Reglerhoheit werden berücksichtigt.
- Fehlende Messwerte, ausbleibende PV-Reaktion, Fremdversorgung oder abgelaufene Freigaben beenden die Probe mit Wiederholschutz. Die endgültigen Hardware- und Netzschutzprüfungen bleiben aktiv.
- Deutsche Modul- und Verknüpfungskommentare sowie Regressionen für Koordination, Ladepunkte, Heizstab, Speicher und AppCenter ergänzt. Prüfung echter Geräte und Anlagen-Inbetriebnahme bleibt erforderlich; keine Garantie gegen kurzzeitige Netztransienten.
- Fertige Laufzeit-Artefakte behalten die schnelle npm-Prüfkette ohne automatischen Neubau oder Neuversiegelung beim Veröffentlichen.

## 1.0.16 - 2026-09-19 (Official Stable)

- Microgrid-Einrichtung, Regelung, Teilnehmerübersicht und optionales Zählerarchiv im EMS-AppCenter zusammengeführt; separaten Installer-Einstieg entfernt.
- Installation und Aktivierung steuern Seite, APIs, Regelkanal und Archiv. Nicht installierte Apps starten keine Dienste.
- Bestehende Verbünde aus 1.0.14/15 werden einmalig sichtbar übernommen; aktive Schutzgrenzen sperren versehentliches Aus/Deinstallieren auch bei Save und Backup-Import.
- Rollen-, Lebenszyklus-, Migrations- und 99-Slave-Regressionen ergänzt; schnelle npm-Veröffentlichung mit unveränderten Schutzprüfungen.

## 1.0.15 - 2026-09-19 (Official Stable)

- Trafo-Master verteilt sichere Haus-NVP-Korridore bedarfsabhängig; freie Reserven, Stränge, Phasen und Import/Export werden berücksichtigt.
- Wahlweise 250-ms-Austausch; unveränderte Vorgaben behalten ihre Befehlsnummer für verlässliche Wirkungsbestätigungen.
- Optionales Zählerarchiv mit lokalem Offlinepuffer, dauerhafter Master-Bestätigung, Nachlieferung, Zählerqualität und Abrechnungsentwürfen mit Originalnachweis.
- Betreiberübersicht und Gesamtfreigabe für Installer/Admin; neue Rollen-, Ausfall- und 99-Slave-Prüfungen.
- Bestehende Veröffentlichungsprüfungen und beschleunigte Syntaxprüfung bleiben aktiv.

## 1.0.14 - 2026-09-18

Official Stable

- Add a pinned EOS master and up to 99 slaves with independently timed Tailscale HTTP channels, individual HMAC pairing, monotonic leases and conservative reserved budgets.
- Enforce local import/phase/category limits and generic PV/storage final-write caps; provide a protected installer/admin setup and live connection view.
- Require commissioning and independent device fallback; keep unsupported storage interfaces and active topology changes gated.
- Speed up publish syntax checks without removing release, secret, manifest or runtime gates. Update German code explanations and regression coverage.


## 1.0.13 - 2026-09-18

Official Stable

- Restrict SmartHome configuration, datapoint discovery and NexoLogic editing to Installer/Admin, including direct HTML/static paths, stale customer sessions and disabled customer authentication.
- Preserve customer operation of configured devices and provide a separate read-only room/floor/page layout endpoint. Hide setup links until a strict role check succeeds.
- Bundle the existing NexoWatt logo as a build asset so the mail setup header works under the runtime mount and Admin tab.
- Advance the PWA cache, update German source explanations and add HTTP/browser regressions for the revised role contract and decoded logo.
- Retain the protected publish and ZIP-overlay checks from 1.0.12.

## 1.0.12 - 2026-09-18

Official Stable

- Add automatic dependency-free preparation before publish: scan the full working tree, validate the current Admin artifact, back up unused old entry bundles outside the repository and remove only those obsolete files.
- Preserve indirect/declared chunks, current assets, source files, settings and Git index. Real credentials and changed current artifacts still block publishing.
- Distinguish obsolete build files from credential findings in diagnostics; keep publish:check read-only and retain all existing publish gates.
- Add overlay-update and failure regressions, repair the outdated static lifecycle test and require validation of fresh and upgraded repositories.
- Preserve all product logic and German source documentation from 1.0.11.

## 1.0.11 - 2026-09-18

Official Stable

- Add German module explanations to 223 original TS/TSX files and detailed flow comments to 68 central functions/methods.
- Add a source guide and generated function/import catalog; correct outdated source-of-truth and customer SmartHome documentation.
- Require ongoing documentation upkeep in repository/contribution rules and validate source/catalog synchronization in full-repository release checks and regression tests.
- Preserve product behavior; changes to product sources are comments only.

## 1.0.10 - 2026-09-18

Official Stable

- Review reported historical SMTP frontend bundle: no hardcoded SMTP password; sender/login defaults and password input metadata can resemble credentials to a scanner. Incident closure still requires matching GitGuardian's exact finding.
- Load the initial SMTP login from the protected server instead of embedding a login default in the frontend; retain the public sender address.
- Generate test passwords/system secrets afresh per run; retain encryption, TLS and notification timing regression coverage.
- Add dependency-free repository, staged-index and publish guards for supported SMTP secret patterns, private keys, installation data and obsolete admin entry bundles. Findings never print matched values.
- Add a real pre-commit hook, activated explicitly with npm run githooks:install. No Git history rewrite, account change or external SMTP probe.
- Preserve AC/DC regulation, Home/Pro storage limits, Admin-only SMTP/license access and customer SmartHome settings.

## 1.0.9 - 2026-09-17

Official Stable

- SMTP configuration and license management are restricted to Admin on the server and in the UI, including stale Installer sessions and direct links.
- Restore customer SmartHome setup entry points from SmartHome and Settings; customer configuration, save and datapoint discovery remain available.
- Supply Installer App-Center feature limits through a dedicated endpoint without license keys or system UUID.
- Collect all Markdown files under docs, update documentation links, package paths and release checks.
- Preserve Home storage farm limit 2 / Pro 10, AC/DC control and notification delivery intervals.

## 1.0.8 - 2026-09-17

Official Stable: Speicherfarm in Home bis 2 Speichersysteme, in Pro bis 10. Zentrale Lizenzmatrix, Konfigurations-/Importprüfung und Regelungsgrenze einschließlich Neutralisierung zusätzlicher Sollwerte beim Lizenzwechsel. Bestehende Zuordnungen und Messwerte bleiben erhalten; die Oberfläche zeigt Überschreitungen an. Regressionen für Pool/Gruppen, Signed/Split, Lizenzwechsel, FEMS und App-Center. Die bisherigen 50-kW-Leistungsgrenzen von Home, AC/DC-Regelung und Benachrichtigungsintervalle bleiben bestehen.

## 1.0.7 - 2026-09-17

Official Stable: direkter SMTP-Versand von info@nexowatt.com, geschützt konfigurierbar ohne E-Mail-Adapter. Harte Anlagenfehler sofort bei Erkennung, normale Fehler gesammelt alle 30 Minuten, übrige Meldungen täglich. Dauerhafter Wiederholschutz, Eskalationen, TLS-Pflicht, geschützte Zugangsdaten und lokale SMTP-Regressionen. Bestehende AC/DC-Regelungsgrenzen bleiben erhalten.

## 1.0.6 - 2026-09-15

### Official Stable – AC/DC electrical limits

- Require explicit valid per-connector current or power minimum/maximum bounds; incomplete configurations remain at a safe zero with a diagnostic reason.
- Carry DC minimum power through AppCenter, persistence, engine and the productive TS write plan. Min+PV retains the configured grid base.
- Separate DC-output current (fresh measured output voltage) from AC-input current; remove the implicit 230 V DC-current fallback.
- Use configured network phases in the final DC phase guard and preserve current/step/power bounds at the writer.
- Convert alias setpoints using the alias write unit, avoiding a second W/kW conversion.
- Add focused AC/DC runtime, current-domain, phase-guard and alias regression checks. Hardware commissioning remains project-specific and must precede activation.

## 1.0.5 - 2026-09-12
**Official Stable Patch – preserve EV storage protection across telemetry gaps**

- Separate customer protection intent from actual vehicle watts. Unknown or stale telemetry no longer silently releases storage discharge into a protected vehicle.
- When the protected EV load is unknown, pause storage discharge conservatively while permitting charging from physical total surplus. Resume the existing house-only balance automatically after fresh telemetry.
- Publish an atomic, bounded policy snapshot; retain protection intent (not old watts) through incomplete ticks, expired snapshots and adapter restarts. Fresh deliberate changes to assist or pure PV remain authoritative.
- Keep fresh standby/idle load, Auto/Boost/Min+PV choices, pure PV mode, PV priority, phase minimums/switching, tariff decisions and hardware writer implementations unchanged.
- In the E3/DC RSCP telemetry-failure stop, select the existing IDLE mode for that command only instead of releasing to native NORMAL; keep the configured default unchanged.
- Add unit and real charging/storage tick regressions, including the 2-kW house plus 4.5-kW vehicle failure case and recovery. No new production dependencies or polling timer.
- Retain the 1.0.1 memory/SSE, 1.0.2 heartbeat, 1.0.3 Home AppCenter and 1.0.4 Auto-PV/phase corrections. Hardware commissioning is not replaced by software tests.

## 1.0.4 - 2026-09-11
**Official Stable – Auto PV priority and phase-aware start reservations**

- Attribute only the physical PV share of approved Auto charging targets to the customer PV priority; retain explicit grid/tariff/goal permissions and all existing hard limits.
- Include fresh Auto consumption in signed-NVP PV reconstruction; do not double-count commanded power or synthesize PV from grid import.
- Release unused PV to storage when PV-driven Auto cannot meet its actual phase/current/power minimum, is switching phases, or is settling. Never reserve a partial impossible start.
- Preserve all per-wallbox phase thresholds, vendor write values, hysteresis/cooldown state and settling time through the runtime-to-TypeScript bridge.
- Keep a zero target during phase settling. A separate switching cooldown does not block charging after settling.
- Require the configured three-phase current minimum before upshifting; use the total Auto budget rather than already-consumed residual capacity.
- Add unit/pipeline and real-tick/executor regression coverage. Physical device commissioning remains required; no live wallbox test is claimed.
- Retain 1.0.1 memory/SSE, 1.0.2 heartbeat and 1.0.3 Home AppCenter fixes. No new production dependencies.

## 1.0.3 - 2026-09-09

- **Official Stable Patch:** Behebt die sofortige erneute Sperre des geschützten AppCenters nach erfolgreicher Admin-Anmeldung mit aktiver EOS-Home-Lizenz.
- Ursache war eine Vermischung von Authentifizierungsfehlern und fachlichen API-Antworten: Der globale Fetch-Handler deutete jeden HTTP-Status 401 oder 403 als verlorene Anmeldung. Erwartbare Pro-Lizenzsperren wie `eos_required` konnten deshalb den bereits autorisierten Home-Admin erneut auf den Login-Sperrbildschirm setzen.
- Die Login-Sperre richtet sich jetzt ausschließlich nach dem anschließend bestätigten Auth-Status und der für die aktuelle Seite erforderlichen Capability. Bleiben Admin-Session und `appcenter.open` gültig, wird eine fachliche 403-Antwort unverändert an die aufrufende Komponente zurückgegeben, ohne Overlay oder Seitenverriegelung.
- Ein echter Sessionverlust, ein nicht erreichbarer Auth-Status oder eine fehlende Seiten-Capability sperrt weiterhin fail-closed. Der Schutz wurde nicht abgeschwächt.
- Alte Pro-Konfigurationen werden in der an die Home-Oberfläche gelieferten Kopie über die bestehende Lizenznormalisierung deaktiviert. Netzbetreiber-, Mesh-/Microgrid- und Betriebsstrategien-Komponenten werden unter Home nicht initialisiert; insbesondere wird `/api/netoperator/drivers` nicht mehr angefordert.
- Die Netzbetreiber-Komponente besitzt zusätzlich einen eigenen Editions-Guard vor dem Laden des Pro-Treiberverzeichnisses. Damit bleibt der AppCenter selbst bei versehentlichem Direktaufruf robust.
- Neuer Chromium-Regressionsverbund reproduziert den Feldfehler mit gültigem Home-Admin, gespeicherten Pro-Flags und `403 eos_required`, prüft den dauerhaft offenen AppCenter sowie den weiterhin wirksamen Sperrfall bei echtem `401` und bestätigtem Sessionverlust.
- PWA-Cache auf `nexowatt-cache-v503` angehoben, damit die korrigierten Auth- und AppCenter-Skripte nach dem Update zuverlässig geladen werden.
- EMS-, NVP-, Lade-, Speicher-, Netzlimit-, Nulleinspeise-, §14a-, Tarif-, Export-Guard-, Parkregler- und Hardware-Regelung bleiben unverändert.

## 1.0.2 - 2026-09-09

- **Official Stable Patch:** NexoWatt EOS 1.0.2 korrigiert die weiterhin auftretende zyklische „Offline / Veraltet“-Anzeige der EOS-Übersicht. Ursache war ein zweiter, vom RC88-/SSE-Thema unabhängiger Timing-Konflikt: EOS Admin bewertet Liveness nach ungefähr 20 Sekunden, während `info.connection` bisher nur alle 30 Sekunden bestätigt wurde und ein vollständiger EMS-/Diagnosezyklus legitimerweise länger als 20 Sekunden laufen konnte.
- `info.connection` wird jetzt alle vier Sekunden aus dem tatsächlichen HTTP-Serverzustand bestätigt. Solange Web/API wirklich lauschen, bleibt der Adapter frisch; bei gestopptem Prozess oder nicht lauschendem Server endet beziehungsweise negiert der Heartbeat und der echte Offlinefall bleibt zuverlässig erkennbar.
- Der EMS-Kern veröffentlicht einen unabhängigen Vier-Sekunden-Scheduler-Heartbeat. Dieser läuft getrennt vom vollständigen Regelzyklus und zeigt, ob der Schedulerprozess lebt, auch wenn ein Modul noch innerhalb seines zulässigen Watchdogfensters arbeitet.
- Der EOS-Admin-Diagnosepublisher besitzt einen eigenen Vier-Sekunden-Liveness-Timer, der nicht vom Lock des vollständigen Diagnosezyklus blockiert wird. `updatedAt`, Publisher-Heartbeat und die kompatible `summaryJson`-Liveness werden rechtzeitig erneuert, ohne im Normalbetrieb die vollständige Snapshot-Last zu verdoppeln.
- Adapter-Erreichbarkeit, Scheduler-Liveness, Regelzyklus und Diagnoseaktualisierung sind nun getrennte Zustände. Nur `info.connection=false` beziehungsweise vollständig ausbleibende Liveness führt zu „offline“. Ein 25 Sekunden laufender Regelzyklus bei frischem Scheduler bleibt online; ein Zyklus über dem 30-Sekunden-Watchdog wird als `tick-stalled` und „Adapter online – EMS-Regelzyklus überschreitet Zeitlimit“ gewarnt.
- Aktivitätszeitstempel werden nach dem neuesten gültigen Wert ausgewählt, statt den ersten befüllten State zu verwenden. Ein älterer Tick-Start kann dadurch neuere Scheduler-, Tick-Ende-, Budget- oder Lademanagement-Aktivität nicht mehr überdecken.
- Ein neuer Stable-1.0.2-Regressionsverbund reproduziert den Feldfall `vor 23 s / letzter Regeltick vor 25 s / Zyklus 2608 ms`, prüft den 35-Sekunden-Stall, veralteten Scheduler, echtes `info.connection=false`, unabhängige Timer und deren Shutdown.
- Die Speicher-/SSE-Korrektur aus 1.0.1 bleibt vollständig erhalten. Keine Änderung an NVP-, Lade-, Speicher-, Netzlimit-/Nulleinspeise-, Export-Guard-, §14a-, Tarif-, EZA-/Parkregler- oder Hardware-Regelung.

## 1.0.1 - 2026-09-09

- **Official Stable Patch:** NexoWatt EOS 1.0.1 korrigiert ausschließlich die Speicherdiagnose und den SSE-Livekanal, die auf laufenden Anlagen zu kurzzeitigen falschen „Offline / Veraltet“-Anzeigen führen konnten.
- Ein Heap-Wachstum von mindestens 128 MiB innerhalb des Diagnosefensters ist weiterhin sichtbar, löst bei niedriger absoluter Heap-Auslastung aber keine Warnung und keine Druckentlastung mehr aus. Maßgeblich sind jetzt ausschließlich die realen Heap-Schwellen von 65 % für Warnung, 75 % für selektive Entlastung, 86 % für die anhaltende Restart-Schwelle und 92 % für die Notbremse.
- Der im Feld beobachtete Zustand `233 MiB / 2096 MiB`, `11,1 % Heap` und `+141 MiB in zehn Minuten` wird ausdrücklich als normaler Warm-up-/Cache-Aufbau klassifiziert: schnelle Zunahme ja, Speicherdruck nein, keine SSE-Trennung.
- Normale Speicherdruckbehandlung trennt nur noch tatsächlich backpressure-blockierte oder stark gepufferte SSE-Clients. Ein üblicher Socketpuffer von 32 KiB und ein frisch verbundener Client mit einem initialen Snapshot bis 1 MiB bleiben verbunden und können regulär über `drain` weiterlaufen.
- Normale Druckentlastung setzt keine globale EventSource-Reconnect-Sperre mehr. Bei einer wirklich kritischen Speichersituation bleibt die Schutzabschaltung aktiv; deren Reconnect-Sperre ist auf höchstens zehn Sekunden begrenzt und liegt damit unter dem 20-Sekunden-Frischefenster der EOS-Übersicht.
- Die betrieblichen Logpräfixe heißen nun `[memory-guard]` und `[sse-guard]` statt `[RC88 heap]` beziehungsweise `[RC88 SSE]`. RC-Bezeichnungen bleiben nur in historischen Dokumenten, Tests und internen Kompatibilitätsmarkern erhalten.
- Die Regressionstests prüfen den konkreten Feldfall, gesunde SSE-Puffer, Initialsnapshot-Grace, sofortige Wiederverbindung nach normaler Entlastung, die kritische Zehn-Sekunden-Grenze sowie weiterhin eine Million verworfene Backpressure-Updates ohne ungebundenes Heap-Wachstum.
- Keine Änderung an EMS-Regelalgorithmen oder Hardware-Writer: NVP, Lade- und Lastmanagement, Speicherregelung, Netzlimit/Nulleinspeisung, Export Guard, §14a, Tarife und EZA-/Parkregler-Priorität bleiben unverändert gegenüber 1.0.0.

## 1.0.0 - 2026-09-06

- **Official Stable:** NexoWatt EOS 1.0.0 ist der erste offiziell für Verkauf und produktiven Betrieb freigegebene Stable-Stand.
- Die Stable-Version übernimmt den abschließend validierten RC93-Funktionsstand unverändert. Bei der Promotion wurden ausschließlich Versions-, Release-, Dokumentations- und sichtbare Stable-Kennzeichnungen angepasst; die produktive EMS-Regellogik blieb unverändert.
- Die Netzlimit-App begrenzt die maximale Nettoeinspeisung am NVP weiterhin auch ohne EZA-/Parkregler. `0 W` steht für echte Nulleinspeisung; positive Werte bilden eine feste maximale Einspeiseleistung in Watt ab.
- Ein zertifizierter EZA-/Parkregler wird nur bei vollständig aktivierter App und Schnittstelle, bestätigter Inbetriebnahme, gesetzten Installateurfreigaben, aktivem Export Guard und gültiger Wirkleistungsvorgabe zur bevorzugten Führungsquelle. Andernfalls regelt EOS selbst.
- Der vorhandene `GridConstraints Export Guard` bleibt der einzige produktive Asset-Writer. Die Netzbetreiber-Schnittstelle stellt ausschließlich einen validierten Operations-Envelope bereit und schreibt nicht direkt auf Wechselrichter, Speicher, Ladepunkte oder Verbraucher.
- Die wirksame Einspeisegrenze bleibt der strengere Wert aus lokaler Sicherheitsobergrenze und gültiger externer Vorgabe. Externe Werte können die lokale Grenze niemals erhöhen.
- `allowedExportPowerW`, `fallbackExportPowerW`, `lastUpdate`, `validUntil`, `source`, `quality`, `commandId`, Fail-Safe und begrenzte Haltezeit bleiben der standardisierte Vertrag. Fehlende oder ungültige Werte werden nie versehentlich als `0 W` behandelt.
- Die Senkenpriorität bleibt: reale lokale Verbraucher, freigegebene Ladepunkte, freigegebene flexible Verbraucher, zulässige Speicherladung, optional Mesh/Microgrid und erst anschließend Wechselrichter-Abregelung.
- Führungsquelle, konfigurierte, externe und wirksame Grenze, Gültigkeit, Qualität und Rückfallgrund werden diagnostisch veröffentlicht; die Entscheidungshistorie bleibt SHA-256-hashverkettet und beim Wiederanlauf verifiziert.
- Der Stable-Release-Gate prüft nun zusätzlich Versionsgleichlauf, Stable-Kennzeichnungen, Release-Dokumentation, PWA-Cache-Bump und das Fehlen sichtbarer Candidate-Texte.
- Die Software-Freigabe ersetzt keine projektspezifische Inbetriebnahme oder Zertifizierung. Parkregler- und reale Einspeisebegrenzung sind je Kundenanlage im Diagnosemodus zu prüfen und anschließend kontrolliert zu aktivieren.

## 0.8.217 - 2026-08-29

- RC92 korrigiert ausschließlich die mobile Bedienung der Historienseite; sämtliche EMS-, NVP-, Lade-, Speicher-, Tarif-, §14a- und Hardwareentscheidungen bleiben gegenüber RC91 unverändert.
- Hauptchart und Preis-Chart verwenden `touch-action: pan-y pinch-zoom`, KPI-Karten `touch-action: auto`. Vertikale Wischbewegungen gehören dadurch wieder dem Browser und blockieren das Seitenscrollen nicht mehr.
- Die Gestenerkennung unterscheidet belastbar zwischen kurzem Tap, vertikalem Scrollen und einer klar horizontalen Tages-Zoomgeste. `preventDefault()` wird ausschließlich beim bestätigten horizontalen Tages-Zoom aufgerufen.
- Ein Smartphone-Tap nutzt denselben zentralen Auswertungspfad wie der Desktop-Klick: Tag zeigt Leistung in kW, Woche/Monat/Jahr zeigen Energie des ausgewählten Balkens in kWh.
- Das Wertefenster ist viewportfest, für Safe-Area und schmale Displays begrenzt und bei vielen optionalen Verbraucher-/Erzeugerzeilen intern scrollbar. Damit bleibt es auch nach dem Herunterscrollen vollständig sichtbar.
- Preis-Chart-Taps sind ebenfalls von Scrollgesten getrennt; synthetische Folge-Klicks werden unterdrückt, damit Wertefenster nicht doppelt geöffnet oder sofort wieder geschlossen werden.
- Canvas-Resize und wiederholte Renderanforderungen werden pro Animationsframe gebündelt. Browserleisten- und Orientierungsänderungen erzeugen nicht mehr mehrere unnötige Vollzeichnungen hintereinander.
- Ein neuer RC92-Browsertest emuliert ein 390-px-Touchgerät und prüft Tageswerte, Wochenenergien, vertikales Scrollen, Tooltip-Viewportgrenzen sowie den weiterhin funktionierenden horizontalen Tages-Zoom.

## 0.8.216 - 2026-08-27

- RC91 prüft die AppCenter- und Backend-Verträge aller produktiven EMS-Apps gemeinsam. Der sichtbare Browser-Katalog, die Adapterstart-Normalisierung und der Installer-HTTP-Roundtrip müssen dieselben App-IDs erhalten; absichtlich verborgene Module werden ausdrücklich konserviert.
- `energyLedger` und `meshMicrogrid` gingen in einzelnen Backend-Katalogen bislang verloren. Das Speichern eines anderen AppCenter-Reiters konnte dadurch Installiert-/Aktiv-Zustände stillschweigend zurücksetzen. Beide Apps sind jetzt in Start-, Save-, Backup- und Installer-Verträgen vollständig enthalten.
- `chargeKiosk` bleibt weiterhin ausschließlich im Reiter Ladepunkte konfigurierbar, wird aber als verborgener AppCenter-Zustand durch Start, Save und Backup erhalten. Es erscheint keine doppelte Apps-Karte.
- Verschachtelte Modulschalter (`energyLedger.enabled`, `chargeKiosk.enabled`, `meshMicrogrid.enabled`), Legacy-Flags und `emsApps` werden gemeinsam synchronisiert. UI, API und Modulmanager können dadurch nach einem Fremdtab-Save nicht mehr widersprüchliche Aktivzustände führen.
- Die kanonische `main.ts`-Runtime bleibt strikt JavaScript-kompatibel. Eine TypeScript-only Assertion, die beim Regenerieren wortwörtlich in `main.js` übernommen worden wäre und den Adapterstart verhindert hätte, wurde entfernt und durch einen dokumentierten textstabilen Vertrag abgesichert.
- Veraltete Releaseprüfungen für die dauerhaft aktive Netzschutz-App und den seit RC88 watchdog-isolierten Ladepunkt-Executor wurden auf die aktuellen semantischen Sicherheitsverträge angehoben. Die produktive Netz-, Lade- und Safety-Regelung wurde dabei nicht verändert.
- Ein neuer RC91-Cross-App-Test prüft Katalogparität, versteckte App-Erhaltung, Save-/Backup-Allowlisten, verschachtelte Aktivschalter und die Syntax der tatsächlich ausgelieferten `main.js`.
- Der lokale Home-Lizenzfallback des Modulmanagers wird jetzt automatisch gegen die zentrale `HOME_APP_IDS`-Matrix geprüft und enthält auch Netzschutz, Energy Ledger und NL-P1. Damit kann ein seltener Ladefehler des Feature-Services keine eigentlich freigegebene Home-App unbemerkt sperren.
- Die Prüfung umfasste zusätzlich Speicherregelung und Speicherfarm, MultiUse, Heizstab/Thermik, BHKW/Generator/Relais, Peak-Shaving, §14a, Netzbetreiber-Schnittstelle, Tarife, PV-Prognose, Energie-Wertkonto/Herkunft, Mesh/Microgrid, SmartHome/NexoLogic, OCPP/EVCS sowie RC78 bis RC90. Es wurden keine neuen fachlichen Sollwert- oder Hardwareentscheidungen eingeführt.

## 0.8.215 - 2026-08-27

- RC89 trennt in der EOS-Admin-Diagnose Adapter-Erreichbarkeit, EMS-Regeltick-Aktualität und den rein lesenden Diagnose-Publisher. Ein verzögerter Diagnose-Snapshot kann dadurch nicht mehr fälschlich den vollständigen NexoWatt-UI-Adapter als „Offline / veraltet“ darstellen.
- `info.adminOverview.updatedAt` wird als leichter Kompatibilitäts-Heartbeat bereits am Beginn jedes Diagnosezyklus aktualisiert. Bestehende EOS-Admin-Versionen erhalten damit weiterhin ungefähr alle fünf Sekunden ein Lebenszeichen, bevor umfangreichere Diagnoseabfragen stattfinden.
- Sämtliche State-Lese-, State-Schreib- und Objektoperationen des Admin-Overview-Publishers besitzen feste Timeouts und begrenzte Parallelität. Eine hängende Diagnoseoperation wird je Kennung quarantänisiert und nicht in jedem Zyklus erneut parallel gestartet.
- Neue read-only Gesundheitsstates zeigen `adapterOnline`, `emsTickFresh`, `emsTickAgeMs`, Publisher-Heartbeat, letzten vollständigen Erfolg, Zyklusdauer, Timeouts, offene Operationen und letzten Diagnosefehler getrennt an.
- Bei aktueller Adapterverbindung, aber veraltetem Regeltick lautet der Zustand „Adapter online – EMS-Regelschleife verzögert“. Nur `info.connection=false` wird als tatsächlicher Adapter-Offlinezustand gewertet.
- Nicht offensichtliche Timeout-, Fallback-, Kompatibilitäts- und Gesundheitslogik ist in der kanonischen TypeScript-Quelle ausführlich kommentiert. Der Kommentarstandard wurde um Sicherheitsinvarianten, Vorzeichenverträge und die Synchronisierung generierter Runtimes ergänzt.
- RC89 verändert keine NVP-, Lade-, Speicher-, Tarif-, §14a-, PV-, Export-, 0-Einspeise- oder Safety-Entscheidung. Die SSE-/Heap-Härtung aus RC88 bleibt unverändert erhalten.

## 0.8.213 - 2026-08-26

- RC88 schließt die bei der Analyse des nach mehreren Stunden auftretenden V8-Heap-Out-of-Memory-Absturzes identifizierten unbegrenzten Speicherhaltepfade im LIVE- und Watchdog-Lifecycle. Server-Sent-Events berücksichtigen jetzt HTTP-Backpressure, begrenzen pro Verbindung den Schreibpuffer und schließen halb offene beziehungsweise nicht mehr lesende Browser-/VPN-Verbindungen nach einer festen Frist.
- SSE-Updates werden während Backpressure nicht weiter in Node.js gepuffert. Nach `drain` erhält der Client genau einen aktuellen Vollsnapshot; veraltete Zwischenupdates werden verworfen. Clientanzahl, Listener, Heartbeat und Framegröße sind begrenzt und beim Adapter-Unload vollständig bereinigt.
- Interne und öffentliche SSE-Payloads werden pro Batch nur einmal serialisiert. Ohne verbundenes Dashboard entsteht keine dauerhafte 120-ms-SSE-Timer-/Allokationskette.
- Watchdog-Timeouts entfernen eine noch laufende Original-Promise nicht mehr nach einer festen Zeit. Solange ein Geräte- oder Modulaufruf wirklich offen ist, bleibt genau dieses Label quarantänisiert und es wird kein weiterer paralleler Altaufruf erzeugt. Ein optionales `AbortSignal` wird beim Timeout ausgelöst.
- Heap-Telemetrie reagiert früh: Warnung und Druckentlastung beginnen deutlich vor der V8-Grenze. Zuerst werden gepufferte SSE-Verbindungen getrennt, ohne die EMS-Regelung zu verändern. Erst bei anhaltend kritischem Heap erfolgt als letzte Notbremse ein kontrollierter ioBroker-Neustart statt `SIGABRT`.
- Speicherdiagnose zeigt begrenzte SSE-, Socket-, Cache- und Watchdog-Zähler, damit ein erneuter Anstieg eindeutig einer Quelle zugeordnet werden kann. Lade-, Speicher-, NVP-, Tarif-, §14a-, Forecast- und Safety-Regelungen aus RC87 bleiben fachlich unverändert.

## 0.8.212 - 2026-08-26

- RC87: Read-only EMS/Lademanagement-Diagnose trennt dauerhaft aktive NVP-Überwachung von einer tatsächlich bindenden Leistungsbegrenzung.
- `no-charge-demand`, `no-vehicle`, `pv-surplus` und `grid-monitor` werden nicht mehr als aktive globale Begrenzung oder gelber Warnstatus dargestellt.
- Unterhalb von Soft- und Hardlimit bleibt die Übersicht grün und meldet „NVP-Bezug überwacht – keine aktive Begrenzung“.
- Gelb wird erst bei aktivem Import-Softlimit bzw. tatsächlicher Reduktion; das Hardlimit wird als eigener harter Zustand angezeigt.
- Einspeisung erzeugt nur bei aktiviertem, überschrittenem und im Aktivbetrieb befindlichem Export-Limit eine Begrenzungsmeldung; im Diagnosemodus wird eine Überschreitung ausdrücklich nur als Diagnosehinweis ausgewiesen.
- Semantische Ereignis-Deduplizierung verhindert wiederholte Meldungen allein durch kleine Speicher-Istwertänderungen.
- Keine Änderung an NVP-Regelung, Leistungszuteilung, Safety-Writer, Speicher- oder Ladepunktsteuerung.

## 0.8.211 - 2026-08-25

- RC86 korrigiert Gate A des Lademanagements: Die zugeordnete Netzanschlussleistung bleibt die absolute, reine NVP-Bezugsgrenze. Das 90-%-Soft-Limit ist nur noch der Beginn einer progressiven Rampenbegrenzung und keine starre EVCS-Leistungsobergrenze.
- Die EVCS-Freigabe verwendet den signierten kanonischen NVP-Snapshot des zentralen EMS. Netzbezug ist positiv, Einspeisung negativ; PV-Erzeugung und bestätigte Speicherentladung erhöhen damit automatisch die lokal mögliche Ladeleistung, ohne die zulässige NVP-Bezugsleistung zu erhöhen oder doppelt gezählt zu werden.
- Gate A meldet `GRID-IMPORT-LIMIT` nur noch, wenn eine reale Ladeanforderung tatsächlich durch das Netz-Gate reduziert wurde. Bei 0 W Anforderung bleibt der Netzschutz im Zustand „überwacht – kein Eingriff“, Binding = NEIN und die globale Safety-Stufe NORMAL.
- Ein offline gegangener Ladepunkt wird lokal isoliert. Ohne Fahrzeug und bei bestätigten 0 W beträgt seine Reserve 0 W; bei Ausfall während einer Ladung wird die letzte plausible Leistung beziehungsweise eine konservative Mindestleistung reserviert. Andere Ladepunkte dürfen mit dem verbleibenden sicheren NVP-Budget weiterladen.
- Gate A, zentrales EMS-Budget, Diagnose und finaler Safety-Writer verwenden denselben NVP- und Hard-Limit-Vertrag. Zusätzliche Diagnosewerte zeigen NVP-Quelle, Hard-Headroom, Soft-Rampenfaktor, Offline-Reserve, EVCS-Anforderung, zulässige Leistung und tatsächlich reduzierte Leistung.
- Der Auto-Modus ist gegen Preis-/Tarifwechsel, kurze PV-/Budgetschwankungen und Neuverteilungen entprellt. Wirtschaftliche Änderungen werden gehalten und gerampt; nur echte Safety-Gründe wie NVP-Hard-Limit, §14a, Not-Aus, Phasen-/Leitungsschutz oder ein ungültiger zentraler NVP greifen sofort hart ein.
- EMS-Module und Ladepunkt-Schreibzugriffe sind durch zeitlich begrenzte, deduplizierte Watchdogs isoliert. Ein hängender Gerätezugriff kann nicht mehr unbegrenzt den gesamten Regeltick blockieren; ein veralteter Tick-Lock wird automatisch wiederhergestellt.
- Langfristig gehaltene Diagnose-, Fehler-, Timeout- und Entscheidungsstrukturen sind begrenzt. Eine gedrosselte Heap-Überwachung dient nur als letzte Notbremse vor einem erneuten V8-Heap-Out-of-Memory-Absturz.
- Speicher-Netzladen bleibt ausschließlich bei aktivem, frischem und günstigem dynamischen Tarif erlaubt. Die RC83-Objektinitialisierung für `gridConstraints.exportLimit.sinkFieldProtocolJson` und alle Prognose-, 0-Einspeise- und Netzschutzkorrekturen bleiben erhalten.
- Neuer RC86-Regressionsverbund prüft den 40/36/4-kW-Vertrag, signierten NVP-Headroom, progressive Soft-Zone, demand-basiertes Binding, Offline-Isolation, kanonische NVP-Nutzung, Watchdog-/Auto-Härtung und die unveränderte finale Hard-Safety.
- Optionale Phasen- und §14a-Caps werden nur ausgewertet, wenn wirklich ein Wert vorhanden ist. Ein nicht gesetztes `null` kann daher nicht mehr über `Number(null) = 0` eine gültige EVCS-Freigabe fälschlich auf 0 W reduzieren.
- Die weiche Entprellung und Rampenführung gilt ausschließlich für den Auto-/Wirtschaftspfad. Explizites Boost, PV, Min+PV und manuelle Vorgaben werden nicht unbemerkt weich gekappt; die finale Hard-Safety bleibt für alle Modi unverändert wirksam. Eine technische Startprobe erhält nach ihrem eigenen Retry-Cooldown keine zusätzliche versteckte Wirtschaftspause.

## 0.8.208 - 2026-08-25

- RC83 erlaubt Speicher-Netzladen ausschließlich bei **aktivem, frischem und günstigem** dynamischem Tarif. `neutral`, `teuer`, `unbekannt`, deaktivierter Tarif oder veraltete Preis-/Freigabedaten sperren Netzladen sofort; die normale Eigenverbrauchsoptimierung übernimmt.
- Ist das variable Netzentgelt aktiviert, bleibt zusätzlich das manuell konfigurierte NT-/Quartalsfenster Pflicht. Ein NT-Fenster ohne günstigen dynamischen Tarif reicht nicht mehr aus.
- TarifVis erzeugt außerhalb der vollständigen Freigabe keinen eigenen Lade- oder Entladesollwert. Die normale Eigenverbrauchsregelung übernimmt; jeder verbleibende negative Sollwert wird unmittelbar vor dem Writer physikalisch auf den lokal nachweisbaren PV-Überschuss begrenzt.
- Die Speicherregelung verwendet keinen persistierten Einzel-Boolean mehr als Freigabe-Fallback. Stattdessen wird ein frischer, in sich konsistenter Tarif-Snapshot fail-closed geprüft; Sperren wirken sofort, Freigaben bleiben stabilisiert.
- Unmittelbar vor dem Hardware-Writer werden Tarif-, Reserve- und Lastspitzen-Nachladequellen erneut gegatet. Die Quellauflösung berücksichtigt Herstellerprofile und die 0-W-Firewall, sodass ein gehaltener alter Netzladebefehl beim Tarifwechsel tatsächlich auf 0 W beendet wird.
- Für Hersteller-/Hold-/Eigenverbrauchspfade ergänzt RC83 eine zweite PV-only-Sicherheitsgrenze aus signiertem NVP und Batterie-Istleistung. Bei träger Hybrid-Telemetrie darf ausschließlich ein bereits vom NVP-Regler validierter, frischer und zeitlich plausibler PV-/Last-Feed-forward die lokale Überschussobergrenze ergänzen; ohne gültigen NVP gilt fail-closed 0 W.
- Eine zweite physikalische Schutzebene begrenzt Hersteller-, Hold- und Rampen-Ladepfade außerhalb günstig auf realen lokalen PV-Überschuss. Ein vom NVP-Regler bereits validierter PV-/Last-Feed-forward bleibt als sichere Eigenverbrauchsquelle zulässig, damit verzögerte Batterie-Telemetrie bei Sungrow/Hybrid keinen unnötigen 0-W-Stopp auslöst.
- `gridConstraints.exportLimit.sinkFieldProtocolJson` wird jetzt in der Modulinitialisierung als String-/JSON-State angelegt, bevor der schnelle 0-Einspeise-Pfad ihn beschreibt. Damit endet die alle wenigen Sekunden wiederholte ioBroker-Warnung `has no existing object` nach dem Adapterneustart.
- RC83 ergänzt einen eigenen Regressionstest für Tarifmatrix, stale Snapshot, finale Writer-Sperre, gehaltene Sollwerte, physikalische PV-only-Begrenzung, validierten Hybrid-Feed-forward und Objektinitialisierung.

## 0.8.207 - 2026-08-25

- RC82 macht **Netzlimits** zum dauerhaft aktiven Kernschutz. Im AppCenter gibt es für diese Funktion keinen Installiert-/Aktiv-Schalter mehr; stattdessen wird der Status „Netzschutz dauerhaft aktiv · nicht abschaltbar“ angezeigt.
- Ein altes `enableGridConstraints=false`, ein importiertes Backup oder ein früher gespeicherter App-Zustand kann den NVP-/Anschlussschutz nicht mehr deaktivieren. Backend-Normalisierung, Modulmanager, Grid-Modul und finaler NVP-/PV-Koordinator verwenden denselben permanenten Vertrag.
- Der Netzschutz bleibt auch bei abgelaufener, noch nicht aktivierter oder vorübergehend nicht lesbarer Lizenz aktiv. Die Lizenzierung betrifft Komfort- und Funktionsmodule, nicht die physische Schutzfunktion des Netzanschlusspunktes.
- Netzlimits ist Bestandteil von **Home und Pro**. Die zentrale Quelle bleibt unverändert **Zuordnung → Allgemein**: Netzanschlussleistung = Hard-Limit 100 %, automatisch berechnetes Soft-Limit 90 %, Reserve exakt 10 %; der dort zugeordnete NVP bleibt signiert.
- Die 0-Einspeisung bleibt bewusst separat und standardmäßig ausgeschaltet. Nur diese Betriebsart, RLM sowie weitere optionale Netzbetreiber-/PV-Funktionen werden innerhalb von Netzlimits konfiguriert; der Import-Schutz selbst läuft immer.
- Peak-Shaving-RLM und Speicher-0-Einspeisung hängen nicht mehr am entfernten Legacy-Aktivierungsflag. Hysterese, Wiederfreigabeverzögerung, RLM nur absenkend und die finale Hard-Safety vor jedem Hardware-Write bleiben erhalten.
- Der wiederkehrende Logeintrag `[core-limits-ts-shadow] JS/TS budget mismatch: total.effectiveW` ist behoben. Der alte Teil-Shadow bleibt als interne Diagnose im State erhalten, wird aber vom bereits produktiven vollständigen `core-runtime-v2`-Vergleich überlagert und erzeugt keine minütlichen Warnungen mehr. Unerwartete neue Shadow-Signaturen werden höchstens einmal pro Adapterlauf gemeldet.
- Service-Worker-Cache auf `nexowatt-cache-v488` erhöht. Neuer RC82-Regressionsverbund prüft Home-/Pro-Freigabe, Pflicht-App-Normalisierung, Legacy-Flag-Ignorierung, UI-Sperre, optional bleibende 0-Einspeisung, NVP-Koordinator und finalen Safety-Writer.

## 0.8.206 - 2026-08-24

- RC81 macht **Zuordnung → Allgemein** zur einzigen statischen Quelle für Netzanschlussleistung und signierte NVP-Messung.
- Hard-Limit = 100 % der zugeordneten Netzanschlussleistung; Soft-Limit = 90 %; Reserve = exakt 10 %.
- Das editierbare Hard-Limit und der optionale NVP-Fallback-Datenpunkt wurden aus **Netzlimits** entfernt. Die Seite zeigt die abgeleiteten Werte nur noch lesend an.
- Alte `gridConstraints.importHardLimitW`, `gridImportHardLimitW`, `gridPowerId` sowie der Legacy-Fallback über `peakShaving.maxPowerW` werden neutralisiert und von der Runtime ignoriert.
- RLM darf eine vorhandene zentrale Anschlussgrenze nur absenken; ohne Netzanschlussleistung erzeugt RLM kein verborgenes Ersatz-Hard-Limit.
- Die 0-Einspeisung bleibt unter Netzlimits und verwendet denselben zentralen signierten NVP aus der Zuordnung.
- Neue Runtime-Diagnose veröffentlicht Quelle und Basis-Netzanschlussleistung; Service-Worker-Cache auf `nexowatt-cache-v487` erhöht.
- Neuer RC81-Regressionsverbund prüft Feldstandard 30/27/3 kW, signed-NVP-Headroom, Legacy-Ignorierung, RLM-Absenkung, fehlende Basis und die AppCenter-Single-Source-Oberfläche.

## 0.8.205 - 2026-08-24

- RC80 setzt das Import-Soft-Limit verbindlich auf 90 % der wirksamen NVP-/Hard-Vorgabe; die Reserve beträgt immer exakt 10 %.
- Die bisherige Mindestreserve von 1 kW und Maximalreserve von 3 kW ist vollständig entfernt. Beispiele: 5 kW Hard → 4,5 kW Soft; 30 kW Hard → 27 kW Soft; 100 kW Hard → 90 kW Soft.
- Manuelle beziehungsweise ältere Werte für `importSoftLimitW`, `importSoftReserveW` und `importSoftLimitEnabled` beeinflussen die Regelung nicht mehr. Damit kann die feste 10-%-Vorgabe nicht versehentlich übersteuert oder deaktiviert werden.
- AppCenter → Netzlimits zeigt den automatisch berechneten Soft-Wert und die 10-%-Reserve nur noch lesend. Die Eingabefelder für explizites Soft-Limit und Reserve wurden entfernt; Hysterese und Wiederfreigabe-Verzögerung bleiben einstellbar.
- Eine dynamisch strengere RLM-/Netzbetreibergrenze wird zuerst zum wirksamen Hard-Limit; daraus werden anschließend erneut exakt 10 % Reserve und 90 % Soft-Limit berechnet.
- Neuer RC80-Regressionsverbund prüft kleine, normale und große Anschlussleistungen, ignorierte Legacy-Overrides, AppCenter-Felder, Runtime-Modus, signed-NVP-Headroom und die unveränderte Hard-Safety.

## 0.8.204 - 2026-08-24

- RC79 ergänzt eine zweistufige Netzbezugsbegrenzung. Der NVP bleibt signiert: Netzbezug ist positiv, Einspeisung negativ. Das Hard-Limit ist die absolute Anschluss-/Safety-Grenze; das Soft-Limit bildet mit expliziter oder automatischer Reserve den vorausschauenden Planungswert für flexible Lasten.
- Die automatische Soft-Reserve beträgt 10 % der Hard-Grenze, mindestens 1 kW und höchstens 3 kW. Hysterese und verzögerte Wiederfreigabe verhindern Flattern; Diagnose zeigt Soft-/Hard-Limit, Headroom, Stufe, Grund und erforderliche Reduktion.
- Zentrales EMS-Budget und Lademanagement planen gegen das Soft-Limit. Der finale Safety-Envelope vor jedem Hardware-Write prüft weiterhin ausschließlich das Hard-Limit, sodass wirtschaftliche oder komfortorientierte Logiken die Anschlussgrenze nicht übersteuern können.
- Die Einstellung für 0-Einspeisung befindet sich verbindlich im AppCenter unter **Netzlimits**. EVU-Relais-/PV-Stufen bleiben getrennt im Bereich EVU/PV.
- Bei aktivierter 0-Einspeisung folgt die PV-Vorgabe dynamisch der realen lokalen Aufnahme: aktueller Verbrauch, bestätigte Speicherladung und bereits akzeptierte flexible Laständerungen werden zuerst genutzt; nur der verbleibende Überschuss wird an den PV-Wechselrichtern abgeregelt.
- Die Feed-forward-Berechnung verwendet `PV-Soll = PV-Ist + projizierter NVP − NVP-Ziel`. Lastanstieg beziehungsweise zusätzliche Speicheraufnahme gibt PV schnell frei; sinkende Aufnahme reduziert die PV-Vorgabe kontrolliert.
- Gleichzeitige PV-Abregelung und Speicherentladung wird als Regelkonflikt erkannt. EOS hebt die PV-Begrenzung dann unmittelbar auf, damit keine PV-Energie vernichtet wird, während der Speicher dieselbe Last versorgt.
- Cold-Start-Warnungen für `thermal.summary.*` und `threshold.rules.*` sind behoben. Deaktivierte Aktormodule legen ihre Objektstruktur vor dem Safe-Stop an; für den variablen Threshold-Ausgang existiert zusätzlich ein stabiler `mixed`-Diagnosestate.
- Neuer RC79-Regressionsverbund prüft signed-NVP-Headroom, automatische Reserve, Soft-/Hard-Stufen, Hysterese, 0-Einspeise-Feed-forward, Speicher-Konfliktschutz, AppCenter-Platzierung, Cold-Start-Objekte sowie die Trennung von Soft-Planung und Hard-Safety.

## 0.8.203 - 2026-08-24

- RC78 korrigiert die Netzanschluss-Budgetierung auf eine reine Bezugsgrenze. Der NVP bleibt durchgehend signiert: Netzbezug ist positiv, Netzeinspeisung negativ und erhöht die nutzbare Lastfreigabe.
- Das zentrale EMS-Gesamtzielbudget verwendet jetzt `aktuelle geregelte Istlast + Bezugsgrenze − signierter NVP`. Reservierungen und Sollwerte werden nicht als Istleistung zurückaddiert, sondern anschließend geordnet vom Budget abgezogen.
- Der Feldfall mit 30,0 kW Bezugsgrenze und 10,1 kW Einspeisung liefert damit 40,1 kW Gesamtbudget und nach 11,0 kW EVCS- sowie 9,3 kW Speicherreservierung korrekt 19,8 kW Restbudget.
- Das direkte EVCS-Netzcap und die finale Safety-Prüfung unmittelbar vor dem Hardware-Write verwenden denselben Import-only-Vertrag. Parallel geplante Verbraucher können den gemeinsamen Headroom nicht doppelt nutzen.
- Bereits überschrittener Netzbezug wird weiterhin aktiv abgebaut: Bei 32 kW Bezug, 30 kW Grenze und 10 kW laufender geregelter Last sinkt das zulässige Gesamtziel auf 8 kW.
- Fremd gesteuerte Speicherladung wird nur dann als EOS-Istlast zurückaddiert, wenn der EOS-Speicherwriter tatsächlich autorisiert ist. Stations-, Geräte-, Phasen-, §14a-, Parkregler- und Single-Writer-Grenzen bleiben übergeordnet.
- Diagnose und UI benennen das EVCS-Gate jetzt eindeutig als `NVP / Importgrenze`. Ein eigener RC78-Regressionsverbund prüft Core-Budget, Reservierungsfolge, EVCS-Gate, Überbezugsabbau und den finalen Safety-Writer.

## 0.8.202 - 2026-08-24

- RC77 behebt die eigentliche Ursache der im Kundenfrontend dauerhaft fehlenden PV-Prognosewerte: `forecast.openMeteoPv.*` und `forecast.pv.*` werden vor dem ersten Providerabruf abonniert, beim Adapterstart aus ioBroker in den internen UI-`stateCache` eingelesen und anschließend über `/api/state` sowie SSE zuverlässig veröffentlicht.
- `keyFromId()` ordnet lokale Forecast-States jetzt dem öffentlichen `forecast.*`-Namespace zu. Erfolgreiche Provider- und EMS-Writes werden zusätzlich direkt in den UI-Cache gespiegelt, sodass Abrufzeit, Abrufmodus, Standort, Punkte, Kurve und 6-/12-/24-Stunden-Ertrag ohne verzögertes Folgeereignis sichtbar werden.
- Unveränderte persistierte Forecast-Werte werden nach einem Adapterneustart nicht unnötig erneut geschrieben, füllen den neu aufgebauten UI-Cache aber dennoch sofort.
- Eine höchstens zwei Stunden alte, weiterhin in die Zukunft reichende letzte erfolgreiche Open-Meteo-Kurve wird beim Start wiederhergestellt. Bei einem kurzfristigen Provider-/DNS-/Netzfehler bleibt sie als `stale-error` nutzbar; vergangene Segmente werden entfernt und Energie-/Peakwerte neu berechnet. Abgelaufene oder vollständig vergangene Kurven werden sicher verworfen.
- Forecast-Statewrite-Fehler werden gesammelt und auf höchstens eine Warnung pro Minute gedrosselt, statt still verschluckt oder als Log-Spam ausgegeben zu werden.
- Änderungen an Quelle, Aktivierung, Standort, Intervall oder PV-Flächen lösen unmittelbar einen neuen Forecastabruf aus. Service-Worker und `forecast-settings.js` verwenden einen neuen RC77-Cachestand, damit alte Browserdateien die korrigierte Anzeige nicht überdecken.
- Neuer dynamischer RC77-Regressionsverbund prüft Provider-Erfolg und -Fehler, direkte Cache-Spiegelung, Neustart-Fallback, Ablaufgrenzen, Quellalias-/Boolean-Kompatibilität, effektive EMS-Übernahme, lokale/fremde ioBroker-Subscriptions, `keyFromId()`, Browser-Cache und generierte Runtime-Synchronität.

## 0.8.201 - 2026-08-23

- RC76 stabilisiert die Open-Meteo-PV-Prognose mit einer dreistufigen Abrufkette: 15-Minuten-GTI, stündliche GTI und anschließend lokale PV-Berechnung aus GHI/DNI/DHI. Temporäre Transportfehler werden einmal wiederholt.
- Eine vollständige Prognosekurve mit 0 W gilt jetzt als gültige Nacht-/Nullertragsprognose und nicht mehr als fehlende Datenquelle.
- Letzte gültige Prognosen bleiben bei einem temporären Providerfehler nutzbar und werden mit `stale-error`, letztem Versuch, letztem Erfolg und Abrufmodus eindeutig diagnostiziert.
- Der Standortname entspricht vorrangig dem bereits aufgelösten Wetter-App-Standort; EOS-Admin-/Systemstandort und Koordinaten bleiben Fallbacks.
- Die PV-Flächenansicht reagiert jetzt auf die tatsächliche Containerbreite. Bei schmaler Fläche wird jede PV-Fläche als Karte dargestellt; WR-Grenze und Löschschaltfläche können nicht mehr überlappen. Bei nur einer PV-Fläche wird die Löschschaltfläche vollständig ausgeblendet.
- Kundenstatus zeigt Abrufmodus, letzten Abrufversuch, letzte erfolgreiche Prognose sowie konkrete Open-Meteo- oder AppCenter-Fallbackfehler.
- Neuer RC76-Regressionsverbund prüft GTI-Fallbacks, GHI/DNI/DHI-Berechnung, Nullertragskurven, Stale-Fallback, Standortname und reale Chromium-Layouts.

## 0.8.200 - 2026-08-22

- RC75 übernimmt den PV-Prognosestandort zentral aus EOS Admin beziehungsweise `system.config`. Sind dort nur Ort oder Postleitzahl vorhanden, werden Koordinaten über die Open-Meteo-Geocoding-API aufgelöst; alte manuelle Forecast-Koordinaten bleiben nur als Migrationsfallback erhalten.
- PV-Anlagendaten bleiben im Endkundenbereich jederzeit sichtbar und editierbar – auch während verzögerter Settings-Hydrierung oder bei ausgewählter AppCenter-Quelle. Der Kunde verwaltet mehrere PV-Flächen weiterhin über Tabelle und Plus-Schaltfläche, ohne JSON-Eingabe.
- Open-Meteo wird erst dann als aktive Prognose angezeigt, wenn eine zukünftige Kurve mit positiven Leistungspunkten vorhanden ist. Ein leerer oder nur formal gültiger Provider-Snapshot meldet jetzt verständlich „Prognose noch ohne Werte“.
- Forecast-Diagnose um letzten Abrufversuch, letzten erfolgreichen Abruf, positive Prognosepunkte, aktuelle Prognoseleistung, Standortquelle, Standorttext, Koordinaten und Fehlergrund erweitert. Die Kundenanzeige liest bei aktiver Open-Meteo-Quelle direkt den aktuellen Provider-Snapshot und wartet nicht auf einen späteren EMS-Zyklus.
- Browser-Cache für `forecast-settings.js` versioniert. Sichtbarkeit, PV-Flächentabelle und Status werden nach asynchroner State-Hydrierung gemeinsam nachgezogen.
- Open-Meteo und AppCenter werden unverändert auf den zentralen `forecast.pv`-/`adapter._pvForecast`-Vertrag normalisiert. Auto-/Zeit-Ziel-, Budget-, Speicher-/Speicherfarm-, Thermik-, Betriebsstrategien- und Admin-Diagnoselogiken nutzen denselben Vertrag; reale Messwerte und alle Netz-, Stations-, Phasen-, §14a-, Parkregler-, RFID-, Safety- und Single-Writer-Grenzen bleiben übergeordnet.
- Neuer RC75-Regressionsverbund prüft EOS-Admin-Standort, Geocoding, mehrere Dachflächen, direkte GTI-Abfragen, sichtbare Tabelle vor/nach Settings-Hydrierung, valide Energie-/Punktwerte und zentrale EMS-Verknüpfung.

## 0.8.199 - 2026-08-22

- RC74 behebt die dauerhaft stehenbleibende PV-Prognoseanzeige „Wird geladen …“. Das kundenseitige Statusmodul wird jetzt ausschließlich unter `/static/forecast-settings.js` geladen und zeigt Open-Meteo- oder AppCenter-Werte einschließlich Fehlergrund an.
- Open-Meteo-PV-Prognose startet direkt nach dem Adapterstart und wird nach Änderungen an Quelle, Aktivierung, Standort, Intervall oder PV-Flächen sofort neu berechnet; das eingestellte Intervall gilt erst für die folgenden zyklischen Abrufe.
- Standortauflösung erweitert: manuelle Koordinaten, Systemkoordinaten sowie Ort/Postleitzahl aus `system.config` mit Open-Meteo-Geocoding-Fallback und zeitlich begrenztem Cache.
- Endkunden-Experten-JSON vollständig durch einen responsiven PV-Flächeneditor ersetzt. Über `+ PV-Fläche hinzufügen` können mehrere Dachflächen mit Name, kWp, Neigung, Himmelsrichtung, Verlusten und optionaler Wechselrichtergrenze gepflegt werden.
- Ausrichtung wird als Nord, Nordost, Ost, Südost, Süd, Südwest, West oder Nordwest gewählt; der bestehende `settings.pvForecastArrays`-Datenvertrag und die Einzelanlagen-Kompatibilitätsstates bleiben intern erhalten.
- Open-Meteo veröffentlicht zusätzliche Diagnosewerte für Quelle, verwendeten Standort, Aktualisierungszeit, Fehler und Prognosepunkte. Der AppCenter-Datenpunkt-Fallback bleibt unverändert nutzbar.
- Keine neue Hardware-Schreibstrecke: Prognosen bleiben rein lesende Optimierungsdaten; Netz-, Stations-, Phasen-, §14a-, Safety- und Single-Writer-Grenzen bleiben unverändert.

## 0.8.198 - 2026-08-22

- RC73 ergänzt unter `info.adminOverview.*` einen versionierten read-only EMS-Diagnosevertrag für die neue Live-Kachel des NexoWatt EOS Admin.
- Zentrales Budget, aktive Bindung, Ladepunkte, Speicher/Speicherfarm, §14a einschließlich Kommunikationsfallback, Tarif, PV-Prognose, Peak-Shaving und Safety werden in einem kompakten Snapshot zusammengeführt.
- Maximal acht relevante Ereignisse werden für das Cockpit bereitgestellt; der bestehende Ringpuffer bleibt auf 60 verdichtete Einträge begrenzt.
- Veröffentlichung erfolgt nur bei Änderung oder spätestens alle fünf Sekunden. Fehlende optionale Module werden ausgeblendet und blockieren weder Diagnose noch EMS.
- Der neue Vertrag besitzt keine Hardware-, Modbus-, OCPP-, Speicher- oder Setpoint-Schreiboperation und verändert keinen bestehenden Regler oder Single-Writer-Pfad.
- Neue RC73-Regressionsprüfung deckt Normalbetrieb, wartende/ladende Ladepunkte, Speicherfarm, Budgets, Tarif/PV-Prognose, §14a-Fallback, Safety und Ereignisgrenzen ab.

## 0.8.197 - 2026-08-22

- RC72 verankert die Wetter-/PV-Prognose fest im sichtbaren Kundenbereich **Einstellungen → Wetter-App**. Alle Werte werden über den normalen `settings.*`-/`/api/set`-Vertrag gespeichert; die fehleranfällige dynamische Einfügung ist entfallen.
- Prognosequellen `Automatisch`, `Open-Meteo`, `AppCenter-Datenpunkte` und `Deaktiviert` ergänzt. Die vorhandenen AppCenter-Zuordnungen `pvForecastTodayJson` und `pvForecastTomorrowJson` bleiben als eigenständige Quelle und als optionaler Fallback erhalten.
- Open-Meteo-PV-Prognose aus Anlagenleistung, Neigung, Azimut, direkter/diffuser/globaler Strahlung, Temperatur, Verlusten, Wechselrichtercap und Planungssicherheit integriert. Mehrere PV-Flächen werden unterstützt.
- Vorausschauender Auto-/Zeit-Ziel-Planer mit exakter Zielzeit und 15-Minuten-Slots ergänzt: PV zuerst, anschließend günstige Preisfenster, danach späteste sichere Restslots. Ohne Prognose gilt ein konservativer Latest-Start-Fallback.
- Zeit-Ziel aus erzeugt keinerlei Fahrzeug-Zukunftsplanung. Fehlende Tarif-, PV-, Speicher- oder Betriebsstrategiemodule blockieren Auto nicht.
- Betriebsstrategien bleiben MUSS/SOLL/KANN-Intents innerhalb der zentralen Auto-Arbitrierung. MUSS bleibt bindend; SOLL/KANN dürfen nur bei echter Deadline-Gefährdung zurückstehen.
- Mehrladepunktplanung berücksichtigt gemeinsame Standort- und Stationscaps. Der Planer ist read-only; der bestehende Single Writer und alle Netz-, Stations-, Phasen-, §14a-, RFID- und Safety-Grenzen bleiben unverändert übergeordnet.
- Release-Manifest und Publish-Gate um einen deterministischen RC72-Vertrag für Einstellungen, Browseranzeige, Open-Meteo/AppCenter-Fallback, Auto-/Zeit-Ziel, Multi-LP und optionale Module erweitert.

## 0.8.195 - 2026-08-21

- RC70 korrigiert die kompakte Ladepunktanzeige im LIVE-Dashboard: Angezeigt wird jetzt immer der vom Kunden gewählte Modus (`Auto`, `Boost`, `Min+PV` oder `PV`) und nicht mehr der interne Auto-Untermodus. Dadurch erscheint ein Ladepunkt im Auto-Modus nicht fälschlich als `PV`.
- Der wirksame Auto-Untermodus bleibt für die Begründung erhalten. Ein Auto-Ladepunkt kann deshalb weiterhin korrekt „Wartet auf PV-Überschuss“ melden, während die Modusanzeige eindeutig `Auto` bleibt.
- Der Link „Details“ wird nur noch angezeigt, wenn mindestens zwei aktive Ladepunkte vorhanden sind. Bei genau einem aktiven Ladepunkt wird der Link ausgeblendet, aus der Tastaturnavigation entfernt und besitzt kein Ziel mehr.
- Deaktivierte oder alte Runtime-Ladepunkte beeinflussen die Sichtbarkeit des Details-Links nicht. Die Änderung ist vollständig lesend und verändert keine Lade-, Tarif-, §14a-, Speicher-, Betriebsstrategien-, Safety- oder Hardware-Writer-Logik.
- Ein neuer Chromium-Regressionstest prüft Einzel- und Mehrladepunktdarstellung sowie die Trennung von Benutzer- und Auto-Untermodus.

## 0.8.194 - 2026-08-21

- RC69 ergänzt im LIVE-Dashboard unter Systemstatus eine kompakte Ladepunktdiagnose. Für jeden aktiven Ladepunkt wird unmittelbar sichtbar, ob er lädt, begrenzt lädt, wartet oder gestoppt wurde und welcher Regelgrund wirksam ist.
- Kundenverständliche Gründe für EOS Safety, §14a-Kommunikationsfallback, Netzanschluss-, Stations-, Phasen- und Peak-Shaving-Limits, PV-/Min+PV-Warten, Tarif- und Zeit-Ziel-Warten, Betriebsstrategien, RFID, Offline-/Fehlerzustände, Mappingprobleme, veraltete Messwerte und unbestätigte Wallboxbefehle ergänzt.
- Die Systemstatuskarte verdichtet Ladepunktfehler und Wartezustände, markiert Warnungen beziehungsweise Fehler visuell und verlinkt direkt zum Lademanagement.
- Aktive Gerätefilterung gehärtet: Audit-Ressourcen werden übernommen; reine Direct-Runtime-Fallbacks erscheinen nur mit ausdrücklichem `cfgEnabled=true`. Gelöschte, deaktivierte und alte Ladepunktdaten werden nicht erneut eingeblendet.
- Ein echter EOS-Safety-Stopp hat in der Anzeige Vorrang vor einem noch vorhandenen positiven Istwert. Der RC68-§14a-Kommunikationsfallback wird dagegen korrekt als begrenzter Warnbetrieb mit wirksamem EVCS-Budget dargestellt.
- Die neue Statusdarstellung ist vollständig lesend, dreisprachig (DE/NL/EN) und verändert keine Lade-, Speicher-, §14a-, Safety-, Arbitrierungs- oder Hardware-Writer-Logik.

## 0.8.193 - 2026-08-21

- RC68 ersetzt den pauschalen 0-W-Safety-Stopp bei fehlendem, ungültigem oder veraltetem §14a-/CLS-/EEBUS-Signal durch einen lokalen Pmin,14a-Kommunikationsfallback. Es erfolgt weder eine unbegrenzte Freigabe noch eine unnötige Vollsperre.
- Direktansteuerung begrenzt jeden steuerbaren Ladepunkt auf höchstens 4,2 kW netzwirksame Leistung. Im EOS-/EMS-Modus bleibt das gemeinsame Pmin,14a-Budget einschließlich Gleichzeitigkeitsfaktor erhalten; ein tatsächlich startbereiter Ladepunkt kann innerhalb dieses Gesamtbudgets bis 4,2 kW erhalten.
- Netzanschluss-, Stations-, Phasen-, Geräte- und Safety-Grenzen bleiben immer stärker. Reicht der lokale Headroom nicht für die technische AC-Mindestleistung, setzt der bestehende Single Writer den Ladepunkt weiterhin sicher auf 0 W.
- Lokale, physikalisch validierte PV-Leistung darf zusätzlich zum §14a-Netzanteil verwendet werden. Alte externe Setpoints werden während des Kommunikationsfallbacks nicht übernommen.
- Die frühere unsichere Stale-Option `release` wird auf `local-pmin` migriert. AppCenter, Runtime und Safety-Envelope veröffentlichen den aktiven Kommunikationsfallback, den Grund und das wirksame EVCS-Budget.
- Neuer RC68-Regressionsverbund prüft fehlende/stale Signale, frische Freigabe, EEBUS-Gateway-Failsafe, Direkt- und EMS-Modus, GZF-Verteilung, Netzanschluss-Headroom, lokale PV-Ergänzung und finalen Wallbox-Write.

## 0.8.192 - 2026-08-20

- RC67: Lizenzaktivierung bleibt auf einem neuen, noch nicht lizenzierten EOS-System erreichbar, ist aber weiterhin strikt über `license.manage` auf Admin/Installer begrenzt.
- Der allgemeine Lizenz-Lock erlaubt nur die Lizenzseite, minimale statische Assets sowie strikte Auth-/Lizenz-Endpunkte; alle anderen EOS-Seiten und APIs bleiben gesperrt.
- Die Sperrseite verweist direkt auf „Lizenz aktivieren“ und erklärt die sofortige Freischaltung korrekt; der falsche Admin-Pfad und der unnötige Neustart-Hinweis wurden entfernt.
- Neuer Regressionstest verhindert künftig sowohl eine blockierte Lizenzaktivierung als auch einen zu breiten `/static/*`- oder `/api/*`-Bypass.

## 0.8.191 - 2026-08-17

- Stations-/Kioskseiten vollständig als modernes NexoWatt-EOS-Vollbildlayout überarbeitet. Das originale EOS-Logo, Stationsmetadaten, kompakte Statuschips, Stationsübersicht, EOS-Entscheidung und strukturierte Warn-/Fehleranzeige sind jetzt in einer gemeinsamen Oberfläche enthalten.
- Mehrladepunktdarstellung responsive gehärtet: Bis zu vier LPs passen im 16:9-Querformat nebeneinander in eine Zeile; fünf bis acht LPs werden automatisch auf maximal zwei verdichtete Reihen verteilt. 1920×1080, 1600×900 und 1366×768 wurden ohne Seiten-Scrollen geprüft.
- LP-Karten zeigen Leistung, Fahrzeugstatus und optionalen SoC, Sessionenergie, Kosten, Preis, Solar-/Netzanteil, Modus, Regelung, Ziel-Laden, Speicheroption, optionale AC-Phasenumschaltung und Schnellaktionen kompakt an.
- Reale Diagnosegründe aus Ladepunkt, Tarif, PV, Ziel-Laden, Speicher, §14a, Netz-/Phasengrenzen, Mapping und Aktorbestätigung werden zu einer verständlichen EOS-Entscheidung und zu Warnungen/Fehlern verdichtet.
- CSV-Schaltfläche aus der Stationsseite entfernt. Die vorhandene CSV-Service-/Adminroute bleibt unverändert verfügbar.
- Steuerungssicherheit unverändert: Die Stationsseite erzeugt ausschließlich Charging-Management-Intents; direkte Hardwarewrites bleiben deaktiviert und der bestehende Single Writer mit allen Netz-, Stations-, §14a- und Safety-Grenzen bleibt alleiniger Ausführer.

## 0.8.190 - 2026-08-16

- Speicher- und EVCS-Netzladefreigabe bei kombiniertem variablem Netzentgelt und Dynamiktarif fail-closed gehärtet: Ein aktives NT-Fenster überstimmt keinen teuren, veralteten oder unbekannten aktiven Stromtarif mehr.
- Ist der Dynamiktarif deaktiviert, darf das manuell konfigurierte NT-/Quartalsfenster weiterhin allein freigeben. Ist er aktiv, sind innerhalb NT frische Zustände `günstig` oder `neutral` erforderlich.
- Bei ausgeschaltetem variablem Netzentgelt bleibt ein frischer günstiger Dynamiktarif die einzige wirtschaftliche Speicher-Netzladefreigabe. AppCenter-, Prioritäts-, Writer-, SoC-, Netz- und Safety-Grenzen bleiben unverändert.
- Das Lademanagement übernimmt NT nicht mehr pauschal als Netzladefreigabe. Teure oder veraltete Tarifdaten sperren den normalen Auto-Netzbezug auch innerhalb NT.
- Zeit-Ziel-Laden im Auto-Modus behält den Latest-Start-/Forecast-Override: Bei ausreichender Restzeit wird gewartet; sobald die Zielerreichung gefährdet ist, darf die wirtschaftliche Sperre übersteuert werden. Harte Netz-, Stations-, Phasen-, §14a-, Parkregler- und Safety-Grenzen werden nie übersteuert.
- Regressionen für NT + teuer, NT + stale, NT ohne Dynamiktarif, günstige/neutral frische NT-Fenster sowie dringende und nicht dringende Zeit-Ziele ergänzt.

## 0.8.189 - 2026-08-16

- Speicher-Netzladefreigabe an die gewünschte Betriebsart angepasst: Bei aktiviertem zeitvariablem Netzentgelt gibt ausschließlich das aktuell aktive, manuell konfigurierte NT-/Quartalsfenster Netzladen frei; ein günstiger dynamischer Preis ist dabei keine zusätzliche Pflichtbedingung.
- Ist das zeitvariable Netzentgelt deaktiviert, darf ein frischer als günstig klassifizierter dynamischer Tarif den Speicher auch ohne NT-Fenster aus dem Netz laden. Neutraler, teurer, fehlender oder veralteter Preis bleibt in diesem Modus gesperrt.
- NT- und Dynamiktarifpfad als alternative, eindeutige Freigabequellen modelliert. AppCenter-Freigabe, Speicherpriorität, Writer, konfigurierte Ladeleistung sowie alle Netz-, SoC- und Safety-Grenzen bleiben in beiden Pfaden zwingend.
- Veraltete Dynamiktarifdaten können ein aktives konfiguriertes NT-Fenster nicht mehr fälschlich aufheben. Außerhalb NT bleibt Netzladen bei eingeschaltetem variablem Netzentgelt auch bei günstigem Preis gesperrt.
- Einfache HT-/NT- und Q1–Q4-Zeitfenster werden weiterhin ausschließlich aus den gespeicherten Einstellungen gelesen; fehlende Zeiten bleiben fail-closed. PV-/NVP-Laden und die RC63-Availability-/RFID-Korrektur bleiben unverändert.
- Regressionen für NT bei neutralem/teurem/veraltetem Tarif, günstigen Tarif bei ausgeschaltetem Netzentgelt, günstigen Tarif außerhalb NT, fehlende Zeitfenster sowie AppCenter-, Prioritäts- und Writer-Sperren ergänzt.

## 0.8.188 - 2026-08-16

- OCPP21-Stationsfreigabe von der Ladeleistungsregelung getrennt: Ladeende, Steckerziehen, PV-/Tarifpause, §14a, Netz-, Stations- und Safety-0-Werte setzen `availability` nicht mehr auf `false`. Eine Sperre darf nur der ausdrückliche Kundenschalter oder die aktive RFID-Whitelist auslösen; vorhandene Inoperative-Verriegelungen werden bei erlaubtem Zugang wieder auf Operative angefordert.
- RFID-Zugangspfad gehärtet: dedizierter Lock-Datenpunkt hat Vorrang, danach wird der direkte Enable-/Availability-Datenpunkt verwendet; `activeId` bleibt nur Legacy-Fallback. Neue Diagnosewerte zeigen RFID-Sperre, Availability-Eigentümer, gewünschte Freigabe und Grund.
- Speicher-Netzladen mit separatem fail-closed Vertrag versehen. Zulässig ist es nur bei AppCenter-Freigabe, aktivem dynamischem Tarif, frischem ausdrücklich günstigem Preis, aktivem manuell gepflegtem NT-/Quartalsfenster, Speicherpriorität und aktivem Speicher-Writer. NT allein, Negativpreise außerhalb NT und fehlende Quartalszeiten können keine Netzladung mehr freigeben.
- Hardcodierte Q1/Q4- und Q2/Q3-Speicherladezeiten entfernt. Im Quartalsmodell gelten ausschließlich die manuell eingestellten Q1–Q4-Zeiten; fehlende Werte bleiben sicher gesperrt.
- Speicherregelung vom EVCS-Netzlade-Gate entkoppelt und unmittelbar vor dem Hardware-Writer um eine zweite Firewall für Tarif-, Reserve- und Refill-Netzladequellen ergänzt. PV-/NVP-Laden bleibt ausdrücklich unberührt.
- Regressionstest für Kundensperre, RFID-Freigabe, OCPP-Operative-Selbstheilung, günstigen Tarif + manuelles NT, NT ohne günstigen Tarif, günstigen Tarif außerhalb NT, Negativpreis außerhalb NT, stale Preis, fehlende Quartalszeiten, AppCenter-Sperre und PV-Ausnahme ergänzt.

## 0.8.187 - 2026-08-15

- Anlagenweiten Cross-App-Stabilitätsaudit durchgeführt. Alle ausführbaren TypeScript-Runtimequellen werden zusätzlich ohne den temporären `@ts-nocheck`-Schutz auf ungelöste Bezeichner geprüft; reale `ReferenceError`-Kandidaten blockieren den Release künftig fail-closed.
- Lademanagement-Diagnose gehärtet: Der TypeScript-Normalquellenpfad übergibt dem finalen Handover-/Removal-Status nun immer einen expliziten Diagnosevertrag. Ein fehlender lokaler Bezeichner kann die Diagnoseveröffentlichung nicht mehr still in einem Catch-Block ausfallen lassen.
- EOS Mesh/Microgrid stabilisiert: Receiver-Allowlist in Command-Receive sowie POST/GET-Feldtest sauber aus der jeweiligen Receiver-Konfiguration geladen, Peer-Ergebnisstruktur vollständig initialisiert, Fehlerklassen erst nach der finalen Klassifizierung gebildet und doppelte Roundtrip-Felder getrennt. Die Limitansicht leitet Grenzwerte ausschließlich aus der aktuellen Zeile ab und verwendet keine fremden Gruppen-/Fairness-Variablen mehr.
- AppCenter-Konfiguration für thermische Geräte und Heizstäbe repariert: Änderungen markieren die Konfiguration zuverlässig als ungespeichert; Laden und Speichern setzen den Status zurück. Die zuvor aufgerufene, aber nicht definierte Dirty-Funktion kann keine Bedienaktion mehr abbrechen.
- SmartHome-Konfiguration und Kundenansicht stabilisiert: Veraltete Typ-/Validator-Helfer auf die aktuellen Funktionen umgestellt, Typ-Icon-Tabelle vervollständigt und debouncten Geräte-Refresh nach Player-, Sender- und Playlistbefehlen ergänzt.
- Release-Prüfungen auf die aktuellen OCPP-Startsemantiken und den produktiven Betriebsstrategien-Vertrag aktualisiert. Veraltete RC53/RC54-Observe-only-Annahmen wurden aus dem aktuellen Publish-Gate entfernt; stattdessen werden Auto-Arbitrierung, Fail-Closed-Vertrag, RC56-Feldtest, kompakte Ressourcenansicht und der neue RC62-Cross-App-Audit geprüft.
- Multi-App-Regressionsmatrix für Speicher/Storagefarm, FENECON/Sungrow/E3DC, Peak-Shaving, Export Guard, Tarife, §14a, Thermik, Heizstab, MultiUse, KI-Berater, Energie-Wertkonto/Ledger, Mesh/Microgrid, Netzbetreiber-Schnittstelle, Energiefluss, AppCenter, SmartHome/NexoLogic und Betriebsstrategien erneut ausgeführt.

## 0.8.186 - 2026-08-15

- Heizstab-PV-Auto um eine standardmäßig aktive, frei konfigurierbare Nachtsperre ergänzt. Im Nachtfenster (Standard 20:00–06:00) setzt das EOS ausschließlich automatisch übernommene Heizstab-Stufen auf 0; Manual 1/2/3, Boost und eine eindeutig erkannte externe KNX-/Relais-Handfreigabe bleiben zulässig. Start und Ende arbeiten mit lokaler Controllerzeit und unterstützen Fenster über Mitternacht.
- Heizstab-Diagnose um Nachtfenster, Sperrstatus, Zeitgrenzen und erforderliche Handfreigabe ergänzt. Die Oberfläche zeigt die Nachtfunktion direkt in der Heizstab-App; Start gleich Ende wird fail-safe als ganztägige Handfreigabe-Pflicht behandelt.
- Gerätespezifische EVCS-Sollwert-Keepalives eingeführt: Alfen 15 s, Modbus/NexoWatt Devices 20 s, generische Treiber 30 s und OCPP21 45 s. Ein expliziter Installerwert bleibt möglich und verhindert insbesondere das Auslaufen externer Alfen-/Modbus-Sollwerte.
- Direkte OCPP21-Aktorbestätigung in das Lademanagement aufgenommen. `control.requestedChargeLimit`, `appliedChargeLimit`, `chargeLimitReason`, `chargeLimitClamped`, `lastSuccess`, `lastError` und `lastCommandAt` werden getrennt diagnostiziert; ein gehaltenes altes Profil kann nicht mehr als bestätigter 0-W-Stopp gelten.
- Safety-Domänen feiner getrennt: Ein fehlgeschlagener positiver EVCS-Start oder eine Leistungserhöhung bleibt ladepunktlokal und verriegelt die Speicherfarm nicht. Nur ein nicht erreichbarer oder nicht bestätigter erforderlicher EVCS-Sicherheitsstopp invalidiert weiterhin das globale Safety-Envelope fail-closed.
- OCPP-0-W-Vertrag für NexoWatt OCPP 0.4.1 vorbereitet: Eine explizite Pause wird anhand des tatsächlich angeforderten und angewendeten Limits bestätigt. Netz-, Stations-, Phasen-, §14a-, Parkregler-, Speicher- und Single-Writer-Grenzen bleiben unverändert übergeordnet.
- Neue Regressionen prüfen Nachtfenster und Handfreigabe, Alfen-/Device-/OCPP-Keepalives, positive Startfehler-Isolierung, erforderliche Stop-Eskalation, OCPP-Befehlsbestätigung sowie die bestehenden Universal-Auto-, Speicherfarm-, Heizstab- und Safety-Pfade.

## 0.8.185 - 2026-08-13

- Universellen Auto-Orchestrator für NexoWatt Devices, NexoWatt OCPP21 und frei/manuell zugeordnete Ladepunkte ergänzt. Alle Protokolle verwenden dieselbe Fahrzeugkontakt-, Startbereitschafts- und Ladebedarfssemantik.
- IEC-61851-/Mode-3-Zustände fachlich getrennt: A/A1/A2 getrennt, B1/B2 verbunden und begrenzt startfähig, C1/D1 mit Fahrzeugbedarf, C2/D2 ladend sowie E/F als harte Fehlerzustände. Damit startet insbesondere eine Alfen-Wallbox über Modbus auch aus B1/B2 zuverlässig, ohne B2 fälschlich als bereits laufende Ladeleistung zu bilanzieren.
- OCPP-Zustände `Preparing`, `Occupied` und `EVConnected` als kontrolliert startfähig, `Charging` und `SuspendedEVSE` als bestätigten Bedarf sowie `SuspendedEV`, `Finishing`, `Faulted` und `Unavailable` als klare Pausen-/Stoppzustände integriert. `transactions.chargingState` wird nativ getrennt vom Stationsstatus übernommen.
- Zeitlich begrenzten Startversuch für Auto, PV und Min+PV eingeführt: technische Mindestleistung nur bei positivem sicherem Budget, 45 s Antwortzeit für generische/Modbus-Wallboxen, mindestens 75 s für OCPP und 60 s Cooldown nach ausbleibender Reaktion. Harte Netz-, Stations-, Phasen-, §14a- und Safety-Grenzen stoppen weiterhin sofort.
- Zeit-Ziel-Laden kann aus einem sicher erkannten, noch nicht ladenden Fahrzeugzustand eine kontrollierte technische Startanforderung erzeugen. Nach bestätigter Fahrzeugreaktion begrenzt die berechnete Ziel-Leistung den Sollwert; günstige Tarife können die Smart-Zielstrategie beschleunigen und teure Zeitfenster warten nur solange die Zielerreichung nicht gefährdet ist.
- NexoWatt-Devices-Zuordnung auf den stabilen `aliases.v1`-Fähigkeitsvertrag erweitert. Mode-3-/EV-Zustände werden vor generischen Statuscodes bevorzugt, Mess- und Stellpfade stammen immer aus genau einer Gerätebasis und bestehende manuelle Installer-Zuordnungen bleiben autoritativ.
- Beobachtungs-Datenpunkte wie `r.charging`, `transactionActive` oder `chargingActive` werden nicht länger als expliziter Ladebedarf interpretiert. Ein anfängliches `false` kann Auto/PV/Min+PV dadurch nicht mehr blockieren.
- Negative Herstellertexte mit dem Wortbestandteil `charging` wie `Not charging`, `Charging paused`, `Charging blocked`, `Charging complete` oder `Charging stopped` werden vor der positiven Ladeerkennung ausgewertet und können keinen unbeabsichtigten Auto-Start auslösen.
- Speicherfarm-, Speicherassistenz-, Stations-, Multi-Ladepunkt-, §14a-, Netz-, Phasen- und Single-Writer-Regressionsgruppen unverändert bestanden. Neue vollständige Regeltick-Tests decken Alfen/Mode 3, OCPP21, generische AC/DC-Wallboxen, Auto, PV, Min+PV, Zeit-Ziel, Tarif, Starttimeout und Cooldown ab.


## 0.8.183 - 2026-08-13

- Kritischen RC58-Laufzeitfehler im Lademanagement behoben: Das Diagnosefeld `ocppDatapointMappingMigrations` wird jetzt ausschließlich aus dem definierten Migrationsarray erzeugt. Ein leerer Satz wird als `[]` ausgegeben; der sicherheitskritische `chargingManagement`-Tick kann nicht mehr durch die nicht definierte Variable abbrechen.
- Speicherfarm-Sicherheitsfreigabe wiederhergestellt: Nach einem erfolgreichen Lademanagement-Tick wird das gemeinsame Safety-Envelope wieder gültig aufgebaut, sodass berechnete Farm-Sollwerte nicht länger wegen des RC58-Tickfehlers auf `farm-stop` beziehungsweise 0 W geklemmt werden. Die fail-closed Schutzkopplung bleibt unverändert aktiv.
- NexoWatt-OCPP21-Adapter ausschließlich über direkte native Datenpunkte unter `ocpp21.<Instanz>.<Station>.*` angebunden. Produktive Mess- und Schreibpfade verwenden keine `alias.0.nexowatt.ocpp.*`- oder `alias.0.ocpp21.*`-Zwischenschicht mehr.
- Native OCPP21-Zuordnung für Leistung, Strom, Energie, SoC, Status, WebSocket-Verbindung, Transaktion, Datenaktualität, letzte Aktivität, RFID, `chargeLimit`, `availability` und Phasenanzahl ergänzt. Bekannte Alias- und ältere OCPP-Pfade dienen nur noch als stationsgebundene Migrationsquelle.
- OCPP21-Zuordnung bei gemischten Ladepunkten gehärtet: Geräte werden nach Stationsidentität und nicht mehr nach Listenposition zugeordnet. Bestehende Modbus-, MQTT- und `nexowatt-devices`-Ladepunkte werden nicht überschrieben; für weitere OCPP21-Stationen wird ein leerer oder neuer Eintrag verwendet.
- Browser-Regressionstest für gemischte Ladepunktlisten sowie vollständigen Laufzeittest für Lademanagement, OCPP21-Nativvertrag, Safety-Recovery und Speicherfarm-Freigabe ergänzt. Bestehende Boost-, Min+PV-, PV-, §14a-, Stations-, Netz- und Single-Writer-Regeln bleiben maßgeblich.

## 0.8.182 - 2026-08-12

- Kompakten Datenpunktvertrag des NexoWatt-OCPP-Adapters 0.4 nativ in Erkennung und Lademanagement aufgenommen. Bevorzugt werden die stabilen öffentlichen Aliase unter `alias.0.nexowatt.ocpp.*`, anschließend der kompakte native Baum `ocpp21.*`; technische Aliase und der ältere `ocpp.*`-Adapter bleiben kompatible Rückfälle.
- Leistung, Strom, Gesamtenergie, Stationsstatus, Transaktionszustand, physische WebSocket-Verbindung, Datenaktualität, letzte Aktivität, Fahrzeug-SoC, RFID, Leistungsvorgabe und optionale Stationsfreigabe auf die neuen `measurements`, `info`, `health`, `transactions` und `control`-Pfade abgebildet.
- Bekannte OCPP-0.3-Zuordnungen wie `meterValues.Power_Active_Import`, `meterValues.SoC`, `evse.*.connector.*.status` und `connector1Status` werden ausschließlich innerhalb derselben eindeutig erkannten Station auf den kompakten Vertrag migriert. Fremde MQTT-/Modbus-Zuordnungen und andere Stationen werden nicht verändert.
- AppCenter-Zuordnung um Fahrzeug-SoC und RFID erweitert. Beim Nachpflegen bestehender Ladepunkte werden leere Felder sowie eindeutig veraltete OCPP-0.3-Pfade ersetzt; bestehende individuelle Zuordnungen bleiben erhalten.
- `dataFreshId`, Transaktionszustand und explizites OCPP-Telemetrieprofil werden nun vollständig vom Installer-Backend bis zum Lademanagement weitergegeben. Neue Diagnosewerte dokumentieren Datenpunktvertrag und Laufzeitmigrationen.
- RC57-Verbindungsstabilität, 75-s-Startantwortzeit, 60-s-Einschwingphase, Boost, Min+PV, PV-Überschuss, Stationsverteilung, §14a, Netz-/Phasengrenzen und Single-Writer bleiben unverändert wirksam.
- Regressionstest für den OCPP-0.4-Native-/Aliasvertrag, sichere 0.3→0.4-Migration, kompakte Connector-ID, Backend-Erkennung, Frontend-Zuordnung und Runtime-Weitergabe ergänzt.

## 0.8.181 - 2026-08-12

- OCPP-Verbindungsbewertung stabilisiert: Für NexoWatt OCPP (`ocpp21.*` sowie stabile Alias-Pfade) verwendet das Lademanagement den physischen WebSocket-Zustand `socketConnected` als Online-Wahrheit. Aktivitäts-, Heartbeat- und Messwert-Freshness bleiben getrennte Diagnose- beziehungsweise Datenqualitätswerte und können einen weiterhin verbundenen Ladepunkt nicht mehr im 25-Sekunden-Takt fälschlich offline melden.
- Bereits zugeordnete volatile OCPP-Onlinepfade wie `info.connection`, `health.online`, `connected` oder irrtümlich als Online verwendetes `dataFresh` werden nur innerhalb derselben eindeutig erkannten Ladestation sicher auf `socketConnected` migriert. Fremde MQTT-/Modbus- oder andere Stationspfade werden nicht umgeschrieben.
- Native NexoWatt-OCPP-, öffentliche NexoWatt-Alias- und technische Kompatibilitätsstrukturen werden automatisch erkannt. Fehlende Begleitzuordnungen für Leistung, Strom, Status, Transaktion, Datenaktualität, Heartbeat und Leistungsvorgabe werden aus dem erkannten Stationsvertrag ergänzt.
- OCPP-Datenaktualität ist separat über `dataFreshId` abbildbar und beeinflusst ausschließlich die Verwendbarkeit der Istleistung, nicht die physische Erreichbarkeit. Neue Diagnosewerte zeigen verwendeten Onlinepfad, automatische Migration, OCPP-Struktur, Datenaktualität und Alter.
- OCPP-spezifische Startlatenz ergänzt: PV-/Min+PV-Startantwortzeit mindestens 75 Sekunden und Einschwingphase mindestens 60 Sekunden. Der globale EOS-Regelzyklus bleibt bei 1 Sekunde, Boost bleibt direkt und alle §14a-, Parkregler-, Netz-, Stations-, Phasen- und Safety-Grenzen bleiben unverändert übergeordnet.
- OCPP-Ereignisreihenfolge gehärtet: Ein frischer Charging-Status mit real positiver Leistung bleibt trotz kurz verzögertem `transactionActive=false` wirksam; Preparing/SuspendedEVSE wird als nicht terminaler Startzustand behandelt, während Finishing, Faulted, Unavailable, Offline und tatsächliches Transaktionsende weiterhin autoritativ 0 W ergeben.
- Den bewährten 45-Sekunden-Sollwert-Keepalive unverändert beibehalten. Es wurde keine künstliche Istleistung, keine Sollwert-zu-Istwert-Brücke und kein zweiter Hardware-Writer eingeführt.
- Regressionstests für OCPP-Native/Alias-Erkennung, stationsgebundene Online-Migration, Ereignisreihenfolge, 75-/60-Sekunden-Zeitfenster, 45-Sekunden-Keepalive sowie bestehende Boost-, Min+PV-, PV-, Stations-, §14a- und Single-Writer-Pfade ergänzt.

## 0.8.180 - 2026-08-12

- Die App „Betriebsstrategien“ zeigt nur noch native EOS-Ressourcen an, deren zugehörige App und Fachregelung aktiv sind, deren einzelnes Gerät ausdrücklich aktiviert ist und für die eine sinnvolle Mess- oder Stellzuordnung existiert. Leere Thermik-, Heizstab-, Ladepunkt- und Energiefluss-Platzhalter werden ausgeblendet.
- Ressourcen-, Profil- und Regelkarten kompakt und standardmäßig eingeklappt dargestellt; Detailzuordnungen, Strategierolle, Priorität, Inbetriebnahme und Rückfallverhalten bleiben gezielt aufklappbar.
- Einen schreibfreien Strategy-Planner vor den vorhandenen Fachmodulen registriert. Er erzeugt ausschließlich kurzlebige, ressourcenbezogene Anforderungen und besitzt keinen eigenen Hardware-Writer.
- Ladepunkte können nur bei Benutzerbetriebsart Auto, Auto-Quelle „EOS Betriebsstrategie“, ausdrücklicher Ressourcenteilnahme und bestätigter Inbetriebnahme beeinflusst werden. Manuell, Boost, PV-Überschuss, Min+PV und Zeit-Ziel bleiben unverändert; bei abgelaufener oder ungültiger Anforderung greift der konfigurierte Rückfall auf Standard-Auto oder Pause.
- Speicherstrategien erhöhen ausschließlich die vorhandene SoC-Untergrenze beziehungsweise Nachtreserve; sie senken keine Schutzgrenze und erzwingen keine direkte Netzladung.
- Thermische Geräte und Heizstäbe werden ausschließlich im vorhandenen PV-Auto-Modus beeinflusst. Mindestlauf-/Stillstandszeiten, Temperatur-, Alarm-, Aktualitäts-, §14a-, Netz- und Gerätebegrenzungen bleiben übergeordnet; die Strategie kann vorhandene Freigaben nur begrenzen oder sicher freigeben.
- Benutzerdefinierte Ressourcen mit frei eingetragenen Schreibdatenpunkten bleiben für diesen Feldtest im Beobachtungsbetrieb. Produktive Befehle laufen nur über bereits vorhandene und geprüfte EOS-Fachmodule nach dem Single-Writer-Prinzip.
- Fail-closed-Tests für Modus-, Freigabe-, Messwertalter-, TTL-, Fallback- und Konfliktfälle sowie Filterung inaktiver Geräte ergänzt.

## 0.8.179 - 2026-08-12

- Fail-closed Steuervertrag für `Auto → EOS Betriebsstrategie` vorbereitet. Eine Ressource darf nur nach ausdrücklicher Teilnahme, passendem Auto-Modus und bestätigter Inbetriebnahme berücksichtigt werden.
- Beobachtungs-, Inbetriebnahme- und Aktiv-Stufe sowie einen sicheren Rückfall auf die bestehende Standard-Automatik definiert.
- Strategieanforderungen mit Ablaufzeit vorbereitet, damit nach Ausfall oder fehlender Aktualisierung kein alter Sollwert dauerhaft gültig bleibt.
- Deterministische MUSS-/SOLL-/KANN-Arbitrierung und Begrenzung auf den zulässigen Planungsrahmen ergänzt.
- Das vorhandene Lademanagement, §14a, Parkregler, Stationsgrenzen, Sicherungslogik und die bestehenden Geräte-Writer bleiben übergeordnet beziehungsweise allein ausführend.
- Kein direkter OCPP-, Modbus- oder Hardware-Schreibpfad wurde aus der Betriebsstrategien-App freigegeben.

## 0.8.178 - 2026-08-11

- Die EOS-Pro-App „Betriebsstrategien“ um einen modularen Regelbaukasten mit MUSS-/SOLL-/KANN-Klassen, Prioritäten, Profilbezug, Zeitplänen, Prüffenstern und Wochentagen erweitert.
- Frei kombinierbare Bedingungen für System-, Wetter-, Tarif- und Ressourcenwerte ergänzt. Fehlende Zielgeräte oder Messwerte werden sichtbar blockiert und nicht mit stillen Ersatzzuordnungen weiterverarbeitet.
- Thermische Sicherheitsparameter für maximale Abschaltdauer, Mindestlauf-/Stillstandszeit, Temperaturgrenzen, Hysterese, Aktualität, Online-Status und Alarm ergänzt. Sicherheitsentscheidungen werden im Trockenlauf vor normalen Zielen priorisiert.
- SoC-, Energie-, Schalt- und Leistungsziele einschließlich Zielzeit, verbleibender Energie, Wirkungsgrad sowie minimaler/maximaler Geräteleistung vorbereitet. Die Nachtenergie-Reserve wird als eigenes SOLL-Ziel bis zum Nachtbeginn simuliert.
- Editierbare Kundenkaskade für Fahrzeug 70 % bis 12:00 Uhr, Kühlhaus-Nachtpause, Speicher 80 %, optionale Fahrzeugladung bis 100 % und Heizstab-Überschussnutzung ergänzt.
- Vollständig schreibfreien Trockenlauf mit manuellen Testwerten, Konfliktauflösung pro Ressource, ausgewählter Anforderung, zurückgestellten Regeln und nachvollziehbaren Entscheidungsgründen ergänzt.
- Vorhandene EOS-Ressourcen nehmen weiterhin nur nach ausdrücklicher Freigabe teil. Backend und Frontend erzwingen `simulationOnly`, `hardwareWrites = 0`, deaktivierte Steuerübernahme und deaktivierte Hardwareausführung; produktive Lade-, Speicher-, Heizstab-, Thermik-, §14a-, Parkregler- und Safety-Pfade bleiben unangetastet.

## 0.8.177 - 2026-08-11

- Neue installierbare und aktivierbare EOS-Pro-App „Betriebsstrategien“ im AppCenter ergänzt. Nach Installation steht ein eigener Reiter für Ressourcen, Datenpunktzuordnungen und Saisonprofile zur Verfügung.
- Vorhandene Einzel-/Farm-Speicher, Ladepunkte, Energiefluss-Verbraucher, Thermik-Geräte und Heizstäbe werden aus ihren bestehenden EOS-Zuordnungen übernommen; es wird kein zweiter konkurrierender Geräteschreiber angelegt.
- Benutzerdefinierte Ressourcen können hinzugefügt, gelöscht und mit Lese-, vorbereiteten Stell- sowie Rückmeldedatenpunkten verknüpft werden. Schreibpfade werden ausschließlich gespeichert und bleiben technisch gesperrt.
- Winter-/Sommerprofile mit 40 % beziehungsweise 60 % SoC-Ziel zum Nachtbeginn und separat einstellbarer absoluter Speicheruntergrenze vorbereitet. Die Nachtenergie darf während der Nacht den allgemeinen Verbrauch decken; RC53 führt die Reserve noch nicht aus.
- Verbindlicher Ladepunktvertrag hinterlegt: Eine spätere Teilnahme ist ausschließlich über „Auto → Betriebsstrategie“ und explizite Freigabe möglich. Manuell, Boost, PV-Überschuss, Min+PV, Zeit-Ziel, Stationsverteilung und das bestehende Lademanagement bleiben unverändert zuständig.
- Frontend und Backend erzwingen fail-closed den Beobachtungsmodus, deaktivierte Steuerübernahme, deaktivierte Hardwareausführung, gesperrte Ressourcen-Schreibpfade, leere Regeldefinitionen und Standard-Auto als vorgesehenen Rückfall. Produktive Lade-, Speicher-, Heizstab-, Thermik-, §14a-, Netzanschluss- und Safety-Regelungen wurden nicht angebunden oder verändert.

## 0.8.176 - 2026-08-11

- AppCenter/Ladepunkte um eine read-only Live-Diagnose für das Lademanagement erweitert. Global werden aktiver Limiter, Sicherungsstufe, Budget, EVCS-Istleistung, NexoWatt-Gesamtsoll, Reserve, Restbudget, Netz-/Phasen-/§14a-Gates und Stage-A-Status angezeigt.
- Pro Ladepunkt sind Istleistung, ursprüngliche Leistungsanforderung, finaler NexoWatt-Sollwert in W/A, reservierte Leistung, PV-/Speicheranteil, Stationsrest, Entscheidungsgrund, Safety-Bindung, Sollwert-Datenpunkt und Hardware-Write-Status nachvollziehbar.
- Bedeutungsbasierter Ringpuffer mit maximal 240 Ereignissen ergänzt. Kleine Messwertschwankungen erzeugen keine Logflut; bei aktiver Regelung wird höchstens einmal pro Minute ein Heartbeat-Snapshot protokolliert.
- Filter nach Ladepunkt und Problemstatus sowie JSON-/CSV-Export ergänzt. Das Löschen des Ereignislogs ist Installer/Admin-geschützt und verändert weder Live-Snapshot noch Sollwerte, Reservierungen oder Hardwareausgänge.
- Diagnosevertrag, API und UI sind ausschließlich lesend in Bezug auf die Anlagensteuerung. Bestehende Lade-, OCPP-, §14a-, Netzanschluss-, Speicher-, FENECON- und Safety-Entscheidungen bleiben fachlich unverändert.

## 0.8.175 - 2026-08-11

- OCPP-Telemetrieprofil für den verwendeten OCPP-Adapter automatisch anhand von `ocpp.<Instanz>.<ChargePoint>.<Connector>.*` erkannt. Connectorstatus, Transaktionszustand, Stationsverbindung und Adapter-Lebenszeichen werden ohne zusätzliche manuelle Zuordnung abgeleitet.
- Rohleistung und für das EMS wirksame Istleistung getrennt. Ein alter positiver `MeterValues`-Wert bleibt als Diagnose sichtbar, wird bei `StopTransaction`, `Finishing`, `Available`, `Faulted`, `Unavailable` oder Verbindungsverlust aber sofort als 0 W wirksam.
- Unveränderte OCPP-Leistungswerte bleiben während einer bestätigten aktiven Transaktion ereignisbasiert gültig. Der letzte EOS-Sollwert wird im OCPP-Pfad niemals als gemessene Istleistung verwendet.
- Ladeerkennung, PV-/Stationsreservierung, Speicher-Schutzlast und Bilanzierung verwenden die normalisierte Effektivleistung. Zyklisch abgefragte Modbus-/HTTP-/MQTT-/UDP-Ladepunkte behalten ihr bisheriges Verhalten.
- OCPP-Adapter-Liveness wird zusätzlich über `system.adapter.ocpp.<Instanz>.alive` überwacht; ein stehen gebliebenes `connected=true` kann bei gestopptem Adapter keine alte Leistung fortschreiben.

## 0.8.174 - 2026-08-10

- Neue EOS-App `netoperator-interface` als sichere, standardmäßig deaktivierte und read-only Grundlage für zertifizierte EZA-/Parkregler vorbereitet. Der zertifizierte Regler bleibt am Netzanschlusspunkt maßgeblich; die Übergabe an Operation Engine und Asset-Writer ist noch gesperrt.
- Kanonisches Datenmodell für Trip, Freigabe/Sperre, P-/Q-/cos-phi-Vorgaben, NAP-Istwerte, Controllerstatus, Kommunikation, Fehler, Zeitstempel, Quelle und optionale EOS-Quittierungen eingeführt.
- Versioniertes Treiberprofil-SDK mit Datentyp, Skalierung, Endianness, Quality-/Validity-Signalen, Zeitstempel, Watchdog und Mapping-Version ergänzt. Acht Herstellerprofile sind bewusst leere Mapping-Vorlagen ohne erfundene Registeradressen.
- Modbus TCP und EOS-Datenpunkt-Mapping als read-only Transporte umgesetzt; Modbus RTU, OPC UA, IEC 60870-5-104 und IEC 61850 bleiben ausdrücklich reservierte, noch nicht implementierte Treiberslots.
- Betreiberansicht, Installer-Konfiguration, Rohwertdiagnose, Latenz-/Frischeanzeige und Ereignisprotokoll ergänzt. T01 bis T12 sind als einheitliche Treiber-Abnahmesuite hinterlegt.

## 0.8.173 - 2026-08-10

- Neu auf dem bekannten startfähigen Stand 0.8.171 aufgebaut; die fehlerhafte 0.8.172 ist keine Codebasis dieser Version.
- EVCS: Eine fehlende optionale Stationszuordnung oder Stationsgrenze wird nicht mehr als 0-W-Gerätegrenze interpretiert. Einzelne Wallboxen laden in Boost und Min+PV ohne künstliche Station; ein wirklich ausgeschöpftes gemeinsames Stationsbudget bleibt ein harter Stopp.
- §14a: Pmin,14a wird bei Direkt- und EMS-Steuerung nicht unterschritten. Ein normaler externer 0-W-Wert wird auf die berechnete Mindestleistung geklemmt und nicht als EOS-Not-Aus interpretiert.
- §14a/PV: Die §14a-Grenze betrifft den netzwirksamen Bezug. Das zentral physikalisch validierte lokale PV-Budget darf zusätzlich verwendet werden; Gesamt-, App- und Gerätebudgets verhindern eine Mehrfachvergabe.
- EEBUS-Fallback: Bei abgelaufener Gültigkeit oder Heartbeatverlust bleibt der letzte gültige Vertrag beziehungsweise Pmin,14a aktiv; ein Kommunikationsausfall erzeugt keinen normalen 0-W-§14a-Befehl.
- Release-Härtung: Jede ausgelieferte JS-Datei, jeder statische relative require()-Pfad und die main.js-/EMS-/§14a-Startkette werden geprüft. Dieser Test hätte den MODULE_NOT_FOUND-Fehler der verworfenen 0.8.172 vor einer Veröffentlichung blockiert.

## 0.8.171 - 2026-08-10

- NexoLogic-Desktoparbeitsfläche von der allgemeinen Cockpit-Maximalbreite entkoppelt. Der Editor nutzt nun nahezu die vollständige Browserbreite; linke Bausteinpalette und rechte Eigenschaftenleiste bleiben kompakt, während die mittlere Zeichenfläche den zusätzlichen Platz erhält.
- Vorhandene Seiten-, Canvas-, Palette- und Eigenschaften-Scrollbereiche sowie Verbindungserstellung, Auto-Anordnung, Simulation, Undo/Redo und lokale Entwurfssicherung bleiben unverändert bedienbar.
- SmartHome-Kacheln aller zehn Basistypen optisch vereinheitlicht: klare Iconflächen, Status-Pills, Bedienfelder, aktive Zustände, Fokusdarstellung sowie deutlichere Stale-/Offline-/Fehlerkennzeichnung.
- SmartHome-Desktopseite nutzt die verfügbare Breite besser; Tablet- und Mobilumbrüche bleiben bestehen. Ein echter Chromium-Test prüft alle zehn Kacheltypen auf Größe, Überlappungsfreiheit, Vollbreite und Browserfehler.
- Produktive EMS-, Lade-, Speicher-, FENECON-, §14a-, Safety-, Authentifizierungs-, NexoLogic- und SmartHome-Steuerlogiken bleiben fachlich und außerhalb der Versionskennungen byte-identisch.

## 0.8.170 - 2026-08-10

- NexoLogic um einen vollständig schreibfreien Browser-Testmodus erweitert. Alle 41 aktuellen Bausteintypen können mit Testwerten, virtueller Zeit, Live-Werten an Bausteinen und Leitungen sowie einem chronologischen Trace geprüft werden, ohne API-POSTs oder Hardware-Schreibbefehle auszulösen.
- Neue Bausteine werden automatisch in geordnete Spuren einsortiert: Eingänge links, Logik/Funktionen mittig und Ausgänge rechts. Freie Positionen werden überlappungsfrei gesucht; eine Auto-Anordnung bereinigt auch bestehende Graphen anhand ihrer Verbindungen.
- Rückgängig/Wiederholen, lokale Entwurfssicherung und Wiederherstellung nach Browserabbruch ergänzt. Manuell per Drag-and-drop gesetzte Positionen bleiben möglich.
- Reale Chromium-Prüfung deckt Spurplatzierung, vollständige 41-Baustein-Simulation, Live-Werte, Trace, Schreibfreiheit, Undo/Redo, lokalen Entwurf sowie bestehende Verbindungserstellung und Scrollbereiche ab.
- Die produktive NexoLogic-Engine sowie EMS-, Lade-, Speicher-, FENECON-, §14a- und Safety-Regelungen bleiben fachlich unverändert.

## 0.8.169 - 2026-08-09

- NexoLogic-Desktoplayout korrigiert: Die vollständige Drei-Spalten-Arbeitsfläche bleibt erhalten, während Seite, Zeichenfläche, Bausteinpalette und Eigenschaftenleiste wieder sichtbare und unabhängig bedienbare Scrollleisten besitzen. Auch bei niedriger Fensterhöhe wird die untere Canvas-Kante nicht mehr abgeschnitten.
- Echten Chromium-Regressionstest ergänzt, der Seiten- und Canvas-Scrollreserve, horizontales/vertikales Verschieben sowie die vollständige Erreichbarkeit der Arbeitsfläche bei schmalerem Desktop prüft.
- Lizenzbereich strikt abgesichert: Direkte Runtime-URL, `/static`-Pfad, Admin-Deep-Link sowie Lese- und Schreib-API verlangen eine echte EOS-Sitzung mit `license.manage`. Ein deaktivierter allgemeiner Kunden-Schreibschutz kann Lizenz, EMS oder Simulator nicht mehr freigeben.
- Strikte Auth-Endpunkte für EMS, Lizenz und Simulator ergänzt. Diese Bereiche besitzen keinen Auth-deaktiviert-Admin-Bypass; nur Installer/Admin-Session oder ausdrücklich gesicherter Trusted-Header werden akzeptiert.
- Lizenzdaten werden erst nach erfolgreicher Rollenprüfung geladen, der Schlüssel bleibt standardmäßig verdeckt und wird weder in HTML noch Browser-Speicher hinterlegt. Alte Browser-Cache-Schlüssel werden beim Öffnen entfernt; Logout und Seitenwechsel löschen UUID und Schlüssel sofort aus der Ansicht.
- Der bestehende React-Admin-Deep-Link zur Lizenz wird vor dem Start des älteren Bundles auf die geschützte Runtime-Seite umgeleitet. Dadurch können weder direkter Hash-Aufruf noch Browser-Cache die alte ungeschützte Lizenzansicht öffnen.
- Rollenaufteilung bestätigt: SmartHome, Gerätezuordnung und NexoLogic bleiben für den Endkunden nutzbar; EMS/App-Center, Lizenz, Simulator und beliebige Roh-Datenpunkt-Schreibtests bleiben Installer/Admin vorbehalten.
- Netzanschluss-, Phasen-, §14a-, EVCS-, Speicher-, Speicherfarm-, FENECON/FEMS-, SafetyEnvelope-, Heizstab-, Thermik- und FENECON-NVP-Shadow-Regelungen bleiben fachlich unverändert. Service-Worker-Cache auf `nexowatt-cache-v469` und zentrale Versionskennungen auf 0.8.169 aktualisiert.

## 0.8.168 - 2026-08-09

- NexoLogic-Verbindungsfehler behoben: Der Porttyp-Lookup verwendete irrtümlich `nwLE.library`, obwohl die Editorbibliothek unter `nwLE.lib` gespeichert wird. Dadurch brach jeder Leitungsabschluss mit einer Browser-Ausnahme ab.
- Verbindungsbedienung gehärtet: Ausgang und Eingang lassen sich per Klick, Drag/Drop oder Tastatur verbinden; Quelle, kompatible Ziele und unpassende Ports werden sichtbar markiert. Größere Hitboxen verbessern die Desktop-Bedienung.
- Einen echten Chromium-End-to-End-Test ergänzt, der zwei reale Logikbausteine lädt, Ausgang und Eingang bedient, exakt einen Graph-Link erzeugt und die sichtbare SVG-Leitung ohne Browser-Ausnahme bestätigt.
- NexoLogic als reine Desktop-Arbeitsfläche auf die vollständige Viewportbreite/-höhe erweitert. Bausteinpalette, Zeichenfläche und Eigenschaftenleiste besitzen getrennte Scrollbereiche und deutlich mehr Übersicht.
- SmartHome-Konfiguration, NexoLogic, Logikuhren, Type-Detection und Datenpunktsuche dem Kundenarbeitsbereich zugeordnet. Die Seiten besitzen keine Installer-Capability-Sperre und keinen obligatorischen Installer-Passwortdialog mehr.
- EMS/App-Center, Lizenz und Simulator bleiben serverseitig Installer/Admin-geschützt. Der beliebige Hardware-Schreibtest (`/api/smarthome/dpset`) bleibt aus Sicherheitsgründen ebenfalls im Expertenbereich.
- Datenpunktauswahl in SmartHome, NexoLogic und AppCenter behält beim Ändern eines bestehenden Mappings den aktuellen Elternordner als Einstieg.
- Kunden sichtbare Titel, PWA-Metadaten, Admin-Einstiege und Status-/Hilfetexte auf `NexoWatt EOS` vereinheitlicht. Technisch notwendige Paket-, Plattform- und State-IDs bleiben unverändert.
- Sichtbare E3/DC-Mappingbeschreibungen und die Sprachquellenanzeige neutral auf NexoWatt EOS/Connector-Begriffe umgestellt.
- Netzanschluss-, Phasen-, §14a-, EVCS-, Speicher-, Speicherfarm-, FENECON/FEMS-, SafetyEnvelope-, Heizstab- und FENECON-NVP-Shadow-Regelungen bleiben fachlich unverändert. Service-Worker-Cache auf `nexowatt-cache-v468` und zentrale Versionskennungen auf 0.8.168 aktualisiert.

## 0.8.167 - 2026-08-09

- NexoLogic-Lifecycle gehärtet: atomare Initialisierung ohne Zwischenwrites, strikte Datenqualität statt `null → 0`, keine künstlichen Startflanken, sichere Deaktivierung/Reload/Unload-Ausgänge, persistente Blockzustände und generationstreu serialisierte Hardwarewrites.
- Graphvalidierung prüft bekannte Bausteine, eindeutige IDs, Ports, Datentypen, Pflichtparameter und unzulässige kombinatorische Zyklen. Speichern aktiviert die neue Runtime zuerst testweise und fällt bei Fehlern transaktional auf den vorher funktionierenden Graph zurück.
- Zeitbausteine stabilisiert: Der Zwei-Punkt-Regler wertet nach Mindest-Ein/-Aus-Zeit automatisch erneut aus; der Mischermotor verwendet die konfigurierte Puls-/Pausenzeit und plant Folgeschritte ohne notwendige Eingangswertänderung.
- SmartHome auf einen kanonischen v3-Gerätevertrag erweitert: Momentary-/Toggle-Taster, Dimmer, RGB/RGBW/Tunable White, Beschattung mit Lamellen und Schutzsignalen, Klima, Player inklusive TTS, schreibbare Wertgeber, Kameras, Widgets und URL-Aktionen.
- Unbekannte, veraltete, offline und fehlerhafte Zustände werden von realem AUS/0 getrennt dargestellt. Beschattungs- und Klimabefehle werden serverseitig fail-closed gegen Sperre, Wind/Regen/Frost, Fensterkontakt und Gerätestörung geprüft.
- Szenen vollständig validiert und serialisiert: verschachtelte Szenen, Zyklus-/Tiefenschutz, Preflight aller Ziele, read-only-/Mapping-Prüfung, sichere Datentypumwandlung und klare Fehlerantwort statt stiller Teilaktivierung.
- SmartHome-Konfigurationssave ist transaktional und besitzt Rollback auf die zuletzt funktionierende Runtime.
- Datenpunktauswahl in SmartHome, NexoLogic und AppCenter öffnet beim Ändern eines bereits zugeordneten Datenpunkts wieder direkt im aktuellen Objektordner.
- Fehlenden produktiven Paketpfad `lib/smarthome-contract.js` explizit in die npm-Dateiliste aufgenommen.
- Netzanschluss-, Phasen-, §14a-, EVCS-, Speicher-, Speicherfarm-, FENECON/FEMS-, SafetyEnvelope-, Heizstab- und FENECON-NVP-Shadow-Regelungen bleiben fachlich unverändert. Service-Worker-Cache auf `nexowatt-cache-v467` und zentrale Versionskennungen auf 0.8.167 aktualisiert.

## 0.8.166 - 2026-08-09

- Vollständig schreibfreien FENECON-NVP-Shadow ergänzt. Er läuft parallel zur unveränderten RC41-Regelung und darf weder FEMS-/ESS-Hardwaredatenpunkte beschreiben noch die bestehende FEMS-/EOS-Reglerhoheit verändern.
- Minimale Regelbasis klar getrennt: `Restlast ohne Speicher = NVP-Ist + echte AC-ESS-Istleistung`. Daraus wird die bestehende finale EOS-Batteriepolicy mit `FEMS-Netzziel = Restlast ohne Speicher - Batterie-Soll` in einen reinen Vergleichswert übersetzt.
- Zusätzlichen 0-Einspeise-Vorschlag mit standardmäßig +80 W Netzbezug berechnet. Der Shadow zeigt parallel die dafür erforderliche Batterie-Leistung, zusätzliche Senke/PV-Abregelung, mögliches Importreduktionspotenzial und optional begrenzende Batterie-Min-/Max-Werte.
- Direkt gemessenen Gesamtverbrauch und gesamte PV-Erzeugung ausschließlich als unabhängige Plausibilisierung verwendet. Diese Werte werden nicht erneut in die NVP-Regelgleichung addiert und können daher keine PV-Doppelzählung oder Regelkreis-Rückkopplung erzeugen.
- Shadow-Berechnung fail-closed gehärtet: fehlender/veralteter NVP, fehlende/veraltete ESS-Aktorleistung, widersprüchliche Batteriegrenzen oder eine vorhandene unplausible Last-/PV-Bilanz verhindern die spätere Feldtest-Bereitschaft. Fehlende optionale Last-/PV-Werte blockieren die reine NVP+ESS-Berechnung dagegen nicht.
- Diagnose auf fünf Sekunden gedrosselt und vollständig vom Produktwriter entkoppelt. Neue `speicher.regelung.feneconNvpShadow*`-States dokumentieren Eingänge, Vorschlag, Read-only-Vertrag, Mapping-Bereitschaft und vollständiges JSON, ohne AppCenter-Statusseiten oder Warnlogs zu füllen.
- Neue Device-Adapter-Aliase für die Shadow-Datenbasis aufgenommen: bevorzugt `aliases.r.nvpPower` und `aliases.r.consumptionTotal`, mit sicheren Read-only-Fallbacks. Die echte AC-ESS-Rückmeldung bleibt `aliases.r.essActivePower`; ein späterer Feldtest darf ausschließlich `aliases.ctrl.gridSetpointW`/`aliases.ctrl.napSetpointW` auf einen echten `SetGridActivePower`-Aktor abbilden.
- Die gesamte Shadow-Orchestrierung einschließlich Diagnose-State-Definitionen in den neuen typisierten Runtime-Service `fenecon-nvp-shadow-runtime` ausgelagert. Im historischen `storage-control` verbleiben nur der schreibfreie Aufruf und die unveränderten produktiven Übergabepunkte; die Anzahl ungeprüfter Runtime-Dateien wächst dadurch nicht.
- Neue reine Formel- und Runtime-Regressionen prüfen Vorzeichen, 0-Einspeise-Ziel, Policy-Erhalt, Plausibilität, Stale-Failsafe und den statischen/verhaltensbasierten No-Hardware-Write-Vertrag. Der bestehende reale FEMS-No-Write-Tick bestätigt zusätzlich, dass der Shadow während FEMS-Reglerhoheit läuft, ohne einen 0-W-Keepalive zu erzeugen.
- Produktive Netzanschluss-, Phasen-, §14a-, EVCS-, Speicher-, Speicherfarm-, FENECON/FEMS-, SafetyEnvelope- und Heizstabregelung aus 0.8.165 unverändert belassen. Service-Worker-Cache auf `nexowatt-cache-v466` und zentrale Versionskennungen auf 0.8.166 aktualisiert.

## 0.8.165 - 2026-08-09

- Heizstab-TS-Entscheidungsmodell mit der produktiven Runtime vereinheitlicht: Der TypeScript-Pfad erhält jetzt pro Zielstufe dieselbe kumulierte Leistung und denselben aus realer Messleistung angelernten `stagePowerScale` wie die bestehende Heizstabregelung. Mehrere gleich große Einzelstufen können dadurch nicht mehr als fälschlich gleich große Gesamtstufen bewertet werden.
- Die im Feld sichtbare Warnung `[heating-rod-ts-shadow] ... c2.targetPowerW` bereinigt: Eine reine Leistungsmodell-Abweichung bei identischer Zielstufe bleibt in der Diagnose sichtbar, erzeugt aber kein zyklisches Warn-Log und blockiert keine korrekte Schaltentscheidung.
- Echte Zielstufenabweichungen bleiben auch nach Übernahme des TS-Normalpfads fail-closed. In diesem Fall gewinnt die bewährte JavaScript-Sicherheitsreferenz; die TS-Zielstufe wird nicht an die Hardware weitergegeben.
- Shadow-Vergleiche auf den tatsächlich erreichten produktiven PV-Auto-Pfad begrenzt. Manuelle/extern übernommene Stufen, deaktivierte Geräte, §14a-Begrenzungen, Schutzabschaltungen und 0-Einspeise-/Forecast-Sonderpfade werden nicht mehr mit einem fachlich unpassenden Standardmodell verglichen.
- Neue Verhaltensregressionen prüfen kalibrierte 1/2/3-Stufenmodelle, reine Wattdiagnose ohne Warnspam, Zielstufen-Fallback im Normalpfad und das Überspringen separater Sicherheits-/Ownership-Pfade.
- Den Energieherkunft-/Ledger-Routentest plattformneutral gemacht. Windows-Pfade mit Backslashes und Linux-Pfade werden identisch geprüft; dadurch scheitert der interne Entwicklungstest nicht mehr allein am Betriebssystem.
- Netzanschluss-, Phasen-, §14a-, Lade-, Speicher-, FENECON- und SafetyEnvelope-Grenzwerte aus 0.8.164 bleiben unverändert. Service-Worker-Cache auf `nexowatt-cache-v465` und zentrale Versionskennungen auf 0.8.165 aktualisiert.

## 0.8.164 - 2026-08-09

- Publish-Stabilisierung für Windows: Der Releasepfad verändert keine Runtime- oder Spiegeldateien mehr während `npm publish`. `npm ci` installiert den exakt gepinnten und für RC40 verwendeten TypeScript-Compiler 5.8.3; der Publish-Check prüft diese Version fail-closed. Compilerabweichungen, fehlende DevDependencies oder nicht synchronisierte Runtime-Artefakte brechen mit einer eindeutigen Meldung ab, statt den Quellstand automatisch umzuschreiben.
- `prepublishOnly` besteht wieder nur aus Versionsfreiheitsprüfung und dem vollständigen 202-Schritte-Publish-Gate. Damit bleiben Quellcode, Runtime und Git-Arbeitsbaum während des Veröffentlichens unverändert.
- Windows-Publish-Hotfix: Die bisherige 9.734 Zeichen lange `publish:check`-Shellkette mit 202 `&&`-Schritten wurde durch einen plattformunabhängigen, fail-closed Node-Runner ersetzt. Alle Prüfungen bleiben in identischer Reihenfolge erhalten, werden aber einzeln ohne lange `cmd.exe`-Gesamtzeile gestartet. Der strukturierte `scripts/publish-check-plan.json` wird vor der Ausführung vollständig validiert; unbekannte Befehlsformen, fehlende npm-Skripte, fehlende Node-Dateien oder eine veränderte Typecheck-Reihenfolge blockieren den Publish.
- `prepublishOnly` behält unverändert die öffentliche npm-Versionsprüfung als ersten Schritt. Der neue kurze `publish:check`-Aufruf ist nur 36 Zeichen lang; der längste einzelne Planschritt 64 Zeichen. Dadurch bleibt das komplette Release-Gate auch unter Windows aktiv, ohne `--ignore-scripts` oder ein Umgehen der Sicherheitsprüfungen.
- Vollständigen Projekt-Typecheck von zuvor 1.285 Diagnosen auf 0 Fehler reduziert. Nach der Compiler-/DevDependency-Vorprüfung ist `npm run typecheck` jetzt der erste technische Schritt des verbindlichen `publish:check` und blockiert neue Typbrüche vor allen Laufzeit-, Safety- und Packaging-Prüfungen.
- Sicherheitskritische Runtime-Grenzen in `SafetyEnvelope`, §14a-/EEBUS-Direkt-API, FENECON-Reglerübergabe, Ladebudget, Modulmanager, Schwellwertsteuerung, NexoLogic-Budget, Energieherkunft, Datenpunktkonfiguration sowie Sprach-/Ledger-Frontend mit expliziten Typverträgen versehen.
- CommonJS-, DOM-, Browser-, ioBroker- und Runtime-Brückentypen so ergänzt, dass die produktiven Quellen ohne einen separaten, weicheren Typecheck kompiliert werden. Der Releasepfad prüft dieselbe Quellbasis, aus der anschließend die JavaScript-Runtime erzeugt wird.
- Einen realen Bestandsfehler in der Schwellwertsteuerung behoben: Die Standardwerte für `minOnSec` und `minOffSec` wurden durch einen überzähligen Funktionsparameter intern als `true` statt als `0` Sekunden angelegt. Die bestehende Laufzeitregression prüft nun beide Objekt-Defaults ausdrücklich.
- `@ts-nocheck` aus Modulmanager und Schwellwertsteuerung entfernt; das No-Check-Budget sinkt von 60 auf 58 Runtime-Dateien und wird für 0.8.164 neu festgeschrieben. Neue ungeprüfte Dateien oder ein Wachstum des verbleibenden Altbestands bleiben im Release-Gate verboten.
- `prepublishOnly` führt nach der weiterhin zuerst laufenden, fail-closed Registry-Versionsprüfung das vollständige `publish:check` aus. Ein npm-Publish kann damit weder den Gesamt-Typecheck noch die RC39-Sicherheits-, Lade-, Speicher-, §14a-, Runtime-Mirror- und Packaging-Regressionen umgehen.
- Fachliche Regelalgorithmen und Grenzwerte aus RC39 bleiben unverändert. Service-Worker-Cache auf `nexowatt-cache-v464` und zentrale Versionskennungen auf 0.8.164 aktualisiert.

## 0.8.163 - 2026-08-08

- Zentrale `SafetyEnvelope` als verbindlichen, fail-closed Sicherheitsvertrag für alle flexiblen Verbraucher eingeführt. Jeder produktive EMS-Zyklus beginnt gesperrt und wird erst nach vollständigem Inbetriebnahme- und Messwertnachweis freigegeben.
- Eine gültige Netzanschlussleistung größer 0 W und ein frischer, plausibler NVP-/Netzzählerwert sind jetzt zwingende Voraussetzungen für jeden positiven Stellbefehl. Der harte Sicherheits-Timeout ist unabhängig vom bisherigen Diagnose-Timeout und beträgt standardmäßig 30 Sekunden.
- Bei aktivem Phasenlimit müssen alle für den Anschluss konfigurierten Phasen vollständig zugeordnet, verbunden und frisch sein. Die finale Freigabe berücksichtigt die kleinste verbleibende Phasenreserve sowie Phasenanzahl und Nennspannung des Verbrauchers.
- §14a wird bis an die letzte Hardware-Schreibgrenze durchgereicht: Gesamt-, App- und Geräte-Caps, ausdrücklich 0 W, `forceZero`, `emergencyStop`, Signalfrische und der lokale EEBUS-Heartbeat-Failsafe sind harte Grenzen. Ein fehlender Cap wird bei aktiver Begrenzung nicht als unbegrenzt interpretiert.
- Ladepunkte, Speicher-Netzladung, Speicherentladung, Thermik, Heizstab, Multi-Use, sicherheitsrelevante Schwellwertregeln und budgetierte NexoLogic-Ausgänge prüfen den aktuellen SafetyEnvelope unmittelbar vor jedem Hardware-Write erneut. Alte Pläne, Race-Conditions oder später geänderte Grenzen können damit keinen positiven Alt-Sollwert mehr durchlassen.
- Die zentrale Reservierung zählt nur tatsächlich bestätigte Ziel- und Mehrleistungen. Mehrere Wallboxen, Speicherladung, Heizstab und weitere flexible Verbraucher teilen denselben verbleibenden Netzanschluss-, Phasen- und §14a-Headroom, ohne Doppelvergabe.
- Fehlgeschlagene oder nicht bestätigte Hardware-Writes verriegeln den Sicherheitszustand des laufenden Zyklus. Fehler sicherheitskritischer Module bleiben über Zyklusgrenzen gelatcht und werden erst nach einem erfolgreichen Recovery-Tick plus anschließendem vollständig sauberen Zyklus wieder freigegeben.
- Sicherheitsrelevante Schwellwertregeln benötigen ein belastbares Leistungsmodell (`estimatedPowerW`); unvollständige Regeln dürfen keinen Aktor einschalten. Budgetierte NexoLogic-Ausgänge werden vor `applyBudgetGrant` gegen dieselbe aktuelle Sicherheitsfreigabe geprüft.
- Neue Regression `test:safety-envelope-final-write` prüft fehlende Anschlussgröße, Null-/Stale-NVP, Phasenausfall, Netzanschlussklemmung, §14a-Cap und 0-W-Stopp, Summenreserve, alte EVCS-Pläne, Write-Fehlerverriegelung, Speicherbefehle und die Einbindung aller produktiven flexiblen Writer. Sie ist fest im `publish:check` und im Release-Safety-Gate verankert.
- FENECON-RC38-Reglerhoheit, Speicherfarm-One-Writer, Ladebetriebsarten, Tariflogik, Energiefluss, Bilanzierung und bestehende AppCenter-Funktionen bleiben erhalten. Service-Worker-Cache auf `nexowatt-cache-v463` und zentrale Versionskennungen auf 0.8.163 aktualisiert.

## 0.8.162 - 2026-08-08

- FENECON/OpenEMS-DC-/Hybridspeicher erhalten wieder eine eindeutige, entprellte Reglerhoheit: Bei frischer PV-Leistung über 500 W übernimmt FEMS nach standardmäßig 10 Sekunden die Eigenregelung; bei dauerhaft weniger als 500 W übernimmt EOS nach standardmäßig 120 Sekunden. Exakt 500 W beziehungsweise ein konfiguriertes Umschaltband hält die bisherige Reglerhoheit; fehlende oder veraltete PV bleibt fail-safe bei FEMS.
- Ein echter 0-W-Sicherheits-, §14a-, SoC-, Policy- oder manueller Stopp bleibt unabhängig von PV und Reglerhoheit jederzeit möglich. Beim Wechsel von EOS zu FEMS wird ein noch aktiver EOS-Sollwert zuerst einmalig auf 0 W neutralisiert; danach endet der Refresh kontrolliert, damit der FEMS-API-Watchdog ohne parallelen zweiten Regler auslaufen kann.
- FENECON-Pflichtmesswerte werden fail-closed ausgewertet: Ohne frischen NVP-Wert oder ohne ausdrücklich zugeordnete AC-ESS-Aktorleistung entsteht kein neuer FEMS-Netzzielbefehl. Allgemeine Batterie-/PowerBalance-Werte werden nicht mehr als vermeintliches FENECON-Aktorfeedback verwendet.
- Optionale FENECON-Minimum-/Maximum-Datenpunkte begrenzen nur noch bei tatsächlich vorhandenem, endlichem Zahlenwert. Fehlende oder leere Werte klemmen den Sollwert nicht mehr auf 0 W; widersprüchliche Grenzen (`min > max`) blockieren den Schreibbefehl mit Diagnose.
- Die zentrale Messwertkonvertierung behandelt `null`, `undefined`, leere Strings, Booleans, Objekte und nicht endliche Werte nicht mehr als reale 0. Deutsche und englische Zahlenformate wie `1.234,56` und `1,234.56` werden eindeutig normalisiert. Damit sind NVP, PV, SoC, Speicher, EVCS und optionale Grenzen gemeinsam gegen Nullwert-Verwechslungen gehärtet.
- Die herstellerübergreifende 0-W-Firewall stoppt nach Ablauf der Messwert-Grace sicher auf 0 W, bevor ein alter Cachewert den vorherigen Nicht-Null-Sollwert über das NVP-Zielband weiterhalten könnte. Unvollständige Schwellwertregeln erzeugen ohne gültige Schwelle keinen Aktorbefehl.
- Speicherfarmen bleiben bei mehreren schreibbaren Speichern vollständig unter zentraler EOS-Koordination. Ein nativer FEMS-NVP-Master ist nur exklusiv zulässig; Monitor-Speicher dürfen zusätzlich vorhanden sein, ohne einen zweiten Hardware-Schreiber zu erzeugen.
- AppCenter, Runtime und Diagnose verwenden nun durchgängig 500 W / 500 W, 10 s FEMS-Übergabe, 120 s EOS-Übernahme und 60 s FEMS-API-Watchdog. Einzel-FENECON und Speicherfarm zeigen getrennte, widerspruchsfreie Hilfetexte.
- Der vor `npm publish` erforderliche Doppelversionsschutz wurde wiederhergestellt. Nur eine eindeutige Registry-404 gibt die Version frei; bestehende Versionen, Timeouts und unklare Registry-Antworten blockieren den Publish fail-closed. Statische und lokale HTTP-Laufzeittests sichern diesen Vertrag.
- Neue Regressionen prüfen die reale Speicher-Tick-Laufzeit, FEMS-No-Write, verzögerte EOS-Übernahme, einmalige 0-W-Übergabe, jederzeitigen Sicherheitsstopp, strikte Messwerte, native/direct Kommandotrennung, Speicherfarm-One-Writer, Multi-Use-Topologie und den Publish-Guard. Service-Worker-Cache auf `nexowatt-cache-v462` und zentrale Versionskennungen auf 0.8.162 aktualisiert.

## 0.8.161 - 2026-08-08

- Boost-Laden gegen den Feldfehler „nach etwa 10 Sekunden wieder 0 A“ gehärtet: Der explizite Kundenmodus darf den bereits durch alle harten Grenzen begrenzten Maximalwert auch ohne optionalen Fahrzeug-/Ladebedarf-Datenpunkt vorgeben.
- Der finale TypeScript-Allocator und sein Abschluss-Guard verwenden denselben Vertrag. Auto, PV und Min+PV bleiben ohne bestätigten Ladebedarf sicher auf 0; nur Boost besitzt die bewusste Vorlade-Ausnahme.
- Zeit-Ziel-Laden, SoC-Warten und Tarif-/PV-Optimierung können Boost nicht mehr nachträglich stoppen oder begrenzen. Netzanschluss, Stationslimit, Phasenlimit, §14a, Peak-Shaving, Offline/Fault und die lokale Ladepunktgrenze bleiben weiterhin verbindlich.
- Boost umgeht die weiche Hochlauframpe und fährt den zulässigen Strom-/Leistungssollwert sofort an. Ramp-down und alle Safety-Stopps bleiben unverzögert.
- In Mehrladepunktanlagen besitzt Boost Vorrang vor weichen Mindestreservierungen späterer Ladepunkte. Innerhalb einer gemeinsamen Station bleibt deren harte Gesamtgrenze strikt erhalten.
- Alte `controlPreference=none/off`-Konfigurationen mit vorhandenem Sollstrom- oder Sollleistungs-DP werden in Runtime, Infrastruktur-Budget und AppCenter automatisch auf `auto` normalisiert. Die Checkbox „Aktiv (Regelung)“ ist der einzige bewusste Abschalter.
- Regressionen prüfen Boost, Auto, Min+PV, PV und Aus, fehlenden Ladebedarfsnachweis, Ziel-SoC-Warten, Rampenverhalten, Gesamt-/Stationsbudget, Mehrladepunktpriorität sowie produktive TypeScript-Allocation und Write-Plan.
- Service-Worker-Cache auf `nexowatt-cache-v461` und zentrale Versionskennungen auf 0.8.161 aktualisiert.

## 0.8.160 - 2026-08-08

- FENECON-Konfigurationsblockade behoben: Das Feld **„FENECON FEMS-NVP-Ziel“** ist in `Automatisch` und `Direkte ESS-Leistung` optional und darf leer bleiben.
- Eine aus den Zwischenständen 0.8.158/0.8.159 stammende Fehlzuordnung von `aliases.ctrl.powerSetpointW` beziehungsweise `SetActivePowerEquals`/706 im FEMS-NVP-Feld wird automatisch in **„Sollleistung signed“** verschoben; das falsche native Zielfeld wird geleert.
- Derselbe Migrationsvertrag gilt beim AppCenter-Speichern, in der serverseitigen Installer-Normalisierung, im Einzel-Speicher-Runtime-Mapping und in Speicherfarm-Zeilen. Die Anlage wird dadurch auch vor einem erneuten manuellen Speichern wieder auf den direkten ESS-Schreibpfad gebracht.
- Netzleistungs-Messwerte wie `aliases.r.gridPower` werden in Auto/Direkt weiterhin aus dem nativen Schreibfeld entfernt.
- Nur der ausdrücklich gewählte Expertenmodus `FEMS-NVP-Ziel dauerhaft schreiben` bleibt streng: Er verlangt einen echten beschreibbaren `ctrlBalancing*/SetGridActivePower`-DP und blockiert 706/powerSetpointW als falsche Rolle.
- Regressionen prüfen die exakte Feldkonfiguration aus dem Kundenbild, die automatische Einzel-/Farmmigration, Servervalidierung, direkte Sollwertausgabe und den bisherigen NVP-Feedbackfall mit +500 W Entladevorgabe.
- FENECON-Regelbasis aus 0.8.158, EVCS-RC33, §14a-/EEBUS-Direktanbindung und alle übrigen Regelpfade bleiben unverändert. Service-Worker-Cache auf `nexowatt-cache-v460` und zentrale Versionskennungen auf 0.8.160 aktualisiert.

## 0.8.159 - 2026-08-07

- FENECON/OpenEMS-Automatik gegen eine reale Fehlzuordnung gehärtet: Ein Netzleistungs-Messwert wie `aliases.r.gridPower` wird nicht mehr allein wegen eines belegten Feldes als nativer FEMS-NVP-Schreibpfad ausgewählt.
- Ist gleichzeitig ein direkter ESS-Sollwert (`SetActivePowerEquals` / 706 beziehungsweise `aliases.ctrl.powerSetpointW`) vorhanden, fällt Auto deterministisch auf die direkte ESS-Regelung zurück. Die Regelung bleibt damit auch bei 0 W PV-Erzeugung aktiv.
- Expliziter FEMS-NVP-Modus lehnt Netzleistungs-Messwerte mit verständlicher Fehlermeldung ab; nur ein echter beschreibbarer `ctrlBalancing*/SetGridActivePower`-DP ist dort zulässig.
- AppCenter-Schnellzuordnung und Speichern bereinigen bekannte `r.gridPower`-Fehlzuordnungen automatisch, ohne den direkten Sollwert zu löschen.
- Regression bildet die Feldkonfiguration exakt nach und bestätigt: signed ESS-Sollwert wird geschrieben, `r.gridPower` wird niemals beschrieben, Kommandofamilie bleibt `signed`.
- FENECON-Sollwertfeedback aus 0.8.158, EVCS-RC33, §14a-/EEBUS-Direktanbindung und alle übrigen Regelpfade bleiben unverändert.
- Service-Worker-Cache auf `nexowatt-cache-v459` und zentrale Versionskennungen auf 0.8.159 aktualisiert.

## 0.8.158 - 2026-08-07

- FENECON/OpenEMS Direktregelung korrigiert: Im Modus `direct-ess` wird die geschlossene NVP-Regelung nicht mehr aus der physischen ESS-Aktorleistung aufgebaut, wenn diese interne DC-PV-Beladung enthalten kann.
- Regelbasis ist nun vorrangig das Readback der tatsächlich aktiven externen Vorgabe (`SetActivePowerEquals`, typischerweise Register 706), danach der direkte Signed-/Split-Sollwert und der letzte bestätigte Speicherbefehl.
- Beim Kaltstart ohne verwertbares Readback wird ein sicherer 0-W-Anker verwendet. Physische ESS-Leistung bleibt unverändert für Anzeige, Diagnose, SoC-, Leistungs- und Sicherheitsgrenzen verfügbar.
- Feldfall abgesichert: Bei 600 W Netzbezug, 50 W Zielnetzbezug und aktiver Vorgabe -50 W entsteht rund +500 W Entladevorgabe statt eines erneuten Ladebefehls.
- Neue Regression schützt die Sollwertrichtung und stellt sicher, dass die EVCS-Input-Refresh-Härtung aus 0.8.157 sowie §14a-/EEBUS-Funktionen unverändert erhalten bleiben.
- Service-Worker-Cache auf `nexowatt-cache-v458` und zentrale Versionskennungen auf 0.8.158 aktualisiert.

## 0.8.157 - 2026-08-06

- EVCS-Eingangspfad auf eine zentrale, verlustfreie Multi-Binding-Struktur umgestellt. Ein gemeinsam genutzter Stations-Datenpunkt wie Online, Heartbeat oder Status aktualisiert nun alle zugehörigen Ladepunkte statt nur den zuletzt konfigurierten Connector.
- Sämtliche lesenden Ladepunkt-Zuordnungen werden einheitlich registriert: Leistung, Gesamtenergie, Status, Online, Aktiv, Fahrzeug verbunden, Ladebedarf, Heartbeat, Fahrzeug-SoC, Phasenrückmeldung, Lock, RFID und Modus.
- Aliasobjekte werden bis zur Read-Quelle aufgelöst und zusätzlich abonniert. Ein Alias-Zielereignis liest sofort wieder die konfigurierte Alias-ID, damit Alias-Transformationen und deklarierte Einheiten erhalten bleiben.
- Der vorhandene 3-Sekunden-Sicherheitsabruf aktualisiert nicht mehr nur den internen Cache, sondern repariert auch die lokalen `evcs.<n>.*`-Spiegelstates. Verpasste `stateChange`-Ereignisse führen dadurch nicht mehr zu dauerhaft stehenden NexoWatt-Werten.
- Quellzeitstempel bleiben für Freshness- und Stale-Bewertungen erhalten. Eigene bestätigte Spiegel-State-Ereignisse dürfen Messwerte nicht künstlich verjüngen; identische Quellproben werden zugleich nicht unnötig erneut geschrieben.
- Zusätzliche Rohspiegel für Fahrzeugverbindung, Ladebedarf, Heartbeat und Phasenrückmeldung ergänzt. Die fachliche Ladebedarfs-, Online-, Status- und Sicherheitsauswertung bleibt weiterhin direkt am Original-Datenpunkt im Charging-Management.
- Die Änderung betrifft ausschließlich Subscription, Read-Fallback, Normalisierung und Spiegelung. Ladebudget, PV-Regelung, Sollwertschreiben, Speicherlogik, §14a und EEBUS-Direktanbindung bleiben unverändert.
- Neue Regression prüft produktive Methoden dynamisch auf gemeinsame Stations-IDs, Alias-Readback, Mirror-Reparatur, Timestamp-Deduplizierung und Energieeinheiten. Service-Worker-Cache auf `nexowatt-cache-v457` und zentrale Versionskennungen auf 0.8.157 aktualisiert.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 60); der offen ausgewiesene Runtime-Zeilenrahmen steigt für die verlustfreie Multi-Binding-, Alias- und Spiegel-Reparaturlogik transparent von 150.686 auf 150.976 Zeilen.

## 0.8.156 - 2026-08-05

- Versionierte direkte Adapter-API zwischen `ioBroker.eebus` und dem zentralen NexoWatt-§14a-Regler ergänzt. CLS-/LPC-Befehle benötigen im Direktbetrieb keine manuelle Datenpunktzuordnung mehr.
- Zeitkritischen Pfad auf Arbeitsspeicher und `sendTo` reduziert: Eingang wird vor Diagnose-I/O übernommen und löst einen vollständigen zentralen EMS-Tick mit 0 ms Zusatzverzögerung aus. Bereits laufende Regelzyklen werden nicht parallelisiert, sondern erhalten unmittelbar danach einen Folgetick.
- Zweistufige interne Verarbeitung eingeführt: EOS bestätigt dem EEBUS-Gateway die Annahme unmittelbar nach erfolgreicher Vormerkung. Die positive korrelierte SPINE-ResultData wird gegenüber der CLS-Box jedoch erst nach abgeschlossenem §14a-/Core-Limits-/Verbraucher-Schreibzyklus gesendet; anschließend folgt der effektive LoadControl-Readback.
- Ende-zu-Ende-Zeitmessung mit konfigurierbaren Feldtestzielen von 250 ms für API-Annahme, 1.000 ms vom CLS-Eingang bis zum abgeschlossenen zentralen Regel-/Schreibzyklus und 1.500 ms vom CLS-Eingang bis zur Umsetzungsrückmeldung ergänzt. Diese Werte sind technische NexoWatt-Zielwerte und keine pauschalen gesetzlichen Fristen.
- Heartbeat-, Gültigkeits- und Failsafe-Übergänge bleiben autoritativ im EEBUS-Gateway. EOS erzeugt keine konkurrierenden Übergänge; ein Kommunikationsfehler darf die zulässige Leistung niemals erhöhen.
- Positive CLS-Umsetzungsrückmeldung wird bei Fehlern in aktiven Geräte-/Schreibpfaden zurückgehalten. Teilmesswerte der Ladeinfrastruktur werden nicht fälschlich als gesamte SteuVE-Leistung ausgewiesen.
- Regressionstest für Direkt-API, 0-ms-Schnelltick, Deduplizierung, Release, Degraded-Fail-Closed und Zeitmessung ergänzt; Service-Worker-Cache auf `nexowatt-cache-v456` und zentrale Versionskennungen auf 0.8.156 aktualisiert.

## 0.8.155 - 2026-08-05

- §14a-Controller für Feldanlagen gehärtet: Zugeordnete und beschreibbare Ladepunkte werden direkt aus der EVCS-Konfiguration übernommen; aktive Wärme-/Klimageräte und Heizstäbe werden über ihre Fachmodule und Energiefluss-Slots automatisch angebunden.
- Einzel- und Farmspeicher erhalten den verständlichen Schalter **„Netzladen erlauben“**. Nur bei aktivierter Netzladung wird die ausgewählte, tatsächlich beschreibbare Speichertopologie automatisch als §14a-SteuVE berücksichtigt.
- §14a begrenzt bei Speichern ausschließlich Tarif-, Reserve- und sonstige Netzladepfade. PV-/Eigenverbrauchsladen sowie die Entladung bleiben verfügbar; ein zusätzlicher E3/DC-Schalter bleibt eine Hersteller-Unterfreigabe.
- Upgrade-Schutz ergänzt: alte, noch nicht als automatisch markierte Schnellsetup-Zeilen werden anhand ihrer Aktor-Datenpunkte erkannt und weder doppelt als SteuVE gezählt noch für konkurrierende Legacy-Writes verwendet.
- §14a-Berechnung korrigiert: UI-Feld `maxPowerW` wird übernommen, die Basis kann nicht unter 4.200 W fallen, die 40-%-Sonderregel gilt nur für große Wärme-/Klimagruppen und unabhängige Speicher werden nur bei expliziter Konstrukt-ID zusammengefasst.
- Externe EMS-Gesamtsollwerte werden nun auch oberhalb der berechneten Mindestleistung bis zur bekannten Anschlussleistung nach Priorität verteilt; unbekannte Anschlussleistungen erhalten kein ungesichertes Zusatzbudget.
- Boost-, manuelle und externe Anforderungen von Thermik und Heizstab können den aktiven §14a-Deckel nicht mehr umgehen. Der ursprüngliche Benutzer-/Fremdwunsch bleibt während der Begrenzung erhalten und wird nach Freigabe wiederhergestellt.
- Zusätzliche manuelle Verbraucher bleiben möglich, sind in der Oberfläche aber klar von automatisch angebundenen NexoWatt-Fachmodulen getrennt. Neue Diagnose-States zeigen automatische und manuelle Teilnehmer sowie die automatische Teilnehmerliste.
- Die PV-Erzeugerregelung 60/30/0 bleibt als getrennte Erzeugungs-/Wechselrichterfunktion unverändert und wird nicht mit der §14a-Verbraucherbegrenzung vermischt.
- DE-/NL-/EN-Texte ergänzt; Service-Worker-Cache auf `nexowatt-cache-v455` und zentrale UI-/Provider-Versionskennungen auf 0.8.155 aktualisiert.
- Der separate NexoWatt-EEBUS-Adapter ist nicht Bestandteil dieses Pakets und wurde in RC31 weder geändert noch Ende-zu-Ende gegen IF_CLS_CTRL/LPC geprüft.

## 0.8.154 - 2026-08-04

- FENECON/OpenEMS-Hybridregelung grundlegend korrigiert: PV-Erzeugung, Forecast und Tageszeit schalten die Reglerhoheit nicht mehr um. Der beim Speichern beziehungsweise Start eindeutig aufgelöste Regelpfad arbeitet tagsüber und nachts kontinuierlich.
- `Automatisch` verwendet nur dann den nativen FEMS-NVP-Regler, wenn ein echter separater `ctrlBalancing*/SetGridActivePower`-Datenpunkt vorhanden ist und der FENECON der einzige beschreibbare Speicher am NVP ist; andernfalls wird kontinuierlich die direkte ESS-Leistungsregelung verwendet.
- Direkter FENECON-Pfad verwendet als Regelungsfeedback ausschließlich die echte AC-seitige ESS-Leistung (`ess*/ActivePower`, typischerweise Register 604). `powerBalance` sowie PV-/Hybrid-Summen sind als Aktorfeedback und zusätzlicher Feed-forward gesperrt.
- FEMS-NVP-Ziel und direkter ESS-Sollwert dürfen niemals dieselbe Objekt-ID verwenden. `aliases.ctrl.powerSetpointW`/Register 706 wird nicht mehr als FEMS-NVP-Ziel akzeptiert oder automatisch zugeordnet.
- FENECON-Konfigurationsvalidierung und Autozuordnung gehärtet: echte NVP-Ziel-Aliase (`ctrl.gridSetpointW`/`ctrl.napSetpointW`), echte ESS-Rückmeldung und exklusive Kommandofamilien werden geprüft; fehlerhafte Konfigurationen bleiben fail-safe ohne Hardwarewrite.
- Speicherfarm übernimmt dieselben Regeln: gemischte Farms steuern FENECON ausschließlich als direkten ESS-Teilnehmer; ein nativer FEMS-NVP-Master ist nur exklusiv zulässig.
- NexoWatt-Devices-Aliasvertrag um getrennte FENECON-Rollen für AC-ESS-Leistung, interne/externe/Gesamt-PV, momentane Leistungsgrenzen und Sollwert-Readback erweitert.
- Service-Worker-Cache auf `nexowatt-cache-v454` und zentrale UI-/Provider-Versionskennungen auf 0.8.154 aktualisiert.

## 0.8.153 - 2026-08-03

- Ladepunkt-Zuordnung um die Option **„Energie-DP liefert Wh → in kWh umrechnen“** ergänzt. Kumulative Ladeenergie wird bei aktivierter Option vor LIVE-, Session-, History- und Report-Verarbeitung durch 1000 geteilt.
- Bestehende manuelle kWh-Zuordnungen bleiben unverändert; die Option ist standardmäßig aus und verändert weder Momentanleistung noch Stromsollwerte.
- Automatische NexoWatt-Devices-Zuordnung erkennt die kanonische Einheit von `aliases.v1.r.energyTotal` und aktiviert die Wh→kWh-Normalisierung automatisch, wenn das Alias-Manifest `Wh` meldet.
- OCPP-/Objekterkennung wertet `common.unit` des ausgewählten Energiezählers aus und übernimmt die passende Einheitseinstellung in die Ladepunktkonfiguration.
- Initialwerte und laufende Fremd-State-Updates werden vor der Spiegelung nach `evcs.<n>.energyTotalKwh` einheitlich normalisiert, damit Tagesenergie, Lade-Sessions, History und Exporte keine 1000-fach zu großen Werte erhalten.
- DE-/NL-/EN-Texte ergänzt; Service-Worker-Cache auf `nexowatt-cache-v453` und zentrale UI-/Provider-Versionskennungen auf 0.8.153 aktualisiert.

## 0.8.152 - 2026-08-03

- FENECON/OpenEMS DC-/Hybridsysteme im Modus `Automatisch` geben bei frischer PV-Erzeugung die Reglerhoheit vollständig an die interne FEMS-Eigenverbrauchsoptimierung ab; NexoWatt schreibt in diesem Zustand weder `SetActivePowerEquals`/706 noch `SetGridActivePower`.
- Fehlende oder veraltete PV-Messwerte führen fail-safe ebenfalls zu FEMS-Regelhoheit. NexoWatt übernimmt die direkte ESS-/NVP-Regelung erst, wenn eine frische PV-Messung dauerhaft unter der konfigurierten Abschaltschwelle liegt.
- Hysteretische Umschaltung ergänzt: standardmäßig FEMS-Freigabe ab 200 W PV, Nachtübernahme unter 50 W erst nach 120 Sekunden; bestehende Reglerhoheit wird im Zwischenband gehalten.
- No-Write wird im Speicherstatus als `null`/keine externe Vorgabe veröffentlicht und nicht als 0-W-Speicherstopp. Der letzte bestätigte Kommandoanker bleibt nur bis zum konfigurierten FEMS-API-Watchdog diagnostisch erhalten.
- Speicherfarm gehärtet: Ein exklusiver einzelner FENECON-Hybrid kann Tag-FEMS/Nacht-NexoWatt verwenden; gemischte Farms bleiben auf direkter ESS-Leistung und erhalten keine parallele FEMS-Regelhoheit.
- FENECON-AC-Systeme, Sungrow, E3/DC, generische Signed-/Split-Speicher und alle übrigen Herstellerpfade bleiben unverändert.
- Service-Worker-Cache auf `nexowatt-cache-v452` und zentrale UI-/Provider-Versionskennungen auf 0.8.152 aktualisiert.

## 0.8.151 - 2026-08-02

- FENECON/OpenEMS DC-/Hybridsysteme erhalten einen exklusiven nativen FEMS-NVP-Regelpfad über `ctrlBalancing0/SetGridActivePower`; FENECON AC und alle anderen Hersteller bleiben auf der bisherigen direkten Leistungsregelung.
- Speicherfarm pro Zeile um Herstellerprofil, Kopplungsart und FENECON-Regelart (`Automatisch`, `FEMS-NVP-Regler`, `Direkte ESS-Leistung`) ergänzt; höchstens ein nativer FEMS-Master und keine parallelen direkten Farmwriter am selben NVP.
- Sichere Watchdog-Übergabe zwischen direkter ESS-Leistung und nativer FEMS-Regelung: echte Write-Zeitstempel, kein paralleler Controller und kontrollierter Übergangsstatus statt falscher Schreibfehler.
- FENECON-Messrollen für ESS-Aktorfeedback, Minimum/Maximum, Sollwert-Readback sowie interne DC-, externe AC- und Gesamt-PV getrennt.
- AppCenter-Passwortsperre fail-closed gehärtet: Außenklick, Fokuswechsel, Escape und Ausfall der Auth-Status-API geben die Seite nicht frei.
- Endkunden mit SmartHome-Konfigurationsrecht dürfen Datenpunkte suchen, auswählen und speichern; beliebige direkte Hardware-Schreibtests bleiben Installer-only.
- Dynamische-Tarif-Konfiguration als vollbreite, automatisch wachsende responsive Kachel ohne Überlauf neu angeordnet.
- Service-Worker-Cache auf `nexowatt-cache-v451` und zentrale UI-/Provider-Versionskennungen auf 0.8.151 aktualisiert.

## 0.8.150 - 2026-08-01

- **Automatische DP-Zuordnung** für Geräte aus `nexowatt-devices.*` auf Basis von `aliases.meta.manifest`, `aliases.v1`, `deviceClass`, Capabilities und ioBroker-Objektmetadaten.
- Schnell-Inbetriebnahme zeigt vor der Übernahme eine Geräte-/Klassenübersicht, ergänzt standardmäßig ausschließlich leere Felder und aktiviert weder Apps noch Geräte. Manuelle Zuordnungen bleiben autoritativ.
- Geräteklassen fachlich gehärtet: `evCharger` wird als EVCS behandelt; `CHARGER`/`DC_CHARGER` bleiben Solar-/DC-Laderegler und werden nicht als Fahrzeugladepunkte fehlklassifiziert.
- Schreib-DPs werden nur übernommen, wenn `common.write=true`; bei Speichern wird genau eine Kommandofamilie (Split oder Signed) ausgewählt. Mehrdeutige NVP-Zähler- und Speicherfarm-Topologien bleiben bestätigungspflichtig.
- Neue **Tarifprovider-Grundstruktur im AppCenter** mit direkter Anbindung für Tibber, EnergyZero und ENTSO-E sowie konfigurierbarem Ostrom-OAuth-, Custom-REST/JSON- und lokalem Stadtwerk-/Anbieterprofil.
- Internes Preisformat vereinheitlicht auf EUR/kWh-Intervalle mit Qualität, Quelle, Import- und optionalem Einspeisepreis. 15-, 30- und 60-Minuten-Zeitreihen werden unterstützt.
- Interne States für aktuellen Preis, Durchschnittspreis sowie Heute-/Morgen-JSON werden automatisch unter Zuordnung gekoppelt. Die bestehende Tariflogik bleibt alleiniger Resolver für Speicher, EVCS und Kostenoptimierung; kein externer Tarifadapter ist erforderlich.
- Provider-Zugangsdaten werden im AppCenter maskiert und beim Speichern sicher erhalten. Verbindungs- und Normalisierungstest liefert nur nicht-sensitive Vorschauwerte.
- Provider-Abrufe sind API-schonend gehärtet: deterministischer Zeitversatz verteilt Installationen, Fehler verwenden exponentielles Backoff, und Tibber-Preisreihen werden abhängig von vorhandenen Morgenpreisen mehrere Stunden zwischengespeichert statt im EMS-Takt neu abgefragt.
- Freshness-Sicherung: veraltete Preisreihen und Preise werden operativ geleert, damit keine neue Netzlade-, Speicher- oder EVCS-Arbitrage mit alten Daten beginnt. NVP- und Safety-Regelungen laufen unabhängig weiter.
- EnergyZero auf den offiziellen Public-v1-Endpunkt und dessen Viertelstunden-/Stunden-Enums umgestellt; ENTSO-E-Zeitfenster auf das geforderte UTC-Format gehärtet.
- DE-/NL-Übersetzungen für die zentralen neuen Provider- und Schnellinbetriebnahme-Bedienelemente ergänzt; Service-Worker-Cache auf `nexowatt-cache-v450` erhöht.
- Neue Regressionen für Geräteinventar/Autozuordnung, Provider-Normalisierung, Stale-Fail-Safe, AppCenter-Kopplung und geschützte Zugangsdaten.

## 0.8.149 - 2026-08-01

- Sichtbarkeit der optionalen Seite **Energieherkunft & Ladebilanz** vollständig gehärtet: Topbar- und Burger-Menüpunkt erscheinen nur bei gültiger Home-/Pro-Lizenz sowie AppCenter `installed=true` und `enabled=true`.
- CSS-Prioritätsfehler behoben: spätere `display:flex !important`-Regeln für `.menu-item` konnten die allgemeine `.hidden`-Klasse überschreiben und den Menüpunkt trotz deaktivierter App anzeigen. Spezifische Hidden-Regeln stehen jetzt am Ende der Cockpit-Styles.
- Direktzugriff auf `/ledger/energy-origin` serverseitig gesperrt. Ohne aktive App beziehungsweise Lizenz erfolgt eine Weiterleitung zum LIVE-Cockpit; die Seite wird nicht mehr mit einer bloßen Fehlermeldung geöffnet.
- Zusätzliche Client-Sicherung eingeführt: Die Betreiberseite bleibt bis zur bestätigten `/config.featureVisibility.hasEnergyLedger`-Freigabe unsichtbar und leitet bei Deaktivierung oder `app_not_active` zurück auf LIVE.
- Regression erweitert um Route-Gate, aktiv/inaktiv-Lizenzmatrix, CSS-Hidden-Priorität und Client-Feature-Gate; Service-Worker-Cache auf `nexowatt-cache-v449` erhöht.

## 0.8.148 - 2026-08-01

- Release-Version für das integrierte Grundmodul „Energieherkunft & Ladebilanz“; funktional identisch zu 0.8.147 RC23.
- Versionssprung erforderlich, weil 0.8.147 im npm-Registry bereits veröffentlicht und damit unveränderlich ist.

## 0.8.147 - 2026-08-01

- Grundmodul **Energieherkunft & Ladebilanz** aus dem separaten Entwicklungszweig in den aktuellen RC22-Hauptstand übernommen; Home und Pro verwenden denselben read-only 15-Minuten-Bilanzkern.
- Eigene Kunden-/Betreiberseite unter `/ledger/energy-origin` in die Cockpit-Navigation integriert. Der neue Topbar-Reiter **BILANZ** steht direkt hinter History; im Burger-Menü erscheint **Energieherkunft & Ladebilanz**.
- Sichtbarkeit strikt an `AppCenter → Energieherkunft & Ladebilanz → installiert + aktiviert` sowie eine gültige Home-/Pro-Lizenz gekoppelt. Bei deaktivierter App bleiben Menüeinträge verborgen und JSON-/CSV-API antworten mit `app_not_active`.
- Konfiguration bleibt vollständig im AppCenter; die neue Frontend-Seite ist ausschließlich für Betreiberanalyse, 15-Minuten-Journal, Speicher-Herkunftskonto, Messkettenqualität sowie JSON-/CSV-Export zuständig.
- Read-only-Vertrag erhalten: keine Schreibzugriffe auf Speicher, Wallboxen, Wechselrichter, Zähler oder sonstige Fremd-Datenpunkte.
- Gemeinsame Cockpit-Shell erweitert, sodass optionale Bilanznavigation auf LIVE, History, EVCS, SmartHome, Speicherfarm, Einstellungen und Berichtsseiten konsistent erscheint.
- DE-/NL-Systemsprache um **BILANZ/BALANS** und weitere Bilanztexte ergänzt; Service-Worker-Cache auf `nexowatt-cache-v448` erhöht.

## 0.8.146 - 2026-07-27

- EVCS-Speicherschutz und Speicher-Assist nach Betriebsart getrennt: Im reinen Modus `pv` bleibt die Speicherpolicy vollständig neutral; `storageProtectedLoadW` und `storageAssistRequestedLoadW` werden für diesen Ladepunkt nicht gebildet.
- Die Speicherpolicy greift nur noch in den vom Kunden festgelegten Modi `auto`, `boost` und `minpv`. Die Kundenwahl bleibt gespeichert und wird nach einem Moduswechsel aus PV automatisch wieder wirksam.
- Reine PV-Ladung bleibt ausschließlich am physikalischen PV-Budget gekoppelt. Batterieentladung wird bereits in der PV-Überschussberechnung abgezogen, sodass ein zusätzlicher Speicherschutz dort weder erforderlich noch zulässig ist.
- Gemischte Multi-Ladepunktanlagen werden connectorbezogen ausgewertet: Ein PV-Ladepunkt bleibt speicherneutral, während Auto-, Boost- oder Min+PV-Ladepunkte weiterhin Schutz beziehungsweise bestätigte Speicherunterstützung nutzen können.
- Regressionen für Protect und Assist in PV, Auto, Boost und Min+PV ergänzt; bestehende Standby-, 0-W-Puls-, PV-Budget- und Herstellerprofiltests bleiben bestanden.

## 0.8.145 - 2026-07-27

- EVCS-Speicherschutz auf tatsächliche Fahrzeugladeleistung umgestellt: Nur eine frische, bestätigte Fahrzeuglast oberhalb der Aktivitätsschwelle wird als geschützte E-Mobilitätslast oder Speicher-Assist-Bedarf veröffentlicht. Wallbox-Elektronik und Standby bleiben normale Gebäudelast.
- ABL-eMH1-Feldfall abgesichert: `B2 EV has the permission to charge` mit rund 69 W Bereitschaftsverbrauch erzeugt weder `storageProtectedLoadW` noch einen Speicher-Stopp. Eine normale Eigenverbrauchsentladung darf dadurch nicht mehr zwischen Entladen und 0 W pendeln.
- EVCS-Schutzberechnung nach der herstellerunabhängigen Fahrzeugstatus-Normalisierung ausgeführt. `protect` und `assist` sind dabei exklusiv; dieselbe Fahrzeugleistung kann nicht gleichzeitig geschützt und als Speicherunterstützung angefordert werden.
- Kurze Lücken der physischen Speicher-Istleistung gehärtet: Ein frischer gehaltener Messanker oder ein zeitlich begrenzter, durch Kommandodatenpunkt-Readback bestätigter Entladeanker darf die Hauslastberechnung fortführen. Dadurch entstehen zwischen langsameren Batterie-Telemetrieproben keine künstlichen 0-W-Pulse.
- Echte Stoppbedingungen bleiben erhalten: Verursacht die geschützte EVCS-Ladung allein den Netzbedarf, wird die Speicherentladung weiterhin ausdrücklich mit 0 W beendet. Fehlen NVP sowie sämtliche frischen/gehaltenen/bestätigten Speicherbasen, bleibt der Pfad fail-safe.
- Veraltete EVCS-Schutzwerte werden standardmäßig nach 5 Sekunden statt bis zu 60 Sekunden verworfen; der konfigurierbare Bereich ist auf 1 bis 15 Sekunden begrenzt.
- Verdeckte Diagnose je Ladepunkt um tatsächliche Speicher-Policy-Fahrzeuglast und Begründung ergänzt, ohne die sichtbare AppCenter-Statusseite mit neuen Karten aufzublähen.
- Neue Regression `test:evcs-storage-protection-no-standby-pulse` prüft ABL-Standby, reale 4,2-kW-Fahrzeuglast, Assist-/Protect-Exklusivität, veraltete Messwerte, Telemetrielücken, echten EVCS-Alleinlast-Stopp und den fail-safe-Fall ohne Speicherbasis.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt für Fahrzeuglastfilter, Entladeanker und Regressionen von 146.182 auf 146.337 Zeilen.

## 0.8.144 - 2026-07-27

- Zentralen NVP-Schnellregler für Einzelspeicher und Speicherfarm eingeführt: Jede frische externe NVP-Zählerprobe startet nach 75 ms Debounce einen vollständigen zentralen EMS-Tick; der normale Ein-Sekunden-Tick bleibt als Watchdog bestehen.
- Eigenverbrauchsregelung verwendet den frischen signierten Roh-NVP als Hardware-Führungsgröße. Die bisherige Mehrsekunden-Glättung bleibt ausschließlich für Anzeige und Diagnose erhalten und verzögert den Speicher-Sollwert nicht mehr.
- NVP-Hysterese fachlich in eine kleine Messtoleranz umgewandelt. Innerhalb der Toleranz wird der wirksame Sollwert gehalten; außerhalb regelt der Speicher unmittelbar zur konfigurierten Zielmitte statt nur bis zur nächsten Bandkante. Neuer Standard: Zielbezug 50 W, Messtoleranz ±20 W.
- Die geschlossene NVP-Regelung umgeht die allgemeine Home-/Pro-Aufbaurampe. Der physikalisch berechnete Absolutsollwert `Speicher-Ist + (NVP-Ist - NVP-Ziel)` wird mit der nächsten frischen Probe geschrieben; Geräte-, Leistungs-, SoC-, Anti-Export-, Tarif-, §14a-, Authority- und Safety-Grenzen bleiben nachgelagert vollständig aktiv.
- Asynchrones Speicherfeedback bleibt über getrennte Mess- und Kommandoanker abgesichert. Unveränderte NVP-/Speicherproben können denselben Fehler nicht erneut aufintegrieren; eine neue NVP-Änderung wird genau einmal nachgeführt.
- Einzelspeicher und Speicherfarm verwenden denselben zentralen Sollwert. Die Farm verteilt nur den einen Gesamtsollwert auf ihre Speicher; MultiUse liefert ausschließlich SoC-/Reserve-/LSK-Policy und besitzt weiterhin keinen zweiten NVP-Regler.
- AppCenter-Bezeichnungen auf Zielmitte/Messtoleranz und Anzeige-Glättung präzisiert; DE/NL/EN-Kataloge ergänzt. Bestehende bewusst gespeicherte Toleranzwerte bleiben erhalten, neue Konfigurationen verwenden 20 W.
- Neue Regressionen `test:storage-nvp-fast-servo` und `test:storage-nvp-fast-controller` prüfen Zielmittenregelung, Rampen-Bypass, Rohwertführung, Einmalverarbeitung identischer Messproben, Farm-/Single-Parität und debouncte NVP-Ereignisticks.
- Service-Worker-Cache auf `nexowatt-cache-v447` erhöht.

## 0.8.143 - 2026-07-27

- Universelle EVCS-Statusnormalisierung eingeführt: OCPP-, IEC-61851-/Control-Pilot- und bekannte Herstellerzustände werden auf die einheitlichen Zustände `disconnected`, `connected`, `ready_to_charge`, `charging`, `paused_by_evse`, `paused_by_vehicle`, `finishing`, `faulted` und `offline` abgebildet.
- ABL eMH1 wird ohne Sonderlogik in der PV-Regelung erkannt: `B2 EV has the permission to charge` bestätigt jetzt einen ladebereiten Fahrzeugbedarf und reserviert ausschließlich die technische PV-Startleistung; `B1` bleibt „verbunden ohne Bedarf“, `C1/C2/D1/D2` werden als Ladebedarf erkannt.
- Herstellerunabhängige AppCenter-Zuordnung ergänzt: optionale DPs für „Fahrzeug verbunden“, „Ladebedarf/Ladebereit“ und „Heartbeat/LastSeen“ sowie frei konfigurierbare TRUE-/FALSE- und Rohstatus-Wertelisten. Unbekannte Hersteller lassen sich dadurch ohne Änderung der zentralen Lade- oder Budgetlogik semantisch anbinden.
- `Available`, `Idle` und ein freier Connector reservieren weiterhin keine Leistung. Frische reale Ladeleistung und explizite Ladebedarfs-DPs bleiben autoritativ; widersprüchliche Signale werden fail-safe behandelt.
- Ereignisbasierte Bereitschaftszustände dürfen bei frischem Online-/Heartbeat-/Messsignal gültig bleiben, auch wenn der Status-DP nur bei Zustandswechseln schreibt. Veraltete `Faulted`-, `Offline`- oder `Charging`-Texte werden dadurch nicht wiederbelebt.
- Reine PV-Startreservierung gehärtet: Nimmt ein ladebereites Fahrzeug die angebotene technische Mindestleistung innerhalb des konfigurierbaren Antwortfensters nicht an, wird die Reservierung freigegeben und erst nach einem Cooldown erneut versucht. Ein volles oder schlafendes Fahrzeug blockiert damit kein PV-Budget dauerhaft.
- Diagnose um normalisierten Fahrzeugzustand, Beweisquelle, Roh-/Freshness-Werte und PV-Startreservierung erweitert, ohne die sichtbare AppCenter-Statusseite mit neuen Karten aufzublähen.
- Regressionen für ABL B2/B1/C2, OCPP-Status, freie Hersteller-Mappings, explizite semantische DPs, Heartbeat-Persistenz, `Available` ohne Reservierung und PV-Startleistung ergänzt.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offene Runtime-Rahmen wird für Statusnormalisierung, AppCenter-Mappings und Startprobe transparent von 145.433 auf 146.017 Zeilen aktualisiert.

## 0.8.142 - 2026-07-27

- Speicher-Messwert und Speicher-Schreibhoheit getrennt: Ein unter **Energiefluss** manuell zugeordneter `storageSoc` wird jetzt auch bei deaktivierter Speicherregelung und ohne aktive Speicherfarm nach `historie.core.storage.socPct` geschrieben. Damit lassen sich Speicher mit eigener 0-Einspeise-/Eigenverbrauchsregelung ausschließlich anzeigen und dennoch vollständig historisieren.
- `storageSoc` in den fokussierten Live-Refreshplan aufgenommen, damit externe Anzeige-/Historien-DPs unabhängig vom Lifecycle der Regel-App zeitnah aktualisiert werden. Ein aktiver Farm-/Einzelwriter bleibt nur Fallback, wenn kein gültiger expliziter SoC-Override vorhanden ist.
- Heizstab-Energiefluss auf echte Messwertautorität umgestellt: Der im Energiefluss zugeordnete Verbraucher-Leistungs-DP gewinnt vor internen `measuredW`, `appliedW`, `targetW` und nominalen Stufenleistungen. Ein gültiger Wert von **0 W** wird nicht mehr als „fehlend“ behandelt.
- Heizstab-Runtime trennt beobachtete Istleistung von Kommando-/Budgetreservierung. Frische 0-W-Messungen dürfen nicht durch Relais-/Stufenmodelle überschrieben werden; bestätigte EMS-Stufen reservieren trotzdem sofort ihren Zielwert, damit das zentrale PV-Budget nicht doppelt an EVCS, Thermik oder weitere Verbraucher vergeben wird.
- Zentrale Budgetdiagnose veröffentlicht `actualW` aus der beobachteten Heizstableistung auch bei exakt 0 W, während `reserveW`/`budgetUsedW` den bestätigten Aktorbedarf abbilden. Manuelle/externe Heizstableistung bleibt gewöhnliche Hauslast und wird nicht nochmals als EMS-Budget reserviert.
- Neue Regression `test:energy-flow-measurement-authority` führt SoC-Historisierung ohne Speicherwriter, Heizstab-Messwertpriorität einschließlich 0 W, Stufen-Fallback bei fehlender Messung und die einfache zentrale Budgetzählung aus.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der ausgewiesene offene Runtime-Rahmen wird für die Messwert-/Historienentkopplung transparent von 145.340 auf 145.433 Zeilen aktualisiert.
- Service-Worker-Cache auf `nexowatt-cache-v445` erhöht.

## 0.8.141 - 2026-07-27

- Kundenfreigabe der Ladestation von Connector-/Fahrzeugstatus und EMS-Regelung getrennt. Der neue persistente State `chargingManagement.wallboxes.<lp>.userStationEnabled` ist die einzige Kundenentscheidung für **Ladestation An/Aus**; `activeId` bleibt ein reiner Read-Status und wird von der Schnellsteuerung nicht mehr beschrieben.
- PV- und Min+PV-Modus mit fehlendem Überschuss bedeuten jetzt verbindlich **Warten**: Sollleistung 0 W, Sollstrom 0 A und Hardware-Enable bleibt `true`. Die Wallbox kann bei erneutem Überschuss ohne manuelles Wiedereinschalten starten.
- Nur ein ausdrückliches Kunden-Aus oder eine frische Betriebs-/Sicherheitssperre setzt den Hardware-Enable-DP auf `false`; das Abschalten der EMS-Regelung setzt nur den Sollwert auf 0 und lässt die Station für manuelle Nutzung freigegeben.
- Einzel-Wallboxdialog und Multi-Ladepunktansicht verwenden dieselbe Stationsfreigabe. Legacy-Aufrufe `evcs.<n>.active` werden bei aktivem Lademanagement serverseitig auf die neue Kundenfreigabe migriert und dürfen nicht mehr auf den gelesenen `activeId` schreiben.
- Produktiver EVCS-Writer übergibt die Stationsfreigabe explizit an `enableWriteId`. Safe-Stop-, Failsafe- und TS-Fallback-Pfade berücksichtigen eine echte Kundensperre, ohne PV-Wartezustände als Deaktivierung zu behandeln. Online-/Erreichbarkeitsstatus bleibt von der Kundenfreigabe getrennt, damit ein Disable-Befehl auch bei gesperrter Station zuverlässig ausgeführt wird.
- AppCenter-Bezeichnung von `activeId` auf **Fahrzeug/Ladevorgang aktiv (lesen, optional)** präzisiert; frei zugeordnete Run-/Enable-DPs bleiben unverändert autoritativ.
- Neue Regression `test:evcs-station-permission` führt 0-A-PV-Warten mit `enable=true`, aktive Ladung und eine ausdrückliche Kundensperre mit `enable=false` bis zum Consumer-/DP-Writer aus.
- Service-Worker-Cache auf `nexowatt-cache-v444` erhöht; DE/NL-Systemsprache aus RC16 bleibt vollständig erhalten.

## 0.8.140 - 2026-07-27

- Zentrale DE/NL-I18N-Runtime eingeführt. Der UI-Adapter liest die ioBroker-/EOS-Systemsprache aus `system.config.common.language` und übernimmt Änderungen ohne Adapterneustart über `/api/locale`, DOM-Liveübersetzung und ein Sprachwechsel-Event.
- Deutsche und niederländische Benutzeroberfläche bleiben vom Länderprofil getrennt. Das NL-Marktprofil aktiviert P1/DSMR und blendet/deaktiviert die ausschließlich deutsche §14a-Funktion, während ein deutschsprachiger Installateur weiterhin eine NL-Anlage konfigurieren kann.
- LIVE-Dashboard, Energiefluss, EVCS, History, Speicherfarm, SmartHome, NexoLogic, Einstellungen sowie die Kernnavigation des AppCenters erhalten einen zentralen niederländischen Textkatalog. Dynamisch erzeugte Texte, Tooltips, Platzhalter und neu eingefügte DOM-Inhalte werden ebenfalls nachübersetzt.
- Zahlen-, Preis-, Datums- und Uhrzeitformatierung in LIVE und den wichtigsten Berichten verwendet jetzt dynamisch `de-DE`, `nl-NL` oder `en-GB` statt fest verdrahtetem `de-DE`.
- Service Worker liefert die Sprachruntime und DE/NL/EN-Kataloge offline aus; Cache auf `nexowatt-cache-v443` erhöht.
- Neue Regression `test:system-language-i18n` prüft Locale-API, Kataloge, HTML-Einbindung, Markttrennung, NL-P1/DSMR, §14a-Marktgating und dynamische Locale-Formatierung.

## 0.8.139 - 2026-07-23

- NVP-Zielmitte und Hysterese besitzen jetzt genau einen Owner je aktiver Speicher-Topologie: `single` liest ausschließlich **AppCenter → Speicher**, `farm` ausschließlich **AppCenter → Speicherfarm**. MultiUse liefert weiter SoC-, Reserve- und LSK-Policy, übernimmt aber immer die NVP-Abstimmung der ausgewählten Topologie und kann keine zweite Hysterese mehr überlagern.
- Echte Bandregelung statt Regelung zur Zielmitte: Außerhalb des Zielbands wird nur bis zur nächstgelegenen Bandkante korrigiert. Beispiel `Ziel 0 W / Hysterese ±50 W / NVP -65 W` ergibt exakt `-15 W` Ladeanforderung; innerhalb `-50…+50 W` wird kein neuer Korrekturbefehl erzeugt.
- Sollwertauflösung von der Speicher-Nennleistung entkoppelt. Home und Pro verwenden standardmäßig 1-W-Auflösung; die Pro-Nennleistung skaliert weiterhin Rampen, PV-Dynamik, Async-Prognose und Plausibilitätsrahmen. Ein 62-kW- oder 500-kW-Speicher wird damit nicht mehr auf 62-W- beziehungsweise 500-W-Kommandos gerastert.
- Verdeckte zweite Nullzonen aus Eigenverbrauchs-, EVCS-Schutz-, Anti-Export-, Sungrow- und 0-W-Firewall-Pfaden entfernt beziehungsweise auf die technische 1-W-Auflösung zurückgeführt. Kleine physikalisch notwendige Korrekturen bleiben dadurch bis zum tatsächlichen AppCenter-Hardwarewriter erhalten.
- Speicherfarm erhält eigene AppCenter-Felder für NVP-Zielmitte und Hysterese. Bestehende Farmkonfigurationen ohne eigene Werte übernehmen migrationssicher zunächst die bisherige Speicher-Abstimmung; nach dem Speichern sind die Farmwerte autoritativ.
- Gemeinsamer NVP-Bandresolver wird von Einzel-Speicher, Speicherfarm, FENECON-, Sungrow-/Generic-Pfaden, MultiUse-Policy und NVP-Koordinator verwendet. Diagnose trennt Abweichung zur Zielmitte von der tatsächlich regelwirksamen Abweichung zur Bandkante, ohne neue sichtbare Statuskarten hinzuzufügen.
- Neue Regression `test:storage-nvp-topology-hysteresis` prüft 15-W-Korrekturen über Signed-, Sungrow-Split- und Farmwriter, Farm-/Single-Ownership, MultiUse-Vererbung, Pro-62-kW-Auflösung und die identische Banddefinition im NVP-Koordinator. Bestehende Speicher-, Async-, Anti-Export-, FENECON-, EVCS-, Farm- und Kommandoreadback-Regressionen wurden auf die Bandkanten-Semantik umgestellt.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Bestand sinkt trotz Topologieauflösung, Banddiagnose und AppCenter-Verkabelung von 145.217 auf 145.208 Zeilen.
- Service-Worker-Cache auf `nexowatt-cache-v442` erhöht.

## 0.8.138 - 2026-07-22

- Speicher-SoC-Policy zentralisiert: Einzel-Speicherregelung, Speicherfarm, MultiUse-Diagnose und Core-PV-Budget verwenden denselben seiteneffektfreien Resolver. Nur ein tatsächlich aktives MultiUse (`enableMultiUse=true` und `installerConfig.storageMultiUse.enabled=true`) darf Reserve-, LSK- und Eigenverbrauchszonen vorgeben.
- Kritischen Feldfall behoben: Ein vorhandener, aber deaktivierter MultiUse-Datensatz kann keine versteckte 20-%-SoC-Untergrenze mehr in die normale Eigenverbrauchsregelung einschleusen. Bei 19 % SoC, 1,54 kW NVP-Bezug und Standalone-Default 10 % wird wieder rund 1,49 kW Entladung angefordert; bei aktivem MultiUse mit 20-%-Floor bleibt 0 W mit eindeutigem SoC-Sperrgrund korrekt.
- MultiUse-Werte werden nicht mehr nach `storage.self*`, `storage.reserve*` oder `storage.lsk*` gespiegelt. Dadurch bleiben AppCenter-Konfiguration, aktive Policy und Hardwarewriter getrennt; das Deaktivieren von MultiUse hinterlässt keine weiterwirkenden Reserve-/LSK-/SoC-Altwerte.
- Standalone-NVP-Ziel und Deadband werden separat als `standaloneSelfTargetGridImportW` und `standaloneSelfImportThresholdW` erhalten. Alte, nachweislich von MultiUse gespiegelte SoC-Werte werden ignoriert; vorhandene explizite Standalone-Snapshots bleiben autoritativ.
- Speicherfarm und Einzelspeicher nutzen identische SoC-Floors. MultiUse bleibt reine Policy und aktiviert keinen versteckten Hardwarewriter; die zentrale Topologie entscheidet weiterhin exklusiv zwischen `single`, `farm` und `none`.
- Policy-Blockaden werden transparent veröffentlicht: `requestGrund`, `policyBlocked`, `policyBlockReason` und `policySource` zeigen den wirksamen Grund. Der NVP-Koordinator meldet bei 0 W wegen SoC-/Reserve-/Freigabegrenze nicht mehr fälschlich `correcting-storage`, sondern `storage-policy-blocked` beziehungsweise `storage-policy-limited`; eine blockierte 0-W-Vorgabe wird nicht als bevorstehende Speicherwirkung kreditiert.
- AppCenter-Speicher-NVP-Tuning gegen MultiUse-Überlagerung gehärtet. Keine zusätzliche Statuskarte oder dauerhafte Warnbox; die bestehende Statusseite und das Stabilitätslog bleiben kompakt.
- Neue Regressionen `test:storage-policy-core-cleanup`, `test:storage-control-app-separation`, `test:storage-policy-baseline`, `test:storage-policy-runtime` und `test:storage-multiuse-policy-isolation` sind Bestandteil der Publish-Prüfkette und prüfen Standalone, aktives/inaktives MultiUse, Farmgleichlauf, explizite SoC-Sperren und den realen 19-%-/1,54-kW-Fall.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt durch den gemeinsamen Policy-Resolver, eindeutige Sperrdiagnose und Regressionen von 145.128 auf 145.217 Zeilen.
- Service-Worker-Cache auf `nexowatt-cache-v441` erhöht.

## 0.8.137 - 2026-07-22

- Home/Pro-Speicherleistungsprofile ergänzt: Home besitzt einen verbindlichen finalen Lade-/Entlade-Hardcap von 50 kW. Pro bleibt lizenzseitig frei skalierbar; der technische Lizenzschlüssel-/Edition-Alias `eos` bleibt vollständig kompatibel, wird in der Produktoberfläche aber als Pro ausgewiesen.
- Neue optionale Speicher-Nennleistung im AppCenter unter **Speicher**. Der Wert ist ausschließlich ein Skalierungsanker und niemals ein Hardware-Sollwert. Home begrenzt den Eintrag auf 50 kW; Pro kann damit Industrie- und Farmspeicher bis in hohe Leistungsbereiche abbilden.
- Lizenzabhängige Regeldefaults: Home behält 50-W-Schritt, 500 W je Takt, 1,5 kW PV-Rampe, 10 kW Async-Prognose und 1 MW Energiefluss-Plausibilität. Pro skaliert bei hinterlegter Nennleistung standardmäßig mit 0,1 % Schrittweite, 5 % je Takt, 10 % PV-Rampe, 25 % Async-Prognose und mindestens vierfacher Nennleistung für die Plausibilitätsprüfung. Explizite Expertenwerte einschließlich 0 bleiben autoritativ.
- Der Home-Hardcap greift nach Strategie-, Hersteller- und 0-W-Policy, aber vor Budget, Farmverteilung und Hardwarewriter. Dadurch können Hold-/No-Write-Zweige oder alte Sollwerte die Lizenzgrenze nicht umgehen; Laden und Entladen werden symmetrisch begrenzt.
- Backend-Härtung: `/api/installer/config` begrenzt Home-Nennleistung sowie Speicher-Lade-/Entladegrenzen bereits beim Speichern. Legacy-/Rohpatches und alte Farmzeilen können die Home-Grenze nicht umgehen. Geräte-, NVP-, SoC-, §14a-, Authority- und Safety-Grenzen bleiben unabhängig davon wirksam und dürfen stets enger begrenzen.
- Pro-Energiefluss-Plausibilität wird aus der konfigurierten Speicher-/Farm-Nennleistung abgeleitet. Ohne Nennleistungsangabe bleibt Pro mit einem hohen technischen Plausibilitätsrahmen frei skalierbar, statt an der bisherigen statischen 1-MW-Annahme zu scheitern.
- Kompakte Diagnose-States `license.storagePowerProfile`, `license.maxStoragePowerW` sowie `speicher.regelung.licensePower*` ergänzt. Keine neue Statuskarte oder dauerhafte Warnbox; die AppCenter-Statusseite bleibt kompakt.
- Neue Regression `test:storage-license-power-profiles` prüft Edition-Aliase, Home-Hardcap in beiden Richtungen, Pro-Industrieskalierung, Farm-Nennleistungsableitung, Backend-Gate, AppCenter-Verkabelung und die Position des finalen Caps in der produktiven Speicher-Kommandokette.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt durch Lizenzprofil, UI-Verkabelung und Regressionen von 144.558 auf 145.128 Zeilen.
- Service-Worker-Cache auf `nexowatt-cache-v440` erhöht.

## 0.8.136 - 2026-07-22

- Speicher-NVP-Anti-Export (Baustein 9) als finale herstellerunabhängige Entladeschranke ergänzt: Ein frischer signierter NVP-Wert begrenzt positive Speicherentladung nach Strategie-, Budget- und Herstellerlogik, aber noch vor Speicherfarm/Hardwarewriter und Kommandodatenpunkt-Readback.
- Kein pauschaler Sofort-Stopp bei einer einzelnen Einspeiseprobe: Die Entladung wird ab dem ersten Messwert proportional auf den physikalisch noch benötigten NVP-Anteil reduziert. Eine konfigurationsintern auf 2 Sekunden begrenzte Grace-Zeit toleriert kurze Mess-/Regelüberschwinger; bei anhaltender Einspeisung senkt jede neue NVP-Probe den akzeptierten Befehl weiter ab. Derselbe Messwert wird niemals mehrfach integriert.
- Nach Ablauf der Grace wird 0 W nur dann als ausdrücklicher Sicherheitsstopp geschrieben, wenn rechnerisch keine sichere Entladung mehr verbleibt. Ein kurzer Export, der vor Ablauf verschwindet, setzt den Anti-Export-Zustand zurück und die normale Eigenverbrauchsregelung übernimmt ohne künstliche 0-W-Runde.
- Frische NVP-Messung besitzt Vorrang vor Sungrow-Hold, No-Write, PV-/Last-Feed-forward, asynchroner Speicherprognose sowie Tarif-/MultiUse-Präferenzen. Unter aktiver Korrektur wird der reduzierte Sungrow-Befehl ausdrücklich geschrieben; ein alter Entladebefehl darf nicht gehalten werden.
- Die Schranke gilt identisch für Sungrow, FENECON/OpenEMS, E3/DC, Signed-Sollwert, getrennte Lade-/Entlade-DPs, Einzelspeicher und Speicherfarm. Frei im AppCenter zugeordnete DPs bleiben autoritative Hardwareziele; Safety-, Authority-, §14a- und SoC-Gates sowie der RC10-Kommandodatenpunkt-Readback bleiben vollständig aktiv.
- LIVE/History physikalisch kohärent gehärtet: Gleichzeitig positive Import-/Export-Splitwerte werden auf einen signierten Nettofluss normalisiert, sodass nur Bezug oder Einspeisung dargestellt wird. Dasselbe gilt für gleichzeitig positive Lade-/Entlade-Istwerte; die Bruttowerte und der erkannte Rohdatenkonflikt bleiben in der Diagnose erhalten.
- AppCenter → Status bleibt kompakt: keine neue sichtbare Karte oder Warnbox. Die technische Kette steht ausschließlich in `speicher.regelung.antiExportStatus`, `speicher.regelung.antiExportJson` sowie den bestehenden NVP-/Stabilitätslogs.
- Neue Regression `test:storage-anti-export-ramp` prüft den Sungrow-Feldfall mit 3 kW Entladung und 1 kW NVP-Einspeisung über mehrere reale Tick-Zyklen: proportionaler erster Abbau, etwa 2 Sekunden Toleranz, keine Mehrfachintegration derselben Probe, monotone weitere Absenkung und bestätigter 0-W-Befehl erst bei anhaltender Nichtreaktion. Measurement- und Topologie-Regressionen prüfen zusätzlich die Netto-Normalisierung der History/LIVE-Flüsse.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt durch Anti-Export-Regler, History-Normalisierung und Regressionen von 144.090 auf 144.558 Zeilen. Service-Worker-Cache auf `nexowatt-cache-v439` erhöht.

## 0.8.135 - 2026-07-22

- AppCenter-Speicherzuordnung gehärtet: Manuell im Reiter **Speicher** hinterlegte Objekt-IDs bleiben die persistierte und autoritative Quelle. Ein allgemeiner Energiefluss-Fallback wie `r` darf den vollständigen Istleistungs-DP weder nach dem EMS-Neustart überschreiben noch über `/api/installer/config` zurück in das Formular spiegeln.
- Globale Speicher-Messwerte aus `datapoints.*` werden ausschließlich in einem privaten, nicht persistierbaren Runtime-Snapshot geführt. Sie springen weiterhin ein, wenn im Speicher-Reiter kein eigener SoC-/Istleistungs-/DC-PV-DP gesetzt ist; Sollwert-, Run-, Freigabe- und Limit-DPs bleiben davon vollständig getrennt.
- Zentrale Speicher-DP-Normalisierung ergänzt: Aktuelle kanonische Felder gewinnen auch gegen alte Aliasfelder; ein bewusst geleertes Feld bleibt leer. Generische Fragmente wie `powerId = r` werden nicht als Speicher-Istleistung migriert. Ein erkennbar verkürzter Wert kann aus einer noch vorhandenen vollständigen lokalen Legacy-ID repariert werden, ohne Hersteller- oder Adapter-Whitelist.
- Installer-API liefert AppCenter-Konfigurationen aus dem persistierten `installer.configJson`-Patch statt aus der zur Laufzeit ergänzten Adapterkonfiguration. Dadurch können Runtime-Fallbacks nicht mehr als manuelle Zuordnung gespeichert werden.
- DP-Eingabefelder übernehmen getippte, eingefügte und per Picker gewählte Objekt-IDs sofort in `currentConfig`; vor jedem Save werden alle sichtbaren DP-Felder nochmals synchronisiert. Nach dem Verlassen des Feldes wird der Anfang der vollständigen ID sichtbar, der komplette Wert bleibt zusätzlich als Tooltip erhalten.
- Neue Regression `test:storage-appcenter-dp-persistence` deckt den realen Fehlerfall `vollständige manuelle ID` gegen `globaler Runtime-Fallback r`, explizites Leeren, Legacy-Migration, Fragment-Recovery, API-Source-of-Truth und Frontend-Save-Synchronisierung ab. Die bestehende Override-Regression wurde auf die neue runtime-only Semantik umgestellt.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt durch die Save-/API-Härtung von 144.081 auf 144.090 Zeilen. Service-Worker-Cache auf `nexowatt-cache-v438` erhöht.

## 0.8.134 - 2026-07-20

- Speicher-Kommandokette (Baustein 8) exklusiv gehärtet: Pro Speicher ist genau eine Sollwertfamilie aktiv. Eine vollständig zugeordnete getrennte Lade-/Entladefamilie gewinnt vor einem zusätzlich vorhandenen Signed-DP; andernfalls wird Signed oder der herstellerspezifische E3/DC-RSCP-Pfad verwendet. Der frühere Parallelbetrieb `signed+split-targetPower` ist entfernt.
- Nicht ausgewählte alternative Sollwertfamilien werden vor der aktiven Vorgabe kontrolliert auf 0 W neutralisiert. Dadurch kann ein alter Signed-, Lade-, Entlade- oder E3/DC-Befehl den ausgewählten Hardwarepfad nicht mehr übersteuern. Echte Objekt-ID-Doppelbelegungen werden als Zuordnungskonflikt blockiert; frei benannte AppCenter-DPs bleiben vollständig zulässig.
- Direkter Richtungswechsel bei getrennten DPs bleibt ohne zusätzliche 0-W-Regelrunde erhalten: Im selben Write-Plan wird zuerst die inaktive Richtung auf 0 W gesetzt und unmittelbar danach die neue Richtung beschrieben. Laden → Entladen schreibt damit `charge=0` vor `discharge=Soll`; Entladen → Laden entsprechend umgekehrt.
- Kommandodatenpunkt-Readback für Einzelspeicher und Speicherfarm ergänzt. Signed-, Split-, E3/DC-, Run-, Freigabe-, Limit- und Reservekommandos werden nach dem Write gegen den tatsächlichen ioBroker-DP geprüft. Abweichungen wie `direction-handover-failed`, `signed-command-mismatch`, `run-command-mismatch` oder `command-dp-mismatch` gelten nicht mehr als akzeptierte Speicherleistung.
- Bei einem bestätigten Kommando-Readbackfehler wird der Write-Cache verworfen und die Run-Freigabe best effort sicher gelöst. NVP-Prognose, EVCS-Speicherunterstützung, Tarifstatus und Farm-Akzeptanz dürfen nur noch einen vollständig bestätigten Kommandopfad als wirksam berücksichtigen.
- Speicherfarm-Dispatch verwendet dieselbe exklusive Familienauswahl und bestätigt akzeptierte Leistung erst, wenn aktiver Sollwert, inaktive Gegenrichtung und erforderliche Freigaben korrekt zurückgelesen wurden. Teil- oder Fehlwrites bleiben als nicht akzeptierte beziehungsweise fehlgeschlagene Leistung sichtbar.
- AppCenter → Status bleibt unverändert kompakt: keine neue Karte und keine zusätzliche sichtbare Detailzeile. Die Diagnose erfolgt über `speicher.regelung.commandFamily`, `commandDpReadbackStatus`, `commandDpReadbackJson`, `lastWriteSplitJson`, `storageFarm.lastDispatchJson` und das vorhandene Stabilitätslog.
- Neue Regression `test:storage-command-family-readback` sowie erweiterte AppCenter-, Sungrow-, Farm-, EVCS-, NVP-, Async-Feedback- und 0-W-Prüfungen sichern Split-Priorität, Neutralisierung alter Alternativbefehle, direkte Übergabereihenfolge, absichtlich verschluckte Writes und die Trennung zwischen EMS-Berechnung, Kommandodatenpunkt und physischer Speicherreaktion ab.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt für exklusive Kommandofamilien, Readback und Regressionen von 143.426 auf 144.081 Zeilen.
- Service-Worker-Cache auf `nexowatt-cache-v437` erhöht.

## 0.8.133 - 2026-07-20

- EVCS-Speicherschutz (Baustein 7) physikalisch asymmetrisch korrigiert: Geschützte Ladepunkte dürfen nicht aus dem stationären Speicher versorgt werden. Der Speicher entlädt weiterhin ausschließlich für Haus-/sonstige Lasten ohne E-Mobilität und lädt nur aus einem tatsächlich vorhandenen Gesamtüberschuss am Netzverknüpfungspunkt.
- Der frühere symmetrische EVCS-NVP-Zieloffset ist neutralisiert. Dadurch kann eine teilweise durch PV versorgte Wallbox keinen künstlichen Lade-Headroom mehr erzeugen und weder Eigenverbrauchs-, Tarif- noch Herstellerlogik dürfen den Speicher parallel aus dem Netz laden.
- Laufende falsche Richtungen werden sauber beendet: Eine alte Speicherladung wird bei fehlendem Gesamtüberschuss mit einem expliziten 0-W-Stop zurückgesetzt; eine nicht mehr benötigte Entladung wird ebenfalls gestoppt, wenn PV Gebäude und EVCS bereits deckt. Ohne aktiven vorherigen Speicherbefehl wird kein unnötiger 0-W-Write erzeugt.
- Hausausgleich bleibt erhalten: Der erlaubte Entladeanteil wird aus NVP, bestätigter Speicher-Istleistung, kleinem NVP-Ziel und geschützter EVCS-Leistung berechnet. Fehlt bestätigtes Speicherfeedback, wird ein alter negativer Ladebefehl niemals als Überschussnachweis verwendet; ein positiver akzeptierter Entladebefehl fließt nur konservativ in die Überschussprüfung ein, damit eine noch nicht bestätigte Entladewirkung nicht unmittelbar als Freigabe zum Netzladen fehlgedeutet wird.
- Die finale Schutzschranke liegt nach Sungrow-, FENECON- und E3/DC-Profilen und vor Budget, 0-W-Firewall und Hardwarewriter. Sie gilt damit identisch für Einzelspeicher, Speicherfarm, Signed- und getrennte Lade-/Entlade-DPs sowie alle frei im AppCenter zugeordneten Hardwareziele.
- Keine Erweiterung der AppCenter-Statusseite. Die vorhandenen Diagnose-States und JSON-/Stabilitätslogs zeigen Schutzaktion, geschützte Last, erlaubte Lade-/Entladeleistung und Stopgrund.
- Neue und erweiterte Regressionen prüfen den Kundenfall `NVP +3.200 W / Speicher -2.300 W / EVCS 3.580 W`, Hauslastausgleich, stabilen Überschussbetrieb, Tarif-Netzladeblockade, fehlendes Feedback, Richtungsstopp und die 0-W-Firewall.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt für die zentrale EVCS-Speicherschutzschranke und Regressionen von 143.115 auf 143.426 Zeilen.
- Service-Worker-Cache auf `nexowatt-cache-v436` erhöht.

## 0.8.132 - 2026-07-20

- Multi-Lademanagement: Neue installerfreigegebene globale Kundenbedienung „Speicher schützen / Speicher mitnutzen“ unter AppCenter → Ladepunkte. Bei mindestens zwei aktiven Ladepunkten setzt der Schalter auf der normalen EVCS-Seite den Speicherschutz konsistent für alle aktiven Ladepunkte; ohne Freigabehaken bleibt die bisherige Bedienung pro Ladepunkt erhalten.
- Serverseitige Konsistenzsperre: Ist die globale Bedienung aktiv, werden widersprüchliche Einzel-Ladepunkt-Schreibwege abgewiesen. Stationsdisplays zeigen dann nur einen kompakten Hinweis auf die zentrale EVCS-Bedienung und bieten keinen eigenen Speicher-Override an.
- Stationsseiten werden jetzt mit einer bestehenden Ladeinfrastruktur-Station verknüpft. Im automatischen Modus erscheinen sämtliche aktiven Ladepunkte/Connectoren mit demselben `stationKey`, sortiert nach Connectornummer; bestehende manuelle `lp1, lp2`-Zuordnungen bleiben als Legacy-/Expertenmodus erhalten.
- Die normale EVCS-Seite bleibt die Gesamtübersicht über alle Ladepunkte. Jede separate Stationsseite zeigt ausschließlich die Ladepunkte ihrer zugeordneten Station und kann dadurch DC-Stationen mit zwei, drei, vier oder mehr Ladepunkten vollständig bedienen.
- Responsive Stationsdisplay-Layouts für Hochformat, Querformat, geringe Displayhöhe sowie fünf und mehr Connectoren ergänzt. Hintergrund, allgemeines Stationsdesign und die bestehende EVCS-Hauptansicht wurden nicht neu gestaltet.
- Neue Release-Regression `test:evcs-global-storage-station-pages` prüft Installerfreigabe, globalen Multi-LP-Write, Einzel-LP-Sperre, Stationsgruppen-Ableitung, Connectorreihenfolge, Legacy-Fallback und responsive Multi-Port-Darstellung.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt für globale EVCS-Bedienung und Stationsseiten von 142.775 auf 143.115 Zeilen.
- Service-Worker-Cache auf `nexowatt-cache-v435` erhöht.

## 0.8.131 - 2026-07-20

- EVCS-Bereitschaftsstatus gehärtet: `Available`, `Ready` und `Idle` gelten als stabile, ereignisbasierte Ruhezustände. Ein unveränderter Zeitstempel darf diese Zustände nicht mehr als „Status veraltet“ markieren.
- Transiente und sicherheitsrelevante Zustände bleiben unverändert freshness-pflichtig: unter anderem `Preparing`, `Charging`, `SuspendedEV`, `Faulted`, `Unavailable` und `Offline`. Alte Fehler- oder Ladezustände werden weiterhin nicht als aktuelle Wahrheit übernommen.
- Die EVCS-Kundenansicht zeigt bei einem lange unveränderten `Available` wieder schlicht die Einsatzbereitschaft. Es wurden keine neuen Karten, Detailfelder oder sichtbaren Diagnosezeilen ergänzt; Alter und Rohquelle bleiben in den bestehenden Diagnose-States verfügbar.
- Regression `test:evcs-status-hardening` erweitert: Der reale Feldfall mit einem 3922 Minuten alten `Available`-Status bleibt gültig, während gleich alte `Charging`- und `Faulted`-Werte weiterhin als stale gelten.
- TypeScript-Migrationskontrolle: keine zusätzliche `@ts-nocheck`-Datei (weiterhin 58); der offen ausgewiesene Zeilenrahmen steigt für die zentrale EVCS-Altersregel von 142.740 auf 142.775 Zeilen.
- Service-Worker-Cache auf `nexowatt-cache-v434` erhöht.

## 0.8.130 - 2026-07-19

- EMS-Stabilisierungsbaustein 6 (RC6): Die NVP-Speicherregelung verwendet bei asynchroner oder langsamer Speichertelemetrie einen unveränderlichen echten Messwertanker und einen getrennten, erst nach akzeptiertem Hardware-Write aktivierten Kommandoanker. Derselbe NVP-Fehler kann dadurch bei unverändertem Speicher-Istwert nicht mehr in jedem Regelzyklus erneut auf den Sollwert addiert werden.
- Sungrow-Feldfall als Pflichtregression: Bei `NVP +526 W`, Ziel `+50 W` und Speicher-Ist `+2000 W` bleibt der Sollwert über mindestens zehn identische Zyklen bei `+2476 W` und läuft nicht mehr auf `+4476 W` hoch. Eine Änderung des NVP wird nur einmal als Fehlerdifferenz nachgeführt; ein neuer realer Speicher-Istwert verankert die Berechnung anschließend neu.
- Asynchrones Feedback für Signed-, Split-, Sungrow-, E3/DC- und Speicherfarm-Ausgänge vereinheitlicht. Getrennte Lade-/Entlade-Istwerte liefern jetzt einen gemeinsamen Sample-Zeitstempel beziehungsweise Sample-Schlüssel, damit nur eine tatsächlich neue Hardwaremessung als neue Regelbasis gilt.
- Sungrow-NVP-Pfad gehärtet: Reine NVP-/Feed-forward-Entlade-Caps dürfen einen korrekt gehaltenen asynchronen Zielwert nicht in nachgelagerten Vorprüfungen erneut verkürzen. SoC-, Reserve-, Tarif-, EVCS-, Peak-Shaving-, Geräte-, Authority- und Safety-Grenzen bleiben vollständig bindend.
- NVP-Reaktionsdiagnose an den tatsächlich akzeptierten Befehl gekoppelt: Materielle Sollwertänderungen in derselben Richtung starten das Reaktionsfenster neu; Fortschritt wird nur bei einem neuen realen Istwertsample bewertet. Das Basisfenster beträgt 10 Sekunden und wird anhand der beobachteten Speichertelemetrie begrenzt bis maximal 30 Sekunden angepasst.
- Neue Diagnosewerte veröffentlichen Messwertzeitpunkt und -takt, akzeptierten Kommandozeitpunkt/-sollwert/-quelle sowie den asynchronen Regelanker in `speicher.regelung.balanceAsyncJson`, `ems.nvpCoordinator.statusJson` und `ems.nvpCoordinator.logJson`.
- AppCenter → Status bleibt bewusst kompakt: keine zusätzlichen Karten oder sichtbaren Detailzeilen. Die neuen Async-, Telemetrie- und Kommandoinformationen stehen ausschließlich in den vorhandenen JSON-Diagnosen und im begrenzten Stabilitätslog zur Verfügung.
- Neue Release-Regression `test:storage-async-feedback-all-profiles` sowie erweiterte Speicher-, NVP- und Diagnoseprüfungen sichern langsame/veraltete Telemetrie, NVP-Änderungen ohne neues Istwertsample, neue reale Samples, direkte Richtungswechsel und die unveränderte kompakte Statusansicht ab.
- TypeScript-Migrationskontrolle: Es wurde keine weitere Runtime-Datei mit `@ts-nocheck` versehen (weiterhin 58 Dateien). Der explizite Zeilenrahmen wurde für die zusätzlichen Messanker-, Kommandoanker- und Diagnosestrukturen von 142.370 auf 142.740 Zeilen angehoben; die technische Schuld bleibt damit offen ausgewiesen.
- Service-Worker-Cache auf `nexowatt-cache-v433` erhöht.

## 0.8.129 - 2026-07-19

- EMS-Stabilisierungsbaustein 5 (RC5): Speicherfarm-Dispatch trennt angeforderte, geplant verteilte, vom Hardwarewriter akzeptierte, fehlgeschlagene und nicht verteilbare Leistung. Ein teilweise erfolgreicher Farm-Write wird als `farm-partial` mit `schreibOk=false` ausgewiesen; NVP-Koordinator, Tarifdiagnose und nachgelagerte Budgets rechnen ausschließlich mit der tatsächlich akzeptierten Farmleistung.
- Gemeinsames Same-Cycle-Leistungsledger: Wallboxen, MultiUse-Verbraucher, Wärmepumpe/Klima, Heizstab, NexoLogic, BHKW/Generator und Schwellwertaktoren melden nur erfolgreiche, frische und physikalisch quantifizierbare Leistungsänderungen. Die finale PV-/WR-Regelung läuft nach diesen Aktoren und verarbeitet nur den verbleibenden NVP-Export; fehlgeschlagene oder unklare Aktoränderungen werden nicht optimistisch gutgeschrieben.
- EVCS-Speicherunterstützung verwendet die ausgewählte stationäre Speichertopologie: Farm-SoC und verfügbare Farm-Entladeleistung bei `farm`, Einzel-SoC und Einzel-Entladeleistung bei `single`, kein stiller Farm→Einzel-Fallback. Fahrzeug-SoC, Ziel-SoC und Abfahrtszeit bleiben ausschließlich für das Zeit-/Zielladen des Fahrzeugs zuständig. Zusätzliches EVCS-Ladebudget entsteht nur aus frisch bestätigter, tatsächlich akzeptierter Speicherentladung; das NVP-Bezugslimit bleibt die harte Grenze.
- EVCS/OCPP-Statushärtung: Connector 0 darf nur einen echten Stations-Online-DP weitergeben, aber niemals Status, Enable oder Active an Connector 1..N vererben. `Faulted` und `Unavailable` bedeuten erreichbar, aber betrieblich gesperrt; `Offline` bleibt fehlender Erreichbarkeit vorbehalten. Nur frische, connectorrichtige und nicht zwischen Ladepunkten geteilte Statuswerte dürfen blockieren. Veraltete oder falsch zugeordnete Rohwerte bleiben Diagnose und werden in der EVCS-Oberfläche als nicht bestätigt beziehungsweise veraltet angezeigt.
- Tarif-/Speicherstatus zeigt bei Farm-Teilerfüllung den akzeptierten Sollwert als wirksame Zielgröße und veröffentlicht angefordert, geplant, akzeptiert, Write-Fehler und offenen Rest getrennt. Ein alter Istwert darf einen fehlgeschlagenen oder nur teilweise angenommenen Befehl nicht als vollständig ausgeführt darstellen.
- Neue Regressionen `test:accepted-power-effects` und `test:evcs-status-hardening` sowie erweiterte Farm-, NVP-, Tarif-, Topologie- und Charging-Szenarien prüfen Teilerfüllung, fehlgeschlagene Writes, Same-Cycle-Aktoreffekte, ausgewählte SoC-Quelle, bestätigte Speicherunterstützung, Connector-0-Trennung, Faulted/Unavailable/Offline und veraltete Statuswerte.
- TypeScript-Migrationskontrolle: Es wurde keine weitere Runtime-Datei mit `@ts-nocheck` versehen (weiterhin 58 Dateien). Der explizit versionierte Zeilenrahmen wurde für die zusätzlichen Integrations- und Diagnosestrukturen von 141.417 auf 142.370 Zeilen angehoben; diese technische Schuld bleibt damit sichtbar statt stillschweigend umgangen.
- Service-Worker-Cache auf `nexowatt-cache-v431` erhöht.

## 0.8.128 - 2026-07-19

- EMS-Stabilisierungsbaustein 4 (RC4): Neuer zentraler `NvpCoordinatorModule` ordnet die NVP-Regelung in einem festen Ablauf. Speicher oder Speicherfarm erhalten zuerst genau einen finalen Sollwert; die dynamische PV-/WR-Regelung verarbeitet anschließend ausschließlich die nach einer belastbaren Speicherreaktion verbleibende Einspeisung.
- Physikalische Restwertrechnung: `NVP_prognose = NVP_ist - (Speicher_soll - Speicher_ist)`. Eine noch ausstehende Speicherreaktion wird nur bei frischem, vertrauenswürdigem Istwert sowie akzeptiertem Write und nur innerhalb einer begrenzten Reaktionszeit berücksichtigt. Blockierte, fehlgeschlagene oder dauerhaft wirkungslose Speicherbefehle werden nicht optimistisch von der PV-Regelung abgezogen.
- Grid-Constraints laufen im zentralen EMS zweiphasig: RLM, Netzgrenzen und statische EVU-Vorgaben vor den Aktoren; Nulleinspeisung beziehungsweise Exportbegrenzung nach dem Speicher. Bei Netzbezug werden dynamische PV-Limits gelöst, bei Einspeisung wird nur der Rest begrenzt. Lizenz-, App-, Installer-, Owner-, Authority- und Safety-Gates bleiben wirksam; der Koordinator erzeugt keinen zweiten Speicherwriter.
- Speichergrundregeln bleiben unverändert: Laden ↔ Entladen erfolgt direkt ohne 0-W-Zwischenrunde. `0 W` bleibt echten Stop-, Warte-, Sperr- und Sicherheitsentscheidungen vorbehalten. Farm und Einzelspeicher bleiben exklusiv, manuell zugeordnete AppCenter-DPs bleiben die tatsächlichen herstellerunabhängigen Hardwareziele.
- LIVE-Energiefluss: Ausschließlich die Tarif-Infozeile ist wieder kompakt wie vor RC3; Wattwerte, Resolverkette, Gate-, Farm- und Readback-Details werden dort nicht mehr ausgeschrieben. Die Energieflussknoten, Leistungen, Linien, Farben, Animationen und Aktualisierung bleiben unverändert.
- Neue Einstellungsdiagnose unter AppCenter → Status zeigt NVP-Ist/Ziel/Toleranz, Messquelle und Alter, Speicher-/Farm-Ist und -Soll, Write-/Readback-Status, prognostizierten Rest-NVP, PV-/WR-Aktion sowie die kompakte und vollständige Tarifkette. `ems.nvpCoordinator.logJson` führt einen begrenzten Ringpuffer für Stabilität, Pendeln, Reaktionszeiten, Gates und PV-Eingriffe.
- Neue Regressionen prüfen den Feldfall `+1011 W` NVP, `-73 W` Speicher-Ist und `+888 W` Soll mit prognostizierten `+50 W`, Speicher-vor-PV-Restverteilung, Reaktionstimeout, blockierte Writes, direkte Richtungswechsel, Lizenz-/App-Gates sowie die Trennung zwischen kompakter LIVE-Zeile und ausführlicher Einstellungsdiagnose.
- Service-Worker-Cache auf `nexowatt-cache-v430` erhöht.

## 0.8.127 - 2026-07-19

- EMS-Stabilisierungsbaustein 3 (RC3): Tarifabsicht, zentraler Speicher-Resolver, Safety-/Authority-Gates, Hardware-Write, Farm-Dispatch und Istwert-Readback werden als getrennte Stufen ausgewiesen. Die Tarifansicht übernimmt nicht mehr ihre eigene Strategieabsicht als vermeintlich ausgeführten Speicherzustand.
- Neue nachgelagerte `TariffStatusModule`-Auswertung läuft erst nach der Speicherregelung und besitzt keine Schreibhoheit. `Speicher lädt` oder `Speicher entlädt` wird nur noch bei frischem, vertrauenswürdigem Istwert mit passender Richtung gemeldet; andernfalls zeigt der Status ausdrücklich `angefordert`, `wartet`, `blockiert`, `Schreibfehler`, `Rückmeldung fehlt/veraltet` oder einen Richtungswiderspruch.
- Tarifstatus-Freshness: Ein alter `_tarifVis`-Snapshot darf keine veraltete Tarifabsicht weiter anzeigen. Tarifwunsch und tatsächlich wirksamer Speicherbefehl bleiben auch dann getrennt, wenn Eigenverbrauch, MultiUse, Peak-Shaving oder eine Sicherheitsgrenze den finalen Sollwert verändert.
- Speicherfarm-Diagnose: Nur ein frischer Farm-Dispatch, der zum aktuellen finalen Sollwert gehört, wird als Bestätigung ausgewertet. Gelieferte und nicht bediente Farmleistung sowie Authority-Sperren werden sichtbar, ohne eine alte Verteilung als aktuellen Erfolg auszugeben.
- Neue Diagnose-States unter `tarif.*` veröffentlichen Intent, Resolver-Request, finalen Sollwert, Topologie, Gate-/Write-Ergebnis, Readback-Freshness, Farm-Teilerfüllung und den vollständigen Statusvertrag als JSON. Sie sind über die bestehende State-API/SSE verfügbar.
- Manuelle AppCenter-DP-Zuordnungen, der exklusive Farm-/Einzelwriter aus 0.8.126 und der direkte Richtungswechsel aus 0.8.125 bleiben unverändert. Das neue Modul führt keine Hardware-Writes aus und umgeht keine Owner-, Authority-, §14a-, Netz-, Geräte- oder Safety-Gates.
- Neue Regression `test:tariff-storage-status-truth` prüft bestätigtes Laden/Entladen, Readback-Verzögerung und -Ausfall, Richtungswiderspruch, 0-W-Wartezustand, Gate-Sperre, Write-Fehler, Farm-Teilerfüllung, veraltete Tarif-Snapshots und die Modulreihenfolge nach der Speicherregelung.
- Service-Worker-Cache auf `nexowatt-cache-v429` erhöht.

## 0.8.126 - 2026-07-19

- EMS-Stabilisierungsbaustein 2 (RC2): Eine zentrale Speicher-Steuerhoheit wählt pro Regelzyklus exakt eine Ausgangstopologie `farm`, `single` oder `none`. Eine aktive beschreibbare Farm hat Vorrang; eine reine Mess-Farm verdrängt den Einzelspeicher nicht. Bei Farmfehlern gibt es keinen versteckten Parallel- oder Einzel-Fallback.
- MultiUse ist wieder reine Policy: SoC-Zonen, Reserven und Strategie werden an denselben zentralen Speicherresolver geliefert, ohne die Einzel-Speicher-App verdeckt zu aktivieren. MultiUse funktioniert damit sowohl mit Einzelspeicher als auch mit Speicherfarm.
- Der direkte Lade-/Entlade-Richtungswechsel aus 0.8.125 bleibt verbindlich: kein `0 W` als Umschaltmechanismus und keine Rampe in der alten Richtung. `0 W` bleibt echten Stop-, Warte-, Sperr- und Sicherheitszuständen vorbehalten.
- App-Abhängigkeiten vereinheitlicht: Core-Budget/PV-Rekonstruktion, Tarif-SoC, EVCS-PV-Budget, Heizstab/Thermik-Reserve, BHKW/Generator, AI-Advisor, Energiefluss, Storage-Mapping und Stage-A-Diagnose verwenden dieselbe ausgewählte Speichertopologie und mischen keine alten Farm-/Einzelwerte.
- Manuelle AppCenter-DPs bleiben herstellerunabhängig und autoritativ. Der ausgewählte Writer führt den finalen Wert weiterhin über Owner-, Authority-, Konflikt-, §14a-, Netz-, Geräte- und Safety-Gates zum exakt zugeordneten Objekt.
- Der typisierte Core-Runtime-Snapshot veröffentlicht zusätzlich Speichertopologie, Writer-Aktivität und Authority-Grund; Legacy- und TS-Snapshot werden auch für diese Felder auf Parität geprüft.
- Neue Regression `test:storage-topology-authority` prüft AppCenter-Priorität, MultiUse mit beiden Topologien, read-only Farm, fehlenden Farm-Fallback, Topologiewechsel, Messquellen und Core-Budget. Abhängige Speicher-, Farm-, Tarif-, Charging-, Thermik- und Prime-Mover-Szenarien wurden erweitert.
- Service-Worker-Cache auf `nexowatt-cache-v428` erhöht.

## 0.8.125 - 2026-07-18

- Erster begrenzter EMS-Stabilisierungsbaustein (RC1): Lade-/Entlade-Richtungswechsel werden in der Einzel-Speicherregelung und in der Speicherfarm direkt mit dem neuen Sollwert ausgegeben. Die bisherige `zero-before-reverse`-Runde und die zeitbasierte Vorzeichensperre sind entfernt.
- Die allgemeine Sollwert-Rampe darf bei einem echten Vorzeichenwechsel weder `0 W` noch noch einmal die alte Richtung ausgeben. SoC-, Reserve-, Tarif-, Budget-, §14a-, Geräte- und Authority-Gates bleiben nachgelagert wirksam und dürfen bei einem tatsächlichen Stop-/Warte-/Sicherheitszustand weiterhin `0 W` anordnen.
- Signed-, Split-, Limits-, Enable-Flag- und E3/DC-Writer übernehmen den finalen Wert im selben Regelzyklus. Bei getrennten Lade-/Entlade-DPs wird nur die inaktive Richtung im selben Tick auf `0` gesetzt; es entsteht keine separate 0-W-Regelrunde.
- Speicherfarm: Ein negativer Gesamt-Sollwert kann im unmittelbar folgenden Dispatcher-Aufruf direkt in einen positiven Gesamt-Sollwert wechseln; die manuell zugeordneten AppCenter-DPs bleiben die Hardwareziele.
- Neue Pflichtregressionen prüfen den realen Feldfall `-35 W` Batterie-Ist bei `+1092 W` NVP, beide Richtungswechsel, einen Tarifwechsel von `+3000 W` auf `-4000 W`, Single-Signed/Split sowie Farm-Dispatch ohne 0-W-Zwischenrunde. SoC-Stopps bleiben echte 0-W-Befehle.
- Dokumentierter Wiederherstellungsplan `docs/STABILISIERUNGSPLAN_BIS_2026-07-19_ABEND.md`. MultiUse-/Tarif-/Status-Abhängigkeiten sind ausdrücklich noch nicht Bestandteil dieses begrenzten RC und werden erst nach separatem Änderungsvorschlag und Freigabe bearbeitet.
- Service-Worker-Cache auf `nexowatt-cache-v427` erhöht.

## 0.8.124 - 2026-07-18

- Herstellerunabhängiger AppCenter-Aktorvertrag: Manuell zugeordnete beschreibbare ioBroker-Objekt-IDs bleiben unverändert die autoritative Quelle. Es gibt keine Hersteller-, Adapter- oder Objektpfad-Whitelist; nur echte Doppelbelegungen und aktive Sicherheits-/Authority-Gates dürfen einen Write blockieren.
- FENECON/OpenEMS: Der frühere Tages-/PV-`No-Write`-Zweig ist entfernt. Der nach NVP-, SoC-, Budget-, Tarif-, Reserve-, EVCS- und Safety-Gates berechnete Sollwert wird zyklisch an den manuell zugeordneten DP übergeben; bei fehlendem NVP wird sicher `0 W` geschrieben, statt den externen Watchdog auslaufen zu lassen.
- Speicher-Ausgänge: `targetPower`, getrennte Lade-/Entlade-Sollwerte, Leistungsgrenzen, Lade-/Entladefreigaben, Run/Externe-Regelung und Reserve-SoC verwenden denselben finalen Sicherheitswert. Bewusst einseitige Mappings bleiben nutzbar; kollidierende Funktionen auf exakt demselben Objekt werden sicher diagnostiziert und gesperrt.
- Speicherfarm: Dispatcher- und EMS-Takt sind auf höchstens `1000 ms` begrenzt. Unveränderte Sollwerte werden nach `900 ms` erneut geschrieben, damit externe Vorgaben und Hardware-Watchdogs nicht auslaufen.
- Wallboxen: Sollstrom, Sollleistung, Enable sowie Phasenumschalt-DP, Phasenfeedback, herstellerspezifische 1p/3p-Werte, Stabilitätszeiten und Speicher-Assist-Freigabe werden vollständig vom AppCenter bis zum Charging-Gate weitergereicht.
- Geräte-Gates geprüft: Thermik/Wärmepumpe, Heizstab, Schwellwert-/Relaisausgänge, NexoLogic, Peak-Shaving, BHKW, Generator, Netz-/Wechselrichter-Gates, §14a, Charge-Kiosk und Mesh-Command-States bleiben an Owner-, Konflikt-, Readback-, Retry- und Safety-Verträge gekoppelt. §14a bleibt standardmäßig ein zentraler Constraint; direkte Verbraucher-Writes sind weiterhin nur im ausdrücklich aktivierten Legacy-Migrationsmodus zulässig.
- Regressionen: Der Geräte-Gate-Vertrag prüft 47 repräsentative Brücken; ein zusätzlicher Laufzeitvertrag inventarisiert 60 frei benannte AppCenter-Ausgänge und prüft Keepalive sowie Blockade-Propagation. Ergänzt sind Ende-zu-Ende-Prüfungen für FENECON-Keepalive, alle Speicher-Ausgangsmodi, Farm-1-s-Takt und Wallbox-Phasenbrücke.
- Service-Worker-Cache auf `nexowatt-cache-v426` erhöht.

## 0.8.123 - 2026-07-18

- Speicher/AppCenter: Manuell je Gerät zugeordnete Datenpunkte sind wieder die autoritative Quelle für Messwerte und Sollwerte; feste Objektpfade oder Hersteller-Namensmuster werden nicht vorausgesetzt.
- Speicherfarm: Aktuelle AppCenter-Zeilen schlagen veraltete `storageFarm.configJson`-Spiegel. Der Runtime-State wird aus der gültigen Zuordnung repariert, statt alte Schreibziele nach einem Update oder Downgrade erneut zu aktivieren.
- Schreibpfad: Eine Farm mit reinen Mess-/Status-Datenpunkten übernimmt den Sollwertpfad nicht mehr. Der Einzel-Speicher schreibt weiterhin auf sein manuell zugeordnetes Ziel; nur eine tatsächlich beschreibbare Farm übernimmt die Verteilung.
- Migration: Kanonische, direkte, verschachtelte und ältere Feldnamen aus der Zeit vor der TypeScript-Umstellung werden zentral normalisiert; aktuelle Felder haben Vorrang und String-Boolean-Werte werden korrekt ausgewertet.
- Farm-Freigaben: Fehlende oder ungültige optionale Freigabe-/Stör-Datenpunkte erzeugen Diagnosewarnungen, blockieren den Dispatch aber nicht. Explizite Sperren und Störmeldungen bleiben als Sicherheitsstopp wirksam.
- Rückkopplungsschutz: Frei benannte Istwert-Datenpunkte wie `.ctrl.`, `setpoint`, `chargePowerW` oder `dischargePowerW` bleiben zulässig; ausgeschlossen wird ausschließlich die exakte Wiederverwendung eines zugeordneten Schreibziel-Objekts als Istwert.
- Regressionen: Neuer echter Runtime-Test `test:storage-manual-dp-routing` für AppCenter-Priorität, Farm-Recovery, Legacy-Migration sowie frei benannte Einzel-/Farm-Datenpunkte.
- Service-Worker-Cache auf `nexowatt-cache-v425` erhöht.

## 0.8.122 - 2026-07-18

- EVCS: Reserviert Gesamt- und PV-Budget nur noch bei bestätigtem Fahrzeugbedarf. `Available`, `Idle`, `Reserved`, `Offline`, stale Statuswerte und alte Sollwerte ohne Fahrzeugnachweis blockieren keinen Speicher mehr.
- EVCS: Trennt die Kunden-/RFID-Freigabe `evcs.N.active` verbindlich vom Fahrzeugkontakt; frische Leistung oder frische Statuswerte wie `Charging`, `Preparing` und `SuspendedEVSE` bleiben gültige Bedarfsnachweise.
- Speicherfarm: Eine installierte und aktive Farm mit beschreibbaren Setpoints startet automatisch die gemeinsame Eigenverbrauchs-Grundregelung; der separate Einzel-Speicher-App-Haken ist dafür nicht mehr erforderlich.
- Speicherfarm: Dispatcher ordnet Konfiguration und Laufzeitstatus über stabile Hardware-IDs statt Array-Indizes zu und aktualisiert fehlende oder stale Farmstatuswerte vor dem ersten Write.
- Speicherregelung: Ein transient fehlgeschlagener Farm-Write löscht den letzten erfolgreich geschriebenen Sollwert nicht mehr; Hardwarezustand und NVP-Regelbasis bleiben dadurch konsistent.
- Core budget: Creates all typed §14a publication objects before the first state write and removes repeated `has no existing object` warnings for the inactive/neutral snapshot.
- Regressionen: `test:evcs-confirmed-demand-reservation`, `test:storage-farm-auto-dispatch` und `test:storage-farm-dispatch-recovery` ergänzen die Feldszenarien.
- Service-Worker-Cache auf `nexowatt-cache-v424` erhöht.

## 0.8.121 - 2026-07-18

- Core-Limits TypeScript Phase 3: Snapshot, Reservierungen, Restbudgets und State-/Cache-Publikation nutzen einen gemeinsamen typisierten Laufzeitstand; Abweichungen fallen hart auf die bewährte JavaScript-Referenz zurück.
- Dynamischer Modul-Lifecycle: AppCenter-Module werden bei Aktivierung ohne Adapterneustart vor dem ersten Tick initialisiert und bei Deaktivierung sauber zurückgesetzt.
- §14a: Missing-Object-Logspam behoben; Diagnoseobjekte werden vor jedem Write sichergestellt und alte §14a-Caps werden beim Deaktivieren neutralisiert.
- Service-Worker-Cache auf `nexowatt-cache-v423` erhöht.

## 0.8.120 - 2026-07-18

- TypeScript Core-Limits Phase 2: bereits aufgelöste Messwerte werden über einen normalisierten, typisierten Quellenvertrag an den zentralen Core übergeben. `0 W`, `null`, stale/usable und Quellenangaben bleiben eindeutig getrennt.
- Verbraucher-Grants und Reservierungen laufen jetzt über dieselbe typisierte Core-Runtime einschließlich Kunden-PV-Aufteilung und §14a-App-Caps. Restbudgets, Verbraucherreihenfolge und Reservierungsdiagnose werden deterministisch fortgeschrieben.
- Neue typisierte Sequenz-API für EVCS, Speicher, Thermik und Heizstab; die bestehende Modulreihenfolge bleibt unverändert.
- Budget-State- und Cache-Publikation wird aus einem typisierten Publikationsplan erzeugt. Bei fehlendem Spiegel oder Feldabweichung übernimmt automatisch der bisherige JavaScript-Publikationspfad.
- Fehlerkorrektur im Zahlenvertrag: `null`, `undefined`, leere Strings und Booleanwerte werden nicht mehr versehentlich als numerische `0` interpretiert.
- Neue Regression `test:core-limits-typed-runtime-phase2` mit produktivem Publikationspfad, erzwungenem Fallback und 50.000 randomisierten Reservierungssequenzen.
- Service-Worker-Cache auf `nexowatt-cache-v422` erhöht.

## 0.8.119 - 2026-07-18

- Echte TypeScript-Typisierung des zentralen EMS-Kerns, Phase 1: neue streng typisierte, seiteneffektfreie `core-runtime` für NVP-, PV-, Headroom-, zentrale Grant- und Budget-Snapshot-Berechnungen.
- Produktiver Core-Limits-Pfad übernimmt den typisierten Snapshot nur nach vollständiger Feldparität zur bewährten Legacy-Rechnung; bei Spiegel-, Laufzeit- oder Ergebnisabweichungen bleibt automatisch der JavaScript-Fallback aktiv.
- Zentrale §14a-App-Caps und die Kunden-PV-Aufteilung werden im typisierten Grant-Vertrag berücksichtigt.
- Neue interne Diagnose `ems.budget.tsCoreRuntime*` zeigt produktive Übernahme, Fallback und Abweichungen, ohne den normalen AppCenter-Status zu überladen.
- Neue Regression `test:core-limits-typed-runtime-phase1` mit produktivem Modulpfad, erzwungenem Fallback und 50.000 randomisierten Budget-/Grant-Invarianten.
- Service-Worker-Cache auf `nexowatt-cache-v421` erhöht.

## 0.8.118 - 2026-07-17

- §14a als zentraler Constraint: EVCS, Speicherladung, Thermik und Heizstab erhalten app-spezifische Leistungs-Caps aus dem gemeinsamen EMS-Budget; die Fachmodule bleiben alleinige Hardware-Schreiber.
- §14a-Aktivsignal wird auf Messwertalter geprüft. Standard-Policy `hold-active` hält eine zuletzt aktive Begrenzung fail-safe; optional stehen `force-active` und der nicht empfohlene Migrationsmodus `release` zur Verfügung.
- Ein stale externer EMS-Setpoint wird nicht weiterverwendet; die interne §14a-Mindestformel übernimmt sicher.
- Thermik und Heizstab pausieren bei §14a nicht mehr vollständig, sondern regeln innerhalb ihrer zentral zugeteilten Grants weiter.
- Legacy-Direktwrites auf §14a-Verbraucher sind standardmäßig deaktiviert und nur noch als ausdrücklich aktivierter Migrationsmodus verfügbar.
- Neue Regression `test:para14a-central-constraint`; Service-Worker-Cache auf `nexowatt-cache-v420` erhöht.

## 0.8.117 - 2026-07-17

- MultiUse fachlich bereinigt: Standardbetrieb ist ausschließlich Speicher-Policy für Reserve-, Lastspitzen- und Eigenverbrauchs-SoC-Zonen; `storage-control` bleibt einziger Batteriesollwert-Schreiber. Alte flexible MultiUse-Verbraucher sind nur noch über `multiUse.legacyFlexibleConsumersEnabled=true` als expliziter Migrationsmodus aktiv.
- Peak-Shaving-Aktoren verwenden den zentralen Aktorvertrag mit optionalem Readback, ACK-Timeout, begrenzten Wiederholungen und Fehlerverriegelung. Nur bestätigte Reduktionen gelten als umgesetzt; fehlgeschlagene Restores behalten Baseline und Steuerhoheit.
- Dynamischer Tarif gehärtet: aktueller Stundenpreis standardmäßig maximal 90 Minuten gültig, Durchschnitt und Day-Ahead-Kurve maximal 36 Stunden. Eine frische Kurve darf den aktuellen Slot ersetzen; stale Preise lösen weder Negativpreis- noch Netzladebetrieb aus, die Eigenverbrauchsoptimierung bleibt aktiv.
- MultiUse-, Peak- und Tarif-Regressionsprüfungen ergänzt.
- Service-Worker-Cache auf `nexowatt-cache-v419` erhöht.

## 0.8.116 - 2026-07-17

- C3.5: BHKW und Generator verwenden einen gemeinsamen, typisierten Aktorvertrag mit eindeutigen Ownern.
- Unterstützt Start-/Stop-Pulse, getrennte Start-/Stop-Level und einen einzelnen Run-/Enable-Datenpunkt.
- Laufstatus kann über einen direkten Readback oder ersatzweise aus einer frischen Erzeugerleistung abgeleitet werden.
- SoC, NVP und Betriebsrückmeldung werden vor automatischen Start-/Stop-Entscheidungen auf Frische geprüft.
- Mindestlauf- und Mindeststillstandszeiten werden nach einem Adapterneustart aus dem realen Readback-Zeitstempel rekonstruiert.
- Hardwarewrites erhalten Readback-/ACK-Timeout, begrenzte Wiederholungen und zeitliche Fehlerverriegelung.
- BHKW und Generator reservieren kein Verbrauchsbudget; ihre reale Erzeugung wirkt über NVP und Energiefluss in das zentrale EMS zurück.
- Service-Worker-Cache auf `nexowatt-cache-v418` erhöht.

## 0.8.115

- Stufe C3.4: NexoLogic-Ausgänge erhalten eindeutige Aktor-Owner pro Graph und Node und laufen über den zentralen Aktor-Arbiter. Sicherheits-, §14a-, Grid-, Peak- und manuelle Leases können widersprechende NexoLogic-Writes verbindlich blockieren.
- `dp_out` und `scene_trigger` verwenden einen gemeinsamen Write-Vertrag mit optionalem frischem Readback, ACK-Timeout, begrenzten Wiederholungen, Fehlerverriegelung und sauberer Aktorfreigabe.
- NexoLogic-Ausgänge können optional zentrale PV- oder Gesamt-Grants anfordern. Nicht budgetierte Bestandsausgänge bleiben unverändert ereignisgetrieben; budgetierte Ausgänge schreiben erst nach zentraler Freigabe und reservieren nur akzeptierte beziehungsweise frisch gemessene Leistung.
- Bei blockierten oder fehlgeschlagenen Aus-Befehlen bleibt eine noch real aktive NexoLogic-Last im zentralen Budget reserviert, bis der Stopp bestätigt ist. Stale Readbacks können einen Hardware-Write nicht fälschlich bestätigen.
- Stufe A erkennt `dp_out`- und Szenen-Aktoren mit stabilen Ownern `nexoLogic.<graph>.<node>`. Die NexoLogic-Oberfläche ergänzt Readback-, Lease-, Retry- und optionale Budgetparameter ohne neue große AppCenter-Statuskarten.
- Neue Regression `test:actuator-c3-nexologic`.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v417` erhöht.

## 0.8.114

- Herstellerübergreifende Speicher-0-W-Firewall: Im NVP-Zielband, bei kurzen Messwertlücken, transientem zentralen 0-W-PV-Budget oder bestätigtem PV-/Last-Feed-forward bleibt der letzte wirksame Nicht-Null-Sollwert aktiv beziehungsweise Sungrow im No-Write-Hold.
- `0 W` wird nur noch für echte Stopps geschrieben: SoC-Grenzen, Safety-/Freigabesperren, bestätigte vollständige Budgetbelegung, real physikalisch falsche Richtung und sichere Richtungswechsel. Ein aktiver EVCS-Speicherschutz stoppt eine zuvor laufende Entladung ausdrücklich, erzeugt im Leerlauf aber keinen unnötigen 0-W-Befehl.
- Physische PV-/Wechselrichterquellen werden nach Device-/Wechselrichteridentität dedupliziert statt nur nach exakter Datenpunkt-ID. Eine konfigurierte Anlagenleistung begrenzt unplausible PV-Spitzen mit 15 % Messtoleranz; Rohwert und unterdrückte Doppelzählung bleiben diagnostizierbar.
- MultiUse C3.3: Verbraucher verwenden ausschließlich zentrale PV-/Gesamt-Grants, reservieren nur akzeptierte beziehungsweise gemessene Leistung und laufen über eindeutige Aktor-Owner mit Readback-, Retry- und Fehlerverriegelungs-Vertrag. Das alte lokale Parallelbudget wurde entfernt.
- Neue Regressionen `test:storage-zero-write-firewall-v2`, `test:pv-source-dedup-cap` und `test:multiuse-central-budget-c3`.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v416` erhöht.

## 0.8.113

- Stufe C3.2: Thermik und Heizstabsteuerung verwenden eindeutige Aktor-Owner im zentralen Arbiter. Automatik und manuelle Bedienung sind getrennt und besitzen definierte Leases.
- Thermik und Heizstab erhalten einen gemeinsamen Write-Vertrag mit optionalem Readback, ACK-Timeout, begrenzten Wiederholungen und zeitlicher Fehlerverriegelung. Ein geänderter Sollwert löst eine Verriegelung kontrolliert wieder.
- Blockierte oder fehlgeschlagene Thermik-/Heizstab-Writes werden nicht mehr als umgesetzte Leistung im zentralen EMS-Budget reserviert. Gemessene Istleistung bleibt weiterhin autoritativ.
- Heizstab-Stufenwrites werden je physischem Aktor zusammengefasst; doppelt verwendete virtuelle Stufen können denselben Relais-DP nicht mehr innerhalb eines Zyklus gegensätzlich beschreiben.
- Neue kompakte Diagnose-States pro Gerät: Owner, Write akzeptiert, Readback, Pending, Wiederholungen, Fehlerverriegelung und Vertragsstatus. Der AppCenter-Status erhält keine zusätzliche große Karte.
- LIVE-Energieflussanzeige von 15 auf 5 Sekunden verkürzt. Nur die sichtbare Darstellung ändert sich; Backend-Messwerterfassung, EMS-Budget und Regelzyklen bleiben unverändert.
- Neue Regressionen `test:actuator-c3-thermal-heating` und `test:live-energy-flow-5s-cadence`.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v415` erhöht.

## 0.8.112

- Stufe C3.1: Threshold-Regeln und manuelle Relaisbedienung verwenden eindeutige Aktor-Owner, Prioritäten und zeitlich begrenzte Leases im zentralen Arbiter.
- Threshold übernimmt beim Start einen vorhandenen realen Ausgangszustand, verbucht blockierte/fehlgeschlagene Writes nicht als aktiv und kann optional einen bestätigten Readback verlangen.
- Manuelle Relais-API meldet eine Arbiter-Blockade als HTTP 409 statt einen nicht ausgeführten Befehl als Erfolg zu speichern.
- Stufe-A-Owner-Matrix ordnet Threshold- und Relaiszeilen stabil über Regel-/Relaisindex zu.
- Kundenoption „Feste Speicher-/E-Mobilitäts-Aufteilung“ ergänzt. Ausgeschaltet reservieren aktive Verbraucher nur reale beziehungsweise technisch fahrbare Nachfrage; der Speicher erhält den gesamten ungenutzten PV-Rest im selben zentralen EMS-Zyklus.
- Die bestehende feste Speicher-/E-Mobilitäts-Priorisierung bleibt für Bestandsanlagen standardmäßig aktiviert und kann weiterhin als Speicher zuerst, E-Mobilität zuerst oder gemeinsam konfiguriert werden.
- Neue Regressionen `test:actuator-c3-threshold-relay` und `test:pv-surplus-dynamic-storage-remainder`.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v414` erhöht.

## 0.8.111

- Stufe C2 aktiviert den zentralen Aktor-Arbiter für sicherheitskritische Steuerhoheit. Not-/Failsafe-Anforderungen, §14a/Netzbetreiber, Grid-Constraints, Peak-/Anschlusslimits und befristete manuelle Overrides können niedrigere widersprechende Hardware-Writes verbindlich blockieren.
- Normale EMS- und Komfortmodule untereinander bleiben weiterhin im Shadow-Verhalten; die breite Migration von Threshold, Thermik, Heizstab, MultiUse und NexoLogic erfolgt erst in Stufe C3.
- Safety-Leases aus zyklischen EMS-Modulen gelten innerhalb desselben Regelzyklus; manuelle/API-Overrides besitzen eine zeitlich begrenzte Lease. Höhere Safety-Prioritäten können niedrigere Owners übernehmen, identische sichere Refresh-Werte bleiben erlaubt.
- Durchsetzung greift ausschließlich auf tatsächlich in Stufe A erkannten Hardware-Aktoren. Interne Adapter-States, Diagnosepfade und nicht gemappte Bridge-/Command-States werden nicht blockiert.
- DatapointRegistry erkennt blockierte Writes und meldet sie als nicht angewendet, ohne den realen Hardwarepfad zu beschreiben.
- Direkte Write-Pfade von Heizstab, BHKW, Generator und EVCS-Phasenumschaltung übernehmen blockierte Anforderungen ebenfalls nicht als erfolgreich; lokale Write-Caches, Puls-Reset-Timer und angenommene Phasen bleiben unverändert.
- Idempotente/Deadband-Sollwerte erneuern die Safety-Steuerhoheit als reinen Intent, ohne unnötige Geräte-Writes. Dadurch kann ein unveränderter §14a-, Grid- oder Peak-Sollwert im selben EMS-Zyklus nicht von einem späteren Komfort-Write umgangen werden.
- Direkte Sonderpfade für Phasenumschaltung, Heizstab-Force-Writes, BHKW und Generator übernehmen blockierte Arbiter-Writes nicht mehr als erfolgreich und aktualisieren weder lokalen Cache noch Folgeimpulse.
- Peak-Shaving veröffentlicht seinen aktiven Authority-Status; Grid-Constraint-Aktoren werden vollständig in die Stufe-A-Owner-Matrix aufgenommen.
- AppCenter bleibt kompakt: Die bestehende Karte „EMS Überwachung“ zeigt nur Arbiter-Modus, Konfliktanzahl und – nur bei Auftreten – blockierte Writes.
- Feldkompatibler Rückfall bleibt über Admin → Diagnose → Aktor-Arbiter → „Nur beobachten / Shadow“ verfügbar.
- Neue Regressionen `test:actuator-authority-arbiter`, `test:actuator-safety-arbiter` und `test:actuator-blocked-write-propagation` prüfen Priorität, Preemption, Deadband-Intent, Same-Cycle-Freigabe, direkte Modulpfade, manuelle Lease, Shadow-Fallback und Restore beim Shutdown.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v413` erhöht.

## 0.8.110

- Stufe C1 umgesetzt: Ein zentraler read-only Aktor-Shadow-Arbiter beobachtet externe Hardware-Schreibanforderungen, ohne Werte, Reihenfolge oder Erfolg bestehender Writes zu verändern.
- Modul-, HTTP-/Kunden- und unscoped Timer-/Runtime-Writes werden mit Owner, Priorität, Grund, Lease, Zyklus und tatsächlich ausgeführtem Schreiber protokolliert.
- Konkurrierende Werte verschiedener aktiver Owner auf demselben Hardware-DP werden als Laufzeit-Schreibkonflikt erkannt; identische Anforderungen gelten nicht als Konflikt.
- Stufe-A-Mapping-Owner werden für zeitversetzte/unscoped Writes als sichere Owner-Inferenz genutzt.
- AppCenter-Status bleibt kompakt: Die bestehende EMS-Überwachung zeigt nur die zusammengeführte Anzahl statischer und tatsächlicher Aktor-Schreibkonflikte; Detaildaten bleiben in internen Diagnose-States.
- Shadow-Arbiter ist vollständig read-only und bildet nur die Grundlage für eine spätere verbindliche Steuerhoheit in Stufe C2.
- Neue Regression `test:actuator-shadow-arbiter` beweist unveränderte Hardware-Werte, Owner-Kontext, Konflikterkennung, Fehlerweitergabe und Restore beim Shutdown.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v412` erhöht.

## 0.8.109

- Zentrale NVP-Messwertfrische eingeführt: `connected=true`, tatsächliches Messwertalter und Heartbeat werden getrennt bewertet. Ein positives Connected-Signal kann einen eingefrorenen Leistungswert nicht mehr unbegrenzt als frisch markieren.
- Heartbeat-Haltezeit begrenzt: Ein echtes Geräte-/Watchdog-Ereignis darf einen unveränderten Messwert nur innerhalb einer konfigurierbaren Maximalzeit bestätigen. Danach sperrt das EMS die NVP-abhängigen Leistungsbudgets sicher.
- Getrennte NVP-Bezugs-/Einspeise-DPs zeitlich kohärent aufgelöst: Bei zu großem Zeitversatz wird nur der neuere Kanal verwendet und der alte Gegenkanal auf 0 W gesetzt; Phantom-Bezug beziehungsweise Phantom-Einspeisung werden dadurch verhindert.
- Eine kanonische NVP-Quelle für zentrale Budgetierung, EVCS-Lastmanagement, Speicherregelung, Grid-Constraints, Peak-Shaving, LIVE-Energiefluss und Historie. Ein bekannter stale NVP darf in nachgelagerten Modulen nicht über alte Fallbackwerte wiederaufleben.
- Energiefluss-/History-Fallback typisiert zentralisiert: LIVE und Historie folgen dem EMS-Frischestatus und nutzen bei alten Runtime-Ständen denselben Split-DP-Kohärenzschutz.
- AppCenter-Status bewusst kompakt gehalten: Eine einzelne Karte „EMS Überwachung“ zeigt nur NVP-Zustand/-Quelle, Messwertalter, aktive Aktorkonflikte, Speicherquelle und relevante Problemanzahl.
- TypeScript-Migration verbessert: Die neue Frische-, Kohärenz- und Anzeigeauflösung liegt in einer echten typisierten Runtime-Komponente; das `@ts-nocheck`-No-Growth-Gate bleibt eingehalten.
- Neue Regression `test:measurement-freshness-stage-b` prüft Connected/Heartbeat/Messwert-Trennung, Split-NVP-Zeitversatz, stale Budget-Failsafe und gemeinsame Nutzung der kanonischen NVP-Quelle.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v411` erhöht.

## 0.8.108

- AppCenter-Speicher-Overrides wieder autoritativ: Explizit unter „Zuordnung“ konfigurierte SoC-, signed Leistungs- sowie getrennte Lade-/Entlade-Istwerte haben Vorrang vor Speicherfarm- und Bilanz-Fallbacks. Dies gilt ausdrücklich auch für Einzelanlagen ohne aktive Speicherfarm.
- Speicherfarm-Spiegel bereinigt: Die Farm veröffentlicht nur noch kanonische `storageFarm.*`-Aggregate. Allgemeine Speicherwerte werden nur gespiegelt, wenn kein expliziter AppCenter-Override existiert; alte Farmwerte können dadurch Einzel-Speicher-Mappings nicht mehr überdecken.
- Speicherregelung um Split-Istleistung erweitert: Positive Lade- und Entlade-Istwerte werden sicher zu `+W = Entladen / -W = Laden` zusammengeführt. Steuer-/Sollwert-DPs werden als Istfeedback abgewiesen, damit keine Sollwert-Rückkopplung entsteht.
- Energiefluss und Historie verwenden dieselbe Quellenpriorität: AppCenter-Override vor Einzel-Speicher-Mapping, aktive Farm nur als Fallback, Bilanzableitung ausschließlich ohne konfigurierte Speicher-Messquelle.
- Neue read-only „Stufe A“-Diagnose im AppCenter-Status: Aktor-Doppelbelegungen, gleichzeitig aktive Steuerpfade, getrenntes Messwert-/Connected-/Heartbeat-Alter, NVP-Import-/Export-Zeitversatz und die tatsächlich aufgelöste Speicherquelle werden angezeigt.
- Stufe A verändert keine Geräte-Sollwerte. Sie schreibt ausschließlich unter `ems.diagnostics.stageA.*`; diese internen Diagnosen sind aus den öffentlichen Kunden-APIs ausgefiltert.
- Runtime-Build erweitert: Explizit markierte, echt typisierte Runtime-Quellen werden kontrolliert mit TypeScript nach CommonJS transpiliert. Alle bisherigen JS-kompatiblen TS-Dateien bleiben textstabil; das bestehende `@ts-nocheck`-No-Growth-Gate bleibt grün.
- Neue Regressionen `test:storage-appcenter-override-precedence` und `test:stage-a-diagnostics` prüfen Override-Vorrang, Split-Feedback, Farm-Abgrenzung, read-only Diagnose und NVP-Kohärenz.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v410` erhöht.

## 0.8.107

- Speicher-Eigenverbrauch bei aktiven Ladepunkten korrigiert: Ohne im AppCenter freigegebene Kundenwahl bleibt die Wallboxlast Bestandteil des normalen NVP-Regelkreises. Der Speicher darf den Netzbezug damit wie jede andere Last ausregeln.
- Impliziten Speicherschutz entfernt: `Speicher-Assist nicht freigegeben` bedeutet nicht mehr automatisch `Speicher schützen`. Schutz wirkt nur, wenn die Kundenbedienung pro Ladepunkt freigegeben und dort ausdrücklich „Schützen“ gewählt wurde.
- Speicher-Policy pro Ladepunkt getrennt: `normal` = Eigenverbrauchsoptimierung, `protect` = EVCS-Last nicht aus dem Speicher versorgen, `assist` = optionale aktive Speicherunterstützung des Lademanagements.
- Same-cycle Übergabe ergänzt: Charging-Management veröffentlicht Schutz-/Assistlasten direkt im gemeinsamen EMS-Runtime-Snapshot. Storage-Control nutzt diesen Stand vor den asynchronen Diagnose-States, sodass alte Schutzwerte die Entladung nicht noch einen Zyklus blockieren.
- Früher Rückkehrpfad abgesichert: Jeder Charging-Tick setzt die gemeinsame EVCS-Speicherpolicy zunächst neutral. Stale Meter, Safety-Gates oder fehlende Ladepunktdaten können dadurch keinen alten Schutzwert stehen lassen.
- Herstellerunabhängige Wirkung bleibt erhalten: Expliziter Schutz wird weiterhin vor Generic-/Split-, Sungrow-, FENECON-, E3/DC- und Speicherfarm-Schreibpfaden berücksichtigt.
- Neue Diagnosen: `chargingManagement.wallboxes.<LP>.storagePolicyMode`, `storageProtectionRequested` und `speicher.regelung.evcsSpeicherSchutzQuelle`.
- Ladepunkt-Zuordnungen bleiben unverändert: Die im Admin pro LP konfigurierten Mess- und Steuer-DPs werden von dieser Korrektur weder ersetzt noch automatisch umgebogen.
- Neue Runtime-Regression `test:evcs-storage-policy-default-self-consumption` prüft normalen Eigenverbrauch, expliziten Schutz, Assist, Same-cycle-Stale-Schutz und State-Fallback durch den echten Speicher-Tick.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v409` erhöht.

## 0.8.106

- EVCS-Steuerpfade für bestehende `nexowatt-devices`-Anlagen feldkompatibel aufgelöst: Neben den bisherigen Aliasnamen `currentLimitA`/`powerLimitW` erkennt NexoWatt jetzt auch `targetCurrentA`/`targetPowerW` sowie die kompatiblen `setCurrentA`/`setPowerW`-Varianten.
- Fehlende Sollwertzuordnungen werden beim Adapterstart ausschließlich aus real vorhandenen und schreibbaren States derselben Gerätebasis ergänzt. Manuelle Installer-Zuordnungen bleiben unverändert; Steuerpfade verschiedener Ladepunkte werden nicht vermischt.
- AppCenter-Schnellerkennung und Backend-Geräteinventar verwenden dieselbe Aliasauflösung. Dadurch werden korrekt angebundene Ladepunkte wieder als steuerbar gezählt, die installierte Portsumme fließt in das zentrale NVP-/Stationsbudget ein und der finale EVCS-Write-Plan erreicht den tatsächlichen Geräte-DP.
- Neue Regression `test:evcs-control-alias-mapping` prüft Target-/Legacy-Aliase, Schutz manueller Zuordnungen, Gerätebasis-Isolation, 4×11-kW-Infrastruktur, Engine-Erkennung und den realen Sollstrom-Schreibpfad.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v408` erhöht.

## 0.8.105

- EVCS-Infrastrukturgrenze korrigiert: Die im AppCenter konfigurierte Nennleistung gilt wieder pro Ladepunkt. Der Engine-Modus summiert alle aktivierten und steuerbaren Ladepunkte; ein alter 11-kW-Einzelwert kann die gesamte Ladeinfrastruktur nicht mehr global begrenzen.
- Stationsgruppen bereits in der Infrastrukturkapazität berücksichtigt: Die rohe Portsumme bleibt als Diagnose sichtbar, die wirksame Gesamtleistung begrenzt gemeinsam genutzte Stationen auf ihr Stationslimit.
- NVP-/Lastmanagement bleibt führend: Das finale EVCS-Budget ist weiterhin das Minimum aus Infrastrukturleistung, Netzanschluss-Headroom, Phasenlimit, §14a, Peak-Shaving, Tarif- und Stationsgrenzen.
- Mindestversorgung mehrerer Ladepunkte ergänzt: Reicht das sichere Gesamt- und Stationsbudget für alle verbundenen Auto-, Boost- und Min+PV-Ladepunkte, werden zuerst alle technischen Mindestleistungen reserviert. Zusatzleistung wird danach gemäß Boost, Zeit-Ziel, laufender Session, Priorität und Round-Robin verteilt.
- Ladepunkte werden nur noch vollständig abgeschaltet, wenn das sichere Budget nicht einmal alle technischen Mindestleistungen tragen kann. Teilwerte unter dem Mindeststrom bleiben weiterhin verboten.
- Reines PV-Laden bleibt unverändert am zentralen PV-Grant geführt; Auto, Boost, Min+PV, Zeit-Ziel und dynamischer Tarif behalten ihre bisherigen Betriebsregeln und umgehen keine Netz-/Phasen-/§14a-/Stationsgrenzen.
- AppCenter-Diagnose erweitert: installierte Portsumme, wirksame Infrastrukturkapazität, Anzahl steuerbarer Ladepunkte, optionaler Hard-Cap und gemeinsame Mindestversorgung werden separat angezeigt.
- Neue Regression `test:charging-infrastructure-budget` prüft 4 Ladepunkte am 40-kW-NVP, Legacy-11-kW-Konfiguration, Stationscaps und die Mindestversorgung aller technisch versorgbaren Ladepunkte.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v407` erhöht.

## 0.8.104

- Ungenutzte EVCS-PV-Anteile werden im selben EMS-Zyklus vollständig an den Speicher freigegeben. Die prozentuale Einstellung ist nur ein maximaler EVCS-Cap und keine pauschale Reservierung.
- Reines PV-Laden reserviert vor dem tatsächlichen Start nur noch die technisch fahrbare Mindestleistung. Liegt der zugeteilte EVCS-Anteil unter diesem Minimum, entsteht keine Teil-/Ghost-Reservierung und der Speicher erhält den kompletten PV-Rest.
- Min+PV reserviert vor dem Start ausschließlich seine netzgestützte Mindestleistung im Gesamtbudget. Zusätzlicher PV-Anteil wird erst bei realem oder kommandiertem Ladebetrieb reserviert.
- Aktive beziehungsweise bereits hochregelnde Ladepunkte behalten ihren realen PV-Rampenbedarf; Startfähigkeit, Stationslimit, Anschlusslimit, Phasenlimit und §14a bleiben verbindlich.
- Kundenhilfe präzisiert: Ohne aktive oder technisch fahrbare Wallbox-Reservierung fließt der vollständige freie PV-Überschuss zuerst in den Speicher; danach erhalten Thermik und Heizstäbe nur den verbleibenden Rest.
- Neue Regression `test:pv-unused-evcs-release-to-storage` prüft das Feldszenario 2,7 kW Einspeisung + 2,6 kW Speicherladung bei 50/50-Priorität sowie PV-Startminimum und Min+PV-Startbasis.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v406` erhöht.

## 0.8.103

- Min+PV-Grundlogik korrigiert: Die technische Mindestleistung des Ladepunkts wird aus dem normalen Gesamt-/Netzbudget gehalten, auch wenn aktuell `0 W` PV-Überschuss verfügbar sind. Das verhindert Ladeabbrüche bei bewölktem Wetter.
- PV-Priorisierung sauber getrennt: Einstellungen wie `80 % E-Mobilität / 20 % Speicher` begrenzen ausschließlich reines PV-Laden. Min+PV hält seine netzgestützte Mindestleistung aus dem Gesamtbudget und nutzt für die Zusatzleistung den vollständigen physikalisch verbleibenden PV-Grant.
- Reines `PV`, `Auto` und `Boost` bleiben fachlich unverändert. Min+PV darf weiterhin nur starten beziehungsweise laufen, wenn Anschluss-, Phasen-, §14a-, Stations- und Ladepunktgrenzen mindestens die technische Basis zulassen.
- Pending-/Start-Intent erweitert: Ein verbundener Min+PV-Ladepunkt kann seine fehlende Mindestleistung aus dem zentralen Gesamtbudget reservieren, ohne diese Grundlast fälschlich als PV-Verbrauch zu buchen. Dadurch kann der Speicher die notwendige Ladebasis nicht während Start-Hysterese oder verzögerter Wallbox-Telemetrie übernehmen.
- Reaktionszeit verbessert: Änderungen an Modus, Kundenfreigabe, Phasenwahl, Speicherassist und Zeit-/Zielladen lösen einen debouncten zusätzlichen zentralen EMS-Tick aus. Der normale Budget- und Sicherheitsablauf bleibt vollständig erhalten; parallele Regelzyklen werden verhindert.
- Neue Regression `test:charging-minpv-base-reaction` prüft Min+PV bei `0 W` PV, technische Mindestleistung, reine PV-Abgrenzung, Auto/Boost, Stationslimits sowie die unmittelbare Modusreaktion und den Shutdown-sicheren Timerpfad.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v405` erhöht.

## 0.8.102

- Öffentliche Kunden-APIs feldkompatibel gehärtet: `/api/state`, `/events` und `/config` liefern nur noch freigegebene Betriebswerte; API-Schlüssel, E-Mail-Adressen, Lizenz-/Mesh-Geheimnisse, Installerdiagnosen, RFID-Rohdaten und interne ioBroker-Datenpunktpfade werden nicht mehr öffentlich verteilt.
- Kontrollierte Kundenendpunkte ergänzt: RFID-Whitelist/Lernstatus und Test-E-Mail bleiben funktionsfähig, ohne den vollständigen internen State-Cache offenzulegen; beliebige E-Mail-Ziele bleiben Installer/Admin vorbehalten.
- Kunden-Zugriffspolicy ergänzt: Bestehende Installationen bleiben standardmäßig im kompatiblen Modus `all`; optional können Bedienzugriffe auf Anlagen-LAN/VPN (`lan`) oder authentifizierte Sitzungen (`session`) begrenzt werden. Unvertrauenswürdige Forwarded-IP-Header erzeugen keine lokale Berechtigung.
- Browser- und Login-Schutz ergänzt: Same-Origin-Prüfung für Schreibzugriffe, Security-Header, Login-Rate-Limit, temporäre Sperre bei Fehlversuchen und sichere Session-Cookies bei HTTPS.
- Mesh-Kommandos arbeiten jetzt fail-closed: Ohne konfiguriertes Peer-Token werden keine Remote-Kommandos angenommen; Tokens werden ausschließlich aus Headern gelesen und zeitkonstant verglichen. Release-/Feldtest-/Operator-Endpunkte benötigen Installerrechte.
- Doppelte Speicherfarm-Sichtbarkeitsregel bereinigt: Der zentrale Resolver verlangt wie die produktive Runtime mindestens zwei reale Farmspeicher.
- TypeScript-Migration abgesichert: Ein versioniertes No-Growth-Budget verhindert, dass weitere produktive Runtime-Dateien oder Zeilen unter `@ts-nocheck` hinzukommen. Die bestehenden Regelalgorithmen wurden in diesem Release nicht fachlich verändert.
- Release- und Regressionstests um Public-API-Sicherheit, Kunden-Zugriffspolicy, Mesh-Fail-Closed und TypeScript-No-Growth erweitert.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v404` erhöht.

## 0.8.101

- Speicherfarm-Aggregation zentralisiert: `storageFarm.totalPowerW` liefert die signierte Netto-Gesamtleistung der Farm (`+W` Entladen, `-W` Laden). Brutto-Lade- und Brutto-Entladeleistung bleiben getrennt als Diagnose verfügbar.
- Farm-SoC korrigiert: Der im Kunden-Energiefluss verwendete Gesamt-SoC ist jetzt der arithmetische Mittelwert aller gültigen Speicher-SoCs. Ein kapazitätsgewichteter Mittelwert bleibt ausschließlich als Diagnosewert erhalten.
- PV-/Wechselrichter-Summe der Speicherfarm erweitert: eindeutige AC-, DC-/Hybrid- und unbekannte PV-Quellen werden getrennt erfasst, doppelte Datenpunkte nur einmal gezählt und anschließend zentral mit der Anlagen-PV zusammengeführt.
- Doppelzählungsschutz verbessert: Ist die Anlagen-PV praktisch identisch mit der vollständigen Farm-PV, wird die Farm nicht erneut addiert. Ein zusätzlicher, noch nicht enthaltener DC-/Hybrid-Anteil kann weiterhin ergänzt werden.
- Wechselrichter-Telemetrie von Speicherstatus entkoppelt: Ein offline oder degraded gemeldeter Speicher blendet eine weiterhin frische PV-/WR-Messung nicht mehr aus dem Energiefluss aus.
- LIVE-Energiefluss, Historie und EMS verwenden denselben Backend-Gesamtwert `derived.core.pv.totalW`; die Farm-Gesamtleistung und der SoC-Mittelwert werden ebenfalls aus den kanonischen `storageFarm.*`-States übernommen.
- AppCenter-, Scheduler-, Speicherregelungs- und Farm-Dispatcher-Aktivierung vereinheitlicht: Die Farm ist nur bei installierter/aktiver App und mindestens zwei real konfigurierten Speichern aktiv; alte Legacy-Flags können keinen Parallelzustand erzeugen.
- Speicherregelung und Speicherfarm-Schreibpfad nutzen denselben AppCenter-Status. Kapazitätsberechnung, Istleistungsfeedback und Sollwertverteilung können dadurch nicht mehr auseinanderlaufen.
- AppCenter-Hilfe zur PV-/WR-Zuordnung ergänzt und Farmseite um Nettoleistung, PV-/WR-Summe sowie Brutto-Richtungswerte erweitert.
- Neue Regression `test:storage-farm-energy-flow-aggregation` prüft SoC-Mittelwert, Nettoleistung, PV-Zusammenführung, Doppelzählungsschutz und die gemeinsamen Backend-/Frontend-Verträge.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v403` erhöht.

## 0.8.100

- Lademanagement auf eine einzige produktive Mehrladepunkt-Allokation vereinheitlicht: Der reife zentrale Runtime-Plan bleibt für Budget, Betriebsarten, Hysterese, Rampen, Prioritäten und Stations-Round-Robin maßgeblich; der nachgelagerte TypeScript-Vertrag validiert und begrenzt ausschließlich den finalen Write-Plan.
- Harte Abschlussinvarianten ergänzt: Summe aller Ladepunkte bleibt unter dem zentralen EVCS-Gesamtgrant, PV-/Min+PV-Anteile bleiben unter dem zentralen PV-Grant und jede Stationsgruppe bleibt unter ihrem konfigurierten Stationslimit.
- Technische Mindestleistung korrigiert: Ein Ladepunkt erhält entweder `0 W` oder mindestens seine fahrbare Mindestleistung. Teilwerte unter 6 A beziehungsweise unter der konfigurierten Mindestleistung werden nicht mehr geschrieben.
- Strom-/Leistungsquantisierung budgetfest gemacht: Sollwerte werden immer nach unten auf Geräte-Schritte quantisiert. Eine nachträgliche Anhebung auf Mindeststrom kann dadurch weder Gesamtbudget noch Stationslimit überschreiten.
- Ladepunkt-Prioritäten vereinheitlicht: Kleinere Prioritätszahl wird zuerst bedient; Boost, aktives Ziel-/Deadline-Laden, laufende Session, Anschlussreihenfolge und die zustandsbehaftete Stations-Round-Robin-Reihenfolge bleiben vor dem finalen Write-Plan erhalten.
- Betriebsarten getrennt abgesichert: `PV` nutzt ausschließlich den zentralen PV-Grant, `Min+PV` verwendet das Gesamtbudget nur für die technische Basis und PV nur für die Zusatzleistung; `Auto`/`Boost` bleiben am Gesamtbudget geführt.
- Stationsdiagnose wird nach der finalen TypeScript-Prüfung neu veröffentlicht. `usedW`, `remainingW`, `binding`, `targetSumW` und `stationRemainingW` entsprechen damit exakt den anschließend geschriebenen Ladepunkt-Sollwerten.
- Ein explizites zentrales Restbudget von `0 W` ist jetzt ein harter Stop. Der Abschluss-Guard kann diesen Wert nicht mehr als fehlendes Budget interpretieren und auf einen früheren Ladebedarf zurückfallen.
- Neue Regression `test:charging-multipoint-station-budget` prüft mehrere AC-/DC-kompatible Zielpfade, Mindeststrom, Quantisierung, gemischte Modi, Prioritäten und Stationslimits gegen Budgetüberschreitung.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v402` erhöht.

## 0.8.99

- Zentrale EMS-Budget-Orchestrierung vereinheitlicht: EVCS, Speicher, Thermik und Heizstab beziehen ihre PV- und Gesamtleistungsfreigaben jetzt über dieselbe Grant-/Reserve-Runtime. Die feste Regelreihenfolge lautet `Core → EVCS → Speicher → Thermik → Heizstab`.
- PV-Quellenauflösung korrigiert: Ein frischer, aber fehlerhaft `0 W` meldender PV-Alias kann eine gleichzeitig frische `derived.core.pv.totalW`-Messung nicht mehr verdecken. Es wird die höchste plausible direkte PV-Quelle verwendet, ohne mehrere Aliase derselben Anlage zu addieren.
- Physikalisches PV-Budget nutzt den signierten NVP sowie reale flexible PV-Lasten: NVP-Einspeisung, laufende EVCS-PV-Leistung und Speicherladung werden zusammengeführt; Netzbezug und Speicherentladung werden abgezogen. Veraltete Verbraucherwerte besitzen ein endliches Freshness-Fenster und können kein Nacht-/Ghost-Budget erzeugen.
- Kundenpriorität `Speicher & E-Mobilität` wird ausschließlich im zentralen Core aufgeteilt. Bei 80 % E-Mobilität und 20 % Speicher erhält EVCS einen zentralen Maximal-Grant; der Speicher sieht danach nur den tatsächlich verbleibenden Rest. Ungenutzter EVCS-Anteil bleibt im selben EMS-Zyklus für den Speicher verfügbar.
- EVCS-PV-Start-Intent ergänzt: Ein verbundener Ladepunkt im Status `SuspendedEVSE` reserviert seinen technisch nutzbaren PV-Anteil bereits während Start-Hysterese, Rampenaufbau oder verzögerter Leistungstelemetrie. Der Intent reduziert nur das PV-Restbudget und täuscht keine bereits vorhandene Netz-/Anschlusslast vor; `SuspendedEV` reserviert bewusst nichts.
- Die lokale EVCS-PV-Rekonstruktion bleibt nur Diagnose beziehungsweise Kompatibilitätsfallback für Alt-Laufzeiten ohne Core. Sobald die zentrale Runtime vorhanden ist, wird bei einem fehlenden oder veralteten Core-Snapshot sicher blockiert, statt ein zweites lokales PV-Budget zu starten.
- Speicherregelung berechnet keine eigene 80/20-Verteilung mehr. Generic-, Split-DP-, Sungrow-, E3/DC-, FENECON-Assist- und Speicherfarm-Pfade verwenden den zentralen Grant nach der EVCS-Reservierung; der finale Hersteller-Sollwert bleibt durch denselben Rest-Cap begrenzt.
- Speicher-Netzladen aus Tarif, Reserve oder LSK verwendet ebenfalls den zentralen Gesamtgrant nach der EVCS-Reservierung und reserviert seinen tatsächlich freigegebenen Anteil für nachgelagerte Verbraucher. E3/DC erkennt dabei auch die direkten Quellen `tarif` und `reserve` als `GRID_CHARGE`.
- Thermik und Heizstab verwenden ausschließlich die nach EVCS und Speicher verbleibenden zentralen Grants. Tarif-/Netzbudget und PV-Budget bleiben getrennte Gates, werden aber über dieselbe sequenzielle Runtime reserviert.
- Feldregression ergänzt: `17,7 kW PV`, `7,4 kW NVP-Einspeisung`, `3,0 kW laufende Speicherladung` und `0,5 kW Reserve` ergeben `9,9 kW` zentrales PV-Budget; bei 80/20 werden `7,92 kW` für E-Mobilität und `1,98 kW` für den Speicher freigegeben.
- Neue Regression `test:central-pv-budget-orchestration` sichert PV-/Gesamtbudget, EVCS-Pending-Intent, Speicher-Restgrant und die nachgelagerten Verbraucher gegen Doppelbelegung ab.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v401` erhöht.

## 0.8.98

- Zentrale PV-Budgetrekonstruktion korrigiert: Das physikalische PV-Budget verwendet jetzt den **signierten NVP-Wert**. Netzbezug wird abgezogen, sodass laufende Wallbox- oder Speicherlasten das vermeintliche PV-Angebot nicht mehr selbst aufblähen können.
- PV-Priorisierung **Speicher & E-Mobilität** nachgebessert: Das EVCS-Modul reserviert zuerst seinen tatsächlich genutzten Anteil; der Speicher erhält anschließend ausschließlich den verbleibenden PV-Anteil. Nicht genutzter EVCS-Anteil bleibt im selben EMS-Zyklus für den Speicher verfügbar.
- Sungrow-Herstellerpfad korrigiert: Der geschlossene NVP-Regelkreis kann den zentralen EVCS-/Speicher-PV-Cap nach der Herstellerberechnung nicht mehr überschreiben. Der finale Cap wird unmittelbar vor dem Geräte-Schreibpfad erneut angewendet.
- Kurzzeitig inkonsistente `remainingPvW`-Werte werden aus dem autoritativen Allocation-Gate und der tatsächlichen EVCS-Reservierung rekonstruiert. Dadurch entsteht zwischen zwei gültigen Ladezyklen kein falscher `0-W`-Stopp.
- Sungrow-0-W-Firewall ergänzt: Normale Zielband-, Telemetrieversatz- und Leerlaufzyklen verwenden **No-Write/Hold**. `0 W` wird nur noch bei ausdrücklich erkannten Stopbedingungen, SoC-/Leistungsgrenzen, sicherem Richtungswechsel, vollständig verbrauchtem PV-Budget oder längerem NVP-Ausfall geschrieben.
- Sungrow-Hersteller-Neuberechnung übernimmt die gemeinsame Eigenverbrauchs-Min-SoC-/Reservegrenze jetzt nochmals als finale Entladefreigabe. Dadurch kann der NVP-Regelkreis einen echten SoC-Schutzstopp nicht nachträglich überschreiben.
- Kurze Sungrow-NVP-Aussetzer erhalten den letzten erfolgreich geschriebenen Nicht-Null-Sollwert standardmäßig 30 Sekunden ohne neuen Gerätebefehl; erst danach greift der Sicherheitsstopp.
- Neue Diagnosen `pvBudgetPostVendorCapW`, `pvBudgetPostVendorCapped`, `pvBudgetRuntimeRemainingW`, `pvBudgetAllocationDerivedW`, `pvBudgetEvcsReservedW` und `pvBudgetResolution` zeigen die tatsächliche EVCS-/Speicher-Aufteilung und eventuelle Runtime-Rekonstruktionen.
- Regressionen erweitert: signierte NVP-Budgetberechnung, Sungrow-80/20-Feldszenario, finaler Hersteller-Cap, inkonsistenter Runtime-Rest, NVP-Zielband ohne 0-W-Puls und kurzer NVP-Ausfall mit No-Write.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v400` erhöht.

## 0.8.97

- Adapter-Lifecycle: zentraler Shutdown-Guard ergänzt. Sobald `onUnload()` beginnt, werden keine neuen Adapter-Timer, State-/SSE-Folgeverarbeitungen, abgeleiteten Energieflussberechnungen oder Live-Core-Refreshes mehr gestartet.
- EMS-Abschaltung vervollständigt: Engine und Module werden gestoppt; Charging-Management-Publish-Queue sowie BHKW-/Generator-Pulstimer werden beim Shutdown nicht erneut geplant. Dadurch verschwindet der Log-Spam `setTimeout called, but adapter is shutting down`.
- `info.connection` wird beim Beenden weiterhin korrekt auf `false` geschrieben, löst danach aber keine neue interne State-/SSE-Timerkette mehr aus.
- LIVE-Energiefluss: sichtbare Telemetrie wird im Kundenfrontend nur noch in einem festen 15-Sekunden-Takt gerendert. Häufige SSE-Werte werden im Hintergrund gepuffert; beim ersten Laden und nach Rückkehr in den sichtbaren Browser-Tab erscheint der aktuelle Stand sofort.
- Wichtig: Die 15 Sekunden betreffen ausschließlich die Anzeige. Datenerfassung, Speicher-/EVCS-/Heizstabregelung und übrige EMS-Regelkreise behalten ihren schnellen bisherigen Takt.
- Neue Regressionen `test:adapter-shutdown-timer-guard` und `test:live-energy-flow-15s-cadence` sichern Shutdown ohne neue Timer sowie die getrennte Anzeige-/Regelungsfrequenz ab.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v399` erhöht.

## 0.8.96

- Speicherregelung: Direkter PV-/Gebäudelast-Feed-forward ergänzt. Die primäre NVP-Regelgleichung bleibt `Soll = Batterie-Ist + (NVP-Ist - NVP-Ziel)`; PV wird dort ausdrücklich nicht zusätzlich addiert und dadurch nicht doppelt gezählt.
- Der Feed-forward verwendet ausschließlich frische, direkt gemappte PV- und Gebäudeverbrauchswerte. Eine aus PV + NVP + Speicher rückgerechnete Gebäudelast ist als Regelquelle gesperrt, damit kein zirkulärer Regel-Loop entsteht.
- Plausibilitätsprüfung ergänzt: Meldet ein Speicher zeitweise `0 W` oder einen deutlich unplausiblen Istwert, obwohl die direkte PV-/Last-/NVP-Bilanz eine laufende Be- oder Entladung ergibt, übernimmt kontrolliert der absolute Feed-forward-Sollwert statt eines unberechtigten `0-W`-Stopps.
- Sungrow Hybrid ESS vollständig auf den gemeinsamen geschlossenen NVP-Regelkreis umgestellt. Alte Zweige `write-zero-pv-covered`, `write-zero-pv-internal` und `write-zero-nvp-balanced` sowie die zugehörigen AppCenter-Schalter wurden entfernt.
- `0 W` bleibt ausschließlich ein bewusster Stop bei Schutzgrenze, fehlender NVP-Messung oder sicherem Richtungswechsel. Im NVP-Zielband wird ein aktiver Nicht-Null-Sollwert weiter gehalten.
- Hersteller- und Zielpfade vereinheitlicht: Generic signed-DP, getrennte Lade-/Entlade-DPs, Sungrow, E3/DC RSCP und Speicherfarm nutzen dieselbe Istleistungs-/NVP-/Feed-forward-Basis; FENECON-No-Write bleibt unverändert.
- Sungrow respektiert nach der Hersteller-Neuberechnung weiterhin alle vorgeschalteten Demand-, EVCS-, Budget-, SoC- und Anschluss-Caps und kann diese nicht mehr nachträglich aufweiten.
- Neue Diagnosen `speicher.regelung.balanceFeedForward*` sowie Plausibilitätsfehler/Feedback-Verwerfung ergänzt. Neue Regression `test:storage-pv-load-feedforward-zero-stop`; Sungrow- und asynchrone Hersteller-Tests auf die bereinigte Logik aktualisiert.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v398` erhöht.

## 0.8.95

- Speicherregelung/NVP-Balancing: Herstellerübergreifender Batterie-Istwert-Puffer ergänzt, damit asynchron aktualisierte NVP- und Speicherwerte den Sollwert nicht mehr zwischen wenigen hundert Watt und mehreren Kilowatt springen lassen.
- Neue gemeinsame Regelbasis: Der letzte echte physische Speicher-Istwert bleibt standardmäßig bis zu 45 Sekunden verwendbar; NVP-Werte müssen weiterhin aktuell sein. Alte Sollwerte werden niemals als vermeintliche Istleistung übernommen.
- Einschwingkompensation: Nach einer echten Sollwertänderung wird die Reaktion des Speichers kontrolliert abgewartet. Wiederholtes Schreiben desselben Werts startet die Einschwingzeit nicht erneut.
- Im NVP-Zielband bleibt ein aktiver Nicht-Null-Sollwert stabil erhalten. `0 W` bleibt ausschließlich ein bewusster Stop-, Schutz- oder Richtungswechselbefehl.
- Gilt für Generic signed-DP, getrennte Lade-/Entlade-DPs, Sungrow Hybrid ESS, E3/DC RSCP, Speicherfarm, Eigenverbrauchsoptimierung, PV-Überschussladung und NVP-geführte Tarifpfade. Der FENECON-No-Write-Modus bleibt unverändert.
- AppCenter/Speicher: Parameter **Istwert halten (s)** ergänzt; Standard 45 Sekunden. Diagnosewerte `batteryPowerFeedback*` und erweiterte `balance*`-States zeigen Messwertalter, Halten/Prognose und aktive Regelbasis.
- Neue Regression `test:storage-async-feedback-all-profiles` prüft signed, split, Sungrow, E3/DC und Speicherfarm sowie den Schutz gegen Hochintegration ohne echten Istwert.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v397` erhöht.

## 0.8.94

- Speicherregelung/Eigenverbrauch: Erreicht der Speicher durch eine laufende Be- oder Entladevorgabe das NVP-Zielband, bleibt der letzte erfolgreich geschriebene Nicht-Null-Sollwert aktiv. `0 W` wird nicht mehr als normales Regelergebnis verwendet, sondern nur noch für ausdrückliche Stopbedingungen wie SoC-Grenzen, deaktivierte Regelung, fehlende NVP-Messung, Richtungswechsel oder aufgehobene PV-Freigabe.
- Die Istleistungs-/NVP-Differenzregelung bleibt aktiv: Außerhalb des Zielbands wird weiterhin aus Batterie-Istleistung plus aktueller NVP-Abweichung nachgeregelt; alte Sollwerte werden dabei nicht hochintegriert.
- Zentrale PV-Budgetierung erweitert: PV-/Min+PV-Wallboxen und Speicher teilen denselben physikalischen PV-Überschuss, ohne ihn doppelt zu verplanen. EVCS reserviert zuerst seinen zulässigen Anteil, der Speicher nutzt anschließend das im selben EMS-Tick verbleibende PV-Budget.
- Kundeneinstellungen: neuer Reiter **PV-Überschuss** mit den Prioritäten **Speicher zuerst**, **E-Mobilität zuerst** oder **Speicher & E-Mobilität**. Im gemeinsamen Modus ist der maximale EVCS-Anteil prozentual einstellbar; nicht genutzter EVCS-Anteil bleibt für den Speicher verfügbar.
- Dynamische Tarife, Reserve-/Netzladen sowie harte Netz-, Phasen- und §14a-Grenzen bleiben von der PV-Prioritätsauswahl getrennt und weiterhin übergeordnet wirksam.
- EVCS-PV-Rekonstruktion berücksichtigt eine bereits laufende Speicherladung beziehungsweise -entladung, damit der tatsächlich verteilbare PV-Anteil bei NVP-Regelung sichtbar bleibt.
- Neue Diagnosen für NVP-Hold und PV-Aufteilung, unter anderem `speicher.regelung.balanceLetztenSollwertGehalten`, `balanceGehaltenSollW`, `pvBudgetAllocationMode`, `pvBudgetReservedW` sowie `ems.budget.pvAllocation*` und `chargingManagement.control.pvAllocation*`.
- Neue Regressionstests `test:storage-actual-power-nvp-balance` und `test:pv-surplus-budget-priority`; bestehende Speicher-Feldtests auf die neue Nicht-Null-Haltefunktion erweitert.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v396` erhöht.

## 0.8.93

- Speicherregelung: Be- und Entladevorgaben werden jetzt zentral aus der frischen Batterie-Istleistung plus aktueller NVP-Differenz berechnet (`Soll = Istleistung + NVP-Ist - NVP-Ziel`).
- Verhindert sprunghaftes Hin-und-her-Regeln durch alte Sollwerte: Der Leistungsaufbau wird begrenzt, die Ruecknahme in Richtung `0 W` erfolgt schnell und ein Richtungswechsel geht zuerst ueber `0 W`.
- Batterie-Istleistung und RAW-NVP werden nur gemeinsam verwendet, wenn beide Messwerte frisch und zeitlich plausibel zueinander sind. Ohne gueltiges Istfeedback wird kein alter Lade-/Entladesollwert mehr hochintegriert.
- Die Logik greift fuer Eigenverbrauch, PV-Ueberschussladen, Tarif-NVP-Entladung und Sungrow-NVP-Balancing; Generic signed-/Split-DPs, E3/DC-RSCP und Speicherfarm nutzen den daraus erzeugten sicheren Zielwert ueber ihren bestehenden Schreib-/Verteilpfad.
- Harte Lade-/Entlade-Caps bleiben nach der Regelung aktiv, damit weder alte Rampenwerte noch asynchrone Messungen Anschlussbedarf oder PV-Ueberschuss kuenstlich vergroessern.
- Neue Diagnosen: `speicher.regelung.balanceIstLeistungW`, `balanceBasisW`, `balanceNvpW`, `balanceNvpFehlerW`, `balanceKorrekturW`, `balanceSollW`, `balanceFeedbackVerwendet`, `balanceMessversatzMs` und `balanceModus`.
- Regressionstest `test:storage-actual-power-nvp-balance` prueft Laden, Entladen, Deadband, schnelle Ruecknahme, Richtungswechsel, stale Messwerte und den produktiven Tick ohne zweite Sollwert-Rampe.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v395` erhoeht.

## 0.8.92

- Speicherregelung/Eigenverbrauch: NVP-Führungswert geglättet, damit der Speicher im Energiefluss nicht mehr bei kleinen Messsprüngen zwischen Bezug und Einspeisung pendelt.
- RAW-Schutz bleibt aktiv: größerer echter Netzbezug oder Export übersteuert den Filter sofort, damit keine träge Regelung entsteht.
- AppCenter/Speicher: neue Tuningwerte für Ziel-Netzbezug, Deadband, Glättungszeit und RAW-Guard ergänzt.
- Gebäudeverbrauch: frische direkt gemappte Verbrauchs-DPs werden bevorzugt; die Bilanz aus PV + NVP + Speicher bleibt Fallback und Diagnosewert.
- Neue Diagnosen: `speicher.regelung.selfNvpRawW`, `selfNvpFilteredW`, `selfNvpControlW`, `selfNvpControlMode` und `derived.core.building.loadSource`.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v394` erhöht.

## 0.8.90

- Wallbox-/EVCS-Speicherschutz herstellerübergreifend korrigiert.
- Wallboxen ohne aktive Speicher-Mitnutzung werden jetzt als geschützte Last an die Speicherregelung übergeben.
- Die Speicher-Eigenverbrauchsoptimierung verschiebt ihr NVP-Ziel um diese geschützte EVCS-Leistung, sodass nur der Hausverbrauch ohne Wallbox durch den Speicher abgedeckt wird.
- Die Korrektur greift vor dem Hersteller-Schreibpfad und funktioniert dadurch mit Generic signed-DP, getrennten Lade-/Entlade-DPs, Sungrow Hybrid, FENECON/OpenEMS und E3/DC RSCP.
- Neue Diagnosen: `chargingManagement.control.storageProtectedLoadW`, `chargingManagement.control.storageProtectedWallboxes`, `chargingManagement.control.storageAssistRequestedLoadW`, `speicher.regelung.evcsSpeicherSchutzLastW` und `speicher.regelung.evcsSpeicherSchutzNvpZielOffsetW`.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v392` erhöht.

## 0.8.89

- Ergänzt das Herstellerprofil **E3/DC RSCP / ioBroker.e3dc-rscp** in der Einzel-Speicherregelung.
- Registriert die E3/DC-Steuerdatenpunkte `EMS.SET_POWER_MODE` und `EMS.SET_POWER_VALUE` als eigenen Speicher-Zielpfad.
- Unterstützt optional `EMS.POWER_LIMITS_USED`, `EMS.MAX_CHARGE_POWER` und `EMS.MAX_DISCHARGE_POWER`.
- Blendet E3/DC-spezifische Datenpunkte und Optionen nur beim E3/DC-Herstellerprofil ein.
- Ergänzt Diagnose-States für E3/DC-RSCP-Schreibmodus, Moduscode, Wert, GRID_CHARGE und Schreibstatus.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v391` erhöht.

## 0.8.88

- Speicherregelung/Sungrow: fehlende Diagnose-Objekte `speicher.regelung.sungrowHybrid*` werden jetzt in `_ensureStates()` angelegt, damit ioBroker keine zyklischen `State ... has no existing object`-Warnungen mehr schreibt.
- Speicherregelung/Eigenverbrauch: getrennte Lade-/Entlade-Sollwert-DPs werden jetzt auch einzeln unterstützt. Wenn nur eine Richtung gemappt ist, bleibt diese Richtung nutzbar; eine fehlende Richtung fällt bei vorhandenem signed-DP auf diesen zurück oder wird sicher auf `0 W` verriegelt.
- Diagnose: `targetMode`, `splitTargetObjIds`, `lastWriteSplitJson` und `schreibStatus` zeigen jetzt sauber, ob `signed`, `split-charge-discharge`, `split-charge-only` oder `split-discharge-only` verwendet wird.
- Test: `test:storage-sungrow-diagnostics-split-targets` prüft fehlende Sungrow-Diagnoseobjekte und alle Split-/signed-Zielpfade.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v390` erhöht.

## 0.8.87

- Speicherregelung/Sungrow Hybrid ESS: NVP-Balancing korrigiert. Bei Rest-Netzbezug oder Rest-Export wird jetzt die aktuelle Batterie-Istleistung bzw. der letzte gültige NVP-Balancing-Sollwert mit der aktuellen NVP-Abweichung verrechnet.
- Sungrow: PV-deckender Betrieb setzt externe Lade-/Entladevorgaben nur noch auf `0 W`, wenn der NVP wirklich im Zielband liegt. Bei z. B. `700 W` Netzbezug wird weiter geregelt, bis der Zielbezug erreicht ist.
- Sungrow: laufende Beladung plus aktueller NVP-Export wird genutzt; Beispiel `2,9 kW` Ladung und `2,9 kW` Export ergibt ca. `5,8 kW` Ladeziel statt weiterem Restexport.
- Diagnose: zusätzliche `speicher.regelung.sungrowHybridNvp*`-States für Zielbezug, Deadband, Regelfehler, Balancing-Basis und Balancing-Ziel.
- Test: `test:storage-sungrow-hybrid-profile` erweitert um Import-, Entlade- und Lade-Balancing-Fälle aus dem Feld.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v389` erhöht.

## 0.8.86

- AppCenter/Speicher: Herstellerprofil-Auswahl ergänzt (`Generic`, `FENECON/OpenEMS/FEMS`, `Sungrow Hybrid ESS`).
- Speicherregelung: Sungrow-Hybrid-ESS-Modus ergänzt. Bei PV-deckender Leistung werden externe Lade-/Entladevorgaben auf `0 W` gesetzt, damit die interne Sungrow-PV-/Batterielogik nicht durch eine Entladeanforderung übersteuert wird.
- Speicherregelung: Sungrow entlädt nur noch NVP-begrenzt bei echtem Netzbezug ohne ausreichende PV-Deckung; PV-Laden wird bei Sungrow nicht extern erzwungen.
- Diagnose: neue `speicher.regelung.sungrowHybrid*`-States für Modus, Grund, PV/Last/NVP und Schreibmodus.
- Tests: Regressionstest `test:storage-sungrow-hybrid-profile` ergänzt.
- Cache: Service-Worker-Cache auf `nexowatt-cache-v388` erhöht.

## 0.8.85

- Speicherfarm-Menü/Topbar: Sichtbarkeit jetzt strikt an `/config.featureVisibility.hasStorageFarm` gebunden. Dieses Flag entsteht nur aus AppCenter `storagefarm` installiert+aktiv und echten Farm-Datenpunkten.
- Backend: alte `enableStorageFarm`-Fallbacks und `storageFarm.*` Runtime-States dürfen den Kundenmenüpunkt nicht mehr allein öffnen.
- Speicherfarm-Runtime-Hydration: rettet weiterhin vorhandene Farm-Zeilen für die Bearbeitung, aktiviert oder installiert die App aber nicht mehr automatisch.
- Frontend-Unterseiten nutzen die zentrale Feature-Sichtbarkeit, damit Live, History, EVCS, Reports, SmartHome und Storagefarm-Seite denselben Gatekeeper verwenden.
- Regressionstest `test:storagefarm-menu-appcenter-gate` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v387` erhöht.

## 0.8.83

- App-Center: Speicherregelung aus der allgemeinen Zuordnung in einen eigenen Reiter „Speicher“ verschoben, damit Einzel-Speicher-Konfigurationen übersichtlicher bleiben.
- Speicherregelungs-App: Speichertyp AC oder DC/Hybrid auswählbar. AC bleibt Standard; DC/Hybrid aktiviert zusätzliche PV-Erzeugungs-Zuordnung für Hybrid-/Gateway-Systeme.
- Einzel-DC-/Hybrid-Speicher: Neuer optionaler Messdatenpunkt `dcPvPowerObjectId` für die PV-Erzeugung des Hybrid-/PV-Wechselrichters. Der Wert ist ausdrücklich Messung/Kontext und kein Batterie-Sollwert.
- Speicher-Mapping/Diagnose: `speicher.mapping.kopplung`, `speicher.mapping.dcPvId`, `speicher.dcPvPowerW`, `speicher.regelung.speicherKopplung` und `speicher.regelung.dcPvPowerW` ergänzt. Alte DC-PV-Reste werden bei AC-Betrieb nicht weiter genutzt.
- Energiefluss/History: Einzel-DC-/Hybrid-PV kann analog zur Speicherfarm in die PV-Summe einfließen, mit Double-Count-Heuristik gegen doppelte Zählung.
- FENECON-/0-Einspeise-Kontext nutzt den Einzel-DC-/Hybrid-PV-Messwert als sauberes PV-/Tages-Signal, falls er gemappt ist.
- Regressionstest `test:storage-single-tab-coupling` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v385` erhöht.

## 0.8.82

- Speicher/FENECON/OpenEMS/FEMS: separater Hersteller-/Gateway-Haken in der Speicher-App ergänzt.
- Neuer Tages-/PV-No-Write-Modus: Bei FENECON kann NexoWatt im Tag-/PV-Betrieb keine externe Speicheranforderung mehr schreiben, damit FEMS/OpenEMS nach Watchdog-Ablauf wieder intern regeln kann.
- Optionaler NexoWatt-Assist ergänzt: Bei dauerhaftem Netzbezug darf NexoWatt zeitverzögert und hart NVP-begrenzt eine kleine Entladevorgabe setzen.
- MultiUse, Peak-Shaving, Tarif- und Reserve-Anforderungen bleiben als übergeordnete Policies schreibberechtigt.
- Speicherfarm-Zusammenspiel: Im FENECON-No-Write wird auch kein Farm-Sollwert verteilt; bei Assist oder übergeordneten Policies verteilt die Farm den NVP-begrenzten Zielwert weiter.
- FENECON-Diagnose um Tag-/PV-No-Write, Forecast-/Tageserkennung und Assist-Status erweitert.
- Regressionstest `test:storage-fenecon-day-no-write` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v384` erhöht.

## 0.8.81

- Speicherlogik komplett nach Rollenmodell nachgezogen: Speicherregelungs-App = reine Eigenverbrauchsoptimierung; MultiUse = führende Policy für Reserve, LSK/Peak-Shaving, EVCS-Kopplung und SoC-Zonen; Speicherfarm = reine Verteil-/Schreibschicht.
- Inaktive MultiUse-Zonen aktivieren keine Reserve-/LSK-/EVCS-Logik mehr und blockieren die normale Eigenverbrauchsregelung nicht.
- Entlade-Demand-Caps verschärft: Eigenverbrauch, Tarif-NVP-Entladung und LSK nutzen keinen alten Sollwert und keine abgeleitete Gebäudelast mehr als Demand-Basis.
- LSK-Cap korrigiert: Begrenzung basiert auf echter Peak-Überschreitung am NVP plus echter Batterie-Istentladung und Sicherheitsreserve, nicht auf gesamtem Import oder altem Sollwert.
- Speicherfarm-Floors an MultiUse-Rollenmodell angepasst: Reserve/LSK-Floors gelten nur bei aktiver MultiUse-Policy; 0-W-Limits bleiben bewusste Sperren pro Richtung.
- Regressionstests für Speicher-Baseline, Policy-Trennung, Lade-Cap und Entlade-Cap ergänzt/aktualisiert.
- Service-Worker Cache auf `nexowatt-cache-v383` erhöht.

## 0.8.79

- Speicher-Entladevorgabe abgesichert: Der letzte Sollwert wird nicht mehr als echte Entladeleistung in den NVP-Demand-Cap zurückgeführt. Dadurch kann die Eigenverbrauchs-/Tarifregelung bei kleinem Netzbezug nicht mehr auf viel zu hohe Entladeleistungen hochintegrieren.
- Harte Nach-Rampen-Begrenzung für NVP-Entladung ergänzt: Tarif- und Eigenverbrauchsmodus werden nach der Rampenlogik auf plausible aktuelle Last begrenzt.
- Speicherfarm-Istwertschutz ergänzt: Ist-Leistungs-DPs, die auf Steuer-/Sollwert-DPs zeigen, werden nicht mehr als echte Lade-/Entladeleistung der Farm verwendet und in der Diagnose markiert.
- Regressionstest für den 71,6-kW-Feldfehler ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v380` erhöht.

## 0.8.78

- Speicherregelung/App-Trennung korrigiert: Speicherregelungs-App startet die normale Eigenverbrauchsoptimierung; Speicherfarm startet die Regelung nicht mehr alleine, sondern bleibt Verteil-/Schreibschicht.
- MultiUse-Policy sauber abgegrenzt: SoC-Zonen werden nur bei aktiver MultiUse-App als führende Policy genutzt; inaktive MultiUse-Konfigurationen blockieren die normale Speicherregelung nicht.
- Speicherfarm-Limits zurückgestellt: Leere Be-/Entlade-Grenzen bedeuten unbegrenzt, 0 W sperrt die jeweilige Richtung bewusst.
- Diagnose ergänzt: Policy-Modus und aktive/ignorierte MultiUse-Policy werden als Speicherregelungs-States bereitgestellt.

## 0.8.77

- Speichersteuerung: Speicherfarm-Sollwerte aktivieren die zentrale Speicherregelung jetzt automatisch, auch wenn MultiUse nicht aktiv/installiert ist.
- MultiUse: Inaktive oder alte MultiUse-SoC-Zonen werden im Runtime-Config neutralisiert, damit Eigenverbrauchs-Entladen bei ausreichend SoC und Netzbezug nicht mehr auf 0 W hängen bleibt.
- Speicherfarm: Leere oder 0-W-Be-/Entladegrenzen bedeuten jetzt konsistent „unbegrenzt“ statt `charge_limit_zero`/`discharge_limit_zero`.
- Eigenverbrauchsregelung: Der Demand-Cap berücksichtigt den letzten eigenen Entlade-Sollwert, damit verzögerte/0-W-Istwerte der Farm den Sollwert nicht künstlich herunterziehen.
- Speicherfarm-UI: Hilfetexte und Platzhalter für Max. Beladen/Entladen auf „leer/0 = unbegrenzt“ korrigiert.
- Service-Worker Cache auf `nexowatt-cache-v378` erhöht.

## 0.8.76

- Heizstab-App: Neuer Reiter/Block „Betriebsart“ für den vorhandenen Auto-Button; auswählbar sind „PV-Überschuss am NVP“ und „0-W-Einspeisung / Forecast“.
- 0-W-/Forecast-Logik ersetzt im Auto-Modus die klassische PV-Überschusssteuerung, statt als zweite Testlast-Aktivierung daneben zu laufen.
- Alte `zeroExport.enabled`-Konfiguration wird nur noch zur Migration gelesen; die Laufzeitentscheidung hängt danach sauber an `heatingRod.autoMode`.
- Schnellsteuerung zeigt weiterhin nur einen Auto-Button und ergänzt Status/Diagnose zur aktiven Auto-Betriebsart.
- TS-Normalpfad überschreibt die JS-Probe-/Live-Guard-Strategie der 0-W-/Forecast-Betriebsart nicht mehr.
- Service-Worker Cache auf `nexowatt-cache-v377` erhöht.

## 0.8.75

- Kunden-/LIVE-Frontend: Passwortschutz für sichtbare Bedienung entfernt. Schnellsteuerung, EVCS, SmartHome, RFID und Kundeneinstellungen können ohne Admin-/Installer-Login genutzt werden.
- Schnellsteuerungs-Gates entfernt: Heizstab/Flow, Schwellwertregeln, Relais, BHKW und Generator werten keine Endkunden-Sperrflags mehr als Frontend-Bedienverbot aus.
- Auth-Leiste/Login-Dialog aus LIVE- und Einstellungsseite entfernt; App-Center-/Installer-/Adminseiten behalten ihren Rollen-/Capability-Schutz.
- Service-Worker Cache auf `nexowatt-cache-v376` erhöht, damit die offenen Controls sicher neu geladen werden.
- Keine Änderung an Export Guard, Netzschutz, Lademanagement-Budget oder Speicherregelung.

## 0.8.74

- History: Zusätzliche Energiefluss-Verbraucher verwenden jetzt eine stärker unterscheidbare 10-Farben-Palette; die gestrichelten Linien bleiben unverändert.
- Kundenmenü: Speicherfarm-Link und Speicherfarm-Reiter werden nur noch angezeigt, wenn die Speicherfarm im App-Center installiert/aktiv ist und eine echte Speicherfarm-Konfiguration vorhanden ist.
- Statische Unterseiten starten die Speicherfarm-Navigation versteckt und lassen sie erst nach der `/config`-Prüfung sichtbar werden.
- Service-Worker-Cache erhöht, damit die aktualisierte History-/Menüansicht nach dem Update zuverlässig neu geladen wird.
- Keine Änderung an EMS-Regelung, Lademanagement, Speicherregelung, Export Guard oder Hardwarewrites.

## 0.8.73

- EVCS/VIS: Ladepunkt-Kacheln behalten beim Hover eine neutrale Optik; der globale grüne Hover-Rand wird auf der EVCS-Seite unterdrückt.
- Grüne Umrandung und dezentes Leuchten werden nur noch über den echten Ladezustand `nw-tile--state-on` angezeigt.
- Keine Änderung an Lademanagement, Speicherregelung, Export Guard oder Hardwarewrites.

## 0.8.71

- Speicherregelung: NVP-basierte Eigenverbrauchs-/Tarif-Entladung gegen überschießende Sollwerte gehärtet.
- Ist-Leistung wird ignoriert, wenn sie auf Steuer-/Setpoint-DPs wie `aliases.ctrl.*`, `powerSetpointW`, `chargePowerW` oder `dischargePowerW` verweist.
- Entlade-Demand-Cap wird nach der Rampenbegrenzung erneut hart angewendet, damit ein alter hoher Sollwert nicht weitergeschleppt wird.
- Neue Diagnose: `speicher.regelung.batteryPowerTrusted`, `batteryPowerIgnoredReason`, `dischargeDemandCapW`, `dischargeDemandCapReason`.

## 0.8.70

- Speicher-App-Center bereinigt: sichtbare Hersteller-/Produktnamen in der Speichersteuerung durch allgemeine DP-Zuordnungs- und Gateway-Begriffe ersetzt.
- Keine Herstellerprofile: Steuerpfad bleibt herstellerunabhängig über Datenpunkt-Zuordnung und Capability-Erkennung.
- Legacy-State-IDs bleiben kompatibel, sichtbare Labels/Hinweise sind neutralisiert.

## 0.8.69

- Speicherregelung: Hersteller-offener Zielpfad für Einzel-Speicher ergänzt. Neben dem allgemeinen signed Sollleistungs-DP können jetzt getrennte positive Lade-/Entlade-Sollwert-DPs gemappt werden.
- Speicherregelung: Optionaler Run-/Externe-Regelung-DP ergänzt, damit Adapter/Bridges wie Sungrow-Profile die externe Sollwertführung aktivieren können.
- Speicherregelung: Eigenverbrauchs-Entladung ist für generische Speicher ohne explizite Gegenkonfiguration standardmäßig aktiv; Reserve, Tariffenster, SoC-Grenzen und Safety-Gates bleiben erhalten.
- Diagnose: Zielpfad, Split-Ziel-DPs, Run-DP und letzter Split-Schreibwert werden als States veröffentlicht.

## 0.8.68

- Access-Control: App-Center und Simulation liefern ohne passende Admin-/Installer-Session nur noch eine Sperrseite; es werden keine Hintergrundwerte geladen oder angezeigt.
- Auth: Pflicht-Login-Modus verhindert, dass Abbrechen den App-Center-Inhalt wieder freilegt.
- Lizenz: /api/license/info gibt Lizenzdaten nur noch für Admin-Rolle aus; Lizenzverwaltung bleibt Admin-only.

## 0.8.66

- Release: Versionsnummer auf 0.8.66 erhöht, damit npm nicht versucht, die bereits veröffentlichte 0.8.65 erneut zu überschreiben.
- EVCS Online-Erkennung: `onlineId` wird jetzt als eigener EVCS-State gespiegelt und im Charging-Management separat von `statusId` verarbeitet. Ein echter Online-/Offline-Datenpunkt ist damit authoritative; Status-Texte wie `Available` bleiben reine Anzeige-/Fallback-Information.
- EVCS VIS: Kachelzustand bevorzugt den echten Online-Zustand (`evcs.<n>.online`/`chargingManagement.wallboxes.lp<n>.online`) und wertet `active=false` weiterhin nur als Idle, nicht als Offline.
- Feldtest-Sicherheit: Active-Demand-Reservierung aus 0.8.65 bleibt unverändert; die zusätzliche Prüfung verhindert falsche Optik und falsche Online-Gates bei gemischten Status-/Online-Datenpunkten.

## 0.8.65

- EVCS/VIS: Ladepunkt-Kacheln unterscheiden Online/Idle und Offline jetzt sauber; online verfügbare Wallboxen werden nicht mehr ausgegraut, offline Ladepunkte werden gedimmt dargestellt.
- Lademanagement/Budget: Die zentrale EVCS-Reservierung wird nur noch aus aktivem Ladebedarf gebildet (frische Istleistung oder gültiger Ziel-/Sollwert bei verbundenem Fahrzeug). Inaktive/idle Ladepunkte blockieren kein Budget mehr.
- Diagnose: Active-Demand-Reserve und Anzahl aktiver Ladebedarf-Ladepunkte werden separat veröffentlicht.
- Keine Änderung an Hardwarewrites, Export Guard, Speicherfarm oder Mesh/Microgrid.

## 0.8.64

- Loadmanagement/Budget: EVCS-Ist wird in Status/Prioritäten nicht mehr aus Reservierung oder Sollwert rekonstruiert.
- Loadmanagement/Budget: Budget-Diagnose trennt EVCS-Ist, EVCS-Reservierung und EVCS-Sollwert klar.
- Core-Limits: PV-Budget bleibt physikalisch durch aktuelle PV-Erzeugung begrenzt; künstliches PV-Budget aus EVCS-Reservierung/Speicherentladung wird verhindert.
- Keine Änderung an Hardwarewrites, Export Guard, Speicherfarm oder Mesh/Microgrid.

## 0.8.63

- Core-Limits/Loadmanagement: Zentrales PV-Budget durch physikalische PV-Erzeugung gedeckelt. Flexible Lasten und Batterieentladung können bei PV=0 kein künstliches PV-Budget mehr erzeugen.
- Statusdiagnose: zusätzliche Rohdiagnose für PV-Budget-Rekonstruktion, physikalischen PV-Cap und geklemmte Leistung ergänzt.
- Keine Änderung an Hardware-Schreibpfaden, Speicherfarm, Export Guard oder Mesh/Microgrid.

## 0.8.62

- Lastmanagement: Gate-A-Netzbudget nutzt nur frisch gemessene EVCS-Istleistung für die Netzanschluss-Kappe. Alte Sollwert-/Reservierungswerte können dadurch kein fiktives EVCS-Cap mehr erzeugen.
- Status/App-Center: EVCS Ist, EVCS Reserviert und EVCS Soll werden getrennt angezeigt.
- Zentrales EMS-Budget: EVCS-Reservierung bleibt für Downstream-Apps erhalten, EVCS-Ist wird aber als echte Messleistung veröffentlicht.

## 0.8.61

- Lademanagement: EVCS-Netzcap konservativ gehärtet. Negative Grundlast durch laufende, lokal gedeckte EVCS-Leistung wird nicht mehr als zusätzliche Netzanschlusskapazität genutzt.
- App-Center Status: zeigt jetzt „Lokale Deckung“ separat und „EVCS Cap (Netz sicher)“ statt eines missverständlichen Caps über dem Netzanschluss.
- Regelung: keine Änderung an Hardwarewrites; nur Budget-/Diagnoseformel für Gate A Netz korrigiert.

## 0.8.60

- Core-Limits: TS-Shadow-Vergleich für `grid.effectiveW` als Diagnose-only klassifiziert, damit kein minütlicher Warn-Log-Spam mehr entsteht.
- Core-Limits: Warnungen werden nur noch für echte Warnfelder ausgegeben; `grid.effectiveW` bleibt im Diagnose-JSON sichtbar.
- Sicherheit: keine Änderung an produktiver Regelung, 0-Einspeisung, Speicherfarm, Mesh/Microgrid oder Hardwarewrites.

## 0.8.59

- App-Center: Regression Safety Gate ergänzt. Bekannte Speicherfarm-Konfigurationen werden beim Speichern nicht mehr versehentlich mit leerer UI-Liste überschrieben.
- Qualität: Kritische Release-Gates für Speicherfarm, App-Center-Struktur, No-Release-Artefakte und Runtime-Sync gebündelt.
- Sicherheit: Keine Änderung an Regelung, Export Guard, Mesh/Microgrid oder Hardware-Schreibpfaden.

## 0.8.58

- Speicherfarm/App-Center: Fehler behoben, durch den die Master-Detail-Ansicht nach dem Hinzufügen oder Wiederherstellen eines Speichers wegen undefiniertem `htmlEscape` abbrechen konnte.
- Speicherfarm/App-Center: Runtime-Fallback erweitert. Wenn `storageFarm.configJson` leer ist, werden sichtbare Speicher aus `storageFarm.storagesStatusJson` oder notfalls aus `storageFarm.storagesTotal` als editierbare Platzhalter wiederhergestellt.
- Sicherheit: keine Änderung an Speicherfarm-Regelung, Dispatch, Export Guard, Mesh/Microgrid oder Hardwarewrites. Nur UI-/Konfigurationswiederherstellung.

## 0.8.57

- Bugfix: Speicherfarm-Konfiguration im App-Center wird wieder aus `storageFarm.configJson`/`storageFarm.groupsJson` hydratisiert, wenn `installer.configJson` keine `storageFarm.storages` enthält.
- Schutz: Speichern im App-Center überschreibt produktiv laufende Speicherfarm-Konfiguration nicht mehr versehentlich mit einer leeren Speicherliste.
- Regressionstest `test:storage-farm-appcenter-restore` ergänzt.
- Keine neue Regelstrecke, keine neue Hardwaresteuerung.

## 0.8.56

- 0-Einspeise: Senken-ACK-Verlauf und Feldprotokoll ergänzt.
- ACK-/Status-States je Senke werden nachgelagert gelesen; kein Schreibtest pro Regel-Tick.
- Fehler/Timeout blockieren nur die betroffene Senke, damit der Export Guard schnell zur nächsten Senke oder WR-Abregelung wechseln kann.
- Neue Diagnose-States unter `gridConstraints.exportLimit.sinkAck*` und `gridConstraints.exportLimit.sinks.*.ack*`.

## 0.8.55

- 0-Einspeise: Senken-Freigabe und schneller Aktivbetrieb ergänzt. Schreibtests werden nicht in jedem Regel-Tick ausgeführt.
- Export Guard nutzt gespeicherte ACK-/Freigabedaten je Senke und blockiert fehlerhafte Ziele temporär, bevor die nächste Senke oder WR-Abregelung als Fallback genutzt wird.
- Neue Runtime-States für Fast-Path, Sink Availability, ACK-Zusammenfassung und Zielblockierung ergänzt.
- Bestehende Export-Guard-Regelstrecke bleibt die einzige Regelstrecke; keine zweite 0-Einspeise-Regelung.

## 0.8.54

- 0-Einspeise Inbetriebnahme-Assistent ergänzt. Bestehender Export Guard wird nicht dupliziert.
- Checkliste für Smartmeter, Installateurfreigabe, 0-W-Limit, WR-Write, Senkenreihenfolge und neutrale Senken ergänzt.
- Write-Test-Vorschau und Feldreport unter `gridConstraints.exportLimit.commissioning.*` ergänzt.
- App-Center Diagnose zeigt Inbetriebnahme-Score und offene Pflichtprüfungen.

## 0.8.53

- Audit-/Regression-Fix: alte Versionsanker in Mesh-/0-Einspeise-Testskripten korrigiert.
- Runtime-TS-Spiegel synchronisiert, damit `check:ts-runtime-mirrors` wieder sauber läuft.
- Keine neue EMS-Regelstrecke, keine direkte Hardwaresteuerung, kein App-Center-Schemawechsel.

## 0.8.52

- Hotfix: 0-Einspeise-Senkenkaskade schreibt konfigurierte Speicher-/Ladepunkt-/Flex-/Mesh-Command-States jetzt im Aktivmodus als neutrale JSON-Commands.
- Hotfix: Fehlende WR-Write-Datenpunkte werden nicht mehr als alleiniger Blocker bewertet, wenn aktive Senken-Command-States vorhanden sind; WR-Abregelung bleibt letzte Stufe.
- Neue Diagnose-States für Sink-Command-Write-Status und Fehlertext ergänzt.

## 0.8.51

- Export Guard/0‑Einspeisung: Senkenreihenfolge festgelegt und sichtbar gemacht: Verbrauch zuerst, Speicher laden, Ladepunkte, flexible Verbraucher, Mesh/Microgrid, WR-Abregelung zuletzt.
- Installer: optionale neutrale Command-State-Felder für Speicher, Ladepunkte, flexible Verbraucher und Mesh/Microgrid ergänzt.
- Runtime-Diagnose: `gridConstraints.exportLimit.sinkPriority*` States und nächster Senken-Schritt ergänzt.
- Architektur: keine zweite Einspeiseregelung; die bestehende Export-Guard-/Grid-Constraints-Regelung bleibt Quelle der Wahrheit.

## 0.8.50

- Mesh/Microgrid: Zielgruppen-Verteilung/Fairness ergänzt. Zielgruppen erhalten transparente Budgets, Mindestanteile, Gewichtung und Reserven.
- CommandGuard: Zielgruppen-Fairness begrenzt/blockiert nur neutrale Command-Intents; keine direkten Hardwarewrites.
- Betreiberansicht: Fairness-Budget und Restbudget je Zielgruppe sichtbar.

## 0.8.49

- Mesh/Microgrid: Zielgruppen-Strategie ergänzt. Knoten können zu Gruppen wie Ladepunkte, Speicher, Verbraucher oder Erzeuger gebündelt werden.
- CommandGuard berücksichtigt Gruppenpriorität, Gruppenlimits und Gruppenbudgets, bevor neutrale Command-Intents ausgegeben werden.
- App-Center: Zielgruppen-JSON im separaten Mesh/Microgrid-Reiter ergänzt; Apps bleibt reiner App-Katalog.
- Betreiberansicht/API/CSV enthalten Zielgruppen, Prioritätsreihenfolge und gruppenbedingte Limit-/Blockiergründe.
- Weiterhin keine direkten OCPP-/Modbus-/MQTT-/Herstellerwrites aus Mesh/Microgrid.

## 0.8.48

- Mesh/Microgrid: Leistungsgrenzen je Knoten ergänzt. `minPowerW`, `maxPowerW`, `maxImportW`, `maxExportW`, `maxChargeW`, `maxDischargeW`, `maxLoadW` und `maxGenerationW` können im Mesh/Microgrid-Reiter gepflegt werden.
- CommandGuard: Node- und Bridge-Ziel-Limits begrenzen oder blockieren neutrale Command-Intents vor der Ausgabe.
- Betreiberansicht und CSV/API: gekürzte und blockierte Commands mit Limitgrund sichtbar.
- Architektur: weiterhin herstellerneutral, keine direkten Hardwarewrites aus Mesh/Microgrid.

## 0.8.47

- Mesh/Microgrid: Bridge-Wiederfreigabe je Ziel ergänzt. ACK-OK gibt blockierte Ziele automatisch wieder frei.
- Mesh/Microgrid: manuelle Ziel-Freigabe über API/Betreiberansicht vorbereitet, ohne direkte Hardwarewrites.
- Mesh/Microgrid: Command-Verlauf je Bridge-Ziel als Diagnose-/Feldtestbasis ergänzt.

## 0.8.46

- Mesh/Microgrid: Bridge-ACK-Gate ergänzt. Optional kann ACK pro lokaler Bridge-Zuordnung als Voraussetzung für Folge-Commands gesetzt werden.
- Mesh/Microgrid: Ziel-Ampel und blockierte Ziele werden als Diagnose-States veröffentlicht; direkte Hardwarewrites bleiben weiterhin ausgeschlossen.
- App-Center: ACK-Gate-Schalter im Reiter Mesh/Microgrid ergänzt; Apps-Reiter bleibt reiner App-Katalog.
- Paket: Keine ZIP/TGZ-Artefakte im Paketbaum; TypeScript bleibt fachliche Quelle.

## 0.8.45

- Mesh/Microgrid: Local Bridge ACK- und Zielstatus ergänzt. Bridge-Zuordnungen können jetzt optionale ACK-/Status-States enthalten, die nur gelesen und herstellerneutral klassifiziert werden.
- Betreiberansicht: Bridge ACK / Zielstatus zeigt ok, pending, timeout, Fehler, veraltete und fehlende Rückmeldungen je Bridge-Ziel.
- App-Center: lokale Bridge-Zuordnung erhält ACK-Auswertung und Timeout, weiterhin im separaten Mesh/Microgrid-Reiter und nicht im Apps-Katalog.
- Sicherheit: keine direkten OCPP-/Modbus-/MQTT-/Herstellerwrites; das Mesh-Modul bleibt bei neutralen JSON-Command-Intents und liest ACKs nur zur Diagnose.

## 0.8.44

- Mesh/Microgrid: Local Bridge Mapping ergänzt. Freigegebene neutrale Mesh-Command-Intents können jetzt lokal auf Ziel-Command-States je Knoten geroutet werden.
- App-Center: Konfiguration bleibt im separaten Reiter Mesh/Microgrid; Apps-Reiter bleibt reiner App-Katalog.
- Betreiberansicht: Local-Bridge-Status, Mappingdiagnose, geroutete/ungemappte Commands und letzte Bridge-Writes sichtbar.
- Sicherheitsgrenze: weiterhin keine direkten OCPP-/Modbus-/MQTT-/REST-/Herstellerwrites aus der Mesh-App; lokale Bridges/Adapter setzen den JSON-Intent um.

## 0.8.43

- Mesh/Microgrid: Zwei-Instanzen-Feldtest mit Peer-Fehlerklassen, Roundtrip-Ampel und Remote-Node-Matrix gehärtet.
- Mesh/Microgrid: Feldtest-Verlauf persistenter als Diagnose-State veröffentlicht und Betreiberansicht erweitert.
- Sicherheit: Weiterhin keine direkten Hardwarewrites; Command-Receiver arbeitet ausschließlich über neutrale JSON-Command-States.

## 0.8.42

- Mesh/Microgrid: Feldtestansicht für zwei Instanzen ergänzt.
- Betreiberansicht zeigt Peer-Matrix, Handshake-Status, Command-/ACK-Verlauf und Fehlerklassifikation für Token, Cluster, TTL und Replay.
- Neuer manueller Probe-Endpunkt `/api/mesh/peer/fieldtest` prüft Handshake, Status und Command-Receiver über das separate Mesh-Tailscale.
- Weiterhin herstellerneutral: keine direkten Hardwarewrites, nur neutrale JSON-Command-Envelopes für lokale Bridges.

## 0.8.41

- Mesh/Microgrid: Peer-Handshake und Command-Receiver für das separate Mesh-Tailscale ergänzt.
- Remote-Kommandos werden tokenisiert, Cluster-geprüft, replay-geschützt und nur als neutraler lokaler JSON-Command-State ausgegeben.
- API-Routen `/api/mesh/handshake`, `/api/mesh/status` und `/api/mesh/command/receive` ergänzt.
- App-Center Mesh/Microgrid-Reiter um Command-Receiver-Konfiguration erweitert; Apps-Reiter bleibt reiner App-Katalog.

## 0.8.40

- Mesh/Microgrid: Feldtest-Steuerung ergänzt. Geplante Aktionen können nach Installateurfreigabe als neutrale JSON-Command-Intents in einen konfigurierten Command-State ausgegeben werden.
- Mesh/Microgrid: Separates Tailscale-Mesh-Profil, lokale Node-ID und Peer-URLs vorbereitet, damit Fernwartung und Energieverbund getrennt bleiben.
- Sicherheit: keine direkten OCPP-/Modbus-/MQTT-/Hersteller-Hardwarewrites; Umsetzung erfolgt nachgelagert über Bridge/Instanz.

## 0.8.39

- Mesh/Microgrid: CommandGuard-Vorbereitung ergänzt. Geplante Diagnoseaktionen werden jetzt als neutrale, blockierte Command-Intents veröffentlicht.
- Mesh/Microgrid: Safety-Prüfungen für EOS-Lizenz, Feature-Freigabe, Netzlimit, Knotenprioritäten, Mapping-Vollständigkeit und Read-only-Gate ergänzt.
- Mesh/Microgrid: API `/api/mesh/microgrid/command-guard` liefert die Guard-Vorschau; POST `/api/mesh/microgrid/command` bleibt absichtlich read-only blockiert.
- Betreiberansicht: CommandGuard-Status, Safety-Checks und blockierte Command-Intents sichtbar gemacht. Keine Hardwaresteuerung.

## 0.8.38

- App-Center Strukturhärtung: Der Apps-Reiter bleibt strikt ein App-Katalog für Installiert/Aktiv und optionale Navigationsbuttons.
- Schnell-Inbetriebnahme (Geräte + DPs) aus dem Apps-Reiter in den Reiter Zuordnung verschoben.
- Optionale Detail-Reiter werden im HTML initial ausgeblendet und erst über den Installiert-Status sichtbar gemacht.
- Regressionstest erweitert, damit neue Detailkonfigurationen nicht erneut im Apps-Reiter landen.
- Service-Worker Cache auf `nexowatt-cache-v338` erhöht.

## 0.8.37

- App-Center: Mesh/Microgrid-Detailkonfiguration aus dem Reiter Apps entfernt. Apps zeigt nur noch Installiert/Aktiv und einen Hinweis.
- Neuer Reiter Mesh/Microgrid, sichtbar nur bei installierter EOS Mesh/Microgrid-App.
- Regressionstest erweitert, damit große Modul-Konfigurationen nicht wieder auf der Apps-Startseite landen.

## 0.8.36

- EOS Mesh/Microgrid: Regelbasis im Diagnosemodus ergänzt. Die Betreiberansicht zeigt geplante Local-First-/Grid-Last-Aktionen, Prioritätsreihenfolge und Netzlimit-Diagnose.
- Wichtig: Alle geplanten Entscheidungen sind read-only (`hardwareWrite=false`) und schreiben keine Hardware-, WR- oder Ladepunkt-Setpoints.
- Mesh/Microgrid CSV-/JSON-Snapshot enthält jetzt Planungsdiagnose und geplante Aktionen.
- Service-Worker Cache auf `nexowatt-cache-v336` erhöht.

## 0.8.35

- EOS Mesh/Microgrid: Betreiberansicht `/mesh/microgrid` ergänzt.
- Neue JSON-/CSV-Snapshot-APIs für Cluster, Knoten, Energy-Intents und Local-First/Grid-Last-Diagnose.
- App-Center verweist aus der Mesh/Microgrid-App auf die Betreiberansicht; die Logik bleibt read-only und schaltet keine Hardware.
- Service-Worker Cache auf `nexowatt-cache-v335` erhöht.

## 0.8.34

- App-Center: Button „Zurück zum Installer“ korrigiert. Der Link springt jetzt auf den ioBroker-/EOS-Admin-Tab `#tab-nexowatt-ui-0` mit Admin-Port statt auf `tab.html` am Adapter-Webserver.
- Admin-Port-Erkennung ergänzt: `adminPort`, `ioBrokerAdminPort` oder `port` können per URL übergeben werden; Standard bleibt 8081.
- Referrer vom Adapter-Port wird nicht mehr als Admin-Ziel verwendet, damit kein Rücksprung auf den falschen Port entsteht.

## 0.8.34

- App-Center: Der Button „Zurück zum Installer“ verweist jetzt zuverlässig auf den ioBroker-/EOS-Admin-Tab `#tab-nexowatt-ui-0` auf dem Admin-Port statt auf `/tab.html` am Adapter-Webserver.
- Regressionstest `test:installer-back-link` ergänzt, damit der falsche `/adapter/nexowatt-ui/tab.html`-/`tab.html`-Rücksprung nicht zurückkommt.
- Service-Worker Cache auf `nexowatt-cache-v334` erhöht.

## 0.8.33

- App-Center-Struktur bereinigt: Apps zeigt nur noch Funktionsmodule; System-/Marktprofil und NL P1/DSMR liegen im Reiter Zuordnung.
- EOS DC Station Display / Stationsseiten wurden in den Reiter Ladepunkte verschoben.
- Button „Zurück zum Installer“ im App-Center-Header ergänzt.
- Speicherfarm-Konfiguration als Master-Detail-Ansicht umgebaut: links Speicherliste, rechts nur das Detailformular des ausgewählten Speichers.
- Kommentare zur verbindlichen App-Center-Sortierregel ergänzt.

## 0.8.33

- App-Center-Struktur bereinigt: Der Apps-Reiter zeigt nur noch Funktionsmodule.
- System & Marktprofil sowie NL P1/DSMR & Teruglevering sind jetzt dem Reiter Zuordnung zugeordnet.
- EOS DC Station Display / Ladestationsseiten sind jetzt dem Reiter Ladepunkte zugeordnet.
- Neuer Button „Zurück zum Installer" im App-Center-Kopfbereich.
- Speicherfarm auf Master-Detail-Ansicht umgestellt: links Speicherliste, rechts nur der ausgewählte Speicher im Detail.
- Schema dokumentiert: Apps = Funktionsmodule, Zuordnung = Mapping/Marktprofil, Ladepunkte = LP/Stationsseiten, Status = Runtime/Diagnose.

## 0.8.32

- EOS: Neue separate App „EOS Mesh/Microgrid“ ergänzt.
- EMS: Read-only Mesh-/Microgrid-Datenmodell mit Knoten, Cluster, Local-First-/Grid-Last-Vorbereitung und Energy-Intent-JSON-States.
- App-Center: Installer kann Mesh-Knoten, Rollen und Datenpunktquellen anlegen; Home bleibt blockiert.
- Sicherheit: Keine Hardware-Schreibbefehle, keine doppelte Ledger-/Wallet-/Export-Guard-Logik, keine Hersteller-/OCPP-Bindung.

## 0.8.30

- Export Guard: Diagnose/Testmodus ergänzt. In diesem Modus werden Einspeiselimit, geplante Aktion und Abregelungsbedarf berechnet, aber keine WR-/PV-Setpoints geschrieben.
- Installer/App-Center: Runtime-Diagnose für Einspeisebegrenzung zeigt aktuelle Einspeisung, erlaubtes Limit, Überschreitung, Abregelung, WR-Schreibfähigkeit, geplante Aktion und Negative-Preis-Strategie.
- Grid Constraints: neue Diagnose-States `runMode`, `diagnosticOnly`, `plannedAction`, `installerMessage` und `installerChecklistJson` ergänzt.
- Release-Hygiene: ZIP-/TGZ-Artefakte bleiben bewusst außerhalb des Pakets und werden durch `.npmignore` ausgeschlossen.

## 0.8.29

- Export Guard Diagnose erweitert: aktuelle Einspeisung gegen erlaubtes Limit, verbleibende Einspeiseleistung und Überschreitung werden sichtbar.
- Abregelungsleistung, fehlende WR-/PV-Write-Datenpunkte und negative-Preis-Strategie werden als Diagnose-States veröffentlicht.
- Energie-Wertkonto übernimmt die Export-Guard-Diagnose als Referenz und bereitet abgeregelte kWh, Abregelungswert und nicht genutzten PV-Wert vor, ohne Ledger-/Wallet-Werte doppelt zu zählen.
- LIVE-Karte zeigt den Export-Guard-Wert nur bei tatsächlicher Abregelung an.

## 0.8.26

- EOS: Local kWh Ledger Grundlage ergänzt. DC-Station-Display-Sessions werden herstellerneutral aus `chargeKiosk.stations.*.lastSessionsByLpJson` als kompakte Ledger-Einträge übernommen.
- Ledger-Summen für Tag, Monat und Jahr mit Solar-/Netzanteil, Wert, Stationen/LPs und Deduplikation über `processedSessionKeysJson` ergänzt.
- Exportbasis `energyLedger.export.todayCsvJson` und Recent-Entries vorbereitet; bewusst keine eichrechtsverbindliche Abrechnung.
- App-Center zeigt das EOS-only Modul `Local kWh Ledger`; die Funktion bleibt read-only und schaltet keine Hardware.
- Service-Worker Cache auf `nexowatt-cache-v326` erhöht.

## 0.8.25

- DC Station Display: Betreiberwerte erweitert. Letzte Session je LP wird persistiert und im Display angezeigt.
- DC Station Display: Betreiber-Tageswerte enthalten Solar-/Netzanteil, abgeschlossenen Umsatz, Exportbereitschaft und Sessiondiagnose.
- CSV-Export: Operator-Export v2 mit aktiven Sessions, persistierten letzten Sessions und Tages-Summen ergänzt.
- Architektur: Session-/Betreiberlogik bleibt hersteller- und protokolloffen, ohne OCPP-only-Kopplung.

## 0.8.24

- Energie-Wertkonto: Kundenhinweis und Installateurdiagnose getrennt; die LIVE-Karte zeigt nur kundenrelevante Warnungen, technische Details bleiben in `energyWallet.diagnostics.*`.
- Energie-Wertkonto: Dynamische Zeittarife bekommen Quelle, Alter und Max-Alter-Prüfung. Veraltete Tarifpreise fallen sauber auf den festen Netzstrompreis zurück.
- Kunden-Einstellungen: optionaler Schalter `Preisquelle in LIVE-Karte anzeigen` ergänzt.
- LIVE: optionale Preisquellen-Zeile mit wirksamem Preis, dynamischer Tarifquelle und Alter vorbereitet.
- Service-Worker Cache auf `nexowatt-cache-v324` erhöht.

## 0.8.23

- Energie-Wertkonto: Warnhinweis im LIVE-Dashboard entschärft; optionale veraltete Zusatzquellen wie EVCS/Speicher erzeugen nur noch Diagnosedaten, aber keine Kundenwarnung.
- Kunden-Einstellungen: Energie-Wertkonto bekommt einen eigenen An/Aus-Schalter und der Preisblock wurde unterhalb der dynamischen Tarif-/Netzentgelt-Sektion positioniert.
- Backend/EMS: `settings.energyWalletEnabled` als kundenseitiger Schalter ergänzt; bei Aus wird das Wertkonto deaktiviert und die LIVE-Karte ausgeblendet.
- Service-Worker Cache auf `nexowatt-cache-v323` erhöht.

## 0.8.22

- DC Station Display: Betreiber-/Sessionwerte pro Station robuster persistiert.
- Last-Session-je-LP und Tageskennzeichen für Betreiberwerte ergänzt.
- CSV-Exportbasis für Stations-/Sessiondaten unter `/api/display/station/<token>/operator.csv` vorbereitet.
- npm-Release-Prüfung ergänzt: `npm run release:verify-npm` prüft nach dem Publish, ob die Paketversion wirklich in der Registry sichtbar ist. Dadurch wird vermieden, dass das EOS/ioBroker-Repository eine Version freigibt, die beim Upgrade mit `ETARGET` nicht gefunden wird.
- Service-Worker Cache auf `nexowatt-cache-v322` erhöht.

## 0.8.21

- Burger-Menü-Härtung: `nw-shell.js` übernimmt den Menübutton im Capture-Flow, damit Seiten-spezifische Menühandler und Shell-Fallback nicht doppelt toggeln.
- LIVE/App-Menü markiert den eigenen Handler, sodass die Shell nicht zusätzlich denselben Button bindet.
- 0.8.20-Funktionsstand bleibt enthalten: LP-Bedienung auf DC-Station-Displays, AC-Phasenblock nur bei AC-Ladepunkten und dynamischer Tarif im Energie-Wertkonto.
- Service-Worker Cache auf `nexowatt-cache-v321` erhöht.

## 0.8.20

- DC Station Display: Jede LP-/Connector-Kachel bekommt eine eigene Bedienung für Regelung An/Aus, Modus Auto/Boost/Min+PV/PV, Speicher-Mitnutzung und Ziel-Laden.
- DC Station Display: AC-Phasenumschaltung 1p/3p/Auto PV wird nur bei AC-Ladepunkten mit konfigurierter Phasenumschaltung angezeigt; DC-Ladepunkte bleiben ohne fachlich falschen Phasenblock.
- Display-API: Neue tokenisierte Aktionen `set-enabled`, `set-mode`, `set-storage`, `set-goal` und `set-phase` laufen weiter über die herstellerneutrale NexoWatt-Steuerbrücke und schreiben keine direkten OCPP-/Herstellerbefehle.
- Energie-Wertkonto: Dynamische Zeittarife werden berücksichtigt. Ist der dynamische Tarif aktiv und ein aktueller Preis verfügbar, wird dieser Preis für vermiedenen Netzbezug verwendet.
- Einstellungen: Feste Preisannahmen für das Energie-Wertkonto liegen jetzt im Nutzerfrontend unter Einstellungen/Dynamische Zeittarife; das App-Center bleibt für Verknüpfungen und Installer-Konfiguration zuständig.
- App-Center: Preisfelder aus dem Installerbereich entfernt und durch Hinweis auf die Nutzer-Einstellungen ersetzt.
- Frontend: Burger-Menü zentral gehärtet; doppelte Menü-Handler von App-/Shell-Skripten schließen das Dropdown nicht mehr sofort wieder.
- Service-Worker Cache auf `nexowatt-cache-v320` erhöht.

## 0.8.19

- DC Station Display: Session-/Betreiberbasis ergänzt. Aktive/letzte Sessions werden im Display-Payload klarer gekennzeichnet, Session-Kosten nach Solar-/Netzanteil vorbereitet und Diagnosezustände erweitert.
- DC Station Display: Herstellerneutrale Steuerbrücke vorbereitet. Befehle laufen weiterhin über das NexoWatt-Charging-Management oder optional über einen frei mappbaren JSON-Command-State; damit bleibt die Anzeige nicht OCPP-fest verdrahtet.
- App-Center: Steuerungsprofil und optionaler Command-State pro Display-Station ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v320` erhöht.

## 0.8.18

- EOS DC Station Display: Display-Watchdog je Station mit `displayStatus`, `displayWarning`, `lastSeenAgeSec`, `offlineSince` und Online-/Offline-Zählern ergänzt.
- Display-Frontend: Wartungs-/Offline-Hinweis, Touch-Layouts für 1/2/4 Connectoren und zusätzliche Session-Daten für Dauer, Solar-kWh und Netz-kWh ergänzt.
- Display-API: Wartungsmodus blockiert Start/Stop sicher serverseitig; letzte Display-Kommandos werden zusätzlich als JSON diagnostiziert.
- App-Center: Wartungsmodus, Watchdog-Timeout und Touch-Layout pro DC-Station konfigurierbar.
- Home bleibt unverändert; DC Station Display bleibt EOS-only.

## 0.8.17

- EOS DC Station Display Basis ergänzt: pro angelegter DC-Ladestation gibt es eine tokenisierte Vollbildseite unter `/display/station/<token>`.
- Installer/App-Center: Stationen mit Name, Token, zugeordneten LPs/Connectoren, Solar-/Schnellladen und optionalen Preisen konfigurierbar.
- Backend: tokengefilterte Display-API, Heartbeat und Start/Stop-/Modus-Kommandos mit EOS-Gate und LP-Zuordnungsprüfung.
- Frontend: neue touch-optimierte Display-Seite ohne Navigation, ohne Admin-Funktionen und ohne Rohdatenpunkt-Anzeige.

## 0.8.16

- Energie-Wertkonto: Monats- und Jahreswerte ergänzt (`energyWallet.month.*`, `energyWallet.year.*`).
- Energie-Wertkonto: Persistenz über Adapter-Neustart, Tageswechsel, Monatswechsel und Jahreswechsel gehärtet.
- Energie-Wertkonto: Plausibilitäts-/Datenqualitätsdiagnosen ergänzt (`energyWallet.diagnostics.*`), damit fehlende oder stale PV-/Netzquellen nicht blind integriert werden.
- LIVE: Nutzerkarte zeigt zusätzlich Monatswert, Jahreswert und Datenqualität; Konfiguration bleibt weiterhin ausschließlich im Installer/App-Center.
- Service-Worker Cache auf `nexowatt-cache-v317` erhöht.

## 0.8.15

- Energie-Wertkonto für Home und EOS ergänzt: PV-Wert, lokale Nutzungsquote, vermiedener Netzbezug, Einspeisewert, Speicherwert und Solar-Ladepunktwert werden als `energyWallet.*` States berechnet.
- Home enthält das volle Energie-Wertkonto für Einzelanlagen; EOS behält Betreiber-/Abrechnungsfunktionen wie Ledger, Kiosk, Mesh und Microgrid als spätere Erweiterungen.
- Installer/App-Center erweitert: Preisannahmen für Netzstrom, Einspeisung und Solar-Laden bleiben im Installerbereich; das normale Frontend zeigt nur die Nutzerkarte.
- Feature-Flags auf Home/EOS-Abgrenzung angepasst: `energyWallet` ist Home-Basis, `energyLedger`, `chargeKiosk`, `mesh`, `microgrid` und Betreiberexporte bleiben EOS.
- Service-Worker Cache bleibt mit dem 0.8.14/0.8.15-Build konsistent.

## 0.8.14

- Fundament für Home/EOS-Trennung ergänzt: Home/HEMS bleibt Basislizenz, EOS erhält vorbereitete Zukunfts-Feature-Flags.
- Länderprofil DE/NL vorbereitet und als Installer-Konfiguration im App-Center sichtbar gemacht.
- ioBroker-Systemsprache wird aus `system.config.common.language` übernommen und in `/config`, `system.language` und den Frontend-Shells genutzt.
- Neues Runtime-Modul `country-profile` veröffentlicht Länder-/Marktbegriffe und spätere NL-Fähigkeiten als States.
- Dokumentation ergänzt: Roadmap Home/EOS/NL und Anleitung zum System-/Länderprofil.
- Service-Worker Cache auf `nexowatt-cache-v316` erhöht.

## 0.8.13

- App-Center Ladepunkt-Checkboxen optisch korrigiert.
- Der neue Haken „Kunde darf Speicher-Mitnutzung bedienen“ nutzt jetzt die kompakte `nw-config-checkbox`-Darstellung statt der Browser-Standardgröße.
- Weitere dynamische EVCS-Installer-Checkboxen im Ladepunktbereich auf dieselbe kompakte Darstellung vereinheitlicht.
- Service-Worker Cache auf `nexowatt-cache-v314` erhöht.

## 0.8.12

- EVCS-Speicher-Mitnutzung pro Ladepunkt eingeführt: Installer-Freigabe im App-Center und Kundenwahl im LIVE-/EVCS-Frontend.
- Backend-Gate ergänzt: Ohne Installer-Freigabe bleibt die Speicher-Mitnutzung gesperrt und unsichtbar.
- EVCS-Allocation berücksichtigt Speicherleistung nur für freigegebene und aktivierte Ladepunkte; geschützte Ladepunkte ziehen den Speicher nicht leer.
- Diagnose-States für `storageAssistCustomerAllowed`, `userStorageAssistEnabled`, `effectiveStorageAssist`, `storageAssistBlockedReason` und `batteryContributionW` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v314` erhöht.

## 0.8.11

- EVCS-AC-Phasenbedienung im LIVE-Ladestation-Modal und auf der EVCS-Seite nutzt jetzt direkt die Installer-Konfiguration: Sobald `phaseSwitchId` zugeordnet ist, erscheinen die drei Buttons `1p`, `3p` und `Auto PV`.
- Die Sichtbarkeit hängt nicht mehr nur an `phaseSwitchSupported` aus dem Runtime-State, weil dieser erst nach einem EMS-Tick verfügbar sein kann. Ohne Phasen-Haupt-DP bleibt die Bedienung weiterhin unsichtbar.
- `/api/state` primt die EVCS-Phasenstates (`userPhaseMode`, `phaseMode`, `phaseSwitchSupported`, aktuelle/Zielphase, Umschaltstatus, Cooldown) für LIVE/EVCS zuverlässiger.
- Service-Worker Cache auf `nexowatt-cache-v312` erhöht.

## 0.8.10

- EVCS-AC-Phasenbedienung folgt jetzt der allgemeinen UI-Regel: Ohne zugeordneten Haupt-DP wird die Bedienung nicht gesperrt angezeigt, sondern vollständig ausgeblendet.
- LIVE-Ladestation-Modal und EVCS-Seite zeigen `1p`, `3p` und `Auto PV` nur noch, wenn `phaseSwitchSupported` vom Backend wirklich `true` ist.
- Test `charging-phase-ui` prüft jetzt explizit, dass keine sichtbaren Gesperrt-Hinweise für fehlende Phasenumschalt-DPs zurückkommen.
- Service-Worker Cache auf `nexowatt-cache-v311` erhöht.

## 0.8.9

- EVCS LIVE-Modal und EVCS-Seite zeigen jetzt den AC-Phasenmodus an, wenn die Wallbox per EMS/AC konfiguriert ist.
- Nutzer können direkt zwischen `1p`, `3p` und `Auto PV` wählen; der Wert wird als `userPhaseMode` gespeichert und von der TypeScript-Allocation/Write-Plan-Kette ausgewertet.
- Backend `/api/set` akzeptiert nun `evcs.<n>.phaseMode`/`userPhaseMode`; Diagnose zeigt Phase, Zielphase, Cooldown und Umschaltgrund.
- Service-Worker Cache auf `nexowatt-cache-v310` erhöht.


## 0.8.7

- Hotfix: App-Center baut die lizenzabhängige App-Liste nach dem Laden der EOS/HEMS-Lizenz sofort neu auf.
- Fix: Gültige EOS-Lizenz zeigt wieder alle Apps statt "Keine Apps verfügbar".

## 0.8.6

- Lizenz-Aktivierung-Hotfix: App-Center, Lizenz-API und VIS-Gate aktualisieren den Lizenzstatus jetzt direkt aus der gespeicherten Adapter-Konfiguration. Dadurch werden EOS/HEMS-Schlüssel auch dann wirksam, wenn sie über die Admin-Konfiguration gespeichert wurden und der Runtime-Status noch nicht synchron war.
- App-Center zeigt bei gültiger EOS-Lizenz wieder alle Apps statt „Keine Apps verfügbar“.
- Service-Worker Cache auf `nexowatt-cache-v307` erhöht.
- npm-Publish-Härtung aus 0.8.5 bleibt erhalten; der Lizenzgenerator bleibt separat vom Adapter-Repository.

## 0.8.5

- Windows-Publish-Fix: `scripts/ensure-publish-dev-deps.js` startet npm nicht mehr über `npm.cmd`, sondern über den npm-CLI-Einstieg des laufenden Node-Prozesses. Dadurch wird `spawnSync npm.cmd EINVAL` beim `npm publish` vermieden.
- Service-Worker Cache auf `nexowatt-cache-v306` erhöht.
- EOS/HEMS-Lizenzmodell und App-Center-Cleanup bleiben unverändert; der Lizenzgenerator bleibt separat vom Adapter-Repository.

# Changelog

## 0.8.4
- Release-Cleanup: frische npm-fähige Paketbasis ohne Merge-Konfliktmarker in `package.json`, Service-Worker-Quellen und generierten Runtime-Dateien.
- Service-Worker Cache auf `nexowatt-cache-v305` erhöht.
- EOS/HEMS-Lizenzmodell und App-Center-Cleanup aus 0.8.3 bleiben unverändert; der Lizenzgenerator bleibt weiterhin separat vom Adapter-Repository.

## 0.8.3 - EOS/HEMS-Lizenzmodell und App-Center-Cleanup

- Sichtbare TypeScript-Migrations-/Shadow-Diagnosen aus dem App-Center entfernt; TypeScript bleibt intern weiterhin die kanonische Arbeitsquelle.
- Neues Lizenzmodell mit EOS als Vollprodukt und HEMS als kleiner Edition vorbereitet.
- HEMS enthält Dashboard, Historie, KI-Berater, SmartHome, dynamische Tarife, Lademanagement bis 3 Wallboxen, Speichersteuerung, Klima/Wärmepumpe, Heizstab, Relaissteuerung, §14a und Schwellwertsteuerung.
- EOS erhält Vollzugriff auf HEMS-Funktionen sowie erweiterte Module und künftige Erweiterungen, sofern nicht anders zugeordnet.
- Backend-/API-Gates und App-Center-Filterung für lizenzierte Funktionen ergänzt.

## 0.8.2 - Windows-Publish-Check stabilisiert

- `publish:check` startet jetzt mit einer DevDependency-/TypeScript-Compiler-Vorprüfung.
- Runtime-Typisierungschecks nutzen lokal installiertes TypeScript direkt über `node_modules/typescript/lib/tsc.js`, statt auf `tsc.cmd` im Windows-PATH angewiesen zu sein.
- Fehlende Compiler-Aufrufe zeigen jetzt echte Spawn-/Compilerdiagnosen statt nur einer generischen Meldung.
- App-Center-Farbpolish aus 0.8.1 bleibt erhalten: nicht installierte Apps werden rot markiert.

## 0.8.1 - App-Center Statusfarben und npm-Publish-Fix

- App-Center: Der Status `Installiert = Nein` wird in App-Karten jetzt rot hervorgehoben, damit nicht installierte Module sofort auffallen; `Ja` bleibt grün.
- Die Änderung liegt in der kanonischen TypeScript-Runtime-Quelle `src-ts/runtime-executables/www/ems-apps.ts`; `www/ems-apps.js` bleibt generiertes Runtime-Artefakt.
- `typescript` und die Entwicklungswerkzeuge stehen wieder als echte `devDependencies` in `package.json`, damit `npm install`/`npm ci` auf Windows den lokalen `tsc` für `npm run publish:check` bereitstellen.
- `package-lock.json` wurde auf öffentliche npm-Registry-URLs normalisiert und Version/Manifest/io-package auf `0.8.1` angehoben.
- Service-Worker Cache auf `nexowatt-cache-v302` erhöht und neues Gate `npm run test:app-center-install-colors` ergänzt.

## 0.8.0 - Cockpit-Branding bereinigt und TS-Runtime beibehalten

- Sichtbare Cockpit-Kopfzeilen von `NexoWatt EMS` auf `NexoWatt` umgestellt; der markierte EMS-Zusatz oben links ist aus Live, History, Speicherfarm, Einstellungen und Report-Shells entfernt.
- PWA-/Browser-Branding aktualisiert: Manifest-Version auf `0.8.0`, App-Name auf `NexoWatt` und Startseitentitel auf `NexoWatt UI`.
- Runtime-Regel bleibt unverändert: produktive JavaScript-Dateien sind weiterhin generierte Artefakte aus `src-ts/runtime-executables/**`; der Service Worker wurde in der TypeScript-Quelle auf `nexowatt-cache-v301` erhöht und daraus neu erzeugt.

## 0.7.132 - Legacy-JS-Artefakte nach TypeScript-Handover entfernt

- Entfernt den alten `.nwcore/**`-Doppelbaum samt zugehöriger kanonischer Runtime-Executable-Quelle und TS-Runtime-Spiegeln; die produktive Adapter-Runtime nutzt weiter `ems/**` als generiertes TS-Artefakt.
- Entfernt unbenutzte alte Admin-React-Bundles aus `admin/react/assets`; ausgeliefert bleibt nur das tatsächlich in `admin/react/index.html` referenzierte Bundle.
- Admin-Tab-Quellen unter `src-admin-tab/**` von `.js/.jsx` auf `.ts/.tsx` umgestellt; der Browser bekommt weiterhin das gebaute JS-Bundle.
- Neuer Cleanup-Gate `npm run test:runtime-js-cleanup` stellt sicher, dass `.nwcore` nicht zurückkommt und produktive Runtime-JS-Dateien als generierte TypeScript-Artefakte markiert bleiben.
- Service-Worker Cache auf `nexowatt-cache-v300` erhöht.

## 0.7.131 - Adapter-Runtime auf kanonische TypeScript-Quelle umgestellt

- Neue kanonische Runtime-Quelle: `src-ts/runtime-executables/**` erzeugt die produktiven JavaScript-Artefakte für `main.js`, `ems/**`, `.nwcore/**` und `www/**`.
- Die ausgelieferten Runtime-JS-Dateien sind als generierte Dateien markiert; fachliche Änderungen erfolgen ab diesem Schritt in TypeScript und werden per `npm run sync:ts-runtime-executables` nach JavaScript gebaut.
- EVCS bleibt im Normalpfad TypeScript-geführt: Control, Budget-Caps, Allocation und Write-Plan kommen aus den TS-Helfern; JS ist weiterhin nur die Node/ioBroker-Ausführungsgrenze, Executor und Hard-Fallback.
- Neue Checks: `npm run check:ts-runtime-executables`, `npm run test:runtime-executables` und `npm run test:ts-runtime-executables`; `publish:check` prüft den neuen Runtime-Quellen-Lock.
- Service-Worker Cache auf `nexowatt-cache-v299` erhöht.

## 0.7.130 - EVCS TS-Normalquelle und JS-Hard-Fallback-Lockdown

- EVCS Allocation: neuer Vertrag `buildChargingAllocationNormalSource(...)`; TypeScript ist im normalen Runtime-Tick die fachliche Allocation-Quelle.
- Der bisherige JS/TS-Allocation-Vergleich bleibt als Diagnose sichtbar, blockiert die TS-Normalquelle aber nicht mehr allein wegen `ts-js-allocation-mismatch`.
- Runtime-Handover: Write-Plan nutzt bevorzugt die TS-Normalquelle; JavaScript bleibt ioBroker-Executor und nur noch harter Fallback für Runtime-/Safety-Blocker.
- Neue Diagnose-States: `tsAllocationNormalSourceJson`, `tsNormalSourceLockdownJson`, `tsNormalSourceJson` und `tsNormalSource`.
- App-Center und `/api/state` zeigen EVCS-Allocation-Normalquelle und Normalquellen-Lockdown.
- Neuer Check `npm run test:charging-normal-source-lockdown`; `test:charging-productive-hardening` und `publish:check` prüfen den neuen Gate mit.
- Service-Worker Cache auf `nexowatt-cache-v298` erhöht.

## 0.7.129 - EVCS TS Runtime-Hotfix für Budget-Handover

- EVCS Charging-Management: `gridImportW` tick-weit deklariert, damit Safety-/Control-TS-Handover keine Runtime-ReferenceError mehr auslösen.
- EVCS Budget-Caps: produktiver TS-Handover startet aus dem bereits aufgelösten `effectiveBudgetMode`, damit `engine:pvSurplus+gridImport` nicht auf `engine` zurückfällt.
- Test erweitert: Runtime-Regression für den gemeldeten `effectiveBudgetMode`-Mismatch und den `gridImportW`-Scope-Fehler.

## 0.7.128 - EVCS Safety-Handover über TypeScript gehärtet

- Stale-Meter-Failsafe und Peak-Shaving-Rampdown können den produktiven TS-Allocation- und TS-Write-Plan-Vertrag jetzt als sicheren 0-Setpoint-Handover nutzen.
- `safetyStop`/`safetyReason` ergänzt: TypeScript erzwingt bei Safety-Stop 0 W / 0 A und erlaubt diesen sicheren Stop auch bei stale meter/budget, ohne normale Stale-Blocker zu entschärfen.
- JS bleibt im EVCS-Pfad weiterhin ioBroker-Executor und harter Fallback; der alte JS-only-Safety-Stop-Write-Plan ist als entfernt markiert.
- Legacy-Diagnose auf `ts-charging-legacy-js-decision-tree-reduction-v3` erweitert und App-Center-Karte `TS‑Härtung: EVCS Safety‑Handover` ergänzt.
- Neuer Check `npm run test:charging-safety-handover`; `test:charging-productive-hardening` und `publish:check` prüfen diesen Gate jetzt mit.
- Service-Worker Cache auf `nexowatt-cache-v296` erhöht.

## 0.7.127 - EVCS TS-Produktivpfad gehärtet

- EVCS JS-Executor nutzt im TS-Normalpfad jetzt explizit die vom TypeScript-Write-Plan geplante Basis und den geplanten Setpoint-Datenpunkt.
- Executor-Fehler führen wieder in den Legacy-Fallback statt den Fallbackpfad als erledigt zu markieren.
- Write-Plan-Sicherheitsvertrag um TS-Basis-/Setpoint-Key- und Executor-Fallback-Garantien erweitert.
- EVCS-Tests für produktive Allocation, produktiven Write-Plan und JS-Executor/Fallback entsprechend verschärft.
- Direkte JS-Setpoint-Schreibstellen in Stale-Meter-Failsafe und Peak-Shaving-Rampdown laufen jetzt ebenfalls über den zentralen Executor/Fallback-Pfad.
- Stale-Meter-Failsafe und Peak-Shaving-Rampdown publizieren jetzt ebenfalls TS-Allocation-/Write-Plan-Diagnose statt leerer Legacy-Diagnose.

## 0.7.126 - EVCS Allocation produktiv, Write-Plan produktiv, JS nur Executor/Fallback

- EVCS-/Wallbox-Allocation erhält `buildChargingAllocationProductive` und liefert den produktiven TS-Apply-Vertrag.
- Neuer Diagnose-State `chargingManagement.control.tsAllocationProductiveJson`; `tsAllocationSource` zeigt `ts-allocation` bei sauberer Übernahme.
- EVCS-Setpoint-Write-Plan erhält `buildChargingSetpointWritePlanProductive` als produktiven Vertrag für den JavaScript/ioBroker-Executor.
- Neue Diagnose-States `tsWritePlanProductivePrepJson`, `tsWritePlanProductiveJson`, `tsWritePlanExecutorJson` und `tsLegacyDecisionTreeJson`; `tsWritePlanSource` zeigt `ts-write-plan` bei produktiver Ausführung.
- Der normale Setpoint-Schreibpfad ist deferiert: JS berechnet weiterhin eine Fallback-Referenz, schreibt aber im Normalfall erst nach Freigabe des TS-Write-Plans.
- JS-Allocation/Setpoint-Schreiben bleibt als harter Fallback bei TS-Mismatch, stale meter/budget, fehlendem Mirror oder Runtimefehler aktiv.
- App-Center und `/api/state` zeigen die produktiven EVCS-Allocation- und Write-Plan-Diagnosen.
- Neue Checks `test:charging-allocation-productive`, `test:charging-write-plan-productive` und `test:charging-js-executor-fallback`.
- Service-Worker Cache auf `nexowatt-cache-v294` erhöht.

## 0.7.125 - EVCS TypeScript-Beschleunigung: Control produktiv, Allocation/Write-Plan vorbereitet

- EVCS-/Charging-Control übernimmt Control-/Summary-Werte produktiv über `buildChargingControlProductive` mit JS-Fallback.
- Neuer Diagnose-State `chargingManagement.control.tsControlProductiveJson`; `tsControlSource` zeigt jetzt `ts-control` bei sauberer Übernahme.
- Neue TypeScript-Quelle `charging-allocation.ts` für Wallbox-Zielverteilung als Shadow und Produktiv-Vorbereitung.
- Neue Diagnose-States `tsAllocationShadowJson`, `tsAllocationProductivePrepJson` und `tsAllocationSource`.
- Neue TypeScript-Quelle `charging-write-plan.ts` für Setpoint-Write-Plan-Shadow ohne ioBroker-I/O.
- Neue Diagnose-States `tsWritePlanShadowJson` und `tsWritePlanSource`.
- App-Center zeigt EVCS Control produktiv, EVCS Allocation-Prep und EVCS Write-Plan-Shadow als eigene Karten.
- Ladepunktverteilung und Setpoint-Schreiben bleiben produktiv JavaScript, aber die nächsten Abbau-Gates sind jetzt in einem Schritt vorbereitet.
- Neue Checks `test:charging-control-productive`, `test:charging-allocation-shadow`, `test:charging-allocation-productive-prep` und `test:charging-write-plan-shadow`.
- Service-Worker Cache auf `nexowatt-cache-v293` erhöht.

## 0.7.124 - EVCS / Charging-Management Control-Shadow produktiv vorbereiten

- EVCS-/Charging-Control-Shadow erhält mit `buildChargingControlProductivePrep` einen geprüften Produktiv-Kandidaten für Control-/Summary-Werte.
- Neue Diagnose-States `chargingManagement.control.tsControlProductivePrepJson` und `chargingManagement.control.tsControlSource`.
- Diagnose-API und App-Center zeigen EVCS-Control-Prep sowie EVCS-Budget-Caps als eigene TS-Karten.
- Ladepunktverteilung, Failsafe, Boost, PV-/Min+PV-Logik und Setpoint-Schreiben bleiben weiterhin JavaScript.
- JS-Fallback bleibt bei Mismatch, fehlendem TS-Spiegel, Runtimefehlern oder harten Control-Blockern aktiv.
- Neuer Check `npm run test:charging-control-productive-prep`.
- Service-Worker Cache auf `nexowatt-cache-v292` erhöht.

## 0.7.123 - EVCS Budget-Caps produktiv auf TypeScript

- EVCS-/Charging-Management Budget-Caps werden jetzt produktiv über `buildChargingBudgetSafetyCapsProductive` übernommen, wenn JS/TS-Vergleich sauber ist.
- Übernommen werden Grid-Cap, Phasen-Cap, §14a-Cap und effektiver Budgetmodus.
- Ladepunktverteilung, PV-/Min+PV-Logik und Setpoint-Schreiben bleiben weiterhin JavaScript.
- JS-Fallback bleibt bei Mismatch, fehlendem TS-Spiegel oder Runtimefehler aktiv.
- Neuer Check `npm run test:charging-budget-productive`.
- Service-Worker Cache auf `nexowatt-cache-v291` erhöht.

## 0.7.122 - EVCS / Charging-Management TS produktiv vorbereiten

- TypeScript-Helfer `src-ts/ems/charging-management/charging-budget.ts` für EVCS-Sicherheitscaps vorbereitet.
- Shadow-Vergleich für Grid-Cap, Phasen-Cap, §14a-Cap und Budgetmodus in `charging-management.js` ergänzt.
- Neue Diagnose-States `chargingManagement.control.tsBudgetJson` und `chargingManagement.control.tsBudgetSource`.
- Ladepunktverteilung bleibt produktiv JavaScript; TypeScript rechnet nur parallel als Vorbereitung.
- Service-Worker Cache auf `nexowatt-cache-v290` erhöht.

## 0.7.121 - Core-Limits Restgates produktiv auf TypeScript übernommen

- Forecast-, Tarif-/Negativpreis-, Peak-/Grid- und §14a-/EVCS-High-Level-Gates werden bei sauberem JS/TS-Vergleich produktiv aus dem TypeScript-Helfer übernommen.
- `buildCoreRestGatesProductive` ergänzt und nach `lib/ts-mirrors/ems/core-limits/core-budget.js` gespiegelt.
- `core-limits.js` baut den Budget-Snapshot nach erfolgreicher Restgate-TS-Übernahme neu auf, damit Grid-/EVCS-High-Level-Caps in remainingTotalW und Consumer-Reservierungen wirken.
- `ems.budget.tsRestGatesJson` zeigt jetzt produktiv/Fallback-Status statt nur Shadow-Status.
- JS bleibt Fallback bei TS-Fehlern oder Restgate-Mismatches.
- Service-Worker Cache auf `nexowatt-cache-v289` erhöht.

## 0.7.120 - Core-Limits Restgates als TypeScript-Shadow vorbereitet

- Forecast-, Tarif-/Negativpreis-, Peak-/Netz- und §14a-Gates als TypeScript-Helfer in `src-ts/ems/core-limits/core-budget.ts` vorbereitet.
- `ems/modules/core-limits.js` schreibt jetzt `ems.budget.tsRestGatesJson` als Shadow-Vergleich.
- Die Restgates bleiben in 0.7.120 produktiv weiterhin JavaScript; TypeScript rechnet nur parallel.
- Diagnose-API liefert `emsBudgetTsRestGatesJson` für App-Center/Debug.
- Neuer Check `npm run test:core-limits-rest-gates`.
- Service-Worker Cache auf `nexowatt-cache-v288` erhöht.

## 0.7.119 - Heizstab alte JS-Referenz aus Normaldiagnose entfernen

- Alte Heizstab-JS-Referenz wird bei stabilem TS-Normalpfad aus der normalen Diagnose entfernt.
- Neuer State `heatingRod.summary.tsLegacyNormalDiagnosticsJson` zeigt den finalen Normaldiagnose-Cleanup.
- `legacyJsReferenceJson` und `debugJson.legacyReference` bevorzugen jetzt die kompakte Debug-/Notfallbrücke statt des vollständigen JS-Referenzpayloads.
- App-Center zeigt `JS-Normaldiagnose` und `JS-Normaldiagnose entfernt`.
- Keine neue Heizstab-Schaltlogik; TS bleibt Normalpfad, JS bleibt harte Notfallbrücke.
- Service-Worker Cache auf `nexowatt-cache-v287` erhöht.

## 0.7.118 - Heizstab Cleanup abgeschlossen / JS-Referenz als Entfernungs-Kandidat markiert

- Neuer Diagnose-State `heatingRod.summary.tsLegacyRemovalCandidateJson`.
- Alter JS-Heizstabpfad wird bei stabilem TS-Normalpfad als konkreter Entfernungs-Kandidat markiert.
- Entfernbar markiert: normale JS-Referenz-Entscheidungsbremse, volle JS-Referenzpayloads im Normalpfad und doppelte Blocking-Mismatch-Listen.
- Erhalten bleibt: harte Sicherheitsnotbremse, Runtime-Error-Fallback, kompakte Debug-Brücke und manuelle/externe Sicherheitswächter.
- App-Center zeigt jetzt `JS-Entfernungskandidat` und `JS-Entfernungsphase`.
- Keine neue Heizstab-Schaltlogik; TS bleibt Normalpfad, JS bleibt Notfallback/Debug-Brücke.

## 0.7.117 - Heizstab Legacy-JS-Referenzdetails weiter bereinigt

- Neuer Diagnose-State `heatingRod.summary.tsLegacyPrunedJson` ergänzt.
- Doppelte JS-Referenzdetails werden bei stabilem TS-Normalpfad weiter aus dem normalen Diagnosepfad entfernt.
- `legacyJsReferenceJson` zeigt bei bereinigtem Zustand jetzt den kompakten Pruned-Status statt großer JS-Referenzlisten.
- App-Center zeigt neue Zeilen für JS-Referenzdetails und reduzierte JS-Diagnosedaten.
- Keine neue Heizstab-Schaltlogik; TS bleibt Normalpfad, JS bleibt Notfallback/Debug-Brücke.
- Service-Worker Cache auf `nexowatt-cache-v285` erhöht.

## 0.7.116 - Heizstab Legacy-JS nur noch als Debug-Brücke

- Neuer Diagnose-State `heatingRod.summary.tsLegacyDebugBridgeJson` ergänzt.
- Alter JS-Heizstab-Referenzpfad wird nach stabilem TS-Normalpfad als kompakte Debug-Brücke markiert.
- Vollständige JS-Referenzlisten werden im Normalpfad weiter reduziert; kompakte Samples/Zähler bleiben erhalten.
- App-Center zeigt jetzt `JS-Debug-Brücke` und `JS-Debugdaten`.
- Keine neue Heizstab-Stufenlogik; TS bleibt Normalpfad, JS bleibt Notfallback/Debug-Brücke.

## 0.7.115 - Heizstab JS-Referenzpfad als Removal-Plan vorbereitet
- Service-Worker Cache auf `nexowatt-cache-v283` erhöht.

- Alter Heizstab-JS-Referenzpfad erhält neuen Diagnose-State `heatingRod.summary.tsLegacyRemovalPlanJson`.
- Kompakte JS-Referenzdiagnose ergänzt: bei stabilem TS-Normalpfad werden vollständige Mismatch-Listen aus dem normalen Diagnosepfad genommen und nur noch Zähler + kleine Probe gespeichert.
- TS-Normalpfad bleibt führend; JS wird weiter in Richtung Notfallback/Debug-Brücke verschoben.
- Removal-Plan trennt `removableParts` und `keepParts`, damit später klar ist, was entfernt werden darf und welche Notfallbacks bleiben müssen.
- App-Center zeigt zusätzliche Zeilen `JS-Entfernung`, `JS-Diagnosedaten` und `JS-Cleanup-Kandidat`.
- Alte JS-Referenzdiagnose wird im stabilen TS-Normalpfad auf Zähler und kleine Samples kompaktiert.
- Keine neue Heizstab-Stufenlogik; keine EMS-/Frontend-/API-Fachlogik geändert.

## 0.7.114 - Installations-Hotfix: Runtime-Paket verschlankt

- Installierbares npm/GitHub-Paket verschlankt, damit ioBroker-Installationen auf kleinen Hosts weniger Speicher benötigen.
- `devDependencies` aus der Runtime-Installation entfernt und als `xDevDependenciesForDevelopmentOnly` dokumentiert.
- `files` in `package.json` auf echte Runtime-Dateien reduziert: `admin`, `www`, `main.js`, `io-package.json`, `ems`, `lib`, README und Lizenz.
- Keine produktive EMS-/Heizstab-/Energiefluss-/Frontend-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v282` erhöht.

## 0.7.113 - Heizstab JS-Referenzpfad in Diagnose/Cleanup verschoben

- Neuen Diagnose-State `heatingRod.summary.tsLegacyReferenceJson` ergänzt.
- Neuen Cleanup-State `heatingRod.summary.tsLegacyCleanupJson` ergänzt.
- Alter JavaScript-Heizstab-Referenzpfad wird bei stabilem TS-Normalpfad klar als Diagnose-/Cleanup-Pfad geführt.
- App-Center zeigt jetzt `JS-Referenz Cleanup` und `JS-Entscheidungseinfluss`.
- JS bleibt als harte Notbremse für Safety-Fälle erhalten, aber die alte Referenzentscheidung wird weiter aus dem normalen Entscheidungsweg genommen.
- Keine neue Heizstab-Stufenlogik; Fokus liegt auf Diagnose/Cleanup des alten JS-Referenzpfads.

## 0.7.112 - Heizstab JS-Pfad auf Notfallback begrenzt

- Der alte Heizstab-JS-Pfad wird im stabilen TS-Normalpfad nur noch als Notfallback bei harten Sicherheitsblockern genutzt.
- JS/TS-Referenzabweichungen im TS-Normalpfad werden als `referenceMismatches` dokumentiert und blockieren die TS-Zielstufe nicht mehr.
- Neue Diagnosefelder: `legacyJsPathRole`, `jsReferenceDecisionMode`, `jsFallbackMode`, `jsFallbackLimitedToHardBlockers`, `jsPathReductionStage`.
- App-Center zeigt JS-Fallback-Modus, JS-Pfad-Rolle und JS-Referenzmodus in der Heizstab-TS-Runtime-Auswertung.
- JavaScript bleibt Notfallback bei fehlendem TS-Spiegel, Runtimefehlern und Speicher-/PV-Schutzblockern.

## 0.7.111 - Heizstab TS-Normalpfad übernimmt JS-Referenz

- Heizstab-TS kann nach stabilem Normalpfad-Status die alte JS-Referenz als Normalquelle übernehmen.
- JS-Fallback bleibt bei harten Sicherheitsblockern aktiv: fehlender TS-Spiegel, Runtimefehler, Speicher-/PV-Schutzblocker.
- JS/TS-Referenzabweichungen werden im stabilen Normalpfad weiter diagnostiziert, blockieren aber nicht mehr automatisch den TS-Pfad.
- Neue Diagnosefelder: `jsReferenceReducedCount`, `hardSafetyBlockCount`, `normalPathTakenOver`, `jsFallbackMode`.
- Doppelte `label: Heizstab`-Zeile in der Budgetreservierung bereinigt.
- Keine neue Heizstab-Stufenlogik; nur Normalpfad-Übernahme und Notfallback-Reduktion.

## 0.7.110 - Heizstab TS-Normalpfad vorbereiten

- Heizstab-TS erhält jetzt einen Normalpfad-Status (`ts-heating-rod-normal`), wenn mehrere echte Runtime-Ticks stabil über TS liefen.
- Neuer Diagnose-State `heatingRod.summary.tsNormalSourceJson` ergänzt.
- `heatingRod.summary.source` kann jetzt `js-runtime`, `ts-heating-rod` oder `ts-heating-rod-normal` zeigen.
- App-Center zeigt jetzt `TS NORMAL`, `TS-Normalpfad` und `TS-Normal Ticks` in der Heizstab-Runtime-Auswertung.
- JavaScript bleibt Notfallback bei harten Blockern wie fehlendem TS-Spiegel, Runtimefehler oder JS/TS-Mismatch.
- Keine Änderungen an Core-Limits, Energiefluss, KI, History oder SmartHome.

## 0.7.109 - Heizstab TS Runtime-Auswertung und Fallback-Diagnose

- Heizstab-TS-Produktivpfad sammelt jetzt In-Memory-Samples aus echten Adapter-Ticks.
- Neuer State `heatingRod.summary.tsRuntimeEvaluationJson` mit SampleCount, OK-Quote, Fallbacks, Mismatches und nächster Handlung.
- Diagnose-API liest `heatingRodTsRuntimeEvaluationJson`.
- App-Center zeigt neue Karte „Heizstab TS-Runtime-Auswertung“.
- Keine neue produktive Schaltlogik; die Version beobachtet TS-Nutzung und Fallbacks, damit der alte JS-Pfad später kontrolliert reduziert werden kann.

## 0.7.108 - Heizstab TypeScript produktiv aktiviert

- Heizstab-PV-Auto-Zielstufen können jetzt produktiv aus dem TypeScript-Entscheidungsspiegel übernommen werden.
- TS wird nur aktiv, wenn die TS-Entscheidung mit der bestehenden JS-Referenz übereinstimmt. Bei Abweichung bleibt JavaScript Fallback.
- Neue Diagnose-States: `heatingRod.summary.source` und `heatingRod.summary.tsProductiveJson`.
- Diagnose-API liest `heatingRodTsProductiveJson` und `heatingRodSource`.
- Neuer Check `npm run test:heating-rod-productive` ergänzt.
- Keine Änderung an EVCS, Core-Limits, History, SmartHome, Lizenz oder Frontend-Design.

## 0.7.107 - Core-Limits Consumer-Reservierungen produktiv über TS

- `makeBudgetRuntime.reserve` nutzt den TypeScript-Helfer `computeCoreBudgetReservation` jetzt produktiv.
- Die alte JavaScript-Rechnung bleibt als Referenz-/Fallbackpfad erhalten und wird bei TS-Fehlern oder JS/TS-Abweichungen genutzt.
- `remainingTotalW`, `remainingPvW`, `consumers`, `order`, `consumersJson` und `flexUsedW` werden bei sauberem TS-Vergleich aus dem TS-Ergebnis übernommen.
- `ems.budget.tsReservationJson` zeigt jetzt produktive TS-Nutzung, Fallback und Fallback-Grund.
- Neuer Check `npm run test:core-limits-reservations-productive` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v275` erhöht.

## 0.7.106 - Core-Limits Consumer-Reservierungen als TS-Shadow vorbereitet

- TypeScript-Helfer `computeCoreBudgetReservation`, `buildCoreBudgetConsumersList` und `calculateCoreBudgetFlexUsedW` ergänzt.
- `makeBudgetRuntime.reserve` berechnet die bestehende JS-Reservierung weiter produktiv, vergleicht sie aber parallel mit dem TS-Helfer.
- Neuer Diagnose-State `ems.budget.tsReservationJson` für Grant, usedW, pvUsedW, remainingTotalW und remainingPvW.
- App-Center-Diagnose liest `emsBudgetTsReservationJson`.
- Neue Doku: `docs/TYPESCRIPT_STEP_07106_DE.md`.
- Keine produktive Übernahme der Consumer-Reservierung; dieser Schritt bereitet die nächste TS-Übernahme kontrolliert vor.

## 0.7.105 - Core-Limits TypeScript produktiv aktiviert

- Core-Limits nutzt den TypeScript-Core-Budget-Spiegel produktiv für zentrale Budget-Gates: PV-Budget, Grid-Headroom und Gesamtbudget.
- JavaScript bleibt Fallback, wenn TS-Spiegel fehlt, Shadow-Abgleich abweicht oder TS-Gates unvollständig sind.
- Neue Diagnose-States: `ems.budget.source` und `ems.budget.tsProductiveJson`.
- `makeBudgetRuntime` arbeitet nach erfolgreichem Shadow-OK mit dem TS-geprägten BudgetSnapshot.
- Forecast-, Tarif-, Consumer- und Raw-Felder bleiben weiterhin aus der bestehenden JS-Runtime.
- Neuer Check `npm run test:core-limits-productive`.

## 0.7.104 - Energiefluss TS als Normalquelle vorbereitet

- Energiefluss veröffentlicht nach stabiler Fixed-Source-Phase jetzt `energyFlowSource = ts-normal`.
- `tsProductiveActive` erkennt jetzt sowohl `ts-candidate` als auch `ts-normal`.
- JS-Fallback bleibt als Notfallback bei harten Blockern erhalten, wird aber nicht mehr als normaler Betriebsmodus behandelt, sobald TS stabil ist.
- App-Center zeigt `TS NORMAL` und `TS-Normalquelle` im Energiefluss-Aktivtest.
- Neuer tiefer Code-Scan `verify-energy-flow-deep-debug-scan.js` prüft bekannte Fallback-/Source-Regressionsstellen.
- Keine Änderungen an Core-Limits, Heizstab, KI, History oder SmartHome.

## 0.7.103 - Energiefluss TS als feste Quelle vorbereiten

- Energiefluss-TS sammelt jetzt einen Fixed-Source-Status über echte produktive TS-Ticks.
- Neuer State `derived.core.building.tsFixedSourceJson` ergänzt.
- App-Center zeigt „Feste TS-Quelle“ und TS-Fixed-Ticks im Energiefluss-TS-Aktivtest.
- Weiche Warmup-Fallbacks werden reduziert, sobald TS stabil genug lief.
- Harte Blocker wie Shadow-Mismatch, fehlender Spiegel oder ungültige Kandidatenwerte behalten den JS-Fallback aktiv.
- Keine Änderungen an Core-Limits, Heizstab, KI, History oder SmartHome.

## 0.7.102 - Energiefluss TS-Fallback reduziert

- Energiefluss-TS bleibt jetzt aktiv, wenn die reale Anlagen-Auswertung nur wegen fehlender Sample-Anzahl oder OK-Folge noch im Warmup ist.
- Harte Blocker wie Shadow-Mismatches, Kandidatenfehler oder echte Anlagen-Blocker erzwingen weiterhin JS-Fallback.
- Neues Diagnoseflag `plantEvaluationSoftReleased` zeigt, wenn die Anlagen-Auswertung nur weich freigegeben wurde.
- Neuer Check `npm run test:energy-flow-fallback-reduction` ergänzt.
- Keine Änderungen an Core-Limits, Heizstab, KI, History oder SmartHome.

## 0.7.101 - Energiefluss TypeScript produktiv aktivieren

- Energiefluss-TS-Kandidat ist jetzt standardmäßig aktiviert und produktiv freigegeben, bleibt aber durch Shadow-Vergleich, Kandidatenprüfung, Warmup und reale Anlagen-Auswertung abgesichert.
- Wenn ein Gate blockiert, bleibt automatisch die bisherige JavaScript-Runtime produktiv.
- App-Center zeigt TS als neuen Energiefluss-Standardmodus und erlaubt weiterhin Rückschaltung auf JS oder Shadow.
- Neuer Check `test:energy-flow-ts-productive` verhindert, dass die produktive TS-Aktivierung ohne Sicherheitsgates ausgeliefert wird.
- Service-Worker Cache auf `nexowatt-cache-v269` erhöht.

## 0.7.100 - /api/state und /api/set produktiv über TypeScript-Helfer

- `/api/state` nutzt jetzt produktiv den TypeScript-State-Builder mit JS-Fallback. Die externe Antwortform bleibt kompatibel.
- `/api/set` nutzt für bekannte lokale `settings.*`-Werte produktiv den TypeScript-Schreibplan; komplexe Scopes bleiben in der bisherigen JS-Route.
- Kritische Werte wie `0`, `false` und leere Strings werden in den TS-Helfern explizit erhalten.
- `weatherApiKey` bleibt explizit String, damit API-Schlüssel nicht als Zahl/Boolean normalisiert werden.
- Neue Prüfung `npm run test:main-api-productive` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v268` erhöht.

## 0.7.99 - /api/state und /api/set TS-Shadow-Vorbereitung

- `/api/state` bleibt produktiv unverändert, läuft aber zusätzlich durch einen TypeScript-Shadow-Vergleich.
- `/api/set` bleibt produktiv unverändert, erstellt aber zusätzlich einen TypeScript-Schreibplan ohne State-Schreibzugriff.
- Neue TS-Helfer in `src-ts/backend/main-runtime/main-runtime-helpers.ts` für API-State-Zusammenfassung und API-Set-Schreibplan ergänzt.
- Neue Prüfung `npm run test:api-state-set-shadow` ergänzt.
- Wichtig: 0, false und leere Strings bleiben in der Shadow-Logik gültige Werte.

## 0.7.98 - erste main.js-TypeScript-Helfer produktiv mit Fallback

- Neuer TypeScript-Helfer `src-ts/backend/main-runtime/main-runtime-helpers.ts` ergänzt.
- Neuer generierter CommonJS-Spiegel `lib/ts-mirrors/backend/main-runtime/main-runtime-helpers.js`.
- `main.js` nutzt den TS-Helfer erstmals kontrolliert produktiv für Lizenz-Platzhalterprüfung, Lizenz-Eingabe-Normalisierung und `info.connection`-Schreibplan.
- Alle Nutzungen haben Fallback auf die bisherige JavaScript-Logik, damit der Adapter bei fehlendem/defektem Spiegel lauffähig bleibt.
- Neue Prüfung `npm run test:main-runtime-helpers` ergänzt.
- Keine Änderung an Energiefluss, Speicher-DP-Runtime, Core-Limits, Heizstab, KI-Berater, History oder SmartHome.

## 0.7.97 - main.ts Runtime-Typisierung vorbereitet

- Adapter-Haupteinstieg `src-ts/runtime-mirrors/main.ts` gezielt typisiert.
- Erste TypeScript-Verträge für StateCache, `/api/state`, `/config`, `/api/set`, Lizenz, SSE, Webserver, `info.connection`, TS-Energiefluss-Schaltentscheidung und Runtime-Internals ergänzt.
- Neuer Check `npm run test:main-runtime-typing` kompiliert den Main-Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `main.ts` vor versehentlichem Überschreiben.
- Keine produktive Runtime-Umschaltung; `main.js` bleibt weiterhin führend.

# 0.7.96 - Kunden-LIVE-App gezielt typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/app.ts` um konkrete Verträge für Kunden-LIVE-Dashboard, Energiefluss-Anzeige, KPI-Karten, Wetter, KI-Berater, Schnellkacheln, Modals, Feature-Sichtbarkeit und API-State erweitert.
- Neuer Check `npm run test:app-runtime-typing` kompiliert den App-Vertragsbereich temporär ohne `@ts-nocheck`.
- Runtime-Mirror-Sync schützt `www/app.ts` jetzt vor blindem Überschreiben.
- Keine produktive Runtime-Logik geändert; `www/app.js` bleibt weiterhin führend.
- Service-Worker Cache auf `nexowatt-cache-v264` erhöht.

## 0.7.96 - Kunden-LIVE-Frontend Runtime-Typisierung

- `src-ts/runtime-mirrors/www/app.ts` gezielt typisiert.
- Erste Verträge für API-State, Konfiguration, Feature-Sichtbarkeit, Energiefluss-Anzeige, Dashboard-Wertezeilen, KI-/Wetterkarten, Schreibbefehle, Modals und Runtime-State ergänzt.
- Neuer Check `npm run test:app-runtime-typing` kompiliert den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `app.ts` jetzt vor blindem Überschreiben.
- Keine produktive LIVE-/Dashboard-Runtime auf TypeScript umgestellt; `www/app.js` bleibt führend.
- Service-Worker Cache auf `nexowatt-cache-v264` erhöht.

# 0.7.96 - App Runtime-Typisierung vorbereitet

- `src-ts/runtime-mirrors/www/app.ts` gezielt typisiert.
- Verträge für LIVE-Dashboard, Energiefluss-Anzeige, KPI, Wetter, KI-Berater, Modals, Schnellsteuerungen und `/api/state` ergänzt.
- Neuer Check `npm run test:app-runtime-typing` prüft den Vertragsbereich ohne `@ts-nocheck`.
- Runtime bleibt weiterhin `www/app.js`; keine produktive Funktionslogik geändert.
- Service-Worker Cache auf `nexowatt-cache-v264` erhöht.

## 0.7.96 - LIVE-Dashboard Runtime-Spiegel typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/app.ts` gezielt typisiert.
- Erste Verträge für `/api/state`, `/config`, Feature-Sichtbarkeit, Energiefluss-Anzeige, KPI, Wetter, KI-Berater und DOM-Referenzen ergänzt.
- Neuer Check `npm run test:app-runtime-typing` prüft den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `app.ts` jetzt vor blindem Überschreiben.
- Keine produktive Runtime-Änderung an `www/app.js`.

## 0.7.95 - App-Center Runtime-Typisierung

- `src-ts/runtime-mirrors/www/ems-apps.ts` gezielt typisiert.
- Erste Verträge für Installer-Konfiguration, Datenpunkt-Mapping, App-Registry, Energiefluss-Konfiguration, Heizstab, EVCS, Speicherfarm, KI-Berater, TS-Schaltmodus und Shadow-Diagnose ergänzt.
- Neuer Check `npm run test:ems-apps-runtime-typing` kompiliert den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `ems-apps.ts` jetzt vor blindem Überschreiben.
- Keine produktive App-Center-/Installer-Runtime auf TypeScript umgestellt; `www/ems-apps.js` bleibt führend.
- Service-Worker Cache auf `nexowatt-cache-v263` erhöht.

## 0.7.94 - SmartHome-Config Runtime-Typisierung

- `src-ts/runtime-mirrors/www/smarthome-config.ts` gezielt mit ersten TypeScript-Verträgen für Installer-Konfiguration typisiert.
- Verträge für Gebäude, Etagen, Räume, Geräte, Funktionen, Pages, Szenen, DP-Zuordnung, Validator und Runtime-State ergänzt.
- `npm run test:smarthome-config-runtime-typing` als gezielter Check ohne `@ts-nocheck` ergänzt.
- Runtime-Mirror-Sync schützt jetzt auch `smarthome-config.ts` vor blindem Überschreiben.
- Keine produktive SmartHome-/Installer-Runtime umgestellt; produktiv bleibt `www/smarthome-config.js`.

# 0.7.94 - SmartHome-Konfiguration Runtime-Typisierung

- `src-ts/runtime-mirrors/www/smarthome-config.ts` gezielt typisiert.
- Erste Datenverträge für Gebäude, Etagen, Räume, Funktionen, Geräte, Szenen, Seiten, Timer, Logik-Uhren, Auto-Erkennung und Validierung ergänzt.
- Temporären TypeScript-Check ohne `@ts-nocheck` für den SmartHome-Config-Vertragsbereich ergänzt.
- Runtime-Spiegel-Sync schützt `smarthome-config.ts` jetzt vor versehentlichem Überschreiben.
- Keine produktive SmartHome-/Installer-Runtime auf TypeScript umgestellt; `www/smarthome-config.js` bleibt führend.
- Service-Worker Cache auf `nexowatt-cache-v262` erhöht.

## 0.7.94 - SmartHome-Konfiguration gezielt typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/smarthome-config.ts` gezielt typisiert.
- Verträge für SmartHome-Installer-Konfiguration ergänzt: Gebäude, Etagen, Räume, Geräte, Funktionen, Seiten, Szenen, Timer, Logik-Uhren, Auto-Erkennung und API-Antworten.
- Neuer Check `npm run test:smarthome-config-runtime-typing` prüft den Vertragsbereich ohne `@ts-nocheck`.
- Runtime-Spiegel-Sync schützt `smarthome-config.ts` nun vor versehentlichem Überschreiben.
- Keine produktive Runtime-Änderung; `www/smarthome-config.js` bleibt führend.

# 0.7.93 - SmartHome Runtime-Spiegel gezielt typisiert

- TypeScript-Parallelspiegel `src-ts/runtime-mirrors/www/smarthome.ts` um konkrete SmartHome-Verträge ergänzt.
- Geräte, Zustände, Datenpunktbindungen, Räume, Gebäudestruktur, Kacheln, Popover und API-Antworten typisiert vorbereitet.
- Neuer Check `test:smarthome-runtime-typing` ergänzt; der Vertragsbereich wird ohne `@ts-nocheck` kompiliert.
- `sync:ts-runtime-mirrors` schützt `www/smarthome.js` jetzt vor blindem Überschreiben der gezielten Typisierung.
- Keine produktive Runtime-Änderung.

# 0.7.92 - History Runtime-Typisierung vorbereitet

- Vierte große Runtime-Spiegeldatei gezielt typisiert: `src-ts/runtime-mirrors/www/history.ts`.
- Neue History-Verträge ergänzt: Zeitreihen, API-Antworten, Toolbar-Zustand, Report-Sichtbarkeit und Feature-Sichtbarkeit.
- Kritische History-Regeln direkt dokumentiert: 0 W ist gültig, EVCS/Farm nur bei echter Anlage sichtbar, History darf Energieflusswerte nicht anders interpretieren als LIVE/Backend.
- Neuer Smoke-Test `src-ts/tests/history-runtime-typing-smoke.ts` und Check `npm run test:history-runtime-typing`.
- Runtime-Spiegel-Sync schützt `history.ts` jetzt vor blindem Überschreiben.
- Keine produktive Runtime-Änderung.

# 0.7.91 - KI-Berater Runtime-Spiegel gezielt typisiert

- Dritte große Runtime-Spiegeldatei gezielt typisiert: `src-ts/runtime-mirrors/ems/modules/ai-advisor.ts`.
- Erste TypeScript-Verträge für Adapterzugriff, Datenpunkt-Registry, StateCache, KI-Konfiguration, Kategorien, Vorschläge, Tagesplan, Lernzustand, Snapshot und Speicher-SoC ergänzt.
- `AiAdvisorModule` mit ersten expliziten Feldern und typisiertem Konstruktor vorbereitet.
- `_readStorageSocPct`, `_cfg`, `_updateLearning`, `_buildSuggestions`, `_score`, `_publishDisabled` und `_publish` weiter auf spätere TypeScript-Übernahme vorbereitet.
- Neuer Check `npm run test:ai-advisor-runtime-typing` kompiliert eine temporäre KI-Berater-Kopie ohne `@ts-nocheck` im gelockerten Migrationsmodus.
- `sync:ts-runtime-mirrors` schützt den gezielt typisierten KI-Berater-Spiegel vor versehentlichem Überschreiben.
- Keine produktive KI-/EMS-/Frontend-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v259` erhöht.

# 0.7.90 - Heizstab Runtime-Spiegel gezielt typisiert

- Zweite große Runtime-Spiegeldatei gezielt typisiert: `src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts`.
- Erste echte TypeScript-Verträge für Adapterzugriff, Datenpunkt-Registry, Heizstab-Geräte, Stufensteuerung und Budget-Schutz ergänzt.
- `@ts-nocheck` bleibt im normalen Spiegel erhalten; neuer Check kompiliert eine temporäre Kopie ohne `@ts-nocheck` im gelockerten Migrationsmodus.
- Runtime-Spiegel-Sync schützt jetzt auch den gezielt typisierten Heizstab-Spiegel vor versehentlichem Überschreiben.
- TS-Shadow-Sammlung im produktiven Heizstab-JS lokal initialisiert, damit die Diagnose nicht durch eine fehlende Variable stolpert.
- Service-Worker Cache auf `nexowatt-cache-v258` erhöht.

# 0.7.89 - Core-Limits Runtime-Spiegel gezielt typisiert

- Erster großer gezielter Typisierungsschritt an `src-ts/runtime-mirrors/ems/modules/core-limits.ts`.
- Adapter-, State-, Consumer- und Budget-Snapshot-Verträge direkt in der Core-Limits-Spiegeldatei ergänzt.
- `CoreLimitsModule` mit ersten expliziten TypeScript-Feldern vorbereitet.
- Neuer Check `npm run test:core-limits-runtime-typing` kompiliert eine temporäre Core-Limits-Kopie ohne `@ts-nocheck` im gelockerten Migrationsmodus.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v257` erhöht.

## 0.7.88 - Runtime-JS als parallele TypeScript-Spiegel

- Großer Migrationsschritt gestartet: wichtige JavaScript-Runtime-Dateien werden parallel unter `src-ts/runtime-mirrors/` als TypeScript-Spiegel abgelegt.
- Die Spiegel enthalten deutsche Datei- und Code-Teil-Kommentare und dienen als Grundlage für die spätere echte Typisierung.
- Neue Prüfungen: `sync:ts-runtime-mirrors`, `check:ts-runtime-mirrors`, `test:runtime-mirrors`, `typecheck:runtime-mirrors`.
- Keine produktive Runtime-Logik geändert; Energiefluss, Speicher, Heizstab, KI, History, SmartHome, Lizenz und `info.connection` bleiben unverändert.
- Service-Worker Cache auf `nexowatt-cache-v256` erhöht.

# 0.7.87 - TypeScript-Struktur bereinigt und kanonisiert

- `src-ts/` bereinigt: versehentliches JavaScript-Artefakt unter `src-ts/scripts/` entfernt.
- Doppelte Feature-Sichtbarkeitslogik reduziert: `src-ts/backend/visibility` ist jetzt nur noch Kompatibilitätsadapter und leitet auf die kanonische Implementierung unter `src-ts/backend/feature-visibility` weiter.
- Neuer Strukturcheck `npm run check:ts-canonical` ergänzt, damit keine JS-Artefakte mehr in `src-ts/` landen und alte Pfade keine zweite Fachlogik enthalten.
- Neue Dokumentation `docs/TYPESCRIPT_CLEANUP_STRATEGY_0787_DE.md` ergänzt: erklärt, welche TS-Bausteine dauerhaft bleiben, welche nur Adapter sind und wann überflüssige Bausteine entfernt werden.
- Keine produktive Runtime-Logik geändert.

# 0.7.86 - Energiefluss TS-Aktivtest auf echter Anlage beobachten

- Kontrollierten Energiefluss-TypeScript-Aktivtest ergänzt: Backend protokolliert, ob TS tatsächlich als effektive Quelle genutzt wurde oder ob Sicherheitsgates korrekt auf JS zurückfallen.
- App-Center zeigt neue Karte „Energiefluss TS‑Aktivtest“ mit Samples, TS-/JS-Zählung, letzter Quelle, Grund, Blockern und JSON-Dialog.
- Energiefluss-Debug-JSON enthält `tsActiveTest`, damit reale Anlagenläufe nachvollziehbar bleiben.
- Die vorhandenen Gates bleiben verbindlich: Modus, produktive Freigabe, Shadow-OK, Kandidatenprüfung, Warmup und stabile Anlagen-Auswertung.
- Keine Änderungen an Core-Limits, Heizstab, KI, History, SmartHome, Lizenz oder info.connection.
- Service-Worker Cache auf `nexowatt-cache-v254` erhöht.

# 0.7.85 - Energiefluss TS nur nach stabiler Anlagen-Auswertung

- Energiefluss-TS-Kandidatenmodus zusätzlich durch reale Anlagen-Auswertung abgesichert.
- TS darf Energieflusswerte nur nutzen, wenn Modus `ts`, produktive Freigabe, Shadow-Vergleich, Kandidatenprüfung und stabile Anlagen-Auswertung erfüllt sind.
- App-Center zeigt und speichert neue Sicherheitsoptionen für Anlagen-Samples und OK-Samples in Folge.
- Keine Änderungen an produktiver EMS-/Heizstab-/KI-/History-/SmartHome-Logik außerhalb der Energiefluss-Kandidatenfreigabe.

## 0.7.84 - Shadow-Diagnose echte Anlage auswerten

- Backend sammelt einen kleinen Rolling-Buffer der echten TypeScript-Shadow-Diagnoseabrufe.
- App-Center zeigt neue Karte „Reale Anlagen-Auswertung“ mit Samples, OK-Quote, OK-Ticks in Folge und Blockern.
- JSON-Details zur Anlagen-Auswertung sind dauerhaft im Dialog öffnbar.
- Keine produktive Umschaltung und keine Änderung an Energiefluss, Core-Limits oder Heizstab.

## 0.7.83 - App-Center Shadow-JSON Anzeige stabilisiert

- JSON-Anzeige der TypeScript-Shadow-Diagnose im App-Center auf stabilen Dialog umgestellt, damit die Ansicht bei automatischem Refresh nicht sofort wieder zuklappt.
- Shadow-Karten zeigen jetzt zusätzlich eine verständliche Erklärung, warum OK/Abweichung/Fehler angezeigt wird.
- Keine EMS-/Runtime-Logik geändert; produktive Energiefluss-, Core-Limits- und Heizstabwerte bleiben unverändert.

## 0.7.82 - Energiefluss TS sicherer Kandidatenmodus

- Energiefluss-TS-Kandidatenmodus mit zusätzlicher Kandidatenprüfung ergänzt.
- TS-Werte dürfen nur produktiv genutzt werden, wenn Modus `ts`, produktive Freigabe, Shadow-OK und Kandidatenprüfung OK sind.
- Ungültige, negative, fehlende oder unplausible TS-Kandidatenwerte blockieren automatisch und lassen die JS-Runtime führend.
- App-Center zeigt die Kandidatenprüfung jetzt in der TS-Umschaltbereitschaft an.
- Keine sonstige EMS-/Heizstab-/History-/KI-Runtime geändert.

# 0.7.81 - Energiefluss TS-Schaltmodus im App-Center

- Energiefluss-TypeScript-Modus im App-Center sichtbar gemacht: `js`, `shadow`, `ts`.
- Zusätzliche Sicherheitsfreigabe `energyFlowProductionAllowed` im App-Center steuerbar gemacht.
- App-Center zeigt effektive Quelle, Freigabe, Blocker und TS-Nutzungsstatus aus der Shadow-Readiness.
- `tsMigration` wird jetzt über die Installer-Konfiguration geladen und gespeichert.
- Neue Prüfung `npm run test:energy-flow-mode-ui` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v250` erhöht.

# 0.7.80 - Energiefluss TS-Modus kontrolliert vorbereiten

- Internen Energiefluss-TypeScript-Modus `js/shadow/ts` vorbereitet.
- Standard bleibt `shadow`: JavaScript ist produktiv führend, TypeScript rechnet nur Diagnose.
- `ts` wird nur als Kandidatenmodus markiert und schreibt in dieser Version noch keine produktiven Werte.
- App-Center zeigt Energiefluss-Modus und geplante Quelle in der TS-Umschaltbereitschaft.
- Keine Änderung an Energiefluss-, Speicher-, Core-Limits-, Heizstab-, History- oder KI-Runtime.

# 0.7.79 - TS-Shadow-Diagnose auswerten und Energiefluss-Umschaltung vorbereiten

- Diagnose-API erweitert: `control.tsShadowReadiness` fasst Core-Limits-, Heizstab- und Energiefluss-Shadow-Vergleiche zusammen.
- App-Center zeigt jetzt eine eigene Karte „TS-Umschaltbereitschaft“ mit Status, Blockern und nächster Handlung.
- Keine produktive Umschaltung: JS-Runtime bleibt weiterhin autoritativ.
- Neuer Check `npm run test:shadow-readiness` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v247` erhöht.

## 0.7.78 - TypeScript Shadow-Diagnose im App-Center

- App-Center Statusbereich um sichtbare TypeScript-Shadow-Diagnose erweitert.
- Core-Limits-, Heizstab- und Energiefluss-Shadow-Ergebnisse werden als Karten mit OK/Abweichung/Fehler angezeigt.
- Diagnose-API `/api/ems/charging/diagnostics` liefert die benötigten Shadow-JSON-States an das Frontend.
- Keine produktive Runtime-Logik geändert; JS bleibt weiterhin autoritativ.
- Neuer Check `npm run test:shadow-diagnostics-ui`.
- Service-Worker Cache auf `nexowatt-cache-v246` erhöht.

## 0.7.77 - Core-Limits/Heizstab TypeScript Shadow-Vergleich

- Core-Limits-TS-Spiegel läuft jetzt parallel im Shadow-Modus und schreibt Diagnose nach `ems.budget.tsShadowJson`.
- Heizstab-TS-Spiegel läuft parallel im Shadow-Modus und schreibt Diagnose nach `heatingRod.summary.tsShadowJson`.
- Keine produktive Umschaltung: JavaScript-Runtime bleibt für Budgets und Heizstabentscheidungen autoritativ.
- Neuer Check `npm run test:ems-shadow-runtime` prüft Spiegel-Importe und kritische Fachfälle.
- Service-Worker Cache auf `nexowatt-cache-v245` erhöht.

## 0.7.76 - TypeScript EMS-Mirror für Core-Limits und Heizstab

- Neue TypeScript-zu-JavaScript-Spiegel für `src-ts/ems/core-limits/core-budget.ts` und `src-ts/ems/heating-rod/heating-rod-decision.ts` ergänzt.
- Die Spiegel liegen fachlich sauber unter `lib/ts-mirrors/ems/**`; gemeinsame Zahlenhelfer liegen unter `lib/ts-mirrors/utils/number.js`.
- Neue Prüfungen `npm run test:ems-mirrors` und `scripts/verify-ts-ems-mirrors.js` sichern Importierbarkeit und erste Core-/Heizstab-Regressionsfälle ab.
- Keine produktive Runtime-Logik geändert: Core-Limits, Heizstab, Energiefluss, History und KI laufen weiterhin wie in 0.7.75.
- Service-Worker Cache auf `nexowatt-cache-v244` erhöht.

## 0.7.75 - TS Energy-Flow Shadow-Vergleich

- TypeScript-Energiefluss-Resolver wird im Backend erstmals parallel zur produktiven JavaScript-Runtime ausgeführt.
- Die TS-Schicht ist noch nicht autoritativ: Dashboard, History, Heizstab, Core-Limits und KI verwenden weiterhin die bisherigen JavaScript-Werte.
- Abweichungen zwischen alter Runtime und TS-Resolver werden nur diagnostiziert/geloggt und im Debug-JSON `derived.core.building.inputsJson` unter `tsShadow` ergänzt.
- Neuer Check `npm run test:energy-flow-shadow-runtime` prüft die Shadow-Verdrahtung.
- Keine fachliche Änderung an Speicher-, Netz-, PV- oder Heizstablogik.

## 0.7.74 - TypeScript Feature-Sichtbarkeit autoritativ

- TypeScript-Spiegel für EVCS-/Speicherfarm-/SmartHome-/Wetter-/KI-Sichtbarkeit wird in `/config` jetzt autoritativ genutzt.
- Sicherheitsfallback auf die bisherige JavaScript-Runtime bleibt erhalten, falls der TS-Spiegel nicht geladen werden kann.
- Neue Diagnosefelder `featureVisibility` und `featureVisibilityTsPreview` bleiben in `/config` sichtbar.
- Neuer Check `test:feature-visibility-effective-runtime` sichert die produktive Verdrahtung ab.
- Keine Änderungen an Energiefluss, Speicher-DP, Heizstab, KI-Logik, History oder SmartHome-Runtime.

## 0.7.73 - TypeScript Shadow-Bridge Feature-Sichtbarkeit

- TypeScript Shadow-Bridge für spätere Feature-Visibility-Migration ergänzt.
- Generierter CommonJS-Spiegel unter `lib/ts-mirrors/bridges/feature-visibility-shadow.js` ergänzt.
- Neue Checks `sync/check/test:ts-shadow-bridges` ergänzt.
- Keine produktive Runtime-Logik geändert.

# 0.7.72 - TypeScript NodeNext-Konfiguration

- TypeScript-Konfigurationen für Node-nahe Builds von `Node16/node16` auf `NodeNext/nodenext` umgestellt.
- Frontend-MJS-Mirror-Builds behalten `moduleResolution: Bundler`.
- `verify-tsconfig-modern.js` erzwingt jetzt NodeNext/Bundler statt alter Node16/node10-Resolver.
- Keine Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v240` erhöht.

## 0.7.71 - TypeScript-7-kompatible tsconfig-Struktur

- `moduleResolution: "Node"` durch moderne TypeScript-Konfiguration ersetzt.
- Basis-tsconfig nutzt jetzt `module: "Node16"` und `moduleResolution: "Node16"`.
- Frontend-/MJS-Spiegel nutzen bewusst `moduleResolution: "Bundler"` mit `module: "ES2022"`.
- Neuer Check `npm run check:tsconfig-modern` ergänzt, damit keine veralteten `node10`-/`Node`-Konfigurationen zurückkommen.
- Keine Runtime-Logik geändert.

## 0.7.70 - TypeScript Source Integrity Stabilization

- Reine TS-Migrations-Stabilisierung ohne Runtime-Änderung.
- `scripts/verify-ts-source-syntax.js` ergänzt, um alle `src-ts/**/*.ts` gegen abgeschnittene Dateien, Syntaxfehler und kaputte Exporte zu prüfen.
- Neuer Befehl `npm run check:ts-source-syntax`. Dieser Check benötigt vorher `npm install`/`npm ci`, bleibt aber bewusst außerhalb des schnellen `publish:check`.
- Version und Service-Worker-Cache auf 0.7.70 / `nexowatt-cache-v238` erhöht.

## 0.7.69 - TypeScript Energiefluss-Spiegel und Shadow-Vergleich-Vorstufe

- CommonJS-Spiegel für TypeScript-Energiefluss-Helfer und den produktionsnahen Resolver ergänzt.
- Neue Spiegel unter `lib/ts-mirrors/energy-flow/**` vorbereitet; sie werden noch nicht produktiv von `main.js` oder `www/app.js` genutzt.
- Synchronitäts- und Runtime-Checks für Split-/Signed-Speicher, Fallback, Netz-Signed und 0-W-Fälle ergänzt.
- Build-/Check-Skripte für `sync:ts-energy-flow-mirrors`, `check:ts-energy-flow-mirrors` und `test:energy-flow-mirrors` ergänzt.
- Keine Änderung an Energiefluss-, Speicher-, Heizstab-, KI-, History-, SmartHome- oder Lizenz-Runtime.
- Service-Worker Cache auf `nexowatt-cache-v237` erhöht.

## 0.7.68 - Frontend-MJS-Spiegel Runtime-Check

- Runtime-Importcheck für die generierten Frontend-MJS-Spiegel ergänzt.
- Prüft `display-format.mjs`, `customer-feature-visibility.mjs` und `history-controls.mjs` ohne produktive VIS-Änderung.
- Regressionsfälle für `0 W`, EVCS/Farm-Sichtbarkeit und History-EVCS-PDF ergänzt.
- `publish:check` prüft jetzt zusätzlich, ob die MJS-Spiegel importierbar und fachlich plausibel sind.
- Service-Worker Cache auf `nexowatt-cache-v236` erhöht.

# 0.7.68 - TypeScript Feature-Visibility Regressionen

- TypeScript-Regressionsfälle für kundenseitige Feature-Sichtbarkeit ergänzt.
- EVCS-/Wallbox-Sichtbarkeit, Speicherfarm-Sichtbarkeit, Wetter-, SmartHome- und KI-Sichtbarkeit fachlich abgesichert.
- Neuer Runtime-Test für `buildCustomerFeatureVisibility` ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v236` erhöht.

# 0.7.67 - TypeScript Frontend-Display-MJS-Spiegel

- Ersten kontrollierten TS->MJS-Spiegel fuer browsernahe Frontend-Display-Helfer ergänzt.
- Keine Runtime-Änderung.

## 0.7.67 - TypeScript Frontend-Display-MJS-Spiegel

- Ersten kontrollierten TS->MJS-Spiegel fuer browsernahe Frontend-Display-Helfer ergänzt.
- Neue Spiegeldateien unter `www/static/ts-mirrors/frontend/`: `display-format.mjs`, `customer-feature-visibility.mjs`, `history-controls.mjs`.
- Neue Build-/Check-Skripte: `sync:ts-frontend-mirrors`, `check:ts-frontend-mirrors`, `test:ts-frontend-mirrors`.
- `publish:check` prüft die Frontend-Spiegel synchron, ohne TypeScript-Build auszuführen.
- Keine Runtime-Änderung an Dashboard, History, Energiefluss, SmartHome, EMS, Lizenz oder info.connection.
- Service-Worker Cache auf `nexowatt-cache-v235` erhöht.

## 0.7.66 - TypeScript Build-Output und erster JS-Spiegel

- Erste reproduzierbare TypeScript-zu-JavaScript-Spiegelstrategie eingeführt.
- `src-ts/scripts/publish-check-rules.ts` wird per TypeScript-Build zu `scripts/publish-check-rules.js` gespiegelt.
- Neue Checks: `build:ts:script-mirrors`, `test:ts-script-mirrors` und `test:script-mirrors`.
- `build:ts` erzeugt jetzt zuerst den JS-Spiegel und anschließend die TypeScript-Deklarationen.
- Der generierte JS-Spiegel ist klar als automatisch erzeugt markiert.
- Keine produktive EMS-/VIS-/Speicher-/Heizstab-/KI-/History-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v234` erhöht.

## 0.7.65 - TypeScript Frontend-Anzeigehelfer

- Erste reine Frontend-TypeScript-Helfer unter `src-ts/frontend/` ergänzt.
- Anzeigeformatierung für Leistung, Energie und Prozentwerte vorbereitet.
- Typisierte Dashboard-Wertezeilen vorbereitet, inklusive EVCS-Sichtbarkeit.
- History-Toolbar-Verträge vorbereitet, damit EVCS PDF nur mit echter Wallbox sichtbar wird.
- Runtime-Test für Frontend-Anzeigehelfer ergänzt.
- Keine produktive Runtime-/VIS-Logik geändert.

## 0.7.64 - Git-Konflikt-/TypeScript-Stabilisierung

- Git-Konfliktprüfung `npm run git:conflicts` ergänzt.
- Dokumentation `docs/GIT_CONFLICT_RECOVERY_DE.md` ergänzt, damit lokale Merge-/VS-Code-Konflikte sauber bereinigt werden können.
- `.gitattributes` ergänzt, damit TypeScript-/JavaScript-/JSON-Dateien stabile LF-Zeilenenden verwenden und Binär-/Build-Artefakte klar behandelt werden.
- Keine Runtime-Logik geändert: Energiefluss, Speicher, Heizstab, KI, History, SmartHome, Lizenz und info.connection bleiben unverändert.

# 0.7.63 - TypeScript Adapter-State/API Vorbereitung

- TypeScript-Struktur für adapternahe Helfer ergänzt: `src-ts/adapter/state-cache.ts`, `api-state.ts`, `api-set.ts`, `connection-state.ts` und `settings-writes.ts`.
- Erste typisierte Helfer für StateCache-Normalisierung, `/api/state`-Antworten, `/api/set`-Schreibpläne und `info.connection` vorbereitet.
- Regressionen für 0-W-Statewerte, `false`-Werte, `value`/`val`-Übergangsformen und Kundeneinstellungs-Schreibpläne ergänzt.
- Deutsche Kommentare direkt an den neuen Code-Teilen ergänzt, damit die spätere Migration aus `main.js` nachvollziehbar bleibt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v231` erhöht.

## 0.7.63 - TypeScript API-State und Feature-Sichtbarkeit Vorbereitung

- TypeScript-Verträge für `/api/state`, `/api/set` und SSE-Ereignisse ergänzt.
- Backend-nahe TypeScript-Helfer für StateCache-Normalisierung und API-State-Envelopes vorbereitet.
- Feature-Sichtbarkeit für EVCS, Speicherfarm, SmartHome, Wetter und KI-Berater als TypeScript-Helfer vorbereitet.
- Regressionen für gültige 0-W-/false-Statewerte, fehlende States, EVCS ohne echte Wallbox und Speicherfarm ohne echte Farm ergänzt.
- Neue Checks `test:api-state-feature` und `test:api-state-feature-runtime` ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v231` erhöht.

# 0.7.63 - TypeScript Backend/API-State Vorbereitung

- TypeScript-Vorbereitung für spätere Migration von `main.js`-Hilfsbereichen ergänzt.
- Neue Verträge und Helfer für `/api/state`, Feature-Sichtbarkeit, Lizenzplatzhalter-Schutz und `info.connection`.
- Neue Smoke-/Strukturprüfung `test:backend-api-state` ergänzt.
- Deutsche Kommentare direkt an den neuen TypeScript-Code-Teilen ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v231` erhöht.

## 0.7.62 - TypeScript Core-Limits und Heizstab-Vorbereitung

- TypeScript-Verträge für zentrale EMS-Budgets und Heizstab-/Thermikentscheidungen ergänzt.
- Neue fachliche TS-Struktur unter `src-ts/ems/core-limits` und `src-ts/ems/heating-rod` eingeführt.
- Produktionsnahe Regressionen für Speicherreserve, PV-Budget, Netzlimit und Heizstab-Stufenauswahl ergänzt.
- Neue Checks `test:ems-budget-heating-rod` und `test:ems-budget-heating-rod-runtime` ergänzt.
- Keine produktive Runtime-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v230` erhöht.

# 0.7.61 - TypeScript Energiefluss-Resolver und Regressionen

- Produktionsnahe TypeScript-Vorbereitung für Speicher-, Netz- und Gebäudelast-Resolver ergänzt.
- Neue TypeScript-Resolverbasis für `resolveStorageFlow`, `resolveGridFlow`, `calculateBuildingLoadFromBalance` und Snapshot-Aufbau vorbereitet.
- Energiefluss-Regressionsfälle für Split-DP 0 W, signed Speicher-DP, Bilanz-Fallback, Quellenpriorität und signed/split Netzfluss ergänzt.
- Runtime-Test `npm run test:energy-flow-regression-runtime` ergänzt: TypeScript wird in einen Test-Build kompiliert und mit Node ausgeführt.
- Strukturchecks `test:energy-flow-regressions`, `test:energy-flow-regression` und `test:energy-flow-resolver` halten Kommentare, Anker und neue Dateien fest.
- `publish:check` bleibt ohne TypeScript-Build nutzbar und prüft zusätzlich die Regressionstest-Struktur.
- Keine produktive Energiefluss-, Speicher-, Heizstab-, History-, KI-, Lizenz-, SmartHome- oder Frontend-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v229` erhöht.

## 0.7.60 - TypeScript Energiefluss-Helfer

- Erste reine TypeScript-Helfer für Speicher- und Netzfluss ergänzt.
- `splitSignedStoragePower`, `resolveSplitStorageDps`, `calculateStorageFromBalance`, `chooseStorageFlowResult`, `splitSignedGridPower` und `resolveSplitGridDps` vorbereitet.
- Deutsche Kommentare direkt an den neuen Code-Teilen ergänzt, damit Zweck, Zusammenhänge und spätere Runtime-Migration nachvollziehbar bleiben.
- Compile-only Smoke-Test `src-ts/tests/energy-flow-utils-smoke.ts` ergänzt.
- TypeScript-/Scaffold-Prüfungen um die neuen Energiefluss-Helfer erweitert.
- Keine produktive Energiefluss-, Speicher-, Heizstab-, History-, KI- oder SmartHome-Logik geändert.
- Service-Worker Cache auf `nexowatt-cache-v228` erhöht.

## 0.7.59 - Erste JS-zu-TS-Migration für Wartungsskripte

- Erste kleine JavaScript-Logik aus dem Publish-Check typisiert vorbereitet: `src-ts/scripts/publish-check-rules.ts`.
- Node-kompatible JS-Spiegeldatei `scripts/publish-check-rules.js` ergänzt, damit `publish:check` weiterhin ohne TypeScript-Build funktioniert.
- `scripts/verify-publish.js` nutzt die ausgelagerten Publish-Regeln und ist dadurch ein erster echter Migrationsschritt ohne EMS-/VIS-Risiko.
- Neue TypeScript-Smoke-Datei `src-ts/tests/publish-check-rules-smoke.ts` ergänzt.
- Deutsche Kommentare direkt an den neuen Code-Teilen ergänzt, damit die Migration nachvollziehbar bleibt.
- Keine Änderungen an Energiefluss, Speicher-DP, Heizstab, KI, History, SmartHome oder Lizenzlogik.
- Service-Worker Cache auf `nexowatt-cache-v227` erhöht.

# 0.7.58 - TypeScript Build- und Testbasis

- TypeScript-Migrationsbasis stabilisiert: Basis-, Check-, Build-, Frontend-JS- und Backend-JS-Konfigurationen ergänzt.
- `npm run typecheck` prüft weiterhin nur die TypeScript-Quellen unter `src-ts`; produktive JavaScript-Laufzeit bleibt unverändert.
- `npm run build:ts` erzeugt nur TypeScript-Declaration-Artefakte (`.d.ts`) und keine produktive Runtime-Ausgabe.
- `scripts/verify-ts-scaffold.js` und `scripts/clean-ts-build.js` für eine saubere Build-/Testbasis ergänzt.
- `src-ts/contracts/testing.ts` und `tests/fixtures/regression-plan.de.json` als Grundlage für spätere Regressionstests ergänzt.
- Dokumentation `docs/TYPESCRIPT_BUILD_BASIS_0758_DE.md` ergänzt.
- Keine Änderung an Energiefluss, Speicher-DP, Heizstab, History, SmartHome, KI, Lizenz oder ioBroker-Verbindungslogik.
- Service-Worker Cache auf `nexowatt-cache-v226` erhöht.

## 0.7.57 - TypeScript-Publish-Check getrennt

- `publish:check` wieder npm-stabil gemacht: Es prüft jetzt JSON/ioBroker-Metadaten/Konfliktmarker/JS-Syntax, ruft aber kein `tsc` mehr direkt auf.
- `typecheck` bleibt als eigener TypeScript-Qualitätscheck erhalten.
- Neues Skript `test:all`: `publish:check` + `typecheck` + `npm pack --dry-run`.
- `prepublishOnly` nutzt nur `publish:check`, damit lokales `npm publish` nicht wegen fehlendem `node_modules/.bin/tsc` scheitert.
- GitHub Actions führen weiterhin strikt `npm ci`, `publish:check`, `typecheck` und `npm pack --dry-run` aus.
- Workflow-Fallback `npm ci || npm install` entfernt, damit CI-Fehler nicht mehr versteckt werden.
- Neue Doku: `docs/TYPESCRIPT_PUBLISH_STRATEGY_0757_DE.md`.
- Service-Worker Cache auf `nexowatt-cache-v225` erhöht.

# 0.7.56 - TypeScript Migration Scaffold

- TypeScript-Migrationsbasis ergänzt: `tsconfig.json` und erster `src-ts`-Bereich.
- Erste TypeScript-Verträge für Einheiten, Energiefluss, Speicherauflösung, Feature-Sichtbarkeit, KI-Berater, Lizenz, Datenpunkte und ioBroker-State-Cache ergänzt.
- Neue npm-Skripte `typecheck` und `test:types` ergänzt; `publish:check` führt jetzt zusätzlich den TypeScript-Typecheck aus.
- Dokumentation zur TypeScript-Migrationsbasis unter `docs/TYPESCRIPT_SCAFFOLD_0756_DE.md` ergänzt.
- Keine Produktivlogik geändert: Energiefluss, Speicher-DP-Resolver, Heizstab, KI, History, SmartHome, Lizenz und Connection-State bleiben unverändert.
- Service-Worker Cache auf `nexowatt-cache-v224` erhöht.

# 0.7.55 - Architektur-, Datenfluss- und TypeScript-Dokumentation

- Dokumentationsvertiefung ohne Funktionsänderungen.
- Neue Dokumente ergänzt: `ARCHITECTURE_DE.md`, `DATAFLOW_DE.md`, `STATES_AND_DATAPOINTS_DE.md`, `CRITICAL_RULES_DE.md`, `TYPESCRIPT_MIGRATION_DE.md`, `MODULE_CHECKLISTS_DE.md` und `CODE_CONTRACTS_DE.md`.
- JSDoc-Vertragsblöcke für zentrale Bereiche ergänzt: Adapter-State/API, LIVE-Dashboard, Core-Limits, Heizstab, KI-Berater, App-Center, History und SmartHome.
- Dokumentiert wurden Datenflüsse, State-/DP-Bedeutungen, kritische Nicht-kaputt-machen-Regeln und Checklisten für spätere Änderungen.
- Keine Änderung an Energiefluss, Heizstab, KI, Lizenz, History, SmartHome oder ioBroker-Verbindungslogik.
- Service-Worker Cache auf `nexowatt-cache-v223` erhöht.

# 0.7.54 - Detail-Kommentare für Wartbarkeit und TypeScript-Migration

- Detail-Kommentare vor Funktionen, Methoden, Express-Routen und UI-Ereignisbindungen ergänzt.
- Kommentare beschreiben Aufgabe, Zusammenhang zu APIs/States/Datenpunkten und Hinweise für die spätere TypeScript-Umstellung.
- HTML/CSS-Vertragsstellen zusätzlich dokumentiert.
- `docs/COMMENTING_STANDARD_DE.md` als Kommentarstandard ergänzt.
- Keine Funktionslogik geändert.
- Service-Worker Cache auf `nexowatt-cache-v222` erhöht.

## 0.7.54 - Detaillierte deutsche Code-Kommentare

- Reine Wartbarkeitsversion ohne Funktionsänderungen.
- Deutsche Abschnittskommentare vor Klassen, Funktionen, Methoden und wichtigen Code-Teilen ergänzt.
- Kommentare erklären Zweck, fachlichen Zusammenhang und TypeScript-Hinweise.
- Kommentarstandard unter `docs/COMMENTING_STANDARD_DE.md` ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v222` erhöht.

## 0.7.53 - Deutsche Code-Kommentare und Wartbarkeitsbasis

- Reines Dokumentationsrelease ohne Funktionsänderungen.
- Deutsche Datei-Kommentare für zentrale Backend-, EMS-, Frontend-, Admin-, Report- und Skriptdateien ergänzt.
- Zusätzliche Abschnittskommentare in `main.js`, `www/app.js`, `www/ems-apps.js`, `www/history.js` und `www/smarthome.js` ergänzt.
- `docs/CODEMAP_DE.md` als Code-Landkarte für Wartung und spätere TypeScript-Migration ergänzt.
- Service-Worker Cache auf `nexowatt-cache-v221` erhöht.

## 0.7.52 - info.connection Hotfix

- `info.connection` wird jetzt über eine zentrale Helper-Funktion gesetzt und zusätzlich im `/api/state`/SSE-Cache gespiegelt.
- Nach erfolgreichem HTTP-/SSE-Webserverstart bleibt der Verbindungsstatus per Heartbeat auf `true`, solange der Server erreichbar ist.
- Optionale Teilfehler nach dem Webserverstart setzen die Verbindung nicht mehr fälschlich auf `false`; stattdessen wird eine Warnung geloggt.
- Webserver-`error`/`close`-Events setzen `info.connection` sauber auf `false`.
- Beim Adapter-Unload wird der Heartbeat gestoppt und `info.connection` auf `false` gesetzt.
- Keine Änderung an Energiefluss-, Speicher-, Heizstab-, KI-, History- oder VIS-Logik.
- Service-Worker Cache auf `nexowatt-cache-v220` erhöht.

## 0.7.51 - Lizenz-Hotfix nach ioBroker-Stabilitätsupdate

- Regression aus 0.7.50 behoben: `licenseKey` wird vorübergehend wieder ohne `protectedNative`/`encryptedNative` geführt, weil maskierte ioBroker/Admin-Platzhalter gültige Lizenzschlüssel überschreiben konnten.
- Runtime-Lizenzprüfung liest konfigurierte Schlüssel robuster aus `this.config` und dem Adapter-Objekt.
- `/api/license/save` weist maskierte/geschützte Platzhalter ab und überschreibt damit keine echte Lizenz mehr.
- Admin-Lizenzseite ignoriert maskierte Lizenzwerte beim Laden/Speichern.
- Legacy-Lizenzfeld `common.license` wieder auf `UNLICENSED` gesetzt; `licenseInformation` bleibt für spätere ioBroker-Kompatibilität erhalten.
- Keine Änderung an Energiefluss-, Speicher-, Heizstab-, KI- oder VIS-Logik.
- Service-Worker Cache auf `nexowatt-cache-v219` erhöht.

## 0.7.50 - ioBroker Stability Maintenance

- Node.js Engine auf `>=22` angehoben.
- CI/GitHub-Actions auf Node.js 22.x und 24.x vorbereitet.
- ioBroker-Metadaten ergänzt: `tier`, `dependencies`, `globalDependencies`, `licenseInformation`.
- `licenseKey` via `protectedNative` und `encryptedNative` geschützt.
- `info.connection` State ergänzt und beim Start/Stop gesetzt.
- Admin-Konfiguration nutzt jetzt `native.ip`; `native.bind` bleibt als Legacy-Fallback erhalten.
- `common.news` auf die letzten 7 Einträge gekürzt; doppelte Top-Level-News entfernt.
- Publish-/Stabilitätsprüfung erweitert.
- README auf Englisch als primäre ioBroker-Dokumentation umgestellt.
- Service-Worker Cache auf `nexowatt-cache-v218` erhöht.

## 0.7.49 - Mobile VIS Hotfix History/SmartHome

- History-Seite auf Smartphone/Tablet korrigiert: Zeitraum, Datum, Navigation und Aktionen werden jetzt als responsive Gruppen dargestellt statt als horizontal wegscrollende Riesenkacheln.
- EVCS-PDF und E-Mobilitäts-Legende in History werden nur noch angezeigt, wenn wirklich Ladepunkte konfiguriert sind.
- SmartHome-Mobile-Layout gehärtet: Gebäudenavigation ist wieder ein Drawer und nimmt nicht mehr den Seitenfluss ein.
- SmartHome zeigt einen Lade-/Fehlerzustand statt einer leeren Fläche, falls die Geräte-API langsam ist oder nicht antwortet.
- Service-Worker Cache auf `nexowatt-cache-v217` erhöht.

## 0.7.48 - Speicher-DP/Historie-Hotfix

- Speicher-Lade-/Entlade-DPs werden wieder dauerhaft als Quelle der Wahrheit genutzt, auch wenn ein konstanter 0-Wert lange keinen neuen Zeitstempel bekommt.
- Signed Batterie-DP bleibt unterstützt; getrennte Lade-/Entlade-DPs bleiben unterstützt.
- Rechen-Fallback für Speicherleistung greift nur noch, wenn wirklich kein Speicher-DP konfiguriert ist und eine belastbare Bilanz möglich ist.
- Speicherfarm-Werte übernehmen normale Einzelanlagen nicht mehr über alte Runtime-States.
- Der Energiefluss, Core-Limits, Heizstab-Regelung und Historie verwenden wieder dieselbe konservative Speicherauflösung.

## 0.7.47 - Energiefluss-DP-Resolver und Heizstab-Config-Hotfix

- Energiefluss-Resolver korrigiert: getrennte Lade-/Entlade-DPs bleiben wieder autoritativ und werden nicht mehr pauschal bei Netzeinspeisung unterdrückt.
- Signed Batterie-DP bleibt unterstützt (`-` = Laden, `+` = Entladen, inklusive Invert-Option).
- Rechen-Fallback für Speicherleistung greift nur noch, wenn keine frische Messquelle vorhanden ist bzw. eine Seite fehlt und ein direkter Verbrauchszähler vorhanden ist.
- Core-Limits und Heizstab-Regelung verwenden jetzt dieselbe zentrale Speicherfluss-Auflösung wie der Live-Energiefluss.
- Heizstab-App-Center: Speicher-Reserve und weitere Zahlenfelder werden direkt aus dem DOM vor dem Speichern geflusht, damit Werte nicht auf Defaults zurückspringen.
- Service-Worker Cache auf `nexowatt-cache-v215` erhöht.

## 0.7.46 - Energiefluss- und Heizstab-Budget-Hotfix

- Energiefluss-Bilanz gehärtet: getrennte Batterie-Laden/Entladen-Datenpunkte werden bei gleichzeitigem Netzeinspeisen ohne direkten Hauslast-Zähler gegen Ghost-Entladung plausibilisiert. Dadurch bläht ein falscher `powerDischarge`-Alias nicht mehr Gebäudelast, PV-Budget, KI-Berater und Heizstab-Budget auf.
- Core-Limits und Heizstab-Regelung nutzen dieselbe Schutzlogik, damit Status, PV-Budget und Live-Dashboard identisch rechnen.
- App-Center Schnell-Inbetriebnahme bevorzugt beim Speicher jetzt den signed Batterie-Leistungs-Datenpunkt vor getrennten Lade-/Entlade-Aliasen.
- Heizstab-Konfiguration korrigiert: numerische Felder schreiben sofort in die aktive Konfiguration; `Speicher-Reserve (W)` springt nicht mehr auf den Default `1000 W` zurück.
- Service-Worker Cache auf `nexowatt-cache-v214` erhöht.

## 0.7.45 - App-Center Heizstab-UI Hotfix

- App-Center/Installerseiten erhalten die Installer-Seitenklasse, damit Hero und Hauptcontainer wieder auf derselben breiten Cockpit-Achse liegen.
- Heizstab-Tab auf volle Breite umgestellt: Gerätekarte und Hinweis liegen nicht mehr nebeneinander, damit 1-12 Stufen und DP-Zeilen nicht in die rechte Karte laufen.
- Heizstab-Stufenparameter und Write-/Read-DP-Zuordnung responsiv gehärtet: Karten, Gruppen, Felder und Stage-Grid begrenzen sich sauber auf die verfügbare Breite.
- Seitliches Überlaufen/Überlagern der Heizstab-Konfiguration bei PC-, Tablet- und Smartphone-Breiten behoben.
- Service-Worker Cache auf `nexowatt-cache-v213` erhöht.

## 0.7.44 - Publish-/Package-Hotfix

- `package.json` sauber neu geschrieben und Version auf `0.7.44` gesetzt.
- `io-package.json` und Webmanifest auf `0.7.44` synchronisiert.
- Service-Worker Cache auf `nexowatt-cache-v212` erhöht.
- Publish-Prüfung gegen ungelöste Git-Konfliktmarker bestätigt.

## 0.7.43 - KI-Speicher-SoC-Hotfix

- KI-Energieberater: Speicher-SoC-Ermittlung korrigiert. `storageSoc` ist jetzt die primäre normale Speicher-SoC-Quelle; `storageFarm.totalSoc=0` aus nicht aktiver oder nicht konfigurierter Speicherfarm sowie alte Regelungs-Defaults überdecken den echten Kunden-Frontend-SoC nicht mehr.
- Speicherfarm-SoC wird nur noch genutzt, wenn die Farm aktiv ist und echte SoC-Quellen vorhanden sind; sonst fällt die KI sauber auf den normalen Speicher-SoC zurück.
- Neue Diagnose-States `aiAdvisor.storageSocPct` und `aiAdvisor.storageSocSource`, damit sichtbar ist, welchen Speicher-SoC der KI-Berater wirklich verwendet.
- Service-Worker Cache auf `nexowatt-cache-v211` erhöht.

## 0.7.42 - Batteriefluss-Verknüpfung und striktere Anlagen-Sichtbarkeit

- Batterie-Leistungsanzeige im Cockpit gehärtet: Wenn Lade-/Entlade-Datenpunkte fehlen, stale sind oder nur 0 liefern, aber PV, Netz, Hausverbrauch und SoC eine klare Batterie-Bilanz ergeben, wird Laden/Entladen plausibel aus der Leistungsbilanz abgeleitet.
- Energiefluss-Monitor, aktuelle Werte, KPI-Kachel und Historie nutzen damit wieder konsistente Speicherwerte.
- Backend spiegelt abgeleitete Batterie-Lade-/Entladeleistung auf die öffentlichen Flow-States, damit KI-Berater, Historie und Module dieselbe Speicherlogik sehen.
- EVCS-/Ladestations-Sichtbarkeit weiter verschärft: Alte Bool-Flags allein reichen nicht mehr aus; sichtbar wird EVCS nur bei wirklich konfigurierten Ladepunkt-Zeilen.
- Service-Worker Cache auf `nexowatt-cache-v210` erhöht.

## 0.7.41 - Anlagenabhängige Sichtbarkeit für EVCS und Speicherfarm

- Kunden-Frontend zeigt EVCS/Ladestation nur noch, wenn mindestens ein echter Ladepunkt mit Mess-/Steuer-Datenpunkt konfiguriert ist.
- Default-/Legacy-Placeholder wie `consumptionEvcs` aktivieren keine Wallbox-Anzeige mehr.
- Ladestation-Wert, Schnellzugriff, Energiefluss-Knoten, EVCS-Seite und EVCS-Navigation werden bei Anlagen ohne Wallbox ausgeblendet.
- Speicherfarm-Reiter und Farmansicht werden nur noch angezeigt, wenn die Speicherfarm im Installer aktiv ist und mindestens ein Speicher konfiguriert wurde.
- KI-Energieberater blendet EV-/Wallbox-Empfehlungen bei Anlagen ohne Wallbox aus und formuliert Empfehlungen dann auf Heizstab, Warmwasser und andere flexible Lasten um.
- App-Center erlaubt `0` Ladepunkte als gültige Konfiguration.
- Service-Worker Cache auf `nexowatt-cache-v209` erhöht.

## 0.7.40 - KI-Energieberater Planung & Lernen

- KI‑Energieberater um Tagesfahrplan, EV‑Zielplanung, wetterbasierte Speicherstrategie, Saisonlogik und Komfortfenster erweitert.
- Lastspitzen‑Lernfunktion, Anomalie‑Erkennung und Prognosequalitätsbewertung ergänzt.
- Kunden‑Einstellungen für Optimierungsmodus, EV‑Ziel, Komfort-/Ruhezeiten und Prioritäten ergänzt.
- App‑Center/Admin‑Konfiguration für neue KI‑Bausteine, Schwellwerte, Prioritäten und Kategorien erweitert.
- Neue States unter `aiAdvisor.*` für Tagesfahrplan, Lernhinweise, Prognosequalität, Anomalien, Saison und Komfortfenster ergänzt.

# 0.7.39 - KI-Berater Wetterprognose und Peak-Shaving-Vorwarnung

- KI-Energieberater nutzt jetzt die vorhandene Wetterprognose: Regen-/Wolkenlage, Temperatur und Morgen-Prognose können Empfehlungen zu Speicherreserve, PV-Fenstern, Thermik und Kühlung beeinflussen.
- Peak-Shaving-Beratung korrigiert: Bei konfigurierter Netzanschlussleistung von z. B. 30 kW wird ab 90 % eine Vorwarnung ausgelöst, also ab 27 kW.
- Die Peak-Meldung unterscheidet sauber zwischen „Lastspitzenkappung aktiv“, „Lastspitzenkappung vorbereitet“ und „Lastspitzenkappung nicht konfiguriert“.
- Neue Runtime-States ergänzt: `aiAdvisor.peakUsagePct`, `aiAdvisor.peakStateText`, `aiAdvisor.gridConnectionLimitW`, `aiAdvisor.peakWarnThresholdW` und `aiAdvisor.weatherSummary`.
- App-Center erweitert: Schwellwert „Peak-Warnung ab Netzanschluss (%)“, Schlechtwetter-/Regenrisiko-Schwelle und Kategorie „Wetter / Prognose“.
- Service-Worker Cache auf `nexowatt-cache-v207` erhöht.

# 0.7.38 - Speicherfarm-Route und KI-Berater Kundenschalter

- Fehler behoben: `storagefarm.html` ist jetzt direkt unter `/storagefarm.html`, `/storagefarm`, `/speicherfarm.html` und `/speicherfarm` erreichbar; die 404-Seite beim Topbar-Reiter Speicherfarm ist damit beseitigt.
- Kundenschalter in den Einstellungen ergänzt: Der KI-Energieberater kann vom Kunden unter `Einstellungen → Allgemein` ein- und ausgeschaltet werden.
- Der KI-Energieberater respektiert jetzt die neue Einstellung `settings.aiAdvisorEnabled` sofort im LIVE-Dashboard und im EMS-Modul.
- Kompatibilität zwischen `aiAdvisor.showOnLive` und `aiAdvisor.showInLive` bereinigt, damit App-Center-Konfiguration und LIVE-Anzeige konsistent bleiben.
- Service-Worker Cache auf `nexowatt-cache-v206` erhöht.

# 0.7.37 - SmartHome Halbkreis-Bedienung und Feinschliff


- SmartHome-Dimmer und Jalousien erhalten im großen Bedienpanel zusätzlich einen interaktiven Halbkreis-Regler mit +/− Bedienung; der klassische Slider bleibt als Präzisionssteuerung erhalten.
- Halbkreis-Regler und Slider werden gegenseitig synchronisiert und bleiben mit Live-Vorschau/Commit-Logik kompatibel.
- Service-Worker Cache auf `nexowatt-cache-v204` erhöht.

# 0.7.36 - UI-Polish SmartHome, Einstellungen und Speicherfarm

- Alte Allgemeine-Einstellungen-Sektion vollständig aus dem LIVE-Dashboard entfernt; Einstellungen liegen nur noch auf `settings.html`.
- Speicherfarm bleibt table-only und nutzt auf dem PC die verfügbare Breite/Höhe deutlich besser.
- SmartHome-Kacheln sauberer ausgerichtet, aktive Gebäudestruktur-Einträge wieder kontrastreich lesbar.
- SmartHome-Bedienkacheln mit Halbkreis-Statusanzeige ergänzt; Klick auf Dimmer, RGB, Jalousie, RTR und Player öffnet direkt die große Bedienung.
- Überschrift-/Hero-Kacheln in Einstellungen und Installerbereich auf eine gemeinsame Container-Achse und sauberes Padding gebracht.
- Service-Worker Cache auf `nexowatt-cache-v203` erhöht.

# 0.7.35 - History Vollbreite, Speicherfarm-Tabelle, Admin-Trennung

- History auf Desktop auf volle verfügbare Breite erweitert; Tablet und Smartphone bleiben responsiv.
- Top-Level-Reiter „Speicherfarm“ öffnet jetzt eine eigene table-only Seite (`storagefarm.html`) statt das LIVE-Dashboard als eingebetteten Tab zu zeigen.
- Alte Links auf `?tab=storagefarm` werden auf die neue Speicherfarm-Tabelle umgeleitet.
- Installer-/Konfigurationsseiten unter `/www` sind per Admin-Handoff geschützt und werden aus dem Kundenfrontend nicht mehr direkt verlinkt.
- Admin-React-Handoff ergänzt `nwAdmin=1`, damit App-Center, Simulation und SmartHome-Konfiguration weiterhin aus der ioBroker-Adminseite geöffnet werden können.
- Service-Worker Cache auf `nexowatt-cache-v202` erhöht.

# 0.7.34 - History Full-Width & Speicherfarm-Tab-Fix

- History-Seite auf Desktop/PC auf volle verfügbare Cockpit-Breite erweitert; Tablet- und Smartphone-Breakpoints bleiben touchfreundlich responsiv.
- Diagrammhöhen für History und Preis/Kosten auf Desktop vergrößert, auf Tablet/Smartphone weiterhin kompakt begrenzt.
- Speicherfarm-Tab im Endkunden-Frontend zeigt jetzt ausschließlich die Read-only-Speicherfarm-Tabelle und blendet das LIVE-Dashboard zuverlässig aus.
- Topbar-Links „SPEICHERFARM“ führen auf die Read-only-Tabelle; die Konfiguration bleibt im App-Center intern erreichbar.
- Webcache auf `nexowatt-cache-v201` erhöht.

# 0.7.33 - Frontend-weites Cockpit-Design

- Alle Haupt-Unterseiten optisch an das neue NexoWatt EMS Cockpit angepasst: History, Einstellungen, EVCS, SmartHome, SmartHome-Konfiguration, NexoLogic, App-Center/Speicherfarm, Simulation und Reports.
- Gemeinsame Topbar-, Karten-, Button-, Formular-, Tabellen- und Dialog-Styles ergänzt, damit das komplette Frontend visuell einheitlich wirkt.
- Mobile und Tablet-Breakpoints für Unterseiten erweitert: Toolbars, Einstellungsbereiche, App-Center-Zeilen, Energiefluss-Konfiguration und Tabellen stapeln bzw. scrollen touchfreundlich.
- App-Center, SmartHome-Konfiguration, Simulation und RFID-Report erhalten die gemeinsame mobile Navigation über `nw-shell.js`.
- Webcache auf `nexowatt-cache-v200` erhöht.

# 0.7.32 - Responsive Cockpit-Redesign

- LIVE-Dashboard auf das neue responsive Cockpit-Layout umgebaut: linke System-/Liveübersicht, zentraler Energiefluss und rechte Werte-/Schnellzugriffsleiste.
- Energiefluss-Monitor inklusive Schnellsteuerung für optionale Verbraucher/Erzeuger bleibt erhalten und ist auch auf Tablet/Smartphone touchfreundlich nutzbar.
- Rechte Schnellzugriffsleiste mit Tarif-/EMS-, Ladestation- und Lastmanagement-Kacheln ergänzt; bestehende Modal- und Steuerlogik bleibt angebunden.
- Mobile Breakpoints für Smartphone und Tablet ergänzt; KPI-, Wetter-, Advisor- und Schnellzugriffskarten ordnen sich automatisch einspaltig bzw. zweispaltig an.
- Webcache auf `nexowatt-cache-v199` erhöht.

# 0.7.31 - KI-Energieberater / beratende Optimierung

- Neue App-Center-App „KI-Optimierung“ ergänzt.
- Neuer EMS-Runtime-Baustein `AiAdvisorModule` erzeugt beratende Optimierungsvorschläge unter `aiAdvisor.*`.
- LIVE-Dashboard zeigt eine dezente KI-Energieberater-Kachel mit Top-Empfehlung und Details.
- Kategorien und Schwellwerte für Tarif, PV, Speicher, EVCS, Peak/HLZF, Thermik und Systemhinweise sind im App-Center konfigurierbar.
- Wichtig: Im UI-Adapter bleibt die KI advisor-only; es werden keine Geräte geschaltet. Aktive KI-Schaltentscheidungen bleiben für EOS vorbereitet.
- Webcache auf `nexowatt-cache-v198` erhöht.

# 0.7.30

- Atypische Nachkontrolle: Exportbereich in der §19-Kachel ergänzt mit CSV- und PDF-Export.
- Influx-Nachweis: `historie.peakShaving.atypical.*` wird automatisch angelegt, in das gemeinsame Historie-/Influx-Raster geschrieben und zusätzlich werden die Runtime-States `peakShaving.atypical.review.*` historisiert.
- Neue Runtime-Endpunkte: `/api/peakshaving/atypical/review`, `/api/peakshaving/atypical/review.csv` und `/api/peakshaving/atypical/review.pdf`.
- Webcache auf `nexowatt-cache-v197` erhöht.

# 0.7.29

- App-Center Peak-Shaving: Netzbetreiber-/Quellnachweis für Hochlastzeitfenster ergänzt: Netzbetreiber, Gültigkeitsjahr, Quelle/Dokument, Veröffentlichungsdatum, Quell-URL/Ablage und Bemerkung.
- Atypische Nachkontrolle: Neuer §19-Prüfbereich mit Live-Jahreskontrolle und manuellen Jahres-Endwerten aus RLM-/Zählerexport.
- Runtime: `peakShaving.atypical.review.*` führt gemessene P_abs_max- und P_HLZF_max-Werte mit, berechnet Verlagerung in W/%, Schwellen-/Mindestverlagerungsstatus, Bagatellprüfung und JSON-Snapshot.
- Webcache auf `nexowatt-cache-v196` erhöht.

# 0.7.28

- App-Center: Neuer Reiter „Peak-Shaving“ für die Parametrierung der Lastspitzenkappung ergänzt. Installateure können jetzt Normalbetrieb, atypische HLZF-Kappung, Hybrid-Modus oder reines Monitoring wählen.
- Atypische Lastspitzenkappung: Entnahmeebene, Erheblichkeitsschwelle, Referenz-Jahreshöchstlast, Mindestverlagerung, HLZF-Sicherheitsmarge, Feiertage, Brückentage und Hochlastzeitfenster sind nun direkt über die UI einstellbar.
- Runtime: `peakShaving.strategyMode` trennt Standard-, Atypik-, Hybrid- und Monitoring-Betrieb sauber, sodass im Modus „Atypisch“ außerhalb der HLZF kein permanenter Standard-Cap erzwungen wird.
- Webcache auf `nexowatt-cache-v195` erhöht.

# 0.7.27

- EMS/Peak-Shaving: Atypische Lastspitzenkappung für Hochlastzeitfenster ergänzt (`peakShaving.atypical.*`). Der HLZF-Cap wird im aktiven Zeitfenster mit dem bestehenden Peak-Shaving-/GridConstraints-Limit geminimt und über `peakShaving.control.limitW` in CoreLimits, Speicherregelung und EVCS-Budget weitergereicht.
- Neue Diagnose-States unter `peakShaving.atypical.*` zeigen aktives Hochlastzeitfenster, HLZF-Ziellast, Entnahmeebene, Erheblichkeitsschwelle, Mindestverlagerung und bindende Limitquelle.
- App-Center-Konfiguration wird mit deaktivierten Default-Feldern für `peakShaving.atypical` normalisiert; Lizenzlogik bleibt unverändert.

# 0.7.25

- Lizenzseite beschleunigt: `/api/license/info` wird jetzt zuerst direkt über den Adapter-Runtime-Port abgefragt.
- Der Runtime-Fast-Path wartet nicht mehr vorher auf den ioBroker-Admin-Socket zum Port-Lesen.
- Wenn Runtime UUID und Lizenzstatus liefert, werden langsame Admin-Fallbacks übersprungen.
- Reduziert lange Wartezeiten, bis die System-UUID im Lizenzdialog erscheint.
- Keine EMS-/Regellogik geändert.
- Webcache auf `nexowatt-cache-v194` erhöht.

# 0.7.24

- Lizenz-Admin-Fix: Der gespeicherte vollständige Lizenzschlüssel bleibt nach Verlassen/erneutem Öffnen der Adapterseite sichtbar.
- Lizenzseite liest jetzt zuerst den schnellen Runtime-Endpunkt und danach erst Admin/native-Fallbacks; dadurch ist UUID/Status/Schlüssel schneller und stabiler sichtbar.
- Runtime-Endpunkt `/api/license/info` liefert der Admin-Lizenzseite zusätzlich den aktuell konfigurierten Schlüssel, damit das Eingabefeld auch bei Admin-Socket-Problemen wieder befüllt wird.
- Browser-lokaler Cache bleibt als zusätzlicher Fallback aktiv.
- Keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v193` erhöht.

# 0.7.24

- Lizenzseite verbessert: Nach dem Speichern einer Voll-Lizenz bleibt der Lizenzschlüssel beim erneuten Öffnen wieder sichtbar.
- Die Admin-Seite stellt den Schlüssel aus der nativen Adapter-Konfiguration wieder her; falls die Admin-Abfrage kurzzeitig nicht liefert, wird der zuletzt erfolgreich gespeicherte Admin-Wert lokal im Browser wieder angezeigt.
- Der öffentliche Runtime-Endpunkt `/api/license/info` gibt den vollen Lizenzschlüssel weiterhin nicht aus.
- Reine Admin-/Lizenz-UI-Korrektur; keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v193` erhöht.

# 0.7.23

- Lizenz-Aktivierung behoben: Admin-Callbacks unterstützen jetzt beide ioBroker-Varianten `callback(obj)` und `callback(err, obj)`. Dadurch werden Adapter-Objekt, UUID und Lizenzstatus wieder zuverlässig gelesen.
- UUID-Auslesung robuster gemacht: `system.meta.uuid`, `system.config`, State-Werte und verschachtelte UUID-Felder werden rekursiv geprüft.
- Neuer Runtime-Endpunkt `/api/license/save` vor dem Lizenz-Gate: Lizenzschlüssel kann gespeichert und sofort geprüft werden, auch wenn die Admin-Socket-Verbindung im Browser/iframe hängt.
- `/api/license/info` liest die UUID bei Bedarf erneut nach, falls sie beim Start noch leer war.
- Admin-React neu gebaut. Keine EMS-/Regellogik geändert.
- Webcache auf `nexowatt-cache-v192` erhöht.

# 0.7.22

- Lizenzseite korrigiert: UUID-Auslesung bleibt nicht mehr dauerhaft bei „Lade Daten…“ hängen.
- Admin-Verbindung nutzt jetzt Timeouts für Objekt-/State-Abfragen, damit hängende Socket-Callbacks die UI nicht blockieren.
- UUID-Fallbacks erweitert: `system.meta.uuid` Objekt, `system.meta.uuid` State, `system.config` und Adapter-State `license.uuid`.
- Neuer öffentlicher Runtime-Endpunkt `/api/license/info` vor dem Lizenz-Gate, damit die UUID auch bei gesperrter VIS verfügbar ist.
- Admin-React-Bundle neu gebaut.
- Keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v191` erhöht.

# 0.7.21

- Budget-&-Gates-Diagnose stabilisiert: Die Kachel „Prioritäten / Reservierungen“ bleibt dauerhaft sichtbar und verschwindet nicht mehr bei 0-W-Reservierungen.
- Wenn keine aktive Reservierung vorhanden ist, wird ein ruhiger Platzhalter „Aktive Reservierungen: keine“ angezeigt.
- 0-W-Geisterzeilen werden ausgeblendet; echte Verbraucher/Reservierungen zeigen weiterhin Ist-, Reservierungs- und PV-Leistung.
- Reine UI-/Diagnose-Korrektur; keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v190` erhöht.

# 0.7.20

- Heizstab-PV-Auto Akkuschutz korrigiert: Speicherfarm-0-Werte können echte Speicherentladung aus den Basis-Aliasen nicht mehr verdecken. Dadurch erkennt Gate C Akku-Entladung wieder sauber.
- Harte Speicher-/Netzgrenzen wirken dadurch wieder zuverlässig: bei harter Akku-Entladung wird die PV-Auto-Heizstableistung sofort reduziert/abgeworfen.
- Zentrales Restbudget wird im Heizstab zusätzlich gegen das physische NVP-/Speicher-PV-Cap geprüft. Eine alte eigene Heizstab-Reservierung kann damit nicht mehr als verfügbarer PV-Überschuss gelten.
- Gate D/PV-Forecast wird als Step-up-Plausibilität berücksichtigt: neue höhere Stufen werden nur freigegeben, wenn Live-PV/Forecast die Zielstufe plausibel tragen können.
- EVCS-/Lademanagement-Priorität bleibt unverändert; Ladepunkte haben weiterhin Vorrang vor Thermik/Heizstab.
- Webcache auf `nexowatt-cache-v189` erhöht.

# 0.7.19

- Publish-Sicherheits-Hotfix: `package.json` bereinigt und `publish:check`/`prepublishOnly` ergänzt. Der Check prüft vor `npm publish`, ob `package.json` und `io-package.json` gültiges JSON sind und ob ungelöste Git-Konfliktmarker (`<<<<<<<`, `=======`, `>>>>>>>`) in Projektdateien stehen.
- npm-Paketdateiliste bereinigt: `src-admin-tab`-Quellordner wird nicht mehr in das npm-Paket aufgenommen; die gebauten Admin-/VIS-Dateien bleiben enthalten.
- Keine EMS-Regellogik, keine Gates, keine Speicher-/EVCS-/Heizstab-/Tarif-/VIS-Logik geändert.
- Webcache auf `nexowatt-cache-v189` erhöht.

# 0.7.18

- Heizstab-PV-Auto-Hochstufen korrigiert: stale/verzögerte Stage-Read-DPs setzen das EMS-eigene Ziel nicht mehr bei jedem Tick zurück auf die beobachtete niedrigere Stufe.
- Stage-Feedback nutzt nun frische Read-DPs bevorzugt, fällt bei stale Read-DPs aber auf den Write-/State-DP zurück. Dadurch blockieren alte KNX/OpenKNX-Rückmeldungen das Hochfahren nicht mehr.
- EMS-eigene PV-Auto-Stufen reservieren nach dem Schaltbefehl sofort die kommandierte Zielleistung im zentralen Budget, auch wenn der Leistungsmesser noch verzögert nur die alte Stufe zeigt.
- Behebt Fälle, in denen bei mehreren kW PV-/NVP-Überschuss nur Stufe 1 aktiv blieb und nicht auf Stufe 2/3/4 weitergeschaltet wurde.
- Keine Änderungen an Speicherregelung, Lade-/Lastmanagement, Tariflogik, Peakshaving, MultiUse oder Gate-Berechnung.
- Webcache auf `nexowatt-cache-v188` erhöht.

# 0.7.17

- Energiefluss-Monitor nachgeprüft und robuster gemacht: optionale Verbraucher werden jetzt kollisionsarm rechts verteilt und halten Abstand zu PV, EVCS/Ladestation, Batterie, Gebäude und untereinander.
- Bei vielen optionalen Verbrauchern werden die Zusatzkreise stärker skaliert, damit sie responsiv in der Kachel bleiben.
- Reine UI-/VIS-Anpassung; keine EMS-Regellogik geändert.
- Webcache auf `nexowatt-cache-v187` erhöht.

# 0.7.15

- App-Center/Budget-&-Gates-Diagnose sortiert: zentrale Übersicht zuerst, danach Gate A (Netz), Gate A Phasen, Gate A2 (§14a), Gate B (PV), Gate C (Speicher), Gate D (PV-Forecast) und Gate E (Tarif/Negativpreis).
- „Prioritäten / Reservierungen“, Ladebudget und Summary stehen danach als Diagnose-/Verbraucherblöcke.
- Reine UI-/Diagnose-Aufräumung; keine EMS-Regellogik an Speicher, Lade-/Lastmanagement, Heizstab, Peakshaving, MultiUse, Forecast oder Tariflogik geändert.
- Webcache auf `nexowatt-cache-v185` erhöht.

# 0.7.14

- Gate E – Tarif / Negativpreis ergänzt: negative dynamische Preise setzen zentral `ems.budget.tariff.*` und bevorzugen Netzbezug.
- Bei Negativpreis werden Speicher-Netzladen und EVCS-Netzladen freigegeben; tarifbasierte Speicherentladung wird gesperrt.
- Zentrale Budgetkarte zeigt Gate E mit Preis, Negativstatus, Netzbezug bevorzugt, Speicher-/EVCS-Freigabe und PV-Abregel-Empfehlung.
- 0-Einspeisung/PV-Abregelung erhält bei Negativpreis einen Import-Bias, damit PV – sofern technisch steuerbar – zugunsten wirtschaftlichem Netzbezug zurückgenommen werden kann.
- Heizstab und Thermik können in Negativpreisfenstern Gesamtbudget statt reinem PV-Restbudget nutzen; ihre Budget-Reservierung zählt dann nicht als PV-Verbrauch.
- Harte Grenzen bleiben aktiv: Netzanschluss, Phasenlimits, §14a, Peakshaving und Sicherheitslimits werden nicht überstimmt.
- MultiUse und Peakshaving bleiben in ihrer Grundfunktion unverändert.
- Webcache auf `nexowatt-cache-v184` erhöht.

# 0.7.13

- Heizstab-PV-Auto korrigiert: Bei frischem zentralem `ems.budget.remainingPvW` wird Thermik nicht mehr zusätzlich abgezogen, da die zentrale Budget-Schicht Verbraucher nach Priorität bereits berücksichtigt.
- Behebt Fälle, in denen der Heizstab im PV-Auto trotz freiem Gate nicht automatisch startete oder nach manueller Stufe nicht weiter hochschaltete.
- Diagnose erweitert: Debug-JSON zeigt jetzt `pvBudgetFromCentral` und `thermalDeductedW`, damit doppelte Budgetabzüge sofort sichtbar sind.
- Webcache auf `nexowatt-cache-v183` erhöht.

## 0.7.13

- Heizstab-PV-Auto Start-/Hochschaltpfad korrigiert: Wenn die Heizstab-App das frische zentrale `ems.budget.remainingPvW` nutzt, wird `thermalUsedW` nicht mehr erneut lokal abgezogen, weil Thermik/Ladepunkte im zentralen Restbudget bereits nach Priorität berücksichtigt sind.
- Behebt den Fall, dass der Heizstab im PV-Auto trotz PV-Restbudget nicht selbst startet oder nach manuell gesetzter Stufe 1 nicht weiter hochschaltet.
- Legacy-/Fallback-Budgets behalten den lokalen Thermik-Abzug, damit alte NVP-/CM-Pfade weiter geschützt bleiben.
- Keine Änderungen an Speicherregelung, Speicherfarm, Lade-/Lastmanagement, Peakshaving, MultiUse, Thermik-Regelung oder Gate-D-Forecast.
- Webcache auf nexowatt-cache-v183 erhöht.

## 0.7.12

- Heizstab-PV-Auto Startpfad geprüft und robuster gemacht: die PV-Mindestfreigabe nutzt jetzt zusätzlich `ems.budget.pvPowerW` und `derived.core.pv.totalW`, damit PV-Auto nicht blockiert, wenn die zentrale Gate-Schicht PV korrekt sieht, aber der direkte PV-Alias nicht frisch im Heizstabmodul ankommt.
- Heizstab-Istleistung wird im Heizstabmodul jetzt frisch/stale-geprüft gelesen. Alte Consumer-Power-Werte können dadurch keine externe KNX-/Manuell-Erkennung mehr vortäuschen und den PV-Auto-Start blockieren.
- Zentrale Budget-/Reservierungsdiagnose bereinigt: deaktivierte Apps mit 0 W werden nicht mehr als feste Geister-Consumer in `ems.budget.consumersJson` geschrieben; alte/stale Werte deaktivierter Thermik-/Heizstab-Apps fließen nicht mehr in `flexUsedW`.
- Forecast-Gate gegen fehlende Runtime abgesichert, damit die zentrale Gate-Schicht weiterläuft, auch wenn noch kein PV-Forecast-Snapshot vorhanden ist.
- Keine Regeländerungen an Speicherregelung, Speicherfarm, Ladepunktverteilung, Peakshaving, MultiUse oder Forecast-Strategie.
- Webcache auf nexowatt-cache-v182 erhöht.

## 0.7.11

- **Budget-Prioritäten/Reservierungen korrigiert:** Runtime-Reservierungen schreiben jetzt im JSON zusätzlich `usedW`/`pvUsedW`, nicht nur `reserveW`/`pvReserveW`. Dadurch zeigt die App-Center-Karte nicht mehr fälschlich `0 W`, obwohl ein Verbraucher reserviert ist.
- App-Center zeigt in **Prioritäten / Reservierungen** jetzt **Ist**, **Res** und **PV** an und nutzt Reserve-Felder als Fallback.
- `ems.budget.flexUsedW` wird nach Runtime-Reservierungen live in den State- und API-Cache gespiegelt, damit **Zentrale Messbasis → Flexible Lasten** nicht bis zum nächsten Core-Tick bei 0 hängen bleibt.
- Heizstab-Budget-Ownership nach Neustart robuster: Eine noch laufende EMS-/PV-Auto-Stufe kann wieder als eigene Auto-Stufe erkannt und in `ems.budget` reserviert werden, wenn der persistierte Status klar auf Automatik hinweist.
- Externe/manuelle KNX-Schaltungen bleiben geschützt: manuelle/externe Statuswerte werden nicht als Auto-Ownership übernommen.
- Keine Änderungen an Lade-/Lastmanagement, Speicherregelung, Speicherfarm, Peakshaving, MultiUse, Gate D oder der eigentlichen zentralen Core-Gate-Budgetberechnung.
- Webcache auf nexowatt-cache-v181 erhöht.

## 0.7.10

- Hotfix-Rollback für 0.7.9: zentrale Budget-&-Gates-Schicht auf den stabilen 0.7.8-Codepfad zurückgesetzt.
- Experimentelle Schwellwert-Gate-, Thermal- und Core-Diagnoseänderungen aus 0.7.9 entfernt, weil sie die Gate-Aktualisierung in Installationen stören konnten.
- Gegenüber 0.7.8 keine Funktionsänderung an Lade-/Lastmanagement, Speicherregelung, Speicherfarm, Heizstablogik, Peakshaving, MultiUse oder Gate D / PV-Forecast.
- Webcache auf nexowatt-cache-v180 erhöht.

## 0.7.8

- Heizstab-PV-Auto robuster als zentraler Budget-Follower umgesetzt: laufende EMS-eigene Stufen werden als Haltebudget zum zentralen Rest-PV-Budget zurückgerechnet, damit sie bei sauberem NVP nicht nervös abschalten.
- PV-Mindestleistung wirkt jetzt als Start-/Hochschaltgrenze und nicht mehr als harter AUS-Befehl. Bestehende Auto-Stufen werden über Netzbezug- und Speicherentlade-Gates reduziert, manuelle KNX-/Relais-Schaltungen bleiben geschützt.
- Kleine Netz- und Speicher-Schwankungen werden per Hysterese gehalten; Reduzierung erfolgt erst nach einstellbarer Haltezeit, harte Grenzen greifen weiterhin sofort.
- Nur PV-Auto-/Boost-eigene Heizstableistung wird als flexible Last in `ems.budget` reserviert. Externe manuelle Heizstablast zählt als normale Hauslast und bläht das zentrale PV-Budget nicht doppelt auf.
- App-Center Heizstab aufgeräumt: klare Blöcke für **PV-Auto – Budget & Speicher**, **Robustes Schalten** und **Erweitert: harte Schutzgrenzen**.
- Keine Regeländerung an Lade-/Lastmanagement, Speicherregelung, Speicherfarm oder Gate-D-Forecast.

## 0.7.7

- Zentrales **Gate D – PV Forecast** unter `ems.budget.forecast.*` ergänzt.
- Forecast-Gate veröffentlicht jetzt `valid`, `usable`, `confidencePct`, `nowW`, Durchschnittsleistung für 1h/3h, Peaks für 6h/24h sowie Energie-Horizonte für 1h/3h/6h/12h/24h.
- Forecast-Werte liegen zusätzlich im zentralen `ems.budget.snapshot` unter `gates.forecast`, damit Apps und spätere KI-/Prognose-Strategien eine gemeinsame Quelle nutzen können.
- Diagnose im App-Center/Statusbereich um **Gate D – PV Forecast** erweitert.
- Keine Regeländerung an Lade-/Lastmanagement, Speicherregelung, Speicherfarm oder Heizstablogik; das Forecast-Gate ist in dieser Version bewusst nur eine zentrale Informations- und Freigabeschicht.

## 0.7.6

- Zentrale EMS Budget-&-Gates-Schicht eingeführt: `ems.budget.*` läuft dauerhaft im Hintergrund und veröffentlicht PV-Budget, Netzbudget, Speicherladung/-entladung, flexible Lasten und Restbudgets.
- Flexible Verbraucher reservieren Budget jetzt nach Priorität: Ladepunkte/EVCS zuerst, Thermik danach, Heizstab anschließend. Dadurch wird PV-Überschuss nicht mehr von mehreren Apps gleichzeitig doppelt verplant.
- Heizstab-PV-Auto und Thermik-PV-Auto nutzen bevorzugt das zentrale Rest-PV-Budget; ältere NVP-/Lademanagement-Werte bleiben nur als Fallback erhalten.
- Budget-&-Gates-Diagnose im App-Center von „Lademanagement“ auf zentrale EMS-Sicht erweitert, inklusive zentraler Messbasis und Restbudget nach Priorität.
- Lade-/Lastmanagement wurde nur um Budget-Reservierung/Diagnose erweitert; Speicherregelung und Speicherfarm-Verteilung wurden nicht geändert.

## 0.7.5

- Heizstab-PV-Auto unterscheidet jetzt zwischen eigenen Auto-/Boost-Stufen und extern manuell geschalteten KNX-/Relais-Kanälen. Manuelle Kanäle werden beobachtet und nicht mehr durch ein automatisches AUS überschrieben.
- Die PV-Auto-Mindestfreigabe nutzt wieder die tatsächlich gemessene PV-Erzeugung. Rekonstruierte NVP-/Heizstab-Budgetwerte zählen nicht mehr als PV-Erzeugung.
- Wenn die PV-Erzeugung unter die Mindestschwelle fällt, werden nur von der EMS selbst gehaltene Auto-Stufen einmalig abgeworfen; danach bleibt manuelle Schaltbarkeit erhalten.
- Für die Budget-Rekonstruktion wird nur noch EMS-/PV-Auto-eigene Heizstableistung als flexible Last zurückgerechnet. Externe manuelle Heizstableistung zählt als normale Hauslast und bläht das Auto-Budget nicht künstlich auf.
- Heizstab-App-Center aufgeräumt: zentrale PV-Auto-Budgetwerte in einem kompakten Block, 0-/Minus-Einspeise-Testlasten in einem optionalen erweiterten Bereich.
- Lade-/Lastmanagement, Speicherregelung und Speicherfarm-Verteilung wurden nicht geändert.

## 0.7.4

- Heizstab-PV-Auto folgt dem PV-/NVP-Budget jetzt als diskreter Budget-Gate-Verbraucher: sichtbare Einspeisung am NVP, die bereits laufende Heizstableistung und nutzbare Speicherladung oberhalb der Reserve werden gemeinsam für die Stufenzielberechnung genutzt.
- Speicherreserve wird jetzt als fehlende Reserve bilanziert: lädt der Speicher bereits mindestens mit der Reserve, blockiert sie den Heizstab nicht weiter; fehlt Reserve-Ladeleistung, wird sie weiterhin vom Heizstab-Budget zurückgehalten.
- Stufenmodell lernt die reale Heizstableistung aus der Messung der laufenden Stufe. Wenn die Default-Konfiguration z. B. 2 kW pro Stufe annimmt, der reale Heizstab aber 1 kW pro Stufe zieht, kann PV-Auto trotzdem korrekt auf Stufe 2/3 hochfahren.
- Batterie-Richtung wird in der Heizstab-Budgetierung bevorzugt über den signierten `batteryPower` bewertet. Eine aktiv ladende Batterie kann dadurch nicht mehr fälschlich als Speicherentladung den Stufen-Hochlauf blockieren.
- Neue Einstellung im Heizstab-Bereich „Budget-Gates & Lastmanagement“: „Stufe-hoch Wartezeit (s)“. Hochfahren erfolgt maximal eine physische Stufe je Wartezeit; Reduzieren bei dauerhaftem Netzbezug/Speicherentladung bleibt schnell.
- Lade-/Lastmanagement, Speicherregelung und Speicherfarm-Verteilung wurden nicht geändert.

## 0.7.3

- PV-Gate im Lade-/Lastmanagement wird jetzt dauerhaft berechnet und veröffentlicht, auch wenn gerade keine Wallbox im PV-Modus aktiv ist. Dadurch sehen nachgelagerte Apps wie die Heizstabsteuerung den vorhandenen PV-Überschuss zuverlässig.
- Keine Änderung an der EVCS-Budgetverteilung: Das PV-Cap begrenzt Wallboxen weiterhin nur, wenn PV-only/PV-Modus aktiv ist.
- Heizstab-PV-Budget liest stale registrierte Datenpunkte nicht mehr über den rohen Adapter-Cache zurück. Alte Batterie-Entlade-/Netzwerte können dadurch eine echte PV-Freigabe nicht mehr blockieren.

## 0.7.2

- Heizstab-PV-Auto als lesender Budget-Gate-Verbraucher neu aufgebaut: Restbudget und PV-Gate aus dem bestehenden Lade-/Lastmanagement werden nur gelesen und begrenzen die Heizstab-Stufen.
- Keine Änderungen am Lade-/Lastmanagement, an der Speicherregelung oder an der Speicherfarm-Verteilung.
- Heizstab-Stufen bleiben bei kurzen WR-/FEMS-Nachregeltransienten stabil und werden erst nach einstellbarer Netzbezug- oder Speicherentlade-Haltezeit reduziert.
- 0-/Minus-Einspeise-Testlast prüft jetzt nach dem Zuschalten, ob die PV-Erzeugung tatsächlich steigt; bei fehlendem PV-Anstieg wird zurückgeschaltet und erst nach der Retry-Zeit erneut getestet.
- App-Center Heizstab übersichtlicher gegliedert: Speicher-Koordination, Budget-Gates & Lastmanagement sowie 0-Einspeise-Testlast / PV-Nachregelung.

## 0.7.1

- Speicherregelung stabilisiert: NVP-Eigenverbrauchs- und Tarif-Entladung halten im Zielband den letzten aktiven Sollwert, statt kurzzeitig springenden Batterie-Istwerten/Farm-Aggregationen nach unten zu folgen.
- Safety-Clamp nutzt bei aktiver NVP-Regelung zusätzlich den letzten wirksamen Sollwert als Entladebasis. Dadurch werden 0-W- oder Stale-Messaussetzer nicht mehr direkt als Regelgrundlage verwendet.
- Keine Änderungen an Heizstablogik, PV-Überschussladung, Speicherfarm-Verteilung oder 0-Einspeise-Regelung.

## 0.7.0

- Stabile Basis aus der hochgeladenen Version 0.6.262 übernommen.
- Versionssprung auf 0.7.0 für den nächsten Entwicklungsstand.
- Webcache angehoben, damit Browser/App-Center die neue Version zuverlässig neu laden.
- Keine Regeländerungen an Speicher, Speicherfarm, Eigenverbrauch oder Heizstab aus 0.6.267–0.6.270 übernommen.

## 0.6.262
- SmartHome VIS: sensor/status measurement tiles now render their current value large and centered like temperature tiles, including non-temperature Status/Messwerte devices.
- SmartHome Config: sensor devices now expose an Anzeige/Funktionseinheit selector with units °C, W, kW, kWh, Lux, CO₂, V, A, Wh, %, K, m/s, km/h and ppm plus decimal precision.
- SmartHome backend: sensor tiles can fall back to the source datapoint's common.unit when no unit is configured manually. Web cache version bumped.

## 0.6.261

- Heizstab: Globale Mindest-PV-Freigabe für PV-Auto ergänzt. Unterhalb der Schwelle beobachtet die App nur noch und schreibt kein automatisches AUS, damit manuelle KNX-/ioBroker-Schaltungen nicht überschrieben werden.
- Heizstab: 0-/Minus-Einspeise-Logik blockiert normale PV-Überschüsse bei aktivem Speicher-Vorrang nicht mehr; der Speicher-Vorrang sperrt nur zusätzliche Testlast für verdeckte/abgeregelte PV.
- Heizstab: Forecast-Snapshot und aktuelle PV-Leistung werden robuster gelesen (interner Forecast-Snapshot, ps.pvW/Charging-Management-Fallbacks); Diagnose um PV-Auto-Freigabe erweitert.

## 0.6.260

- Historie/Influx-Hotfix: Zusätzliche Erzeuger/Verbraucher aus dem Energiefluss werden beim Speichern im App-Center sofort als kanonische `historie.producers/consumers.*.powerW`-Datenpunkte angelegt und für InfluxDB aktiviert. Kein Adapter-Neustart mehr notwendig.
- Historie/Influx: Optional-Slots werden robuster aus `datapoints.*Power` und alten `vis.flowSlots.*`-Strukturen erkannt.
- Historie/API: Cache wird nach App-Center-Speichern/Import geleert und die Historie-Stati werden sofort einmal geschrieben.
- Speicherfarm-Hotfix aus 0.6.259 bleibt enthalten: Leere direkte Max.-Lade-/Entladefelder bedeuten unbegrenzt und sperren Signed-DP-only-Speicher nicht.

## 0.6.258

- Speicherfarm: Freigabe-/Stör-DPs bleiben optional; leer bedeutet freigegeben. Stale/degraded Messwerte blockieren den Dispatch nicht mehr automatisch, solange keine explizite Sperre/Störung vorliegt.
- Speicherfarm: Istleistungs-DPs sind für die Farm-Verteilung nur noch Mess-/Diagnosewerte; die Sollwertverteilung läuft auch mit Signed-DP-only Systemen weiter.
- Speicherfarm: Maximale Be-/Entladeleistung wird je Speicher als direkte Eingabe gepflegt; dynamische Max-Leistungs-DP-Zuordnungen wurden aus der harten Dispatch-Logik entfernt.
- UI: neuer klarer Bereich „Feste Leistungsgrenzen (direkte Eingabe)“ und separate Vorzeichenoption für Signed-Sollwerte.

## 0.6.257

- Speicherfarm: herstellerneutrale Dispatch-Logik gehärtet; degradierte, stale oder gestörte Speicher werden aus der aktiven Regelung genommen und auf 0 W gesetzt.
- Speicherfarm: feste und dynamische Lade-/Entladegrenzen sowie Verfügbarkeits-, Störungs-, Ladefreigabe- und Entladefreigabe-Datenpunkte je Speicher ergänzt.
- Speicherfarm: Sollwerte werden nur noch auf regelverfügbare Speicher verteilt und auf deren verfügbare Leistung begrenzt; nicht erfüllbare Restleistung wird in der Dispatch-Diagnose ausgewiesen.
- Speicherregelung: Bei aktivem Farmbetrieb kein ungeprüfter Rückfall mehr auf den Einzel-Speicher-Sollwert; dies ist nur noch über eine explizite Expertenfreigabe möglich.
- Speicherfarm-UI/Visualisierung: neue Eingabefelder und Statusanzeige für regelbare Speicher ergänzt.
- PWA/Web-Cache-Version angehoben.

## 0.6.256

- Heizstab: Energiefluss nutzt jetzt die native Heizstab-Leistung (`measuredW` → `appliedW` → `targetW`) statt nur den Verbraucher-DP.
- Heizstab: Schnellsteuerungs-Ring geglättet und gegen kurze 0-W-Readbacks stabilisiert.
- Heizstab: optionale 0-/Minus-Einspeise-Logik für abgeregelte PV ergänzt: Forecast als Startfreigabe, langsames Stufe-hoch, schneller Abwurf bei Netzbezug oder Speicherentladung.
- App Center: neuer Heizstab-Abschnitt „0-Einspeisung / PV-Abregelung nutzen“ mit konservativen Schutzparametern.

## 0.6.255

- FENECON Hybrid nach Kundentest umgestellt: `SetGridActivePower` wird nicht mehr verwendet, weil dieser DP auf der getesteten FENECON/FEMS-Anlage nicht beschreibbar ist.
- Der vorhandene FENECON-Haken im App-Center → Speicher aktiviert jetzt eine FEMS-Prioritätslogik: bei FENECON-PV ab ca. 1 kW schreibt NexoWatt keine externe Batterie-Vorgabe, damit FEMS selbst in den Normalmodus zurückfallen und regeln kann.
- Bei zusätzlicher externer Erzeuger-PV schreibt NexoWatt nur PV-Ladung über den normalen beschreibbaren Sollleistungs-DP und begrenzt den Sollwert auf die erkannte Zusatz-PV.
- Bei wenig/keiner FENECON-PV unter 1 kW übernimmt NexoWatt wieder die normale Speicherregelung für Dynamik-Tarif, Zeit-/Reserve-/LSK-Logiken und erneuert den Sollwert zyklisch innerhalb des FENECON-Watchdogs.
- SpeicherFarm bleibt unverändert; der FENECON-Hybrid-Sondermodus wird bei aktiver Farm weiterhin ignoriert.
- App-Center und Mapping angepasst: kein eigener `FENECON SetGridActivePower`-DP mehr, stattdessen nur der normale `Sollleistung (W)`-DP für die tatsächlich beschreibbare Batterie-Vorgabe.
- PWA/Web-Cache-Version angehoben.

## 0.6.254

- FENECON Hybrid: Der bisherige FENECON-Haken im App-Center → Speicher aktiviert jetzt die neue Netzpunktführung über `ctrlBalancing0/SetGridActivePower` statt der alten direkten AC-Batterie-Sollwertlogik.
- FENECON Netzpunktführung: NexoWatt schreibt ausschließlich neutrale bzw. negative Netzpunkt-Sollwerte (Standard `-100 W`, niemals positive Netzbezugs-Vorgaben). FENECON/FEMS regelt PV, Hausverbrauch und Speicher intern am Netzanschlusspunkt.
- Alte FENECON-Direktlogik abgekoppelt: EVCS-vor-Speicher-Sonderpfade und direkte FENECON-AC-Entladevorgaben werden durch den Haken nicht mehr aktiviert.
- SpeicherFarm bleibt geschützt: Die neue FENECON-Netzpunktführung wird bei aktiver SpeicherFarm ignoriert; bestehende Farm-Fallbacks bleiben unverändert.
- App-Center Speicher: Neuer Datenpunkt `FENECON SetGridActivePower (W)` für `ctrlBalancing0/SetGridActivePower` ergänzt, inklusive Diagnosezuständen für Sollwert, Schreibstatus und Ziel-DP.
- Beim Aktivieren der neuen FENECON-Netzpunktführung wird ein vorhandener direkter Speicher-Sollwert einmalig auf `0 W` freigegeben, damit die alte direkte Vorgabe nicht nachläuft.
- PWA/Web-Cache-Version angehoben.

## 0.6.253

- Heizstab Schnellsteuerung/Manuellbetrieb: Wenn die PV-Regelung im Frontend oder die PV-Auto-Freigabe in der Konfiguration ausgeschaltet ist, schreibt der Adapter keinen physischen AUS-Befehl mehr und übersteuert den Aktor nicht mehr. Manuelle KNX-/ioBroker-Schaltungen bleiben dadurch erhalten.
- Heizstab manuelle Stufen und Boost: Diese Befehle werden jetzt auch bei deaktivierter PV-Regelung zugelassen und als erzwungener Schaltbefehl auf die konfigurierten Stufen-DPs geschrieben.
- Heizstab PV-Auto bleibt streng PV-basiert: Automatikbetrieb schreibt nur bei verfügbarem PV-Überschuss; bei Netzbezug oder Speicherentladung wird sicher auf die nächste niedrigere physische Stufe reduziert bzw. AUS geschrieben – auch bei mehrfach verwendeten Stufen-DPs.
- Heizstab Schnellsteuerung: zusätzlicher Modus „Aus“ ergänzt, damit der Kunde den Heizstab bewusst AUS schreiben kann, ohne die Bedeutung von „PV-Regelung Aus“ zu vermischen.
- PWA/Web-Cache-Version angehoben.

## 0.6.252

- SmartHome Jalousie/Rollladen: Positions-Slider und Aktor-Rückmeldung werden jetzt durchgängig als 0-100 % behandelt.
- SmartHome Level-API: Jalousie-Geräte werden beim Positions-Schreiben jetzt akzeptiert; der Slider schreibt damit wieder korrekt auf den konfigurierten Positions-Write-DP.
- SmartHome Jalousie-Tasten: Auf schreibt 0/false, Ab schreibt 1/true; Stop bleibt ein Trigger. Boolean-Datenpunkte werden automatisch als false/true geschrieben.
- SmartHome Konfiguration: Beim Gerätetyp Jalousie/Rollladen werden Level-Read/Write-Felder sauber angelegt; die DP-Testfunktion und Hinweise zeigen die 0/1-Richtungslogik an.
- PWA/Web-Cache-Version angehoben.

## 0.6.251

- Heizstab PV-Auto korrigiert: Netzbezug wird bei der Überschussrekonstruktion abgezogen, damit laufende Heizstäbe nachts bzw. bei Import nicht künstlich als PV-Überschuss weiterlaufen.
- Heizstab-Stufenausgänge robuster: doppelt verwendete Write-DPs werden pro Tick zusammengefasst, sodass keine widersprüchlichen EIN/AUS-Schreibbefehle mehr auf denselben KNX-/Relais-DP gehen.
- Schnellsteuerung Heizstab: Ringfüllung und Leistungsanzeige nutzen jetzt die konfigurierte Gesamtleistung des Heizstab-Verbunds sowie Max-/Ist-/Sollwerte aus dem Heizstab-Readback.
- io-package-Versionen und News-Blöcke vereinheitlicht.

## 0.6.250
- Heizstab PV-Auto: PV-Überschuss wird jetzt robuster am Netzverknüpfungspunkt rekonstruiert. Bereits laufende Heizstableistung, Speicherladung und Speicherentladung werden berücksichtigt, damit der Heizstab nicht aus Speicherentladung weiterläuft.
- Heizstab/Speicher-Koordination: neue Speicherreserve für PV-Auto ergänzt. Solange der Speicher unter Ziel-SoC liegt, bleibt ein PV-Anteil für die Speicherladung reserviert; überschüssige PV kann parallel in den Heizstab gehen.
- Energiefluss-Schnellsteuerung: Leistungsanzeige im Heizstab-Modal nutzt jetzt denselben Verbraucher-Leistungs-DP wie der Energieflussmonitor und zeigt nicht mehr fälschlich 0 W.
- Live-Schnellsteuerung: Heizstab-Verbraucher werden als eigene Schnellsteuerungs-Kachel angezeigt, sobald die Heizstab-App aktiv und der Verbraucher-Slot quick-control-fähig ist.
- Diagnose erweitert: neue Heizstab-Summary-Werte für Speicherreserve, Speicherladung/-entladung, aktuelle Heizstableistung und Debug-JSON.
- PWA/Web-Cache-Version angehoben.

## 0.6.249
- SpeicherFarm-Regressionsfix: FENECON-EV-Priorität bleibt für Farmen aus, aber Farm-Setups mit gesetztem FENECON-Haken verlieren nicht mehr automatisch die normale Eigenverbrauchs-Entladung.
- SpeicherFarm-Verteilung entschärft: keine harte 0-W-Verteilung mehr durch quadratische SoC-Gewichtung; Online-Speicher oberhalb ihrer SoC-Untergrenze erhalten wieder proportionale Sollwerte.
- SpeicherFarm-Diagnose ergänzt: `storageFarm.lastDispatchJson` zeigt Zielwert, Quelle, SoC-Untergrenze und die verteilten Lade-/Entlade-Sollwerte pro Speicher.
- Charging-Management: Farm-Erkennung für die FENECON-EV-Priorität bool-tolerant gemacht, damit String/Number-Flags die Farm nicht versehentlich in den FENECON-Sonderpfad schieben.
- Web-Cache-Version erhöht.

## 0.6.248
- EVCS/Speicher-Priorität aus 0.6.247 auf den aktiven FENECON-AC-Modus begrenzt. Herkömmliche Speicher behalten damit das bisherige PV-/Speicher-/Wallbox-Verhalten.
- Charging-Management: PV-/Min+PV-Wallboxen lösen die neue Speicher-Vorranglogik nur noch aus, wenn `storage.feneconAcMode` aktiv und keine Speicherfarm eingeschaltet ist.
- Speicher-Regelung: zusätzliches Sicherheits-Gate ergänzt, damit EV-Prioritäts-Caps ohne FENECON-AC-Modus ignoriert werden.
- Speicherfarm: FENECON-Sonderpfad wird bei aktiver Speicherfarm automatisch deaktiviert; dadurch bleibt die Zwei-Speicher-/Farm-Regelung wieder vollständig im bewährten Legacy-Pfad.
- PWA/Web-Cache-Version angehoben.

## 0.6.247
- EVCS/Speicher-Priorität: PV-Überschussladen für PV- und Min+PV-Wallboxen hat jetzt Vorrang vor Speicherladung.
- Charging-Management: Wenn eine PV-limitierte Wallbox Bedarf hat, wird aktuell laufende PV-Speicherladung dem EVCS-PV-Budget zugerechnet. Dadurch kann die Wallbox den Überschuss übernehmen, statt dass der Speicher den Überschuss zuerst wegfängt.
- Speicher-Regelung: PV-Überschuss-Laden des Speichers wird blockiert, solange Ladepunkte den PV-Überschuss noch nutzen können; erst Rest-PV nach Erreichen der Wallbox-/Stationsgrenzen darf wieder in den Speicher.
- Speicher/FENECON: Der AC-Modus bilanziert die Entladung jetzt am Netzverknüpfungspunkt. Bei PV-Überschuss bzw. EVCS-PV-Überschussladen wird die Entladung reduziert oder gestoppt, statt blind der kompletten AC-Last zu folgen.
- Diagnose erweitert: EV-Priorität zeigt jetzt offene Leistung (`pendingW`) und übergebbare Speicherladung (`storageYieldW`); FENECON meldet `nvp-balanced`.
- PWA/Web-Cache-Version angehoben.

## 0.6.246
- SmartHome VIS: Funktions-/Gerätekacheln kompakter und responsiver aufgebaut; kleinere Abstände, schmalere Grid-Spalten und reduzierte Kachelhöhen für bessere Übersicht.
- SmartHome VIS: Temperatur-Kacheln zeigen den Messwert jetzt groß und mittig in der Kachel.
- SmartHome VIS: Temperatur-Sensoren erhalten automatisch die Einheit °C, wenn die Einheit in der Konfiguration fehlt und Name/Funktion als Temperatur erkannt wird.
- PWA/Web-Cache-Version angehoben.

## 0.6.245
- Speicher/FENECON: AC-Sonderlogik neu aufgebaut. Wenn der FENECON-Haken aktiv ist, folgt der Speicher im Eigenverbrauch jetzt der gesamten AC-Last (derived loadTotalW bzw. Fallbacks inkl. EV und Zusatzverbraucher) statt wie der Standardspeicher am NVP zu regeln.
- Speicher/FENECON: Günstiges Tarif-Netzladen behält Vorrang. Tarif-Entladen, EVCS-Assist und PV-Überschuss-Laden greifen im FENECON-AC-Modus nicht mehr parallel dazwischen, damit die Regelung sauber auf einem Pfad bleibt.
- Diagnose erweitert: policyJson enthält jetzt auch die herangezogene FENECON-Lastquelle und den daraus gebildeten Lastfolger-Sollwert.
- PWA/Web-Cache-Version angehoben.

## 0.6.244
- Rollback: Speicher/FENECON wieder auf das Verhalten aus 0.6.240 zurückgesetzt. Die späteren AC-Hybrid-/PV-Formeln aus 0.6.241 bis 0.6.243 sind nicht mehr aktiv.
- Version und PWA/Web-Cache angehoben, damit das Zurückrollen sauber als Update eingespielt werden kann.

## 0.6.243
- Speicher/FENECON: Im AC-Modus wird die Sollleistung jetzt aus der Hybrid-Bilanz `Verbrauch gesamt - PV-Erzeugung - Ziel-Netzbezug` gebildet. Positiver Rest führt zu Entladung, PV-Überschuss zu Ladung.
- Zusätzliche Verbraucher aus dem Energiefluss werden dabei über die abgeleitete Gesamtlast automatisch mit berücksichtigt; als Fallback werden Hauslast + Verbraucher-/EV-Slots verwendet.
- Die FENECON-Sonderlogik übersteuert im AC-Modus jetzt sauber die klassische Eigenverbrauch-/PV-Teilregelung, damit keine widersprüchlichen Sollwerte mehr entstehen.
- PWA/Web-Cache-Version angehoben.

## 0.6.242
- Speicher/FENECON: Die 0.6.241-Direktbilanz wurde zurückgenommen. Im FENECON-AC-Modus regelt der Speicher wieder wie in 0.6.240 am AC-/NVP-Hausverbrauch, damit die Last sauber abgedeckt wird und der Speicher nicht aus dem Netz lädt.
- Speicher/FENECON: PV-Leistung wird nicht mehr in den AC-Sollwert hineingezogen. Überschuss kann dadurch wieder über den FENECON-/DC-Pfad in den Speicher gehen, während der AC-Teil den Hausverbrauch ausregelt.
- 0.6.241-Diagnose-/Bilanzzustände aus der Direktbilanz sind entfernt; der Stand entspricht wieder dem bewährten Verhalten aus 0.6.240.

## 0.6.241
- Speicher/FENECON: Sollwertbildung im FENECON-AC-Modus auf direkte Anlagenbilanz umgestellt. Verwendet jetzt Verbrauch gesamt inkl. interner Zusatzverbraucher minus PV/Erzeuger, damit der Speicher bei PV-Beladung keinen unnötigen Netzbezug mehr zieht.
- Speicher/FENECON: zusätzliche Verbraucher aus den Energiefluss-Slots werden in der Bilanz berücksichtigt; zusätzliche Erzeuger-Slots fließen ebenfalls sauber in die Gegenseite ein.
- Speicher/FENECON: neue Diagnosezustände für Last, Erzeugung, Zusatzverbraucher und berechnete Bilanz ergänzt.

## 0.6.240
- Energiefluss: Die rechte EVCS-/Wallbox-Linie wird jetzt komplett ausgeblendet, solange keine Wallbox wirklich konfiguriert oder gemappt ist. So verschwindet die Geister-Verbindung in Anlagen ohne Wallbox.
- Sobald eine Wallbox vorhanden ist, erscheint die Linie automatisch wieder und verhält sich wie bisher.
- PWA/Web-Cache-Version angehoben.

## 0.6.239
- Energiefluss-Monitor in der Live-Kachel standardmäßig größer dargestellt und nutzt den Platz in der Kachel auf Desktop besser aus.
- Responsive Größenlogik ergänzt: Mit jedem zusätzlichen Verbraucher/Erzeuger skaliert der Energiefluss stufenweise kleiner, damit die Darstellung auf Desktop, Tablet und Smartphone sauber bleibt.
- SVG-Viewport und Statusbreite für den Energiefluss überarbeitet, damit die Live-Ansicht trotz größerer Darstellung stabil und übersichtlich bleibt.
- PWA/Web-Cache-Version angehoben.

## 0.6.238
- Heizstab: Stage-DP-Zuordnung aus dem Energiefluss in die Heizstab-App verschoben; pro Stufe jetzt direkte Write/Read-DP-Pflege im Heizstab-Tab.
- Energiefluss: Verbraucher-Steuerung ist jetzt typabhängig (Allgemein / Wärmepumpe / Heizstab) und blendet nur noch passende Bereiche ein.
- Heizstab-Backend und Quick-Control lesen Stage-DPs jetzt primär aus der Heizstab-App, behalten aber Legacy-Fallbacks aus dem Energiefluss bei.

## 0.6.237
- Heizstab: Endkunden-Schnellsteuerung im Energiefluss-Monitor / in der Steuerungskachel ergänzt. Enthält Regelung Ein/Aus, manuelle Stufen 1/2/3 sowie einen 100%-Boost für 60 Minuten.
- Quick-Control / Live-Kacheln erkennen Heizstab-Verbraucher direkt über den Energiefluss-Slot und zeigen Betriebsart, aktive Stufen und Boost-Status passend an.
- Heizstab-Backend erweitert: User-Override-Modi, Boost-Timer und native Zuordnung für Flow-Quick-Control ohne Zusatz-Script.
- PWA/Web-Cache-Version angehoben.

## 0.6.236
- Neue native Heizstab-App im App-Center: 1..12 Stufen, frei konfigurierbare Stufenleistung sowie Ein-/Aus-Grenzen pro Stufe, direkt verknüpft mit den Verbraucher-Slots im Energiefluss.
- Energiefluss-Verbraucher haben jetzt einen Gerätetyp (Allgemein / Wärmepumpe / Heizstab) und zusätzliche Stage 1..12 Write/Read-Datenpunkte für Relais- oder KNX-Kanäle.
- Thermik-App fachlich getrennt: Fokus auf Wärmepumpe/Klima; Heizstab-Slots werden dort nur noch als Hinweis dargestellt und nicht mehr automatisch geregelt.
- Regelkern verbessert: native Stufen-Hysterese für Heizstäbe, Thermik mit sauberer Band-Hysterese/Budgetierung und Fallback auf Ist-Leistung.
- PWA/Web-Cache-Version angehoben.

## 0.6.235
- Speicher: Neuer FENECON-Modus im App-Center. Aktiviert bei Single-Storage ohne Speicherfarm die Eigenverbrauchs-Entladung auch ohne MultiUse, damit der AC-Teil des Wechselrichters den Hausverbrauch weiter am NVP ausregelt.
- Speicher: FENECON-Modus verwendet standardmäßig 0 W Ziel-Netzbezug, sofern kein eigener Eigenverbrauchs-Zielwert gesetzt ist.
- PWA/Web-Cache-Version angehoben.

## 0.6.234
- Fix: Energiefluss / NVP-Override im Frontend wieder korrekt. /config liefert jetzt Datapoint-Mapping-Flags (und kompatibel die Datapoint-IDs), damit der Live-Energiefluss den gemappten signed NVP-DP wieder als autoritative Quelle verwendet.
- Fix: Grid/PV-Mapping-Prüfung in der VIS verwendet jetzt robuste Mapping-Flags statt leerer /config.datapoints-Fallbacks.

## 0.6.233
- fix(energyflow): signed NVP override (gridPointPower) is now honored strictly by the current mapping; stale mirrored grid values no longer override the active net point in live flow and Historie
- fix(ui): frontend grid resolver now ignores stale NVP values when the override is not mapped and uses the active signed net point immediately for live KPIs

## 0.6.232
- Energiefluss Live-Core-Refresh auf 3s erhöht (statt 5s) für schnellere Nachlese von Netz/PV/Speicher/EVCS-Datenpunkten.
- Basierend auf 0.6.230, ohne weitere Eingriffe in Energiefluss- oder Historienlogik.

## 0.6.229
- PERF(history): doppelte Initial-Ladevorgänge im Frontend werden jetzt zusammengeführt, damit die Historie beim Öffnen nicht mehrfach denselben Request startet.
- PERF(api/history): Kurzzeit-Cache + Inflight-Deduplizierung eingebaut, damit identische Historien-Abfragen nicht mehrfach parallel gegen Influx laufen.
- PERF(history): kWh-Zählerabfragen werden parallelisiert und die exakte Energie-Berechnung verwendet wenn möglich direkt die bereits geladenen Chart-Serien statt dieselben Historien-DPs erneut abzufragen.
- FIX(history): Integrations-Helper bricht am echten Zeitraumende sauber ab und zählt den letzten Randpunkt nicht mehr unnötig als Zusatzintervall.

## 0.6.228
- FIX: Preis-/Netzentgelt-Historie auf Bruttopreislogik umgestellt. Gesamtpreis entspricht jetzt dem angezeigten Live-/Providerpreis; der Basispreis wird aus Gesamtpreis minus Netzentgeltanteil abgeleitet.
- FIX: Tarif-/Netzentgelt-Nachweisbericht verwendet dieselbe Preislogik wie die Historie, damit LIVE, Historie und Report konsistent bleiben.

## 0.6.227
- fix(history): korrigiert überhöhte kWh-Werte in Tag/Woche/Monat/Jahr
- Ursache behoben: exakte Historien-Integration nutzte fälschlich die volle UI-Endzeit statt die tatsächliche Query-Endzeit
- dadurch werden für heutige/teilweise zukünftige Zeiträume keine letzten Leistungswerte mehr bis Tagesende/Monatsende hochintegriert

## 0.6.226

- Live-Status/KPI: Die Autarkie-Kachel wird jetzt konsistent aus Verbrauch und Netzbezug berechnet und folgt damit auch korrekt, wenn nachts der Speicher den Verbrauch deckt oder der Netzanschlusspunkt bei 0 W bleibt.
- VIS-Fallback: Falls ein Netz-Datenpunkt beim ersten Rendern noch nicht angekommen ist, nutzt die Oberfläche nur temporär eine lokale Abschätzung aus PV- und Batterie-Leistung, statt dauerhaft auf einer unpassenden PV-only-Heuristik zu bleiben.
- PWA/Web-Cache-Version angehoben.

## 0.6.225

- Schnell-Inbetriebnahme erweitert: sichere Standard-DPs im Energiefluss werden jetzt per Ein-Klick aus `nexowatt-devices`-Aliasen vorbelegt. Automatisch erkannt werden Netz (Import/Export oder Signed-Fallback), Netz-Online/Heartbeat, PV (bei eindeutiger Quelle) sowie Speicher-SoC/-Leistung (bei eindeutigem ESS/BATTERY). EV und Gebäudeverbrauch bleiben bewusst auf Auto-Summe/Auto-Bilanz, damit Mehrfachgeräte konsistent bleiben.
- Buttontext/Hinweis für die Schnell-Inbetriebnahme aktualisiert.
- PWA/Web-Cache-Version angehoben.

## 0.6.224
- Historie/Energieabgleich: Historienkarten und Energiebalken nutzen jetzt konsequent dieselben kanonischen `historie.*`-Influx-Datenpunkte wie der Live-Bereich.
- Präzise 10-Minuten-Energieintegration für die History-Karten ergänzt, damit Tag/Woche/Monat/Jahr nicht mehr durch grobe Schrittweiten auseinanderlaufen.
- Jahresansicht der Historie auf feinere 1h-Auflösung angehoben; Tag/Woche/Monat lesen wieder im 10-Minuten-Raster.
- Live-Gesamtenergie-Fallbacks (`productionEnergyKwh`, `consumptionEnergyKwh`, `gridEnergyKwh`, `evEnergyKwh`) werden aus der Historie jetzt mit feinerer Integrationsauflösung berechnet.

## 0.6.223
- Energiefluss/Mapping: Der Energiefluss-Monitor unterstützt jetzt auch einen Signed-NVP-Fallback (`gridPointPower`) direkt im Basis-Mapping. Anlagen mit nur einem Netz-Datenpunkt (+ Bezug / - Einspeisung) können damit ohne separate Import-/Export-DPs sauber arbeiten.
- Energiefluss/Live + Historie: Netzbezug und Einspeisung werden bei fehlenden Einzel-DPs automatisch aus dem Signed-NVP-Datenpunkt abgeleitet und für Monitor, Historie und Debug-/Fallback-States sauber weiterverwendet.
- App-Center/UI: Pflichtanzeige für Netz Bezug / Netz Einspeisung berücksichtigt jetzt auch den Signed-Fallback, und doppelte W/kW-Umschalter für denselben Datenpunkt bleiben synchron.

## 0.6.222
- Historie/Tarif: Der Bereich `Preis / Bezug / Kosten` wird jetzt nur noch angezeigt, wenn dynamischer Tarif oder variables Netzentgelt aktuell aktiv sind. Reine Basispreis-Historie ohne aktivierte Tarif-/Netzentgeltfunktion blendet den Abschnitt nicht mehr fälschlich ein.
- Web/PWA: Cache-Version angehoben, damit die korrigierte Historienansicht sicher neu geladen wird.

## 0.6.221
- Charging management audited and hardened.
- Fixed PV-only control so sudden PV drops clamp immediately instead of continuing from a short moving average.
- Removed the extra startup delay after the PV gate opens by allowing the PV start-ready timer to build during the gate delay.
- Scenario-tested Auto, PV, Min+PV, Boost, tariff/goal blocking, no-vehicle and regulation-off behaviour.
- Confirmed that normal EMS regulation no longer toggles the EVCS enable/freigabe datapoint automatically.

## 0.6.220

- charging-management / Regression: Die EVCS-Regelung toggelt die Wallbox-Freigabe nicht mehr automatisch bei Tarif-/PV-Sperren. Auto, PV, Min+PV und Tarif-Sperren bleiben jetzt auf Strom-/Leistungssollwerten, damit die Wallbox nicht mehr an/aus flattert.
- charging-management / Regelung AUS: Auch bei deaktivierter EMS-Regelung wird die Wallbox nicht mehr automatisch über das Enable-DP geschaltet. Stattdessen setzt das EMS den Sollstrom/Sollwert sauber auf 0 und überlässt die eigentliche Freigabe der Wallbox-/Benutzerebene.

## 0.6.219

- charging-management / Tarif: Auto-Zielladen respektiert teure Tarif-Sperren jetzt sauberer. Wenn kein Fahrzeug-SoC verfügbar ist, löst der Forecast das Netzladen nicht mehr vorschnell aus; stattdessen wartet die Logik bis zum echten Latest-Start.
- charging-management / EVCS-Pause: Bei tarifbedingter Netzlade-Sperre wird ein Auto-Ladepunkt ohne PV-Budget jetzt zusätzlich über das Enable-DP pausiert, damit Wallboxen mit trägem oder ignoriertem 0-Sollwert nicht weiterladen. Beim Freigeben wird der Ladepunkt wieder sauber aktiviert.

## 0.6.218

- Historie/Tarif: Neuer Tarif-/Netzentgelt-Nachweis als eigener Ausdruck ergänzt. Der Bericht arbeitet im 15-Minuten-Raster und listet Datum/Uhrzeit, Basispreis, variables Netzentgelt, Gesamtpreis, Netzbezug sowie Basis-/Netzentgelt-/Gesamtkosten zur Gegenprüfung der Stromanbieter-Abrechnung.
- Einstellungen/§14a: Neuer §14a-Ausdruck ergänzt. Der Bericht liest die historisierten Ereignissnapshots aus `para14a.audit.lastJson` und zeigt exakte Zeitstempel, Quelle, Modus, Budget, EVCS-Limit, EV-/Netzleistung und Ergebnis für Nachweiszwecke an.
- UI/Web: Neue Druck-/Nachweis-Buttons in Historie und §14a-Einstellungen ergänzt, gemeinsame Report-Hilfsdateien angelegt und Web-Cache-Version angehoben.


## 0.6.217

- charging-management: Reines PV-Überschussladen hat jetzt eine eigene Start-/Ramp-/Stop-Logik. 3-phasige Wallboxen starten erst, wenn das technische Minimum stabil verfügbar ist, starten dann sauber auf 6 A / ~4,2 kW und rampen im PV-Betrieb weich nach oben.
- charging-management: Laufende PV-only-Sitzungen bekommen eine kurze Mindestlaufzeit und Stop-Entprellung. Kleine kurzfristige Defizite führen dadurch nicht mehr sofort zu An/Aus-Flattern, langsame Wallbox-/Fahrzeug-Hochläufe bleiben stabiler.
- runtime/config: Neue sichere Standardwerte für PV-Start-Stabilität, PV-MinRun, PV-Defizit-Toleranz und sanfte PV-Rampen ergänzt.


## 0.6.216

- Historie: Chart-Initialisierung gehärtet. Die Historie rendert jetzt beim Öffnen wieder automatisch, zieht nach dem ersten Paint ein Re-Render nach und macht bei noch fehlenden Zeitreihen selbstständig einen kurzen Auto-Retry statt erst auf einen Klick zu warten.
- Historie/Tarif: Zusätzliche historisierte Tarif-Provider-States unter `historie.tariff.providerCurrentEurPerKwh` und `historie.tariff.providerAverageEurPerKwh` ergänzt. Außerdem werden die lokalen Tarif-States direkt an die gemeinsame Influx-Historie gebunden, damit der Preisverlauf sauber über die im EMS zugeordneten Tarif-DPs aufgebaut wird.


## 0.6.215

- Historie: Zusätzlichen Preis-/Kostenbereich ergänzt. Wenn dynamischer Tarif oder variables Netzentgelt aktiv sind, zeigt die Historie jetzt den Preisverlauf, den Netzbezug und die daraus berechneten Kosten für Tag, Woche, Monat und Jahr.
- Historie: Neue Preis-Legende ist klickbar, Tooltip lässt sich per Klick außerhalb des Charts oder per ESC schließen, und alle Preis-/Kostenwerte werden mit zwei Nachkommastellen dargestellt.
- Einstellungen: Variables Netzentgelt kann jetzt mit separaten Zuschlägen für ST / NT / HT gepflegt werden; diese Werte fließen in die Preis-Historie und spätere Gegenprüfung der Abrechnung ein.
- Einstellungen/UI: Tarif-/Netzentgelt-Bereich bleibt sichtbar, damit das variable Netzentgelt auch unabhängig vom dynamischen Strompreis sauber konfiguriert werden kann.


## 0.6.214

- charging-management: Initialisierungsfehler `Cannot access 'vehiclePlugged' before initialization` behoben. Der PV-Startup-Hold wird jetzt erst ausgewertet, nachdem der Fahrzeug-/Steckzustand sicher bestimmt wurde.
- charging-management: Dadurch läuft das Modul wieder ohne Fehlerzähler an, und PV-Start-Haltesperren für Wallboxen bleiben funktional erhalten.


## 0.6.213

- Historie: Die Legende unter dem Chart ist jetzt interaktiv. Serien können per Klick direkt im Diagramm ein- und ausgeblendet werden, damit Tages-, Wochen-, Monats- und Jahresansichten besser lesbar bleiben.

- Historie: Tooltip/Marker werden beim Klick außerhalb des Charts wieder geschlossen; zusätzlich werden in Tooltip und Diagramm nur die aktuell sichtbaren Serien berücksichtigt.

- Historie: Neue Kachel `Autarkie` für Tag, Woche, Monat und Jahr ergänzt. Der Wert wird aus Verbrauch und Netzbezug für den gewählten Zeitraum berechnet.

- Web/PWA: Cache-Version angehoben, damit die aktualisierte Historie sicher neu geladen wird.


## 0.6.212

- charging-management: Reiner PV-Überschuss wird jetzt bevorzugt direkt als `PV - Verbrauch ohne EV - Speicherladung` berechnet; Fallback-Rekonstruktion berücksichtigt Batterie-Entladung und überhöht den PV-Cap nicht mehr künstlich.
- charging-management: Kurze PV-Start-Einschwingzeit für Wallboxen/Fahrzeuge ergänzt, damit frische PV-Starts nicht sofort wieder auf 0 W fallen.

## 0.6.211

- Update/Installation: ioBroker wird jetzt per `stopBeforeUpdate` zu einem sauberen Stop vor dem Update angewiesen; zusätzlich ist ein kurzer `stopTimeout` gesetzt, damit der Adapter mit eigenem Webserver geordnet herunterfahren kann.
- Update/Installation: Das lokale `www`-Verzeichnis wird nicht mehr unnötig in die ioBroker-Datenbank hochgeladen (`wwwDontUpload`), weil die VIS direkt aus dem eingebetteten Express-Server ausgeliefert wird. Das reduziert Reibung im GitHub-Updatepfad deutlich.
- Runtime/Shutdown: Der eingebettete HTTP-/SSE-Server schließt beim Entladen jetzt aktiv offene Clients, räumt zusätzliche Timer auf und wartet sauber auf das Server-Close – damit Updates und Neustarts nicht mehr an offenen Verbindungen hängen bleiben.
- Metadaten: GitHub-Repository/Issues/Homepage sowie `extIcon`/`readme` wurden auf die echten NexoWatt-Pfade korrigiert.

## 0.6.210

- Speicherfarm: Die Entladeverteilung priorisiert im Eigenverbrauch jetzt den Speicher mit höherem SoC deutlich stärker. Der jeweils niedrigste SoC wird bei erkennbarer Spreizung gezielt entlastet, sodass ein stärker geladener Speicher die fehlende Leistung übernimmt.
- Speicherfarm: Reagiert ein Speicher auf einen Entlade-Sollwert nicht oder nur stark begrenzt, wird er für die laufende Verteilung automatisch heruntergewichtet und die Leistung auf verfügbare Speicher umgelegt.
- Speicherfarm: Der Übersichts-Zähler `Online x/y` wurde korrigiert und zählt wieder sauber die verfügbaren Speicher statt Doppelzählungen.

## 0.6.209

- EMS/Lademanagement: PV-geführte Wallboxen erhalten jetzt sauber Vorrang vor PV-Speicherladung. Aktive Speicherladung aus PV wird im PV-Budget der Wallboxen wieder freigestellt, damit kleine Hausanlagen die verfügbare PV zuerst an die Ladepunkte geben.
- Speicher-Regelung: PV-Überschussladen des Speichers wird automatisch blockiert, sobald eine PV-geführte Wallbox aktuell durch PV-Mangel begrenzt ist. Dadurch lädt der Speicher keinen relevanten EV-Überschuss mehr weg.
- Diagnose: Die gemeinsame EMS-Laufzeitsicht enthält jetzt einen EV-Prioritäts-Snapshot für Ladepunkte vs. Speicher, damit das Verhalten im Feldtest nachvollziehbar bleibt.

## 0.6.208

- EMS/Lademanagement: PV-Überschussladen nutzt jetzt standardmäßig einen 500-W-Reservepuffer auf dem effektiven PV-Budget. Dadurch bleibt die Überschussladung ruhiger und regelt nicht mehr so hart auf 0 W Netzbezug.
- Runtime-Konfiguration normiert den neuen Charging-Management-Wert `chargingManagement.pvChargeReserveW` automatisch auf 500 W, wenn noch kein Wert gesetzt ist.

## 0.6.207

- Energiefluss: Anzeige mit leichter clientseitiger Hysterese beruhigt – kleine Messwertsprünge und kurze Richtungswechsel flackern in der VIS nicht mehr so stark.
- Energiefluss: Leistungswerte im Monitor werden jetzt durchgängig mit nur noch einer Nachkommastelle angezeigt.
- Web/PWA: Cache-Version angehoben, damit die aktualisierte Energiefluss-Logik sicher geladen wird.

## 0.6.206

- §14a Nachweis-/Audit-Logging nutzt jetzt bewusst die bestehende Historie/Influx-Instanz (standardmäßig `influxdb.0`) statt eine separate §14a-Instanz anzulegen.
- Bereits von NexoWatt automatisch angelegte dedizierte §14a-Influx-Instanzen werden deaktiviert, damit alle Logs sauber auf einer gemeinsamen Historie bleiben.
- Einstellungen → Log / Nachweis: Hinweise und Beschriftungen auf gemeinsame Historie angepasst.
- Web-Cache-Version angehoben.

## 0.6.205
- Einstellungen: Bereich in Seiten aufgeteilt und eine eigene Unterseite `Log / Nachweis` für §14a-Status, Historisierung und Auditdaten ergänzt.
- §14a: Dedizierte InfluxDB-Instanz wird bei Bedarf automatisch bereitgestellt bzw. wiederverwendet; 730-Tage-Retention wird direkt vorbelegt und der Bereitstellungsstatus im Frontend angezeigt.
- Web/PWA: Cache-Version angehoben, damit die neue Einstellungsseite und der Historie-Status zuverlässig geladen werden.

## 0.6.204
- §14a: Neues leichtgewichtiges Nachweis-/Audit-Logging mit Ereignissnapshots unter `para14a.audit.*` und 1-Minuten-Verlauf unter `para14a.trace.*` – optimiert für minimale Laufzeitlast.
- §14a: Erkennt eine Influx-History-Instanz automatisch und aktiviert die Historisierung der Nachweis-States ohne zusätzliche Polling-Last. Für die 2-Jahres-Aufbewahrung bleibt die Retention in Influx separat zu konfigurieren.
- Web/PWA: Cache-Version angehoben, damit die neue §14a-Hinweiskarte im App-Center zuverlässig geladen wird.

## 0.6.203
- SmartHome Config: Neue assistierte Auto-Erkennung über den ioBroker Type-Detector mit Gerätevorschlägen inkl. Quellpfad, gemappten Zuständen und gezielter Übernahme in die SmartHome-Konfiguration.
- SmartHome Config: Der Datenpunkt-Picker kann jetzt zusätzlich die ioBroker-Objektstruktur mit Ordnern, Breadcrumb sowie Start/Zurück browsen und parallel nach ID oder Name suchen.
- Web/PWA: Cache-Version angehoben, damit die neue SmartHome-Erkennung und der DP-Picker zuverlässig geladen werden.

## 0.6.202
- Logik-Editor: Datenpunkt-Auswahl nutzt jetzt zusätzlich die ioBroker-Objektstruktur mit Ordner-Navigation, Breadcrumb, Start/Zurück und paralleler Suche nach ID oder Name.
- Logik-Editor: DP-Picker öffnet bei bereits gesetzten IDs direkt im zugehörigen Elternpfad und erleichtert damit das schnelle Auffinden vorhandener Datenpunkte.
- Web/PWA: Cache-Version angehoben, damit die neue DP-Auswahl zuverlässig geladen wird.

## 0.6.201
- Logik-Editor: Verbindungen lassen sich wieder ohne Löschen eines Blocks trennen – per Rechtsklick auf Leitung oder Zieleingang.
- Logik-Editor: Bausteine aus der Palette können jetzt per Drag & Drop direkt an der gewünschten Position im Arbeitsbereich abgelegt werden.
- Web/PWA: Cache-Version angehoben, damit das Update zuverlässig beim Feldtest ankommt.

## 0.6.200
- EMS/Charging: PV-only stop gate now ignores temporary grid import caused by the active EV load itself; PV surplus control reacts via a short 5s control window while the 5min average remains available for diagnostics.
- Energiefluss / EVCS live inputs are refreshed every 5s and the web cache version was bumped.

## 0.6.199
- Historie/Jahresreport: liest konfigurierte History-Datenpunkte wieder bevorzugt mit automatischem Fallback auf die internen `historie.*` States – alte Verlaufsdaten bleiben damit im Report nutzbar.
- Historie/Jahresreport: kWh-Summen fallen bei 0/zu kleinen Counter-Deltas jetzt auf die Leistungs-Historie zurück; Verbrauch wird zusätzlich über Energiebilanz abgesichert.
- Jahresreport: Restverbrauch (`Sonstiges`) berechnet ohne Batterie-Verluste und wird nicht mehr negativ angezeigt.

## 0.6.198
- Wartung: internes Hilfsskript aus dem Paket entfernt.
- Wartung: Versionsnummer erhöht, damit das Adapter-Update in ioBroker sauber erkannt wird.

## 0.6.197
- EMS/Lademanagement: PV-only Import-Toleranz erhöht (Default `pvAbortImportW` von 200W → 600W) – reduziert unnötige Stop/Start‑Zyklen bei kurzzeitigen Hauslast‑Spitzen/Messrauschen.

## 0.6.196
- EMS/Lademanagement: PV-Überschussladen (PV-only) stabilisiert – bei verzögerten EVCS-Leistungsmesswerten wird zur PV-Überschuss-Rekonstruktion kurzfristig der letzte Sollwert genutzt (verhindert Start/Stop-Hoppen um die ~4,2kW 3-Phasen-Minimalleistung).
- EMS/Lademanagement: Neue Diagnose-States `chargingManagement.control.pvEvcsActualW` / `pvEvcsCmdW` / `pvEvcsUsedW`.

## 0.6.195
- Wartung: Unbenutzte Legacy-Admin/Materialize-Dateien entfernt (index_m.* + templates.json) sowie unnötige/duplizierte Assets (www/admin.png, www/icons/building.png.bak) → kleinere Paketgröße.

## 0.6.194
- Fix: SmartHome Config – ReferenceError **`byId is not defined`** (Szenen/Zeitschaltuhren).
- SmartHome Config: neuer Bereich **Logik‑Uhren** im Reiter **Zeitschaltuhren**
  - Installer kann Zeitfenster (Wochentage + Ein/Aus‑Zeit) definieren.
  - Adapter erzeugt boolean Datenpunkte: **`smarthome.logicClocks.<id>.active`** (für den Logik‑Editor / Flanken‑Auswertung).

## 0.6.193
- SmartHome Zeitschaltuhren: **Jalousie/Rollladen** jetzt auch mit Timer (**AUF/ZU**)
  - im Installer-Konfigurator unter **Zeitschaltuhren**
  - und direkt im SmartHome-Frontend über das **Uhr-Icon** in der Gerätekachel
- SmartHome Config: Timer-Modul listet Geräte jetzt direkt aus der **SmartHome-Konfiguration** (funktioniert auch wenn SmartHome im Adapter noch deaktiviert ist).

## 0.6.192
- SmartHome: **Zeitschaltuhren pro Gerät** ergänzt (Wochentage + EIN/AUS, Dimmer inkl. Level).
- SmartHome: Endkunde kann Zeitschaltuhr **direkt über die Kachel** (Uhr-Icon) einstellen.
- SmartHome Config: neuer **Szenen-Konfigurator** (Adapter führt Szenen aus, inkl. Aktionsliste).

## 0.6.191
- SmartHome-VIS: Gerätekacheln **Premium-Glass Finish**: mehr Tiefe durch **Double-Stroke (inner highlight)** + **dezentes Noise-Grain** (reduziert Banding, wirkt hochwertiger).
- SmartHome-VIS: **Hover/Active** verfeinert (leichte Elevation + sanfterer Press-Effect) – bleibt ruhig und gut lesbar.

## 0.6.190
- SmartHome-VIS: Gerätekacheln: **Titel vollständig lesbarer** – mehr Platz im Header (dynamisches Padding je nach Buttons), **Titel bis 3 Zeilen**, Status bis 2 Zeilen.
- SmartHome-VIS: Grid ist jetzt **adaptiv (auto-fit)** und richtet die Spalten nach der **real verfügbaren Breite** aus (wichtig mit Sidebar) – verhindert zu schmale Kacheln.
- SmartHome-VIS: Tooltip zeigt jetzt immer **vollen Gerätenamen** (Name + Bedienhinweis).

## 0.6.189
- SmartHome-VIS: **Gerätekacheln jetzt einheitlich gleich groß** (keine XL/Spans mehr) → übersichtlicheres Grid.
- SmartHome-VIS: **Lesbarkeit verbessert** (höherer Text-Kontrast, dezenter Header-Scrim, Titel bis 2 Zeilen).
- SmartHome-VIS: RTR-Status kompakter: **Ist/Soll** in der Statuszeile (falls Werte verfügbar).

## 0.6.188
- Fix: **Update-sichere Installer-Konfiguration** – wenn `installer.configJson` nach einem Update leer/reset aussieht, wird automatisch aus dem **0_userdata Backup** wiederhergestellt (DP-Zuordnungen bleiben erhalten).
- Backup: vorherige Backup-Version wird zusätzlich als **backupJsonPrev** gespeichert (zusätzliche Sicherheit bei ungewollten Überschreibungen).

## 0.6.187
- SmartHome Config & VIS: Weitere Raum-/Bereich-Icons ergänzt: **Kinderzimmer**, **Gästezimmer**, **Kaminzimmer**, **Fitness**, **Sauna**, **Werkstatt**, **Technikraum**, **Gartenhaus/Schuppen**, **Carport** (jeweils auch als **3D Varianten** via `3d-...`).
- SmartHome Config: Builder-Library erweitert – neue **Raum-Presets** (Drag&Drop) setzen automatisch **Name + Icon**.

## 0.6.186
- SmartHome Config & VIS: Icon-Bibliothek für **Geschosse/Bereiche** stark erweitert (Etagen-Stack, Keller, Erdgeschoss, Obergeschoss, Dachgeschoss, Garage, Garten/Außenbereich, Terrasse, Pool, Schaltschrank, Server/Netzwerk, Lager, Büro, Waschküche) inkl. **3D Varianten** (`3d-floors`, `3d-basement`, `3d-upper`, `3d-attic`, `3d-garden`, ...).
- SmartHome Config: Standard-Elemente für Geschosse nutzen jetzt die neuen Icons (konsistenter Look im Builder).

## 0.6.185
- SmartHome: **Dynamische Marken-/Modell-Icons** für Geräte ergänzt (Icon-Key z.B. `inv:SMA` oder `wb:Tesla`).
- SmartHome: Neue **3D Icons** ergänzt: **Wechselrichter** (`3d-inverter`) und **Wallbox-Gerät** (`3d-wallbox`).

## 0.6.184
- SmartHome Config & VIS: **Modernes 3D-Icon-Pack erweitert** (PV/Solar, Batterie, Wallbox/Laden, Tür/Fenster/Schloss, Bewegung, Alarm/Sirene, Rauchmelder, Wasser, Lüfter/Klima, Zähler, Schalter/Toggle, Globe/URL).
- SmartHomeConfig: Geräte-Bibliothek zeigt Icon-Keys jetzt als **SVG-Vorschau** (3D Icons direkt sichtbar).

## 0.6.183
- Logik-Editor: **Zurück zur Übersicht** Button ergänzt.
- SmartHome Config & VIS: **Icon-Bibliothek erweitert** (zusätzliche Raum-/Bereich-Icons + neue **3D-Icon-Varianten** per Icon-Key, z.B. `3d-bulb`, `3d-camera`).
- SmartHome VIS: fehlende Icons ergänzt (**Kamera**, **Thermometer**, **Raster**) + Sidebar rendert Icon-Keys als **SVG** (kein "camera"-Text mehr).
- Interne Prototyp-Kommentare bereinigt.

## 0.6.182
- SmartHome-VIS: **Feintuning** – Breadcrumb-Subtitle (zeigt bei Raum-Seiten das zugehörige **Geschoss**), klarere **Raum-Karten** und explizite **Quick-Controls direkt in der Kachel** (Toggle + +/-) für ein app-ähnlicheres Bediengefühl.
- Migration: Erkennung von Legacy **flacher Raum-Navigation** verbessert (funktioniert jetzt auch bei **custom Page-IDs**).

## 0.6.181
- SmartHome-VIS: Sidebar Navigation jetzt **strukturiert**: **Home → Geschoss → Räume** (verschachtelt). Geschosse sind standardmäßig aufgeklappt, damit Räume ohne Extra-Klick sofort auswählbar sind.
- SmartHomeConfig: Button **„Standard-Seiten“** erzeugt jetzt automatisch die **Etagen → Räume** Struktur (statt flacher Raum-Liste).
- Migration: alte, flache Default-Seiten (Home + Räume ohne Etagen) werden in der VIS automatisch auf die neue Etagen-Struktur umgestellt, sobald Geschosse vorhanden sind.

## 0.6.180
- SmartHome-VIS: **Chip-/Filter-Leiste oben rechts entfernt** (Räume/Funktionen/Alle/Favoriten/Textgröße) – Endkunden-UI ist jetzt clean.
- SmartHome-VIS: läuft automatisch im **"Rooms"-Modus** und rendert **Geschoss → Raum → Geräte-Kacheln** wie im Editor (keine versteckten/gespeicherten Filter mehr).

## 0.6.179
- SmartHomeConfig: **Fix für "Speichern" löscht Gebäude-Struktur** – `floors` + `meta` werden jetzt in `/api/smarthome/config` mitpersistiert.
- SmartHome-VIS: Räume können jetzt **nach Geschossen gruppiert** werden (gleiche Hierarchie wie im Editor).
- SmartHome-Builder: Bibliothek **übersichtlicher** (Suche + einklappbare Gruppen) + Drop von Geräte-Templates **im ganzen Arbeitsbereich** möglich.

## 0.6.160
- EMS/Lademanagement: **STALE_METER blockiert standardmäßig nicht mehr** (Hotfix). Dadurch werden Ladepunkte nicht mehr auf 0 gesetzt, wenn der Watchdog fälschlich „veraltet“ meldet.
- EMS/Lademanagement: Neue Policy (intern): `chargingManagement.staleFailsafeMode` = `off|warn|block` (Default: `off`).

## 0.6.161
- EMS/Speicher: **PV‑Reserve Grid‑Charge Block** weniger aggressiv (Fix für „Speicher lädt nicht mehr“ bei niedrigem SoC).
  - `tariffPvReserveMinSocPct` hat jetzt einen **sicheren Default ≥ 20%** (auch wenn Reserve-Min = 0% gesetzt ist).
  - Kapazitäts‑Fallback (wenn keine Batterie‑Kapazität konfiguriert/ermittelbar ist) nutzt eine **größere Schätzung**, damit PV‑Reserve nicht fälschlich bei 10% SoC deckelt.

## 0.6.159
- EMS/Lademanagement: **STALE_METER** nutzt jetzt einen **Device‑Prefix‑Heartbeat** (irgendein State‑Update unter dem Zähler‑Prefix) als Watchdog‑Quelle, um False‑Positives bei stabilen Messwerten zu reduzieren.

## 0.6.158
- EMS/Core: **Engine-Start-Crash behoben** (ReferenceError `gridPointConnectedId` / `gridPointWatchdogId`).
- Zuordnung → Allgemein: **Netzpunkt Connected/Watchdog** ist jetzt wirklich optional und kann sauber gemappt werden, ohne dass der Scheduler stoppt.
- UI: **HTML-Verschachtelung repariert** – die neuen Felder sind jetzt übersichtlich dargestellt.

## 0.6.155
- EMS/Tarif & Netzentgelt: **Netzentgelt (HT/NT) ist jetzt unabhängig vom dynamischen Tarif** – wirkt auch dann, wenn `Dynamischer Zeittarif = AUS`.
- EMS/Tarif: **Statuszeile** zeigt Netzentgelt + Tarif auch bei Tarif AUS (z.B. `Netzentgelt NT | Tarif aus`), damit sofort klar ist, was aktiv ist.
- EMS: Grid‑Freigabe (`gridChargeAllowed`), Entlade‑Freigabe (`dischargeAllowed`) und Ladepark‑Limit berücksichtigen **Netzentgelt** zuverlässig.

## 0.6.143
- EMS/EVCS: **Zielladen nur bei verbundenem Fahrzeug** – wenn kein Fahrzeug steckt (`evcs.active=false`), wird der Sollwert konsequent auf **0 W** gesetzt (verhindert „gecachten“ 11 kW Start beim Einstecken).
- EMS/EVCS: **SoC Freshness** – nach dem Einstecken wartet Zielladen auf eine frische SoC‑Aktualisierung (verhindert Berechnung mit Tage‑altem SoC).
- UI: Neue Diagnose/Hint: `NO_VEHICLE` + Zielladen Status **Fahrzeug nicht verbunden / warte auf SoC**.

## 0.6.142
- EMS/Speicher: **Bugfix Eigenverbrauch-Entladung** – wenn Tarif „günstig“ ist, aber Speicher-Netzladen durch Zeitfenster-Policy („tagsüber“) blockiert ist, darf der Speicher wieder **sauber entladen** (Netzbezug reduzieren).
- EMS/Speicher: **PV‑Reserve Override** – wenn Tarif-Netzladen durch PV‑Reserve/PV‑Forecast blockiert ist (Soll bleibt 0 W), wird Eigenverbrauchs‑Entladung nicht mehr fälschlich gesperrt.
- UI: Service‑Worker Cache‑Version erhöht.

## 0.6.141
- EMS/EVCS: **Tarif als Bonus** – Zeit‑Ziel Laden nutzt Preis‑Forecast (Fallback: Latest‑Start) und übersteuert Tarif‑Netzladesperren nur dann, wenn es sonst nicht bis zur Deadline reicht.
- EMS/EVCS: Neue Diagnose pro Ladepunkt: `goalTariffOverrideReason`.
- Hinweis: Default Policy ist jetzt `forecast` (für Legacy‑Verhalten: `chargingManagement.goalTariffOverrideMode=always` oder `goalTariffOverrideAlways=true`).

## 0.6.140
- EMS/EVCS: **Priorisierung (Start)** – Zeit‑Ziel Laden übersteuert Tarif‑Netzladesperren pro Ladepunkt, damit die Deadline zuverlässig erreicht wird (optional abschaltbar: `chargingManagement.goalTariffOverrideAlways=false`).
- UI (Installer/Diagnose): Im Status „Budget & Gates“ wird im Card **Gesamtbudget** jetzt auch der **Tarif‑Modus (Manuell/Automatik/Aus)** angezeigt.
- UI: Service‑Worker Cache‑Version erhöht (Update wird zuverlässig geladen).

## 0.6.139
- EMS/EVCS: **Failsafe Stale Meter** Fix – redundante Grid‑Power Quellen werden jetzt korrekt behandelt (mindestens eine frische Quelle reicht).
- EMS/EVCS: Neue Diagnose‑States: `chargingManagement.control.staleMeter`, `staleBudget`, `failsafeDetails`.
- UI: Status‑Info zeigt jetzt **Tarif Modus: Manuell**, wenn der Tarif auf manuell steht (sofort sichtbar).

## 0.6.138
- Historie: Jahresreport zeigt jetzt **alle Bereiche auf einer Seite** (Übersicht) – für sofortigen Gesamtüberblick.
- Historie: Reiter bleiben **optional** als Filter, um einzelne Bereiche separat zu betrachten.

## 0.6.137
- Historie: Neuer Jahresreport (Mehrjahres-Tabelle) mit Reitern **Aufsummiert / Erzeuger / Verbraucher / Batterien / Quoten**.
- Historie: Jahresreport öffnet sich direkt aus der Historie über den Button **Jahresreport**.

## 0.6.136
- EMS/EVCS: Zeit‑Ziel Laden – „Fertig um“ jetzt im 15‑Minuten Raster (00/15/30/45)
- EMS/EVCS: Zeit‑Ziel Laden – Wenn die Uhrzeit erreicht ist, wird die Deadline automatisch auf den nächsten Tag fortgeschrieben (tägliche Wiederholung)

## 0.6.135
- EVCS Bericht: Status‑Dot nutzt wieder den Standard‑Live‑Indikator (grün)
- EVCS Bericht: Zurück‑Button ergänzt (zur vorherigen Ansicht)

## 0.6.134
- EVCS Bericht: Tabellendaten werden wieder geladen (Header/Footer‑Wiring) + CSV‑Export Buttons funktionieren wieder

## 0.6.133
- EVCS Bericht (Wallbox Historie): nutzt jetzt den Standard‑Header mit Navigation und wird aus der Historie im gleichen Tab geöffnet (kein extra Browser‑Tab mehr)

## 0.6.132
- Admin/Installer: URL-Liste unter den Buttons entfernt (weniger Verwirrung bei Endkunden).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.131
- SmartHome VIS: Farbkreis/Colorwheel auf High-DPI/iOS korrigiert (Canvas-Rendering).
- SmartHome VIS: Kachel-Bedienung verbessert – Tippen öffnet Panel bei Jalousie + Raumthermostat; Long-Press öffnet Panel bei Detail-Kacheln (sonst Info-Toast).
- SmartHome VIS: Raumthermostat-Popover Layout feiner abgestimmt (zentraler Bereich etwas tiefer für bessere Lesbarkeit).

## 0.6.130
- Historie: Monats-/Jahresansicht – zukünftige Tage/Monate bleiben jetzt **leer (0)** und die Summen-Kacheln werden nicht mehr verfälscht.

## 0.6.129
- EMS/EVCS: Debug‑Anzeige (nur Installer) für **PV‑Überschuss (ohne EVCS)**: *Instant* + *5‑Minuten‑Ø* im Status „Budget & Gates“.

## 0.6.128
- EMS/EVCS: PV‑Überschussladen stabilisiert – PV‑Budget wird jetzt **ohne EVCS‑Eigenverbrauch** berechnet (NVP/Netz + EVCS) + 5‑Minuten‑Mittelwert.

## 0.6.127
- SmartHome VIS: Mobile‑Lesbarkeit verbessert – 1‑Spalten‑Layout unter 420px + Textgrößen‑Umschalter (Kompakt/Normal/Groß)
- SmartHome VIS: Long‑Press Info‑Toast (zeigt den vollen Gerätenamen + Raum/Funktion)

## 0.6.126
- SmartHome VIS: Kachel‑Titel sind auf Smartphones besser lesbar (2‑Zeilen‑Umbruch + Actions als Overlay)
- Lizenz‑Sperrseite: Klarer Hinweis bei abgelaufener Testlizenz (inkl. Ablaufdatum + optionaler System‑UUID)

## 0.6.125
- (Lizenz) Testlizenz (Tage) unterstützt: NW1T-<Tage>-... (Start/Resttage werden update‑sicher gespeichert)
- (Lizenz/Admin) Statusanzeige im Lizenz‑Tab: gültig / gesperrt / Test (Resttage)

## 0.6.124 (2026-02-08)

- Admin/Lizenz: Lizenz-Paket bereinigt.
- Lizenz ist update-sicher: Lizenzschlüssel bleibt in der ioBroker Instanz-Konfiguration erhalten.

## 0.6.123 (2026-02-07)
- Admin/Lizenz: Lizenzseite funktioniert jetzt auch in neueren ioBroker-Admin-Versionen zuverlässig (kein `servConn` erforderlich – socket.io Fallback).
- Admin/Lizenz: UUID-Anzeige im Admin weiter stabilisiert.

## 0.6.122 (2026-02-07)
- Admin/Lizenz: Lizenzseite wird jetzt im **ioBroker-Admin iFrame** geöffnet (servConn verfügbar) – die UUID wird wieder korrekt geladen/angezeigt.
- Admin/Lizenz: Navigation und UUID-Anzeige im Admin weiter stabilisiert.

## 0.6.121 (2026-02-07)
- Admin/Lizenz: Interne Wartung für UUID-gebundene Lizenzbehandlung.

## 0.6.114 (2026-02-03)
- Tarif/Speicher: Netzladen des Speichers ist jetzt **nur** bei günstigem Tarif erlaubt.
- Tarif/Speicher: Ausnahme zur Tages-Sperre – wenn zeitvariables Netzentgelt im **NT** ist, darf auch außerhalb des Zeitfensters geladen werden (weiterhin nur bei günstigem Tarif).
- Tarif/VIS: Status-Text vereinfacht – keine Uhrzeiten mehr; tagsüber wird **„Eigenverbrauchsoptimierung aktiv“** angezeigt.

## 0.6.113 (2026-02-03)
- Tarif/Speicher: Netzladen des Speichers wird jetzt quartalsabhängig zeitlich begrenzt (Q1/Q4: 18:00–06:00, Q2/Q3: 21:00–06:00).
- Tarif/Speicher: Ausnahme bleibt aktiv – wenn zeitvariables Netzentgelt im NT ist, darf der Speicher trotzdem laden.
- Tarif/VIS: Status-Text zeigt bei günstigem Tarif an, wenn Speicher-Netzladen wegen Zeitfenster gesperrt ist.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.112 (2026-02-03)
- SmartHome VIS: Favoriten können jetzt vom Endkunden direkt in der Kachel per Stern ★/☆ umgeschaltet werden (lokal pro Browser, überschreibt optionale Installer-Defaults).
- SmartHome VIS: Favoriten-Filter/Sortierung berücksichtigt Endkunden-Favoriten.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.111 (2026-02-03)
- SmartHome VIS: Favoriten-Chip ist jetzt immer sichtbar (deaktiviert, wenn keine Favoriten gesetzt sind).
- SmartHome VIS: Neuer Chip „★ zuerst“ – Favoriten in Räumen nach oben sortieren (persistiert pro Browser).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.110 (2026-02-03)
- SmartHome Tooltip/Popover: Quick‑Presets (Dimmer: 0/25/50/75/100, Jalousie: 0/50/100).
- SmartHome Tooltip/Popover: Schritt‑Tuning (1/5/10) + +/- Buttons für Dimmer/Jalousie (persistiert pro Browser).
- SmartHome Tooltip/Popover: Schreib‑Feedback (Senden/OK/Fehler) für Slider‑Commit, Presets, +/- und Jalousie‑Tasten.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.109 (2026-02-03)
- SmartHome Tooltip/Popover: Optional „Live‑Vorschau“ für Dimmer/Jalousie (gedrosselt beim Ziehen, finaler Commit beim Loslassen).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.108 (2026-02-03)
- SmartHome Tooltip/Popover: Slider (Dimmer/Jalousie) deutlich touch‑freundlicher (größerer Track/Thumb) + Progress-Fill.
- SmartHome Tooltip/Popover: Live-Wert beim Ziehen (Anzeige) bleibt erhalten, Commit weiterhin erst beim Loslassen.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.107 (2026-02-03)
- SmartHome Tooltip/Popover: Thermostat-Gauge: +/- Buttons unterhalb des Reglers (übersichtlicher, weniger verdeckt).
- SmartHome VIS: Fehlerzustände (DP-Lese/Schreib-Fehler) werden in Kacheln deutlicher hervorgehoben.
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.106 (2026-02-03)
- SmartHome Tooltip/Popover: Thermostat-Gauge korrigiert (spiegelverkehr wie Referenz: Bogen oben) + Gradient-Darstellung gefixt.
- SmartHome Tooltip/Popover: Hintergrund-Scroll wird gesperrt solange ein Tooltip offen ist (kein "Seite rauf/runter sliden" mehr).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.105 (2026-02-03)
- NexoLogic: Neue Regelungs-Bausteine (Heizung): PI-Raumtemperaturregler (Anti‑Windup + zyklisches Update), Sommer/Winter‑Umschalter, Fensterkontakt‑Sperre, Heizkurve (Vorlauf‑Soll) und 2‑Punkt‑Mischer (Impuls AUF/ZU).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.104 (2026-02-03)
- NexoLogic UI: Baustein-Palette als einklappbare Ordner (Kategorien) für mehr Übersicht.
- NexoLogic UI: Schnell-Button „SmartHome‑Config“ (Sprung zurück zur SmartHome‑Konfiguration).
- NexoLogic: Neue Regelungs-Bausteine: Raumtemperaturregler (2‑Punkt), Raumtemperaturregler (P) und PWM (Zeitproportional).
- UI: Service‑Worker Cache‑Version erhöht (Update wird sofort geladen).

## 0.6.103 (2026-02-02)
- NexoLogic: Neue Bausteine: Flanke steigend/fallend/beide, Treppenlicht, Nachlauf, Impulsverlängerer.
- NexoLogic: Zeitprogramm (Wochen-Schedule + optionaler Feiertag-Eingang A; Feiertage standardmäßig wie Sonntag).
- NexoLogic: Zähler-Bausteine: Impulszähler, Up/Down-Zähler, Betriebsstunden.
- NexoLogic: Skalierung/Mapping (Presets 0..255↔0..100%, 0..10V↔0..100%).
- NexoLogic: SmartHome-Szene auslösen (Szene-Auswahl + Trigger-Flanke, optionaler DP-Fallback).
- Backend: NexoLogic Runtime-Engine an Editor-Blocktypen/Parameter angepasst (u. a. dp_in cast, cmp/hyst, clamp-Params, dp_out Throttle mit Pending-Write).
- UI: Service-Worker Cache-Version erhöht, damit Updates sofort sichtbar sind.

## 0.6.102 (2026-02-02)
- NexoLogic: Mehrere Logikseiten (Pages) im Editor inkl. Umbenennen, Duplizieren und Löschen.
- NexoLogic: Jede Logikseite kann aktiviert/deaktiviert werden (Engine ignoriert deaktivierte Seiten).
- NexoLogic UI: Editor-Layout breiter + Board höher.
- NexoLogic UI: Zoom (Buttons + Strg/Cmd + Mausrad) inkl. Reset (100%) und Fit-to-View.
- Backend: Fix beim Speichern der Logik-Konfiguration (DeepMerge), damit „Speichern“ wieder zuverlässig funktioniert.
- UI/Text: Keine Referenzen auf externe Systeme/Editoren in der Oberfläche/Files.

## 0.6.99 (2026-02-01)
- SmartHome VIS: Kopftext und „Zurück zur Live‑Ansicht“ entfernt (Header ist bereits vorhanden).
- SmartHome VIS: Bedien‑Tooltip/Popover (Icon/⋯) für Dimmer, Jalousie und Raumthermostat (RTR):
  - RTR: Halbkreis‑Slider (Drag) für Solltemperatur.
  - Dimmer/Jalousie: großer Slider im Bedienpanel.
- SmartHome VIS: Slider generell größer/Touch‑friendly.
- UI: Service‑Worker Cache-Version erhöht, damit Änderungen im Browser sofort sichtbar sind.

## 0.6.98 (2026-02-01)
- SmartHomeConfig: Icon-Auswahl überarbeitet (kein Überlappen mehr in mehrspaltigen Karten). Benutzerdefinierte Icons/Emoji optional.
- SmartHomeConfig: UI-Begriffe konsistent auf Deutsch gesetzt (u. a. Vorlage, Nur Anzeige, Sollwert min/max, DP-Test: Lesen/Schreiben).
- UI: Service-Worker Cache-Version erhöht, damit die Änderungen im Browser sofort sichtbar sind.

## 0.6.97 (2026-02-01)
- SmartHome VIS: Hintergrund an das Standard-VIS-Design angepasst (kein blaues Panel mehr).
- SmartHome VIS: Raum-Header jetzt mit kleiner Summary (z. B. Temperatur/Luftfeuchte), wenn entsprechende Sensoren vorhanden sind.
- SmartHomeConfig: Kachel-Reihenfolge per Drag&Drop (Handle) sowie über „Reihenfolge“ (Positions-Index) steuerbar.
- Backend: Geräte-Order wird aus der SmartHomeConfig in die SmartHome-VIS übernommen.

## 0.6.96 (2026-02-01)
- SmartHome VIS: Raum-Sektionen (statt leerer Demo-Ansicht) + Kacheln im „Apple Home“-ähnlichen Look (Glassmorphism) inkl. dynamischer Icons (An/Aus).
- SmartHomeConfig: Kachelgröße (S/M/L/XL) auswählbar + Icon-Picker/Vorschau, damit die Einrichtung schneller und konsistenter wird.
- UI: Service-Worker Cache-Version erhöht, damit SmartHome-Updates sofort sichtbar sind.

## 0.6.95 (2026-02-01)
- SmartHome: VIS-Header/Tabs an die Haupt-UI angeglichen (LIVE/HISTORY/EVCS/SMARTHOME) und Empty-State verbessert (klarer Hinweis bei deaktiviertem SmartHome bzw. wenn keine Kacheln konfiguriert sind).
- SmartHomeConfig: Hinweis ergänzt, wenn SmartHome deaktiviert ist (damit klar ist, warum die VIS-Seite leer bleibt).
- Backend: SmartHomeConfig ist jetzt installer-managed und bleibt über Adapter-Neustarts erhalten. Außerdem folgt SmartHome-Aktivierung zuverlässig dem Admin-Instanzschalter.

## 0.6.93 (2026-02-01)
- SmartHomeConfig: Validator-Panel + Fehler-/Warnliste ergänzt. Betroffene Räume/Funktionen/Geräte werden direkt im Editor markiert, damit das Einrichten stabiler wird.
- UI: Service-Worker Cache-Version erhöht, damit Updates zuverlässig im Browser ankommen.

## 0.6.91 (2026-01-31)
- Tarif: PV-Saisonprofil KI ist jetzt immer aktiv (Standard). Manuelle Quartals-Basisfaktoren sind optional (Feintuning) und werden in der UI standardmäßig eingeklappt.
- UI: Service-Worker Cache-Version erhöht, damit Updates zuverlässig im Browser ankommen.

## 0.6.90 (2026-01-31)
- Tarif: KI-Automatik für das PV-Saisonprofil. Wenn aktiv, wird der Saisonfaktor automatisch anhand der PV-Forecast-Stärke angepasst, damit Kunden nichts manuell feinjustieren müssen (manuelle Quartalswerte bleiben verfügbar).

## 0.6.86 (2026-01-30)
- Tarif/Netzentgelt: Standard (ST) hebelt die dynamische Tarif-Logik nicht mehr aus. Nur NT/HT wirken als Overlay (NT gibt Netzladen frei; HT sperrt). Quartale ohne NT/HT können durch Deaktivieren der NT/HT-Fenster (Von=Bis / 00:00–00:00) als 24/7 Standard betrieben werden.

## 0.6.85 (2026-01-30)
- Tarif: Zeitvariables Netzentgelt (HT/NT) unterstützt jetzt ein quartalsbasiertes Zeitraster (Q1..Q4). NT/HT-Zeiten können pro Quartal gesetzt werden; die restliche Zeit gilt als Standard.

## 0.6.84 (2026-01-30)
- UI: In der Tarif-/Optimierungsansicht wird jetzt sichtbar, wenn Speicher-Netzladen bewusst durch die PV‑Reserve (Forecast‑Headroom) geblockt wird (Transparenz statt „Bug“-Eindruck).

## 0.6.83 (2026-01-30)
- Tarif: PV‑Forecast wird im Nacht-/NT‑Netzladen jetzt auch dann berücksichtigt, wenn keine Speicherkapazität (kWh) gemappt ist (konservative Kapazitäts‑Schätzung als Fallback). Dadurch wird der Speicher bei erwarteter PV‑Erzeugung nicht mehr „blind“ auf 100% aus dem Netz geladen.

## 0.6.82 (2026-01-30)
- UI: Eintrag „Lastspitzenkappung“ in den Endkunden-Einstellungen ausgeblendet (Kundenansicht aufgeräumt).

## 0.6.81 (2026-01-30)
- Tarif: Zeitvariables Netzentgelt (HT/NT) als Zusatz in den Dynamik-Tarif Einstellungen (Toggle + Zeitfenster).
- Logik: Im NT-Fenster dürfen EVCS aus dem Netz laden und der Speicher darf gezielt laden. In HT/zwischen läuft der Speicher wieder in der normalen Eigenverbrauchsoptimierung; EVCS Netzladen ist gesperrt (Ziel-Laden kann weiterhin pro Ladepunkt übersteuern).

## 0.6.80 (2026-01-28)
- Performance: chargingManagement tick massiv beschleunigt bei vielen Ladepunkten (z.B. 50+). Lokale setState-Updates werden jetzt dedupliziert/gebündelt und asynchron mit begrenzter Parallelität geschrieben (kein "await setState"-Bottleneck mehr).
- Performance: Lokale Reads nutzen primär den in-memory stateCache (Fallback nur bei Cache-Miss), wodurch DB-Reads pro Tick stark reduziert werden.
- Performance: Noisy Diagnostik-Counter (z.B. idleMs/meterAgeMs/statusAgeMs + debug States) werden automatisch gedrosselt, damit VIS/DB nicht mit Updates geflutet wird.

## 0.6.79 (2026-01-28)
- Performance: DatapointRegistry.upsert cached Unit-Detection/Subscriptions und primed Foreign-States nur einmal (fixes sehr langsame chargingManagement-Ticks bei vielen EVCS/Ladepunkten, z.B. 50 Stationen).
- UI: EVCS/Ladestation Modal öffnet wieder zuverlässig mit einem Klick (pointerdown-Handling, damit Klicks bei häufigen SSE-Re-Renders nicht „verloren“ gehen).

## 0.6.78 (2026-01-28)
- Chore: Automatisches Version-Bumping hinzugefügt (scripts/bump-version.js). Optionaler Git pre-commit Hook (.githooks) erhöht die Patch-Version bei jedem Commit mit echten Änderungen automatisch.

## 0.6.77 (Simulation v0.4.x)
- Simulation: angepasst an nexowatt-sim v0.4.x (Szenario-Katalog + Start/Stop/Reset direkt in der Simulation-UI).
- Simulation: Sim-Instanz kann beim Aktivieren automatisch eingeschaltet werden (common.enabled=true) und wird beim Deaktivieren optional wieder zurückgesetzt.
- Simulation: Backup/Restore zusätzlicher VIS-Settings für reproduzierbare Tests (z.B. dynamicTariff, tariffMode, storagePower).

## 0.6.76 (EVCS Report Fix)
- EVCS Report/Abrechnung: kWh-Berechnung korrigiert, wenn Historie-Buckets lückenhaft sind (z.B. 10‑Minuten Logging bei 2‑Minuten Aggregation). kWh pro Tag entspricht jetzt wieder den Influx/Historie-Werten (keine Faktor‑5 Unterzählung mehr).

## 0.6.75 (Simulation/Admin + Historie)
- Admin: Neuer Reiter "Simulation" in den Instanzeinstellungen (öffnet Simulation-Steuerung per Link /adapter/nexowatt-ui/simulation.html?instance=<INSTANZ>).
- Simulation: 1-Klick Aktivieren/Deaktivieren inkl. Backup/Restore der App-Center Konfiguration + automatischem DP-Mapping für nexowatt-sim (Grid/PV/Speicher/Tarif/EVCS).
- Historie: Dunkler OpenEMS-ähnlicher Stapel-Chart (optional), SoC rechts 0..100% (0 unten, 100 oben), Tagesansicht baut sich progressiv auf (kein leerer Rest des Tages), kWh-Kacheln bevorzugen Counter-Differenzen (exakt) statt kW-Integration.
- Speicher: Tarif-Netzladen stabilisiert (Anti-Ping-Pong) durch Headroom-Berechnung ohne Rückkopplung.

## 0.6.74 (EMS/Tarif Auto‑KI)
- Backend: Automatik/Forecast: Die „günstig“-Schwelle (min+Band) wird am wirksamen Durchschnittspreis (Ø) gekappt. Ergebnis: Speicher lädt im Auto‑Tarifmodus nicht mehr bei Preisen > Ø.
- Backend: „Nächstes günstiges Fenster“ (naechstesGuensigVon/Bis) nutzt nun dieselbe effektive Schwelle wie die Entscheidung (Forecast/Status sind konsistent).
- Optional (Expert‑Patch): `tariff.autoCheapCapToAvg=false` deaktiviert das Kappen.

## 0.6.73
- UI: EVCS/Ladestation Modal – mobile responsive improvements (smaller gauge, safe-area padding, better scrolling)

## 0.6.72 (EMS/Tarif + App-Center)
- Backend: Tarif-Netzladen nutzt jetzt eine PV‑Reserve (Forecast‑basiertes Headroom). Ergebnis: Wenn PV‑Erzeugung zu erwarten ist, wird der Speicher im günstigen Tarif-Fenster nicht mehr automatisch bis 100% aus dem Netz vollgeladen, sondern bis zu einem dynamischen SoC‑Cap (abhängig von Forecast + Kapazität).
- App‑Center: Kapazität (kWh) im Single‑Speicher ist wieder sauber nutzbar (Eingabefeld sichtbar, Help-Text gestapelt).

## 0.6.71 (EMS/Storage)
- Backend: NVP-Balancing Deadband in der Speicherregelung korrigiert (Eigenverbrauch/Tarif). Kleine Entlade-Sollwerte werden nicht mehr durch das allgemeine 100W-Zero-Band auf 0 gesetzt → weniger Rest-Netzbezug bei aktivem Entladen.
- Backend: Tarif-NVP-Regelung übernimmt standardmäßig die Eigenverbrauch-Zielwerte (selfTargetGridImportW/selfImportThresholdW), sofern keine tarif-spezifischen Werte gesetzt sind.

## 0.6.70 (UI/Tarif Forecast)
- UI: Preis-Forecast Tooltip öffnet jetzt auch per Klick auf die gesamte Tarif-/Optimierungskachel (wie bei der Ladestation).
- UI: EMS-Steuerung der Optimierungskachel liegt nun auf dem Badge "EMS" (Button), damit der Kachel-Klick für Forecast frei ist.
- UI: Chart-Linie geglättet (Auto-Aggregation von 15‑Minuten Slots auf 60‑Minuten für bessere Lesbarkeit).
- UI: Farbliche Segmentierung (günstig/neutral/teuer) über valide Schwellenwerte oder Auto-Quantile-Fallback.
- UI: Browser-Standard-Tooltip (title) am 📈-Icon entfernt (kein Doppelklick mehr nötig auf Touch-Geräten).
- UI: Service-Worker Cache-Version erhöht, damit Updates zuverlässig im Browser ankommen.

## 0.6.69 (UI/Tarif)
- UI: Tooltip in der Tarif-/Optimierungskachel (📈) zeigt den Preisverlauf "heute" als Chart (Forecast).
- UI: Tooltip-Positionierung/Anzeige korrigiert; Service-Worker Cache-Version erhöht.

## 0.6.59 (Mobile/UI/Weather)
- UI: Status-KPIs auf iPhone/kleinen Displays sauber responsiv (stabile 2-Spalten-Kacheln), Schnellsteuerung als 1-Spalte.
- UI: KPI-Zeilen ueberlaufsicher; Gesamtenergien werden automatisch in kWh/MWh/GWh formatiert.
- Wetter: Kachel wird nur angezeigt, wenn Wetterdaten wirklich verfuegbar sind; zusaetzliche kompakte "Morgen"-Zeile.
- Backend: Open-Meteo Daily-Forecast (Morgen) -> neue States: weatherTomorrowMinC/MaxC/PrecipPct/Code/Text.
- Backend: Gesamtenergie-States werden bei Neuinstallation mit 0 initialisiert (keine (null)-Anzeige).

## 0.6.58 (Energiegesamtwerte)
- Gesamtenergie-States (PV/Verbrauch/Netz/EV/CO2 etc.) als eigene Adapter-States; Influx-Logging vorbereitet.
- UI: Anzeige der Gesamtenergien ueber dedizierte Keys (nicht mehr ueber externe EMS-Adapter notwendig).

## 0.6.55 (Admin UI)
- Admin: Legacy EMS-/Admin-Konfigurationsreiter entfernt (EMS/Datenpunkte/§14a/Historie/Ladepunkte werden ausschließlich im App-Center konfiguriert).
- Admin: Diagnose-Einstellungen bleiben verfügbar (Diagnose aktiv, Log-Level, Log-/State-Intervalle, JSON-Länge, Diagnose-States schreiben).
- Admin: Entfernt: Leistungseinheit, "Tarif jetzt" und "Erweiterte Reiter anzeigen".

## 0.6.47 (Hotfix)
- App-Center (installer.configJson) ist Source-of-Truth für installer-verwaltete Konfigbereiche (datapoints/settings/vis/emsApps/…). Admin-Reste beeinflussen EMS/Energiefluss/Tarif nicht mehr.
- UI: Historie Tooltip-Ausrichtung verbessert + doppelte SSE-Verbindung entfernt.

## 0.6.41 (EMS/Tarif)
- Fix: Speicherregelung wird bei aktivem dynamischem Tarif wieder automatisch aktiviert (Auto-Enable), damit Be-/Entladung im Farm-/Einzelspeicher nicht stehen bleibt.

## 0.6.43
- Fix: Historie im Speicherfarm-Modus nutzt Farm-Gesamtwerte für Laden/Entladen/SoC (SoC wieder sichtbar).

## 0.6.38 (Speicherfarm/PV)
- Speicherfarm: PV-Leistung (DC) wird automatisch aus `nexowatt-devices` (aliases.r.pvPower) übernommen, wenn im Farm-Storage kein PV-Datenpunkt gemappt ist. Dadurch wird die PV-Summe im Farm-Modus vollständig (z.B. zwei Hybrid-Systeme → Summe statt nur ein Wert).

## 0.6.37 (EMS/Tarif)
- Tarifregelung: SoC-basierte Ladehysterese im "günstig"-Fenster. Laden startet nur bei SoC <= 98% und stoppt bei SoC >= 100% (dann 0 W / Speicher ruht solange günstig). Verhindert Dauer-Ladeanforderungen bei vollem Speicher.

## 0.6.34 (UI/EMS)
- Energiefluss: Gebäudeverbrauch kann jetzt aus NVP (Bezug/Einspeisung) + PV‑Summe + Speicher‑Laden/Entladen abgeleitet werden (Fallback, wenn kein Hauszähler gemappt ist).
- PV‑Summe (Auto): Wenn kein PV‑Datenpunkt gemappt ist, wird PV aus `nexowatt-devices` (Kategorie `PV_INVERTER`, `aliases.r.power`) summiert.
- Speicherfarm: DC‑PV‑Summe (`storageFarm.totalPvPowerW`) wird im Farm‑Modus zur PV‑Summe addiert (für abgeleitete Gebäude‑Last & PV‑Anzeige).
- Derived‑States: Zusätzliche Diagnose‑States für PV (AC/DC/Total) und Inputs/Qualität.

## 0.6.32 (UI/EMS)
- Speicherfarm: Online/Offline-Erkennung über Device-Connected/Offline-Signale + Heartbeat-Zeitstempel. SoC/Leistung haben keinen UI-Timeout mehr (letzter Wert bleibt sichtbar, solange das Gerät online ist).

## 0.6.28 (UI)
- Historie (Tag): SoC-Achse startet jetzt auf der kW-0-Linie (0% auf der Mittellinie, 100% oben) – SoC nutzt nur den oberen Chartbereich.

## 0.6.26 (UI)
- Historie (Tag): Achsen optisch überarbeitet (mehr Top‑Padding, Achsentitel kW/% oberhalb der Skalen, keine „gestapelten“ Eck‑Labels, bessere Lesbarkeit).

## 0.6.23 (UI/EMS)
- Speicherfarm: Energiefluss nutzt im Farm‑Modus konsequent die Farm‑Summen (SoC/Charge/Discharge) auch wenn Einzel‑Datenpunkte gemappt sind.
- Energiefluss (Farm‑Modus): Batterie‑Richtung/Anzeige basiert auf dem dominanten Netto‑Fluss (Entladen−Laden bzw. Laden−Entladen) – verhindert Fehlanzeige bei Erhaltungsladung einzelner Speicher.
- PWA: Cache-Version erhöht (sicherer Frontend‑Reload nach Update).

## 0.6.22 (UI/EMS)
- Speicherfarm: Robustere Auswertung der Istwerte (Signed / Laden / Entladen) inkl. Parsing von numerischen Strings (z.B. „4,62 kW“) und kW→W‑Konvertierung anhand der DP‑Unit.
- Energiefluss (Farm‑Modus): Anzeige nutzt SoC‑Durchschnitt (Ø) statt Median; DC‑PV‑Farm‑Summe wird im Farm‑Modus zur PV‑Erzeugung addiert.
- Energiefluss: Speicherfarm‑Aktivierung wird zusätzlich über `storageFarm.enabled` erkannt (robuster bei Config/Hot‑Reload).

## 0.6.7 (UI)
- LIVE: Schnellsteuerung – Thermik-Kachel zeigt jetzt ein Icon (visuell konsistent zu den anderen Kacheln).

## 0.6.5 (UI)
- App-Center: Thermik – Eingabefelder/Selects nutzen jetzt das einheitliche Dark-Theme (optisch konsistent zu anderen App-Center Seiten).
- LIVE: Quick-Control Modal – Layout überarbeitet (Gauge rechts, Boost unten), responsiv ohne Überlappungen.

## 0.6.3 (UI)
- App-Center: Thermik-Tab wieder sichtbar (Fix: falscher Config-Ref `config.*` → `currentConfig.*`).
- LIVE: Thermik-Schnellsteuerung wird jetzt bereits angezeigt, wenn die Thermik-App **installiert** ist (auch wenn „Aktiv“ aus ist) – passend zur Logik der anderen Schnellsteuerungs-Kacheln.
- LIVE: Energiefluss – optionale Verbraucher/Erzeuger-Slots sind jetzt klickbar, sobald sie QC/Steuerung unterstützen (öffnet Quick-Control wie bei der Ladestation).

## 0.6.2 (UI)
- LIVE: Thermik/Verbraucher – pro steuerbarem Verbraucher‑Slot wird automatisch eine Schnellsteuerungs‑Kachel erzeugt (öffnet die Schnellsteuerung/Quick‑Control), sobald die Thermik‑App aktiv ist.
- App‑Center: Thermik – Geräte‑Tabelle/Parameter je Slot ist jetzt sauber beschriftet und in verständliche Gruppen gegliedert (Variante, Schwellwerte, Timing, Boost, Setpoint/Leistung/SG‑Ready).

## 0.5.94 (EMS)
- EMS: Speicher – maxChargeW/maxDischargeW sind jetzt standardmäßig **unbegrenzt** (0 = kein Software‑Clamp). Dadurch wird die Entlade-/Ladeleistung nicht mehr künstlich auf 5 kW begrenzt, sofern der Nutzer kein Limit setzen will.
- EMS: Ladepark – „Boost“ überschreibt jetzt die Tarif‑Sperre und ignoriert das Tarif‑Budget‑Limit (Boost = bewusst „jetzt laden“). Nur harte Caps (z.B. §14a, Phasen-/Netzlimits, Stationsgruppen) begrenzen weiterhin.
- EMS: §14a – ohne Aktiv‑Signal wird §14a jetzt **standardmäßig als inaktiv** behandelt. Zusätzlich neues Experten‑Flag „Ohne Aktiv‑Signal als aktiv behandeln“ für installationsspezifische Fallbacks.

## 0.5.93 (EMS)
- EMS: Tarif-Speicherentladung korrigiert: Die in der VIS eingestellte Speicher-Leistung begrenzt nur noch das Tarif-Laden (Netzladen im günstigen Fenster). Die Entladung regelt am Netzverknüpfungspunkt (NVP) und wird nicht mehr durch diesen Nutzerwert gedeckelt (nur maxDischargeW wirkt).
- UI: Tarif-Statusmeldungen vereinfacht ("bis NVP≈0" entfernt).

## 0.5.90 (UI)
- LIVE: Schnellsteuerungs-Kacheln (Schwellwerte/Relais/BHKW/Generator) werden automatisch ausgeblendet, wenn die entsprechende App im App‑Center deaktiviert ist (nicht installiert oder „Aktiv: Aus“).
- LIVE: Relais-Kachel – Zähler/Status-Anzeige korrigiert.
- PWA: Cache-Version erhöht.

## 0.5.89 (UI)
- UI: Energiefluss-Monitor zeigt Leistungswerte jetzt immer in kW (statt Watt) – inkl. optionaler Verbraucher/Erzeuger.
- PWA: Cache-Version erhöht.

## 0.5.88 (Admin UI)
- Admin: Erweiterte Konfigurations-Reiter standardmäßig ausgeblendet (Datenpunkte/§14a/EMS*/Historie/Ladepunkte).
- Admin: Neuer Schalter in „Allgemein“ → „Erweiterte Reiter anzeigen“ zum temporären Einblenden.
- Safety: Inhalte der ausgeblendeten Reiter bleiben zusätzlich per Guard/Gating blockiert (auch wenn ein Reiter z. B. über gespeicherte UI-Auswahl / Direktaufruf angesprungen wird).

## 0.5.86 (Hotfix)
- App‑Center: „Speicherfarm“ (MultiUse Speicher) ist jetzt vollständig über das App‑Center nutzbar (Installieren/Aktivieren + Konfiguration).
- Backend: emsApps‑Normalisierung & Legacy‑Flag‑Mapping korrigiert (u.a. IDs **peak**/**storagefarm**) → Apps werden nach Speichern/Neustart zuverlässig aktiviert.
- PWA: Cache‑Version erhöht.

## 0.5.85 (Hotfix)
- App‑Center: Datensicherung (Export/Import) im Reiter „Status“.
  - Export erzeugt JSON mit kompletter Installer‑Konfiguration (inkl. Datenpunkt‑Zuordnungen).
  - Import stellt Konfiguration wieder her und startet EMS neu.
  - Wiederherstellung aus `0_userdata.0` per Button.
- Automatisches Backup: Bei jedem „Speichern“ wird zusätzlich ein Backup in `0_userdata.0.nexowattVis.backupJson` geschrieben (überlebt Deinstallation/Neuinstallation).
- PWA: Cache‑Version erhöht.

## 0.5.84 (Hotfix)
- Energiefluss: Erzeugungs-Flussrichtung ist jetzt fest (PV/Erzeuger/BHKW/Generator laufen immer **zum Gebäude**; kein Richtungswechsel mehr durch Vorzeichen-Jitter um 0W).

## 0.5.83 (Hotfix)
- App‑Center (BHKW/Generator): Options‑Checkboxes korrigiert (keine Überlappungen mehr). Checkbox‑Styling wird jetzt korrekt am **Input** angewendet, das Label bleibt flexibel.
- App‑Center (BHKW/Generator): kleine Layout‑Politur für die kompakte Optionen‑Zeile (bessere Ausrichtung/Lesbarkeit).

## 0.5.82 (Hotfix)
- OCPP Auto-Zuordnung: Leistung (W) bevorzugt jetzt **meterValues.Power_Active_Import** (statt z.B. lastTransactionConsumption).
- OCPP Auto-Zuordnung: Energie (kWh) bevorzugt jetzt **meterValues.Energy_Active_Import_Register**.
- OCPP Scoring: lastTransactionConsumption wird für Power/Energy stark abgewertet.

## 0.5.81 (Hotfix)
- UI: Energiefluss – BHKW/Generator werden jetzt auf dem **unteren linken Außenring** platziert (sauberer Kreis / keine „Innen“-Überlappungen).
- UI: Energiefluss – BHKW/Generator in **Speicher-Grün** (Ring + Flow-Linie), sichtbar nur bei konfiguriertem Leistungs‑Datenpunkt (W).
- App‑Center: BHKW/Generator – Konfigurationskarten nutzen die verfügbare Breite (Grid ohne leere Spalten) → bessere Lesbarkeit.
- App‑Center: BHKW/Generator – Feld‑Hinweise werden unter den Eingaben angezeigt (kein gequetschtes/überlappendes Layout mehr).

## 0.5.80 (Hotfix)
- Fix (OCPP): Auto-Erkennung unterstützt jetzt das Standard-Pfadlayout des ioBroker OCPP-Adapters (`ocpp.<inst>.<chargePointId>.<connectorNo>...`).
- Fix (OCPP): Heuristik – Connector **0 (Main)** wird bei vorhandenen nummerierten Konnektoren ignoriert (kein doppelter Ladepunkt), Online/Availability-IDs werden aus Main an die Ports vererbt.
- Improve (OCPP): Scoring bevorzugt "Import"-Leistung/Energie (typische OCPP-State-Namen: `Power_Active_Import`, `Energy_Active_Import_Register`).

## 0.5.79 (Hotfix)
- App‑Center: Reiter **BHKW** und **Generator** auf das neue NexoWatt‑Design umgestellt (Config‑Cards statt Legacy‑Layout).
- App‑Center: In BHKW/Generator können Datenpunkte jetzt **wie in den anderen Reitern** über „Auswählen…“ gesucht/zugeordnet werden (inkl. Live‑Badge/Validierung).
- Energiefluss: BHKW/Generator werden angezeigt, sobald **Leistungs‑Datenpunkt (W)** gesetzt ist (Start/Stop bleibt optional für reine Visualisierung).
- PWA: Cache‑Version erhöht.

## 0.5.78 (Hotfix)
- App-Center: **OCPP Auto-Erkennung** im Reiter „Ladepunkte“ (Button „Automatische Erkennung (OCPP)“)
  - erkennt Chargepoints/Connectoren aus ioBroker-OCPP-States,
  - setzt `evcsCount` automatisch,
  - legt `evcsList` inkl. Datenpunkt-Zuordnungen (Power/Status/Online/Setpoints) vor.
- App-Center: Button „Suche Datenpunkte (OCPP)“ – füllt nur **leere** Felder in bestehenden Ladepunkten automatisch.
- Backend: neuer Endpoint **`/api/ocpp/discover`** (Discovery + Mapping-Vorschläge).
- PWA: Cache-Version erhöht.


## 0.5.77 (Hotfix)
- UI: Energiefluss – BHKW & Generator werden links unten zwischen Netz und Batterie dargestellt (nur sichtbar, wenn im App‑Center konfiguriert inkl. Leistungs‑Datenpunkt).
- UI: Energiefluss – Summenleistung über alle aktivierten BHKW/Generator‑Geräte.
- PWA: Cache‑Version erhöht, damit Clients die neue VIS zuverlässig laden.

## 0.5.76 (Hotfix)
- Fix: Energiefluss-Statuszeile zeigt **keinen Platzhalter** mehr ("Optimierung: —") – die Zeile erscheint nur, wenn es eine sinnvolle Meldung gibt.
- Fix: TarifVis Local-States (`tarif.statusText`, `tarif.state`) werden in der UI **auch ohne Admin-Datenpunktmapping** sauber synchronisiert.

## 0.5.75 (Hotfix)
- Fix: Energiefluss – Erzeuger nur im oberen linken Bereich (unterer Bereich bleibt frei für Generator/BHKW).
- Fix: Energiefluss – Erzeuger-Kreise gleiche Größe wie Verbraucher.
- Fix: Energiefluss – Erzeuger-Flussrichtung (Animation) zeigt zum Gebäude/PV (kein invertierter Flow mehr).

## 0.5.74 (Hotfix)
- Fix: TarifVis Status-Text – `tarifStateTxt` korrekt gesetzt (keine Warnungen in `tick()` mehr).
- Fix: Charging-Management – `chargingManagement.wallboxes.*.charging` wird immer als **boolean** geschrieben (kein Type-Warn-Spam mehr).
- UI: Energiefluss – Erzeuger-Positionierung gespiegelt zu Verbrauchern → sauberer Kreis/gleichmäßigere Abstände.

## 0.5.61 (Phase 6.0.1)
- EVCS: Übersicht skaliert auf bis zu **50 Ladepunkte** – Kachelansicht mit Leistung/SoC/Status.
- EVCS: Klick auf Kachel öffnet einen **Tooltip‑Dialog pro Ladepunkt** (alle Details/Settings: Modus, Ziel‑Laden, Aktiv/Regelung, RFID, Station/Boost).
- Fix: Zeit‑Ziel‑Laden – **Uhrzeit‑Picker stabilisiert** (keine unbedienbaren „Focus‑Drops“ durch Live‑Updates).
- App‑Center/Admin: `evcsCount` Limit auf **50** erhöht.


## 0.5.60 (Phase 6.0)
- EMS (Lademanagement): **Smarte Ziel‑Strategie** für Zeit‑Ziel‑Laden
  - nutzt Tarif‑Freigabe (falls vorhanden) weiterhin als Standard‑Schutz vor unerwünschtem Netzladen,
  - **übersteuert** die Tarif‑Sperre pro Ladepunkt bei knappen Deadlines (Restzeit/Dringlichkeit), damit ein Ziel zuverlässig erreicht werden kann,
  - erlaubt in klar „günstigen“ Preisphasen ein moderates **Vorladen** (Cap‑Erweiterung), um spätere teure Phasen zu entlasten.
- App‑Center: neue globale Auswahl **„Ziel‑Strategie (Zeit‑Ziel Laden)“** im Reiter „Ladepunkte“ (Standard/Smart).
- EMS: neuer Diagnose-State je Ladepunkt: **goalTariffOverride**.

## 0.5.59 (Phase 5.9)
- EMS: **Zeit‑Ziel‑Laden (Depot-/Deadline‑Laden)** je Ladepunkt (goalEnabled/goalTargetSocPct/goalFinishTs/goalBatteryKwh) inkl. berechneter Diagnose‑States (goalActive/remaining/required/desired/shortfall/status).
- EMS: Priorisierung in der Verteilung: **boost > Ziel‑Laden > charging > waiting**, Round‑Robin greift nicht für Ziel‑Laden.
- VIS: EVCS‑Seite + Ladepunkt‑Dialog: Endkunden‑UI für Ziel‑Laden (Toggle‑Buttons + Ziel‑SoC + Fertig‑Uhrzeit + optional kWh).
- Backend: /api/set (scope=ems) akzeptiert Ziel‑Laden Keys (evcs.X.goalEnabled/goalTargetSocPct/goalFinishTs/goalBatteryKwh); UI-State‑Prime erweitert.
- Web: neue `.nw-input` Styles für kompakte Eingabefelder.

## 0.5.59 (Phase 5.8)
- VIS: Schalter-UI modernisiert – Toggle-Buttons (An/Aus) statt Checkboxen (Settings + Modals + Ladepunkte), im NexoWatt-Stil.
- EVCS: optionaler Datenpunkt **Fahrzeug-SoC (%)** im App-Center ergänzt.
- EVCS: Fahrzeug-SoC wird – sofern gemappt – in der Ladepunkt-Übersicht und im Ladepunkt-Dialog angezeigt.

## 0.5.54 (2026-01-05)

## 0.5.57 (Phase 5.6)
- App-Center: neuer Reiter „Netzlimits“ (Grid-Constraints) für RLM/0‑Einspeisung inkl. PV/WR-Setpoint‑Zuordnung
- App-Center: Tabs werden abhängig von installierten Apps ein-/ausgeblendet (Thermik/Schwellwert/Relais/Netzlimits/§14a/EVCS)

  - App-Center: Energiefluss/Verbraucher – Steuerung um SG‑Ready (2 Relais) erweitert (Write/Read + Invert).
  - App-Center: Thermik-App unterstützt neuen Regeltyp **SG‑Ready** (Estimated Power + Boost), inkl. Warnhinweis wenn SG‑Ready DPs fehlen.
  - Backend: Quick-Control (/api/set, scope=flow) unterstützt SG‑Ready-Schalten (Relais A/B). QC-Read liefert optional SG‑Ready Status.
  - EMS: Thermik-Modul kann SG‑Ready ansteuern (Relais A/B + optional Enable) und verwendet robuste Fallbacks für Leistungsabschätzung.

## 0.5.56
* (Phase 5.5) Neue App: Relaissteuerung (manuelle Relais / generische Ausgänge) inkl. Installateur-Zuordnung und Endkunden-Bedienung (optional pro Ausgang).
* VIS: Relais-Kachel + Dialog, Statusabfrage und Schalt-/Wertschreiben.
* App-Center: neuer Tab „Relais“ + Validierung für ReadId/WriteId.

## 0.5.51 (2026-01-04)
- Phase 5.0: Energiefluss-Layout Feinschliff
  - Erzeuger (max. 5) links angeordnet (gelb) für sauberes, ruhiges Bild.
  - Verbraucher rechts als Halbkreis mit Versatz (größere Kreise, blau) – weniger „wild“, besser lesbar.
  - Web: Cache-Version erhöht (Service Worker), damit Browser-Assets zuverlässig aktualisieren.

## 0.5.50 (2026-01-04)
- Phase 4.9: Energiefluss-Layout: optionale Verbraucher rechts im Bogen, Erzeuger oben.
- Admin: Tab "Energiefluss" umbenannt in "NexoWatt EMS".
- VIS: Installer/App-Center Button wieder in den Einstellungen verfügbar.

## 0.5.46 (2026-01-04)
- Phase 4.5: VIS – Schnellsteuerung erweitert um **Betriebsmodus** und **Regelung an/aus** für thermische Verbraucher (endkundentauglich).
- Backend: /api/set (scope=flow) unterstützt mode + regEnabled (lokale States), inkl. Reset von Boost/Manual-Hold.
- Backend: /api/flow/qc/read liefert optional thermal-Infos (cfg/user/effective) für UI.
- EMS: Thermische Steuerung berücksichtigt User-Overrides (mode/regEnabled) je Slot und veröffentlicht Diagnose-States (user/effective).
- Web: Cache-Version erhöht (Service Worker), damit Browser-Assets sauber aktualisieren.

## 0.5.40 (2026-01-04)
- Phase 3.11: Energiefluss – Sub-Reiter + Schnellsteuerung für optionale Kreise
  - App-Center: Energiefluss-Setup mit Unterreitern (Basis/Verbraucher/Erzeuger/Optionen) für übersichtliche Einrichtung.
  - Optionale Kreise: Pro Slot zusätzliche Schnellsteuerungs-Zuordnung (Schalten + Sollwert) inkl. optionalem Readback.
  - Dashboard: Optionale Verbraucher/Erzeuger-Kreise werden klickbar, sobald Schnellsteuerung gemappt ist (Modal mit Ein/Aus & Sollwert).
  - VIS Cache: Service-Worker Cache-Bump (v17) für zuverlässige Aktualisierung.

## 0.5.37 (2026-01-04)
- Phase 3.8: Installer-UX Fixes (Netzpunkt / Layout / Cache)
  - Zuordnung: „Netzpunkt-Messung (Import+ / Export-)“ in „Allgemein“ sauber dargestellt (lange Labels umbrechen, kein Overflow der DP-Eingabe).
  - UI: `.nw-config-field-row`/Label-Layout robuster (Wrap/Min-Width), damit DP-Zuordnungen in schmaleren Karten stabil bleiben.
  - VIS Cache: Service-Worker Cache-Bump (v15) für zuverlässige Aktualisierung.

## 0.5.36 (2026-01-04)
- Phase 3.7: Messung/Flows & Ladepunkt-Stabilität
  - Zuordnung: Netzpunkt-Messung (Import+ / Export-) in „Allgemein“ (global für alle Logiken).
  - Energiefluss: zusätzliche Datenpunkte für Batterie Laden/Entladen (storageChargePower/storageDischargePower) + sauberer Fallback.
  - Lademanagement: Stale-Handling für wallboxnahe Messwerte entschärft (event-driven Updates) – keine unnötige Offline-/Control-Sperre mehr.
  - Diagnose: Stale-Flags bleiben sichtbar, beeinflussen aber nicht mehr automatisch die Online-Logik.

## 0.5.35 (2026-01-04)
- Phase 3.6: Station-first & Budget-Transparenz
  - Ladepunkte: Stationen & Ports als verschachtelte Kacheln (Station → Ports) für schnellere Einrichtung (AC/DC).
  - Stationen: Port hinzufügen direkt pro Station, optional Station-Reihenfolge anpassbar.
  - Status: neue „Budget & Gates“ Übersicht (Netz/Phasen/§14a/PV/Speicher) zur Diagnose des Ladebudgets.
  - Admin: zusätzliche Direktseite `appcenter.html` (öffnet das App‑Center automatisch über den Instanz‑Port).

## 0.5.34 (2026-01-04)
- Phase 3.5: Tarife + Live-Kennzahlen + Installer-UX
  - App-Center: Zuordnungskacheln werden nur für installierte Apps angezeigt (weniger Verwirrung beim Setup).
  - Zuordnung: neue Live-Kachel-Datenpunkte (kWh/CO₂/Status) für die unteren Dashboard-Kacheln; optional (Fallback über Historie/Influx möglich).
  - Dynamische Tarife: Netzladung wird bei "neutral"/"unbekannt" nicht mehr pauschal blockiert (nur "teuer" sperrt Netzladen).
  - App-Center: Validierungs-Funktionen sauber in den globalen Scope gezogen (stabile Ausführung, keine Rekursion).
  - Begriffe: "Connector" in der Oberfläche durch "Ladepunkt/Port" ersetzt.

## 0.5.33 (2026-01-03)
- Phase 3.4: Stationsgruppen & harte Limits (Load-Balancing)
  - Harte Stations-Caps: gemeinsames Limit pro Station/Gruppe wirkt zuverlässig über alle Connectors.
  - Diagnose: neue Stationsgruppen-Diagnose im EMS App-Center (Cap, Used, Remaining, Binding, Connectors).
  - Reason-Codes: spezifischer (Netzimport/Phasenlimit/§14a/Stationslimit/User-Limit) für schnellere Fehlersuche.

## 0.5.32 (2026-01-03)
- Phase 3.3: Diagnose & Validierung
  - Installer: Datenpunkt-Validierung (Existenz + Freshness) mit Badge pro Zuordnung (`/api/object/validate`).
  - Status: Ladepunkte-Diagnose im EMS App-Center (`/api/ems/charging/diagnostics`).
  - Lademanagement: Freshness-Checks pro Ladepunkt (Messwert/Status) + sicheres Failover bei stale Daten (Reason `STALE_METER`).
  - VIS Cache: Service-Worker Cache-Bump (verlässliche UI-Updates).

## 0.5.31 (2026-01-03)
- Phase 3.2: Lademanagement + UI/Installer-UX
  - Ladepunkte: stabile Sortierung + Up/Down-Reihenfolge im App-Center (wird auch im Algorithmus als Tie‑Break genutzt).
  - Zuordnung: Apps und Datenpunkt‑Zuordnung als Kacheln im NexoWatt Design.
  - Datenpunkt-Browser: NexoWatt Dialog, Breadcrumb, „Zurück“ + Root, keine Emoji-Icons.
  - API: Objektbaum-Endpunkt auf `/api/object/tree` vereinheitlicht.
  - Code: Branding-Aufräumen (keine Plattform-Nennung in Code-Kommentaren).

## 0.5.29 (2026-01-03)
- Phase 2: EMS App-Center
  - App-Center: Installieren/Aktivieren von EMS-Apps (State `emsApps`) mit Rückwärtskompatibilität zu `enable*` Flags.
  - App-Center UI: Tabs (Apps / Zuordnung / Ladepunkte / Status) + Live-Diagnose.
  - Ladepunkte/Stationsgruppen: Grund-Konfiguration im App-Center (`settingsConfig.evcsCount`, `settingsConfig.evcsList`, `settingsConfig.stationGroups`) inkl. Datenpunkt-Auswahl über Objektbrowser.
  - API: `/api/installer/config` erweitert (u.a. `emsApps`, `settingsConfig`, `gridConstraints`, `diagnostics`) und übernimmt Änderungen direkt in die Runtime.
  - Neu: `/api/ems/status` (Tick/Module/Fehler) für Installateur-Statusansicht.

## 0.5.28 (2026-01-03)
- Installer (Beta): neue EMS-App-/Installer-Seite unter `/ems-apps.html`.
  - Apps als Module: Aktivieren/Deaktivieren der Kern-Logiken (Peak-Shaving, Speicherregelung, Lademanagement, Grid-Constraints, §14a).
  - Zentrale Anlagenparameter (z.B. Netzanschlussleistung) + Basis-Datenpunkt-Zuordnung.
- API: `/api/installer/config` (lesen/schreiben + optional EMS-Neustart) und `/api/object/tree` (Objektbaum) für komfortable Datenpunkt-Auswahl.
- Admin-Tab: Auswahlseite „VIS öffnen“ / „EMS Apps öffnen“.
- Fix: Tarif-Modul – unbeabsichtigter Debug-Reset im Tick entfernt.

## 0.5.23 (Hotfix – Dynamischer Tarif: Dezimal-Komma)
## 0.5.27 (2026-01-03)
- Phase 1: Stabilisierung (Tarif-Modul Fixes, Entfernen externer Referenzen, kleinere Robustheits-Updates)

- Fix Dynamischer Tarif (VIS): Zahlenwerte aus VIS-Inputs werden jetzt robust auch mit deutschem Dezimal-Komma (z.B. „0,40“) geparst.
  - Betroffen: v.a. manueller Strompreis (Schwellwert), sowie generell numerische Tarif-Einstellungen.
  - Dadurch greift „Laden bei günstig / Entladen bei teuer“ zuverlässig.

## 0.5.16 (Versionstand 5 – Peak‑Shaving Grenzwert zentral)

- Admin: Peak‑Shaving „Max. Import (W)“ entfernt. Grenzwert wird zentral aus „EMS → Netzanschlussleistung“ übernommen.
- Peak‑Shaving: Grenzwertquelle preferiert EMS‑Limit; Legacy‑Fallback über `peakShaving.maxPowerW` bleibt für alte Installationen erhalten.
- Charging‑Management (Gate A): nutzt primär EMS‑Limit (Netzanschlussleistung); Legacy‑Fallback nur, wenn EMS‑Limit nicht gesetzt ist.
- Grid‑Constraints (RLM): nutzt für die Berechnung des finalen Import‑Caps das zentrale EMS‑Limit (Legacy‑Fallback weiterhin möglich).

## 0.5.12 (Versionstand 5 – LSK: Mittelwertfenster + Update‑Schwelle)

## 0.5.13

- Fix: Eigenverbrauch-Entladung verwendet für die Netzbezug-Regelung den NVP-Rohwert (verhindert Restbezug bei geglätteter Netzleistung).
- Fix: Eigenverbrauch-Entladung nutzt Ziel+Schwellwert als Deadband (kleiner Restbezug statt Flattern).
- UI/Admin: Optional/Expert-Felder in EMS-Reitern werden korrekt nur im Admin-Expertenmodus angezeigt (expertMode).

- LSK‑Reserve‑Nachladung (Netz‑Refill) nutzt nun ein langes gleitendes Mittelwertfenster (Default **120 s**) und eine Update‑Schwelle (Default **500 W**) für deutlich weniger Sollwert‑Sprünge.
- Sicherheits‑Clamp bleibt aktiv: RAW‑Headroom (Import‑Spikes) reduziert den Nachlade‑Sollwert sofort.
- Admin: neue **Experten‑Parameter** für LSK‑Refill (Mittelwert‑Fenster / Update‑Schwelle).

## 0.5.11 (Versionstand 5 – NVP Durchschnittswerte / stabilere Regelung)
- EMS: Interne Netzleistung wird nun zentral als geglätteter Wert `ems.gridPowerW` (EMA) bereitgestellt. Zusätzlich wird `ems.gridPowerRawW` (roh) veröffentlicht.
  - Dadurch nutzen *alle* EMS-Logiken standardmäßig einen stabileren NVP (weniger „Springen“).
  - `grid.powerW` ist nun bewusst *gefiltert*; RAW bleibt über `grid.powerRawW` verfügbar.
- Speicher-Regelung: LSK-Refill („Reserve über Netz nachladen“) nutzt die **Durchschnittsdifferenz** (Headroom aus geglättetem Import) und clamp't zusätzlich mit RAW-Headroom (Sicherheit bei Import-Spikes).
- Speicher-Regelung: Zusätzliche Deadband-/Hold-Logik für LSK-Refill, um kleine Aufwärts-Korrekturen zu unterdrücken (weniger Setpoint-Flattern).
- Grid-Constraints: überschreibt `grid.powerW` nicht mehr; nutzt stattdessen Fallback-Key `gc.gridPowerW` und bevorzugt den global gefilterten NVP.

## 0.5.10 (Versionstand 5 – LSK-Refill Glättung / weniger Setpoint-Flattern)
- Fix Speicher-Regelung: LSK-„Reserve über Netz nachladen (Headroom)“ nutzt jetzt einen Headroom-Filter („attack fast / release slow“). Dadurch werden Sollwert-Sprünge bei schwankendem Netzbezug deutlich reduziert, ohne Sicherheitsreaktion bei steigender Last zu verlieren.
- Diagnose: Zusätzliche States `speicher.regelung.lskHeadroomW` und `speicher.regelung.lskHeadroomFilteredW` zur Sichtbarkeit/Fehlersuche.

## 0.5.9 (Versionstand 5 – LSK-Refill Fix + Admin Experten-Optionalfelder)
- Fix Speicher-Regelung: LSK-„Reserve über Netz nachladen (Headroom)“ wird nicht mehr durch Tarif-Freigabe blockiert; weiterhin strikt innerhalb des Peak-Shaving-Limits (Import) und bis LSK-Max-SoC.
- Diagnose: Wenn LSK-Refill gewünscht ist, aber kein Peak-Grenzwert/kein Headroom vorhanden ist, wird ein aussagekräftiger Grund in `speicher.regelung.grund` gesetzt.
- Admin UX: Alle als „optional“ gekennzeichneten Felder werden im Admin nur noch im Expertenmodus angezeigt (übersichtlicher).
- Defaults harmonisiert: `storage.reserveEnabled` default = AUS, `storage.reserveTargetSocPct` default = 25.

## 0.5.3 (Versionstand 5 – Speicherfarm Rollen-/Rechtefix)
- Wichtig: Speicherfarm-Konfiguration (Speicher hinzufügen, DP-Zuordnung, Gruppen) ist jetzt ausschließlich im ioBroker-Admin (Installer/Admin) möglich.
- VIS: Speicherfarm-Tab zeigt nur noch Übersicht/Status (read-only) und keine editierbaren DP-Felder mehr.
- Backend: /api/set scope=storageFarm wird blockiert (403), um Änderungen aus der VIS zu verhindern.
- Neu: storageFarm.storagesStatusJson (abgeleitet, ohne DP-IDs) für saubere Endkunden-Ansicht.
- PWA: Service-Worker Cache-Version auf v9 erhöht.

## 0.5.2 (Versionstand 5 – Speicherfarm Admin-UI)
- Admin: neuer Tab „EMS – Speicherfarm“ (nur sichtbar bei aktivierter Speicherfarm) inkl. Tabelle zur Zuordnung der Speicher-Datenpunkte (ähnlich Ladepunkte).
- Adapter: Admin-Konfiguration wird beim Start nach storageFarm.* gespiegelt (mode/configJson/groupsJson), damit VIS/UI und Summenbildung konsistent sind.
- Timer: Farm-Intervall über storageFarm.schedulerIntervalMs (läuft nur wenn Speicherfarm aktiv).
- Cleanup: Speicherfarm-Timer wird onUnload sauber beendet.

## 0.5.1 (Versionstand 5 – Hotfix)
- Fix Speicherfarm: storageFarm.* lokale States werden nun zuverlässig abonniert (namespace.storageFarm.*) und mit Defaults initialisiert. Dadurch bleiben Werte/Tabellen nach Reload/Restart sichtbar.
- PWA: Service-Worker Cache-Version auf v8 erhöht, damit Clients das Update sicher laden.

## 0.5.0 (Versionstand 5)
- VIS: Anmelde-/Login-Bereich (Admin/Installer) entfernt (Frontend + API). Schreibzugriffe erfolgen ohne VIS-eigenes Login.
- EMS: Speicherfarm-Grundfunktion ergänzt: Admin-Schalter (EMS) + neuer Reiter "Speicherfarm" im Frontend inkl. Tabelle zur Anlage mehrerer Speicher und Summenwerte (Ø SoC, Lade-/Entladeleistung).

## 0.4.125
- Admin Feinschliff: Netzanschlussleistung als zentraler Anlagenparameter in EMS verschoben; §14a zeigt nur noch Hinweis.

## 0.4.124
- Admin: §14a tab cleanup (remove unused legacy installer fields)

## 0.4.123

- §14a EnWG: Admin‑UI erweitert (Modus Direkt/EMS, optionales Aktiv‑Signal, optionale EMS‑Sollwert‑DP, Verbraucher‑Tabelle).
- EMS: Pmin,14a/GZF‑Berechnung (inkl. Faktor für WP/Klima > 11kW) und EVCS‑Caps in Charging‑Management.

## 0.4.122

- Rollback: Lizenzpflicht entfernt (Adapter startet ohne Lizenz).
- Admin-Aufräumen + ioBroker-Login/Write-Schutz unverändert.

## 0.4.117 (2025-12-30)
- RC: Admin aufgeräumt – SmartHome-Tabs (vorbereitet + Räume/Geräte) sind jetzt standardmäßig ausgeblendet, damit Installateure nicht verwirrt werden.
- EVCS: Pro Ladepunkt werden EMS-Hinweise/Fehler direkt angezeigt (z.B. „Setpoint fehlt“, „offline“, „Budget/Netzlimit“, „Lastspitzenkappung aktiv“).
- EVCS: Boost-Button wird automatisch deaktiviert, wenn allowBoost=false (außer wenn Boost gerade aktiv ist → dann bleibt „Abbrechen“ möglich).
- PWA: Service-Worker Cache-Version auf v7 erhöht, damit UI-Updates zuverlässig geladen werden.

## 0.4.116 (2025-12-30)
- Fix (EVCS): Modus-Buttons reagieren jetzt mit einem Klick stabil (pointerdown + Pending-Write-Schutz gegen SSE-„Snapback“).
- Fix (EVCS): Optimistische UI-Updates werden nicht mehr durch kurzzeitig alte SSE-Werte überschrieben.
- Fix (PWA): Service-Worker bereinigt und Cache-Version erhöht, damit neue JS/HTML-Dateien zuverlässig geladen werden.

## 0.4.111 (2025-12-30)
- Fix (EVCS): Boost kann jetzt jederzeit manuell beendet werden (Boost‑Button erneut klicken → setzt Mode auf Auto).
- Fix (EMS Init): Charging‑Management wird bei Upgrades mit fehlendem enableChargingManagement-Flag automatisch aktiviert, wenn Ladepunkte konfiguriert sind (damit die EMS‑States + Modus‑Buttons verfügbar sind).
- UX (EVCS/API): Beim Wechsel weg von Boost werden die Boost‑Runtime‑States sofort zurückgesetzt (UI fühlt sich nicht mehr „festgenagelt“).
- Robustheit: Boost/Charging‑Session‑Timer werden nach Adapter‑Restart aus den States wiederhergestellt (Boost‑Timeout + FIFO‑Priorität bleibt stabil).

## 0.4.109 (2025-12-30)
- EVCS-Seite: Ladepunkt-Einstellungen jetzt direkt in der VIS bedienbar (EMS Runtime Mode je Ladepunkt: Auto/Boost/Min+PV/PV).
- EVCS-Seite: Boost-Anzeige inkl. Restzeit (boostRemainingMin), Timeout (boostTimeoutMin) und Priorität (#) bei mehreren Boost-Ladepunkten.
- Fix: /api/set (scope=ems) schreibt auf chargingManagement.wallboxes.lpX.userMode (statt wbX).

## 0.4.108 (2025-12-30)
- Charging: Boost je Ladepunkt mit Auto‑Timeout nach Charger‑Typ (DC default 60min / AC default 300min). Timeout‑Werte sind in der Admin‑UI (Expertenmodus) konfigurierbar und können pro Ladepunkt überschrieben werden.
- Charging: Neue Runtime/Diagnose‑States pro Ladepunkt: boostActive, boostSince, boostUntil, boostRemainingMin, boostTimeoutMin.

## 0.4.107 (2025-12-30)
- EMS (Sprint 3.1): Admin-UI aufgeteilt in eigene EMS‑Tabs: „EMS – Charging“, „EMS – Peak Shaving“, „EMS – Netz‑Constraints“, „EMS – Speicher“ (übersichtlicher, weniger gequetscht).
- Charging (Sprint 3.1): Stations‑Diagnose‑States hinzugefügt: chargingManagement.stations.<stationKey>.* (Cap/Remaining/Used/TargetSum/ConnectorCount etc.) + chargingManagement.stationCount.
- Charging (Sprint 3.1): Optionale Fairness in Stationsgruppen: chargingManagement.stationAllocationMode = roundRobin rotiert die Reihenfolge der nicht‑Boost‑Connectors pro Tick.

## 0.4.106 (2025-12-30)
- EMS (Sprint 3): Neuer Admin-Reiter „EMS“ mit Scheduler-Intervall, Aktivierung Peak-Shaving (Lastspitzenkappung) und Basis-Parameter (inkl. Diagnose-Optionen).
- EMS Engine: Multiuse ModuleManager im VIS aktiviert (Peak-Shaving + Charging-Management laufen im gleichen Scheduler-Takt).
- Ladepunkte (Sprint 2.2): Stationsgruppen (gemeinsame Leistung) + Station-Key/Connector-Metadaten + Boost-Erlaubnis je Ladepunkt.
- Charging-Management: Stationsgruppen-Limit wird bei der Zielwertverteilung berücksichtigt (Summe pro Station wird begrenzt).

## 0.4.103 (2025-12-30)
- Admin: Wallboxen – zentrale Wallbox-Tabelle um EMS-Steuerungs-Datenpunkte erweitert (Sollstrom A / Sollleistung W) inkl. pro-Wallbox EMS-Modus (Auto/PV/Min+PV/Boost).
- Admin: Weitere Monitoring/RFID/Expert-Felder im Admin-Expertenmodus (übersichtlich in Standardansicht).
- Vorbereitung für herstellerunabhängige A↔W-Umrechnung (Phasen/Spannung/Steps/Limits pro Wallbox als Expert-Felder).

## 0.4.102 (2025-12-25)
- Live-Dashboard: CO₂-Wert wird standardmäßig aus der PV-Gesamtproduktion (kWh) berechnet (0,4 kg/kWh -> t CO₂).
- Optional: Wenn ein CO₂-Datenpunkt gemappt ist, wird dieser weiterhin bevorzugt angezeigt.

## 0.4.101 (2025-12-25)
- Live-Dashboard: Wenn kWh-Zählerdatenpunkte nicht gemappt sind, werden die kWh-Werte (Produktion/Verbrauch/Netz sowie EVCS „Letzte Ladung“) automatisch aus InfluxDB (ioBroker History) aus der Leistungszeitreihe berechnet.
- Fallback: Sobald ein kWh-Datenpunkt gemappt ist, hat dieser Vorrang (keine Überschreibung).

## 0.4.100 (2025-12-25)
- Admin: Datenpunkte – kWh-/Zählerfelder und Kennzahlen standardmäßig ausgeblendet (im Admin „Expertenmodus“ sichtbar) und mit Hinweisen/Platzhaltern versehen.
- Keine Änderungen an Umschalt-Reitern oder dynamischem Zeittarif.

## 0.4.99 (2025-12-25)
- Admin: Datenpunkte – Leistungs-Datenpunkte (W) übersichtlicher angeordnet (Reihenfolge + bessere Platzhalter/Hilfetexte).
- Keine Änderungen an Tabs/Umschaltreitern oder Dynamischem Zeittarif.

## 0.4.98 (2025-12-22)
- UI Fix: robustes Number-Casting für SoC/Autarkie/Eigenverbrauch (verhindert Render-Fehler wenn Werte als String kommen, z. B. "19 %").

## 0.4.96 (2025-12-21)

## 0.4.97 (2025-12-21)
- EVCS Report: Button "CSV Sessions (RFID)" hinzugefügt (Download von /api/evcs/sessions.csv mit aktuellem Zeitraum).
- EVCS: Sessions CSV Export: neue Route /api/evcs/sessions.csv (Filter via from/to, Excel-kompatibles CSV mit BOM und ;).

## 0.4.95 (2025-12-21)
- EVCS: Session-Logger für RFID-Abrechnung (Start/Stop, Dauer, kWh, Peak kW, RFID/Name) mit Ringbuffer in evcs.sessionsJson.

## 0.4.94 (2025-12-21)
- EVCS: RFID-Status in der Wallbox-Kachel anzeigen (Gesperrt/Freigegeben, Nutzer), inkl. Tooltip mit RFID/Hint.

## 0.4.93 (2025-12-21)
- EVCS RFID: Freigabe-Logik (Whitelist) mit Sperre/Freigabe über lockWriteId bzw. activeId (Soft-Lock).
- EVCS RFID: neue lokale Status-States je Wallbox (rfidLast, rfidAuthorized, rfidUser, rfidReason, rfidEnforced).

## 0.4.92 (2025-12-21)
- Admin (EVCS): evcsList um RFID-DP (rfidReadId) und Sperre-DP (lockWriteId) erweitert (pro Wallbox konfigurierbar).
- Backend: evcsList liest lockWriteId ein und cached/abonniert optional den State (evcs.<n>.lock).
## 0.4.91 (2025-12-21)
- Feature (EVCS RFID): Anlernen-UI in den Einstellungen (Karte anlernen/Stop, letzte Karte anzeigen, in Whitelist übernehmen & speichern).
- UI: Whitelist-Editor stellt API für Lern-UI bereit (addOrUpdate + auto-save).

## 0.4.90 (2025-12-21)
- Feature (EVCS RFID): Learning-Backend – erkennt die nächste RFID-Karte (aus konfigurierten rfidReadId-Datenpunkten), schreibt lastCaptured/lastCapturedTs und deaktiviert learning.active automatisch.
- Backend: RFID /api/set aktualisiert den Live-State-Cache (SSE/\"/api/state\") sofort; ensureRfidStates initialisiert den Cache-Snapshot.
- Vorbereitung: evcsList unterstützt optional rfidReadId (Alias rfidId/rfid).

## 0.4.89 (2025-12-21)
- Feature (EVCS RFID): Einstellungen – RFID-Freigabe Toggle + Whitelist-Editor (CRUD) inkl. Save/Reload.
- Backend: /api/set unterstützt scope "rfid" (enabled, whitelistJson, learning.active).

## 0.4.88 (2025-12-21)
- Feature (EVCS RFID): Basis-States für Whitelist/Learning angelegt (evcs.rfid.*)

## 0.4.87 (2025-12-21)
- Feature (EVCS Report): CSV/Excel Download-Button im Bericht hinzugefügt (neben Drucken/PDF), nutzt /api/evcs/report.csv mit dem gleichen Zeitraum.

## 0.4.86 (2025-12-21)
- Feature (EVCS Report): CSV/Excel Export unter /api/evcs/report.csv (UTF-8 BOM, ';' Separator, de-DE Zahlenformat).
- Feature (EVCS Report): Summenzeile "Summe Zeitraum" in CSV (kWh Summe + Peak max kW je Wallbox).

## 0.4.85 (2025-12-21)
- Refactor (EVCS Report): Report-Builder in eine wiederverwendbare Funktion ausgelagert (Basis für JSON + CSV), Ausgabe unverändert.

## 0.4.84 (2025-12-21)
- Fix (EVCS Report): Render-Crash behoben (periodTotals korrekt berechnet), Summenzeile „Summe Zeitraum“ funktioniert wieder stabil.

## 0.4.82

## 0.4.83 (2025-12-21)
- EVCS Report: Summenzeile für Zeitraum ergänzt (Gesamt-kWh + kWh je Wallbox, Peak max kW je Wallbox) und im Druck/PDF stabil dargestellt.

- Tweak (EVCS Report): improved table formatting (de-DE number format, fixed decimals).
- Fix (EVCS Report): deterministic sorting (days by date, wallboxes by index).
- Fix (EVCS Report): null/undefined values render as 0 and total kWh falls back to sum of wallboxes.
- Tweak (Print/PDF): table header repeats across pages and rows avoid page breaks.

## 0.4.81

- Fix (EVCS Report UI): Tabelle in Scroll-Container (.table-wrap) gelegt, Sticky-Header innerhalb des Containers (top:0) – dadurch wird die erste Tageszeile nicht mehr optisch überdeckt.

## 0.4.80

- Fix (EVCS Report): getHistory robust (timestamps: ISO/sec/ms/date-only), dynamic count by span/step, aggregation+step to avoid truncation.
- Fix (EVCS Report): power uses average+max with adaptive step; daily peak kW derived from max-series scan.
- Fix (EVCS Report): daily energy prefers internal energyDayKwh (max), fallback to energyTotal via daily max-min (min/max aggregates).

## 0.4.79

- EVCS: enforce mode scale 1..3 everywhere (Boost=1, Min+PV=2, PV=3) and remove 0..2 conversion.
- EVCS: stabilize modal + page slider behavior and fix mode label layout under slider.

## 0.4.78

- Fix EVCS modal HTML (clean markup) and restore proper mode label spacing under the slider.
- Fix EVCS modal mode mapping (prefer 0–2 scale when ambiguous) and stabilize slider by inferring scale from last raw value.

## 0.4.77

- Fix EVCS page mode slider: interpret raw values as 1..3 (Boost/Min+PV/PV) to prevent off-by-one jumps.

## 0.4.76

- EVCS: Mode slider now always writes raw values 1/2/3 (Boost/Min+PV/PV) on EVCS page and EVCS modal.

## 0.4.75

- Fix EVCS modal: read per-wallbox mode/active (evcs.1.*) with robust mode scale mapping and prevent slider jumping.
- Fix EVCS page: preserve falsy datapoint values and convert UI mode to raw mode based on detected scale.
- UI: improve spacing between labels and values in KPI cards and dialogs.


## 0.4.74 (2025-12-20)

- Fix (History): Monats-/Jahresansicht zeigt durch Aggregation per "step" wieder vollständige Daten (keine Lücken durch getHistory-Limits).

## 0.4.73 (2025-12-20)

- Fix (EVCS Bericht): Drucken/PDF rendert wieder zuverlässig (kein beforeprint-Reload mehr, Print startet erst nach vollständig gerendertem Table). Zusätzlich werden Tabellenwerte in der Bildschirmansicht explizit eingefärbt, damit sie nicht von globalem CSS „verschluckt“ werden.

## 0.4.72 (2025-12-20)

- Fix (EVCS Bericht): Tabelle lädt zuverlässig in der Bildschirmansicht (robuste Initialisierung + Ladeindikator) und „Drucken / PDF“ lädt Daten vor dem Drucken.

## 0.4.71 (2025-12-20)

- Fix (EVCS Bericht): Tabellenwerte werden im Browser wieder sichtbar gerendert (td/th erben Textfarbe), auch bei nur 1 Wallbox.

## 0.4.70 (2025-12-20)

- Fix: Einstellungen/Installer – Änderungen werden wieder korrekt per /api/set an die im Admin konfigurierten Datenpunkt-IDs geschrieben (scope/key korrekt übertragen).
- Fix: Backend – config.settings/config.installer werden nur noch ausgewertet, wenn ein gültiger String (Objekt-ID) hinterlegt ist (verhindert Falschauswertung/Fehlerfälle).

## 0.4.62 (2025-12-17)

- Fix (EVCS): Leistungs-Ring im Ladestation-Dialog füllt sich wieder korrekt basierend auf aktueller Leistung vs. eingestellter Maximalleistung.

## 0.4.61 (2025-12-17)

- EVCS: Betriebsmodus-Slider in der Wallbox-Kachel wie im Dialog (Labels Boost / Min+PV / PV + aktive Auswahl).

## 0.4.60 (2025-12-17)

- Fix (EVCS): Header Tabs (LIVE/HISTORY/EVCS) rechts oben wie auf den anderen Seiten.

## 0.4.59 (2025-12-17)

- Fix (EVCS): Route-Alias für `/history/evcs.html` (und `/history/evcs`), damit die EVCS-Seite auch aus der History-Navigation nicht mehr 404 liefert.

## 0.4.58 (2025-12-16)

- Fix: Batterie-Beladung im Energiefluss wird auch angezeigt, wenn der Lade-DP negativ geliefert wird (Normalisierung auf Beträge).
- Admin: Felder für CO₂ und Gesamt-kWh sind im Reiter „Datenpunkte“ vorhanden.

## 0.4.56 (2025-12-16)

- (interne Zwischenversion)

## 0.4.49 (2025-12-16)

- EVCS: Admin „Wallboxen“-Tabelle aufgeräumt (DP-Auswahl als Objekt-Dialog, bessere Labels/Tooltips, Layout optimiert).

## 0.4.46

- Added dedicated settings page (settings.html) with original settings functions and Installer button
- Improved settings auto-open logic in app.js for settings.html and ?settings=1

## 0.4.38 (2025-12-15)

- VIS: Neue EVCS-Seite (/evcs.html) für mehrere Wallboxen.
- Header-Menü: Navigation Live/History/SmartHome/Logic + EVCS (ab 2 Wallboxen sichtbar).
- Live: EVCS-Menüpunkt wird über settingsConfig.evcsCount automatisch ein-/ausgeblendet.
