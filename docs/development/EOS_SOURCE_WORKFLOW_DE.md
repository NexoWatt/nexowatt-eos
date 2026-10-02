# EOS: eine verbindliche Quelle für System und Adapter

Stand: 1. Oktober 2026, Entwicklungsstand `0.2.0-dev.3`. Dieser Ablauf verhindert,
dass eine Adapterkorrektur nur in einem Einzelrepository ankommt und im
ausgelieferten EOS-System fehlt. Er beschreibt den Arbeitsvertrag; eine neue
GitHub-Synchronisierung, CI-Veröffentlichung oder Zweitfreigabe wird damit nicht
als bereits eingerichtet dargestellt.

## Verbindlicher Quellstand

Das zusammengeführte EOS-Repository ist die Hauptquelle des Produkts. Sein
konfiguriertes `origin` ist `https://github.com/NexoWatt/EOS.git`; ein lokaler
Commit bedeutet noch keinen Push auf GitHub. Produktversion und Produktscope
stehen in `system/product.json`. Das Root-`package.json` bezeichnet weiterhin
den übernommenen Installer und ist keine EOS-Produktversionsdatei.

| Bereich | Verbindliche Quelle | Beitrag zum Produkt |
| --- | --- | --- |
| Service-Administration | `components/admin/` | Anmeldung, begrenzte Kontenwege, Lizenzverwaltung |
| NexoWatt-Oberfläche | `components/ui/` | Cockpit, Produktansichten und bestehende Fachlogik |
| Geräte | `components/devices/` | Geräteanbindungen; Aktivierung separat prüfen |
| EEBUS | `components/eebus/` | EEBUS-Anbindung; Aktivierung separat prüfen |
| OCPP | `components/ocpp21/` | Ladepunktanbindung; Aktivierung separat prüfen |
| Sicherung | `components/backitup/` | Backupquellen; Wiederherstellung separat prüfen |
| Controllerprofil | `runtime/controller-profile/` | Versions- und hashgebundene Anpassungen des js-controllers |
| Installation und Betrieb | `runtime/`, `tools/system/`, `system/` | Zulassung, Signaturprüfung, TLS, Dienste und Einrichtung |

Der js-controller ist eine ausdrücklich gesperrte Laufzeitabhängigkeit. Ihn
auszulassen, nur weil seine vollständigen Quellen nicht unter `components/`
liegen, würde die Sicherheits- und Versionsprüfung des Hauptsystems verkürzen.
Die tatsächliche Version, die unveränderten Eingangspakete und die kontrollierten
Transforms gehören in die Buildnachweise und SBOM.

Bei UI-Änderungen zuerst `components/ui/docs/AGENTS.md` und den dort verlinkten
Quellcode-Wegweiser lesen. Die maßgeblichen ausführbaren Quellen liegen unter
`src-ts/runtime-executables/`; zugehörige JavaScript-Dateien entstehen über den
vorgegebenen Synchronisierungsschritt. Generierte Dateien oder typisierte
Spiegel nicht unabhängig von ihrer Quelle korrigieren.

## Änderung bis zum Testpaket

1. Von einem bestimmten EOS-Commit einen Arbeitszweig anlegen. Problem,
   betroffene Komponenten, Schnittstellen und bisherige Befundkennung festhalten.
   Eine funktionierende ältere Funktion nicht beiläufig entfernen oder umbenennen.
2. Die Änderung in der maßgeblichen Quelle unter `components/` beziehungsweise
   `runtime/` vornehmen. Betroffene Eingaben, Rechte, Datenflüsse und STRIDE-Risiken
   im selben Schritt dokumentieren. Geräteadressen, Datenpunkttypen, Einheiten,
   Regelgrenzen und Ausfallverhalten auf Kompatibilität prüfen.
3. Die passenden positiven, negativen und Regressionstests ausführen. Für die UI
   gelten zusätzlich ihre dokumentierten Build- und Paketprüfungen. Ein lokaler
   Modultest ersetzt keinen Test des zusammengebauten Systems.
4. Aus einem frischen, getrennten Buildverzeichnis die ausgewählten Komponenten
   packen und den exakten Abhängigkeitsbaum installieren. Keine Paketinstallation
   oder Kompilierung im laufenden EOS-Gerät. Geprüfte Abhängigkeits-Overrides am
   tatsächlichen Installationsroot durchsetzen; Konflikte führen zum Abbruch.
5. Controllerprofil und Adapterzulassung auf die konkreten Paketbytes anwenden.
   Für ARM64 und x64 jeweils die tatsächlich gelieferten nativen Binärdateien
   prüfen. Ein erfolgreicher x64-Lauf belegt keinen ARM64-Prozessstart.
6. CycloneDX-JSON aus dem tatsächlichen Laufzeitbaum erzeugen und an Manifest,
   Lockdatei und gelieferte Paketbytes binden. Quellinventar, Laufzeit-SBOM und
   späteres Geräteinventar getrennt halten. OS, Node, Redis und Firmware gehören
   zum Gerätebestand; ihre fehlende Erfassung nicht durch eine npm-SBOM ersetzen.
