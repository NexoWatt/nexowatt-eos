# Zentrale EOS-Lizenz und eigene Adapter

Stand: 05.10.2026, Ausgangscommit `4e171e4`, gemeinsamer R9-Testlieferstand in
Qualifikation. Kunden-/Hausanlagenbetrieb und Produktionsfreigabe bleiben offen.

Home/Pro wird einmal im EOS Admin für die System-UUID aktiviert. Admin verwahrt
den verschlüsselten Lizenzdatensatz; die eigenen Adapter beziehen kurzlebige,
an ihre Anfrage gebundene Freigaben. Die UI enthält keinen zweiten Schlüsselweg.
Alte UI-Schlüssel werden weder übernommen noch gelöscht und erteilen keine Rechte.
Anmeldung und zentrale Aktivierung bleiben auf einem echten EOS ohne Lizenz möglich.

## Komponenten und Verhalten

| Komponente | Version | Änderung |
| --- | --- | --- |
| EOS Admin | 7.10.11 | Zentrale Autorität, Plattformprüfung vor Start, kleine Logos und konsistente Browser-Cacheversion |
| NexoWatt UI | 1.0.21 | Zentrale Anzeige, Home/Pro-Apprechte, kein lokaler Schlüsselvalidator/-import; früher Plattformcheck |
| Devices | 0.5.169 | Lizenz vor Runtime und letzten Geräte-/Transportbefehlen; Inventar über alle Devices-Instanzen |
| EEBUS | 0.3.0 | Lizenz vor Start sowie ausdrücklichen und automatischen Steuerbefehlen |
| OCPP 2.1 | 0.4.0 | Lizenz vor Start, Autorisierung und Ladebefehlen; vollständiges explizites Anschlussinventar |
| Backup | 1.0.10 | Lizenz für Aufträge, Zeitpläne und Dateiverwaltung; begrenzte einmalige Restorefreigabe |

Alle sechs enthalten denselben Client 1.0.2. Dieser prüft die aktive root-verwaltete
EOS-Installation, den aktuellen Releasezeiger, die zugelassene Paketversion und
den tatsächlich gestarteten Einstiegspunkt. Ein unverändertes Paket in einem
normalen ioBroker erhält damit keine Freigabe. Die Installationssignatur wird
gesondert vor dem Dienststart geprüft. Das ist keine manipulationssichere DRM-
oder Prozessisolationsgarantie gegenüber root oder verändertem öffentlichem Code.
Interne Paketnamen und erforderliche Drittsoftware-Lizenzhinweise bleiben erhalten.

Die Lease wird regelmäßig erneuert und gilt höchstens 15 Sekunden. Nach Ablauf,
Widerruf oder unerreichbarer Autorität werden neue lizenzpflichtige Befehle
verweigert; alte Warteschlangen werden nicht nachträglich ausgeführt. Bereits
laufende Telemetrie und bestehende Geräteschutzfunktionen werden nicht pauschal
abgeschaltet. Spätere zentrale Aktivierung wird ohne zusätzlichen Adapterschlüssel
übernommen. Ein bereits begonnenes Backup darf seinen Abschluss erreichen.

## Migration und bewusst offene Grenzen

- **OCPP-Anschlussinventar:** Vollständige tatsächliche Anschlüsse konfigurieren.
  Ohne belastbares Inventar bleibt Steuerung gesperrt; ein erfundener Standard-
  Anschluss wird nicht als Kontingentnachweis verwendet. Diese Mengenprüfung gilt
  pro OCPP-Instanz. Globale Reservierungen/Deduplizierung zwischen OCPP, Devices
  und anderen Integrationen sind noch offen; siehe `DEV-LIC-01` im Devices-Bericht.
- **Nativer Systemrestore:** Der alte generische ioBroker-/Redis-Restore darf
  keinen EOS-Controller stoppen. Er wird vor Download/Staging mit
  `EOS_OPERATOR_RECOVERY_REQUIRED` abgewiesen. Ein eigener geprüfter EOS-
  Host-Recoveryweg fehlt noch. Das ist eine funktionale Grenze, kein bestandener
  Wiederherstellungsnachweis. Lizenzierte Backups und unterstützte Datenrestores
  ohne Controllerstopp bleiben vorgesehen.
- **Inbetriebnahme:** R9 installiert weiterhin alle sechs eigenen Adapter,
  lässt im Testprofil aber nur Admin/UI ausführen. Physische Steuerungen bleiben
  gesperrt. Eine gültige Lizenz hebt diese getrennte Testprofilgrenze nicht auf.
- **Praxistest:** Pi-/ARM64-Update, systemd-Mountprofil, echte Browserbedienung,
  Gerätedatenpunkte und Hausanlage müssen am tatsächlichen Lieferstand abgenommen
  werden. Lokale Fixtures ersetzen diese Prüfungen nicht.

## R9-Updatevertrag

Der neue Updater akzeptiert ausschließlich den vollständigen, gesunden R8-Stand
mit Sequenz 11. Er prüft Signatur, Dienstzustand, frische Adapterbereitschaft und
HTTPS vor der Umschaltung auf Sequenz 12. Konto, UUID, Lizenz, Zertifikate,
Konfiguration, PostgreSQL-Schema und systemd-Dateien werden nicht migriert.
Der historische R8-Erststartabschluss bleibt bytegleich erhalten.

Bei fehlgeschlagenem R9-Start wird ausschließlich der zuvor authentifizierte
eigene R8-Stand wiederhergestellt und erst nach erneuter Bereitschaft als aktiv
gemeldet. Kann das nicht nachgewiesen werden, bleibt die eigene Startsperre
erhalten. Fremde Wartungssperren oder abweichende Zustandsdateien werden nicht
überschrieben. Historische signierte Lieferdateien bleiben unverändert.

Der neue Auslieferungsweg verlangt erfolgreiche native Admin/UI-Prüfung genau
derselben Quellversion und desselben App-Inhalts vor dem Signieren. Der native
Test ist ausdrücklich ein unsigniertes, root-verwaltetes Labor auf Linux x64 mit
PostgreSQL 17.11 und Node 24.21.0; anschließend erfolgt die unabhängige Prüfung
des signierten ARM64-Lieferarchivs. Keine automatische Pi-/Produktionsfreigabe.

## Nachweise

[Gemeinsame Prüfung](../../reports/integration/central-license-20261005/README.md),
[R9-Updatefehlerfälle](../../reports/integration/test-update-r9-20261005/README.md),
[nativer R9-Prüfvertrag](../../tests/integration-r9/README.md).
Komponentennachweise liegen unter den jeweiligen Lizenz-/Securityberichten in
`components/`. GitHub prüft die eigenen Adapter gezielt zusätzlich zum bisherigen
Controller-/Management-Basistest; fehlgeschlagene Prüfungen werden nicht versteckt.

Die Änderung ist keine unabhängige Sicherheitszertifizierung oder CRA-/IEC-
Konformitätsbestätigung. Offene Geräte- und Recoverygrenzen sind vor einer
Serienfreigabe gesondert zu schließen.
