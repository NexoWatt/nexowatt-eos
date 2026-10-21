# Sicherheitsaktualisierung für die neue EOS-Testbasis

Stand: 21.10.2026. Basis des Arbeitsstands:
`83f7070c9ec58184188b5f310d0c14140a10e9d4`.
Auftrag: verfügbare Sicherheitskorrekturen übernehmen, danach den neuen
Test-Pi vorbereiten; ausdrücklich **js-controller 7 beibehalten**.

## Änderungen

| Bereich | Neuer Quell-/Zielstand | Zweck |
| --- | --- | --- |
| js-controller | 7.2.5, genau gepinnt | Benutzerkontext und Sitzungs-/Controllerkorrekturen; Controller 8 ausgeschlossen |
| EOS Admin | eigene Version 7.10.11 bleibt erhalten | EOS-Oberfläche, Rollen, zentrale Lizenz und Updateknopf erhalten |
| Socket-Klassen | 2.10.0 | neuere Rechte-/Ereignisprüfungen; bestehende EOS-Beschränkungen bleiben verbindlich |
| Webserver / WS-Server | 3.3.1 / 4.5.2 | aktuelle Sicherheitskorrekturen; SSO/Chat weiter gesperrt, begrenzte WS-Nachrichten |
| HTTP-Abhängigkeiten | u. a. compression 1.8.2, proxy-addr 2.0.8, follow-redirects 1.16.1 | verfügbare Patches in Quelllock und neuer Gesamtauflösung |
| PostgreSQL | expliziter Sitzungsvertrag für 7.2.2 und 7.2.5 | Anmeldung mit neuem Controller erhalten; unbekannte Versionen abweisen |
| Paketbau | vollständiger neuer Laufzeitbaum | geänderte Dependencies tatsächlich liefern, ohne alte signierte Archive umzudeuten |

Die Controlleranpassungen sind an veröffentlichte Eingabedateien und genaue
Ausgabehashes gebunden. Die Sicherheitsaktualisierung behält die EOS-Sperren
für Laufzeitinstallationen, Profile, private PID-/Backup-Zustände und geordneten
Adapterstopp. Sitzungsfehler im neuen Adapterkern enthalten nur einen festen
Diagnosecode, keine Sitzungskennung oder ungefilterte Datenbankfehlermeldung.
Fehlende benötigte Socket-Rechtehooks führen zum Abbruch.

Der Managed-Updater prüft die neue 7.2.5-Katalogidentität. Folgeupdates bleiben
auf die sechs eigenen Pakete bei unveränderten Versions-, Abhängigkeits- und
Hostverträgen begrenzt. Ein Wechsel zu Controller 8 oder eine beliebige
Dependency-Migration ist dadurch nicht freigeschaltet.

## Nachweise und Grenzen

Die Teilberichte unter `controller/`, `admin/`, `adapters/`, `build/`, `install/`
und `review/` unterscheiden tatsächliche Prüfungen, veröffentlichte Paketdaten,
lokale Fixtures und noch offene Integration. Die zusammenführende
`verification.json` bindet die geprüften Dateien; spätere CI-Ergebnisse werden
mit ihrer tatsächlichen Quell-Commit-ID ergänzt.

Lokale Tests laufen unter Linux x64 / Node 24.19.0. Der verbindliche CI-Pfad
prüft Node 24.21.0 und den frisch aufgebauten Laufzeitstand mit nativem
PostgreSQL, HTTPS-Anmeldung, sechs Adapterprozessen, zentralen Lizenzen,
Backups und Neustart. Der historische R9-Overlay-Pfad bleibt separat an einen
unveränderlichen Quellstand gebunden; er ist kein Nachweis für die neue Basis.
Ein grüner Quelltest ist kein erfolgreicher nativer Lauf und keine Pi-Abnahme.

Die neue Laufzeit wird einmal aufgelöst, anschließend aus der genauen Lockdatei
offline installiert und anhand des tatsächlich installierten Baums inventarisiert.
Der Signierer darf nur die identischen vorbereiteten und geprüften Bytes
verwenden. SBOM und Metadaten behaupten keine historische R9-Signatur für
diesen neu aufgebauten Baum.

## Weiter offene Sicherheitsbefunde

- Für `node-forge` ist im geprüften Stand kein passender Patch verfügbar.
  Abhängige Audit-Knoten sind nicht jeweils eine neue eigenständige Lücke.
- `ocpp-rpc` bindet weiterhin AJV 8.14.0. Ein blindes Override bricht die
  Protokollschemas. `$data` bleibt im geprüften Validator deaktiviert;
  dies ist kein allgemeiner Nachweis der Nichtbetroffenheit.
- Die optionale Dropbox-Kette im Backup verwendet weiter `request` und
  weitere veraltete Pakete. Verfügbare kompatible Unterpaketfixes sind
  übernommen; die notwendige Clientmigration bleibt offen.
- Die tatsächlichen Socket-Klassen zeigen weiterhin Grenzen bei
  Nichtadmin-Objektereignissen und einer Admin-Hostbefehlsweiterleitung.
  EOS verweigert die betreffenden Rohabonnements und beschränkt Hostbefehle.
  Charakterisierungstests sind keine Behauptung, diese Upstream-Fehler seien
  vollständig behoben.

Aktuelle Audits bewerten Paketgraphen, nicht automatisch die Ausnutzbarkeit
im EOS-Betriebsprofil. Vor einer Produktionsfreigabe bleiben Befundbewertung,
Abhilfe und Laufzeitnachweise erforderlich. Keine erfundene Risikoakzeptanz.

## Nächste Lieferbedingungen

Ein dauerhaft geschützter Hersteller-Signierschlüssel sowie die fertige signierte
ARM64-Lieferung und der daraus erzeugte öffentliche Installationsbefehl mit
Rücklesetest fehlen noch. Es wird kein neuer privater Einmalschlüssel
als dauerhafte Updateautorität ausgegeben. Private Schlüssel, Zugangsdaten,
reale Lizenzen, Kundendaten und private Laborzustände gehören nicht in die
öffentliche Veröffentlichung.

Der neue feste Managed-Bootstrap ergänzt den Checkout-Installer um die
Frischhost-/APT-/Node-Vorbereitung einschließlich `nftables` und
`dnsmasq-base`. Die Hostprüfungen und ein tatsächlich gebautes, wieder
gelesenes Installer-ZIP sind als Fixtures geprüft; APT und Installation wurden
hier nicht auf einem Zielhost ausgeführt. Das öffentliche Kit übernimmt nur
versionierte Quellen und enthält keine internen absoluten Buildpfade.
**Der vorhandene Pi soll anhand dieses Quellberichts noch nicht
gelöscht oder als aktualisiert betrachtet werden.** Pi-/ARM64-, systemd-,
Stromausfall- und Hardwaretests sind offen. Keine Produktions-/CRA-Freigabe.