7. Den fertigen Laufzeitkandidaten mit Controller, Admin und UI integrieren und
   prüfen. Rohbelege mit Version, Umgebung und Hashes erhalten, auch wenn ein Lauf
   fehlschlägt. Offene kritische Gates nicht durch einen engeren grünen Test ersetzen.
8. Katalog, Signatur und Liefermanifest für genau diesen unveränderten Kandidaten
   erstellen. Vollständiges Repository, Installationsanleitung, SBOM, Nachweise
   und offene Punkte gemeinsam liefern. Nach der Prüfung nicht beim Veröffentlichen
   unbemerkt neu bauen oder andere Paketbytes unter derselben Freigabe austauschen.

Einzeladapter können aus diesem Stand eigene Pakete erhalten. Eine bereits
veröffentlichte Paketversion mit verändertem Inhalt wird nicht wiederverwendet;
neue Paketveröffentlichungen benötigen eigene Versionen und Nachweise.
Gleichlautende Adapterversionen in internen Entwicklungsständen sind nur mit
Commit-/Dateihashbindung unterscheidbar und sind keine npm-Veröffentlichung.

## Änderungen aus den bisherigen Einzelrepositories

Die bisherigen Adapterrepositories bleiben Herkunfts- beziehungsweise mögliche
Paketveröffentlichungsorte. Es ist keine automatische wechselseitige
Synchronisierung eingerichtet. Solange dort noch entwickelt wird, gilt:

1. Den vollständigen fremden Änderungsstand mit Repository, Commit und
   Paketversion festhalten; Änderungen gegen die EOS-Komponente vergleichen.
2. Gewünschte Änderungen gezielt in einen EOS-Arbeitszweig übernehmen. Bereits
   vorhandene EOS-Authentifizierung, Lizenzgrenzen, TLS und Sicherheitskorrekturen
   dabei erhalten. Ein vollständiges Überschreiben des Komponentenordners ist
   keine Konfliktauflösung.
3. Konflikte in Quellcode, Lockdateien, Konfiguration und generierten Dateien
   fachlich lösen; erforderliche Artefakte anschließend kontrolliert erzeugen.
4. Komponenten- und Integrationstests wiederholen, SBOM und Berichte aktualisieren.
   Erst das daraus entstandene EOS-Paket kann auf den Test-Pi übernommen werden.

Für die weitere Arbeit deshalb zuerst im EOS-Hauptrepository ändern. Ein
zusätzlicher Export beziehungsweise eine Veröffentlichung des Adapterpakets
kann danach aus demselben geprüften Commit erfolgen. Ein Push oder eine
Veröffentlichung wird gesondert nachgewiesen; diese Anleitung führt beides nicht aus.

## Zusätzliche Adapter und spätere Updates

Neue Adapter benötigen einen überprüften Quellstand, exakte Paketversionen,
Abhängigkeits-/Lizenzinventar, einen Rechte- und Kommunikationsvertrag sowie
Geräte- und Fehlerfalltests. Eine Katalogaufnahme allein aktiviert keine Instanz.
Im aktuellen integrierten Testprofil sind ausschließlich Admin und UI zugelassen;
EEBUS, Devices, OCPP und Backup sind noch keine betriebsbereiten Produktfunktionen.

Die gewöhnlichen Wege `iob install`, `iob url`, beliebige Admin-URL-Installation
und dynamische npm-Nachinstallation bleiben in diesem Profil gesperrt. Die
vorhandene additive Releaseaktivierung ist auf zusätzliche geprüfte Pakete
begrenzt. Sie ist kein allgemeiner Updater für bestehenden Controller-/Adaptercode
und kein Ersatz für die noch abzugrenzende Instanz-Ersteinrichtung. Für einen
neuen integrierten Teststand derzeit einen frischen Testsnapshot verwenden.

Vor allgemeinem Updatebetrieb müssen Migration, Abbruch, Rollback und vollständige
Wiederherstellung einschließlich Konfiguration, Identitäten und Lizenzbindung
abgenommen werden. Ein laufendes System erhält keine neuen Abhängigkeiten allein
deshalb, weil in einem Einzelrepository eine neuere Version erschienen ist.

## Nachweise und Zuständigkeiten

Entwicklung führt Änderung, Bedrohungsanalyse und Tests zusammen. Die für den
Lieferstand verantwortliche Person entscheidet anhand der konkreten Nachweise
über den Testumfang und dokumentiert verbleibende Risiken. Der Betreiber prüft
den bereitgestellten Stand auf dem bezeichneten Testgerät und meldet beobachtete
Ergebnisse mit Buildbezug zurück. Eine unabhängige Sicherheitsprüfung oder
Herstellerfreigabe wird nur genannt, wenn sie tatsächlich vorliegt.

Maßgebliche Ablagen sind `docs/architecture/`, `docs/security/`, `docs/cra/`,
`docs/operations/`, `tests/`, `reports/` und die releasegebundenen Liefermanifeste.
Das Verfahren unterstützt nachvollziehbare CRA-/IEC-Unterlagen; es bescheinigt
keine vollständige Konformität. Zugangsdaten, private Schlüssel, Kundensicherungen
und unbereinigte Anlagenlogs bleiben außerhalb des Repositorys.
