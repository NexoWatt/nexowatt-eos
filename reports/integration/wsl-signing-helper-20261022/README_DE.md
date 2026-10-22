# Lokale WSL-Signierung der qualifizierten Sequenz 15

Stand 22.10.2026. Änderung: `tools/bootstrap/sign-qualified-r8-wsl.py` verbindet
die vorhandenen qualifizierten Werkzeuge zu einem lokal ausführbaren Ablauf.
Die neue Helferquelle ersetzt nicht den festen Paketquellstand
`f353dd08bf8ac5897e9b1c357994d4047a82ed6d`. Keine Runtime-, Controller- oder
Signaturprotokolländerung. js-controller bleibt 7.2.5, Node 24.22.1.

## Sicherheitsgrenzen und Betrieb

Der Helfer verlangt exakt die beiden ursprünglichen CI-ZIPs, prüft Größe/Hash
vor dem Entpacken und erneut nach der lokalen Kopie, verwirft zusätzliche,
doppelte oder unsichere ZIP-Mitglieder und bindet das innere Archiv. Ein
separater sauberer Sparse-Checkout verwendet ausschließlich den qualifizierten
Commit. Die ARM64-Node-Quelle ist auf offizielle URL, Größe und Hash festgelegt.
Laufzeit-/Native-Nachweise werden vor dem Entschlüsseln validiert; der bestehende
Signierer prüft sie erneut. Es findet keine Paketauflösung statt.

Der Hersteller bleibt normaler Ubuntu-Benutzer. Der verschlüsselte permanente
Schlüssel bleibt außerhalb des Checkouts; seine Entschlüsselung erfolgt durch
OpenSSL mit lokaler Terminaleingabe in einem privaten tmpfs-Verzeichnis. Der
abgeleitete öffentliche Hash muss stimmen. Die temporäre Datei wird im
`finally` entfernt, auch bei Fehler/KeyboardInterrupt. SIGTERM wird in diesen
Abbruchpfad geleitet; SIGKILL/Hostausfall erlauben keine Aufräumgarantie. Ein
tmpfs kann je nach Host ausgelagert werden. Der Host bleibt Vertrauensgrenze.
Core-Dumps sind für den Helfer und seine Kinder deaktiviert.

Der anfängliche leere Kanal ist 30 Tage gültig. Eine feste öffentliche
Exportliste verhindert das versehentliche Verpacken von Schlüssel- oder
Arbeitsverzeichnissen. Es gibt keinen Upload und keine Pi-Aktion.
Die [Betriebsanleitung](../../../docs/operations/WINDOWS_SIGNIERRECHNER_DE.md)
und `PARAMETERS.md` sind angepasst.

## Tatsächliche Prüfungen

- `python3 -I -B tests/bootstrap/sign-qualified-r8-wsl.test.py -v`: **9/9**,
  keine übersprungenen Tests. Echtes OpenSSL mit frisch erzeugten verschlüsselten
  Ed25519-Testschlüsseln, Rechteprüfung und Bereinigung bei Erfolg, Body-Fehler,
  KeyboardInterrupt, falschem Trust und teilweise geschriebener Fehlerdatei.
  Dateityp/Größe/Hash, ZIP-Allowlist, Duplikate, Größenlimit, Traversal,
  nichtkanonische Pfade, Links/Spezialdateien und bestehendes Ziel geprüft.
- Originale CI-ZIPs über ihre Größen und SHA-256 rückgeprüft und mit dem neuen
  Helfer extrahiert. Inneres TAR und acht Native-Mitglieder bestätigt.
- Minimaler tatsächlicher Git-Sparse-Checkout: sauberer HEAD f353dd08, 339
  materialisierte Dateien mit 0644/0755, privater Elternordner und leeres
  `delivery/`; Import der benötigten Module ohne npm erfolgreich.
- Vollständiges tatsächliches Prepared-/Native-/ARM64-Readback mit Node
  **24.22.1**: 22441 Archiveinträge, 22431 App-Dateien, sourcegebundene native
  15/15-Nachweise erfolgreich geprüft.
- Anschließend vollständiger Signierlauf des echten qualifizierten Inhalts
  mit **wegwerfbarem Testschlüssel**, sauberer separater Checkout und frischer
  Extraktion: verwaltetes ARM64-Archiv erzeugt und rückgeprüft; leerer Kanal
  mit demselben Testschlüssel signiert und geprüft. Testschlüssel und temporäre
  Lieferung danach entfernt. Kein Herstellerpaket veröffentlicht.
- `git diff --check`: erfolgreich.

Vorherige lokale Versuche werden nicht als bestanden gezählt: ein Baum wurde
wegen veränderter Dateimetadaten mit `BUNDLE_CHANGED` abgewiesen; im gemeinsam
genutzten Arbeitsbereich wurden fremde temporäre Kopierdateien beobachtet.
Ein erneuter Lauf im bereits begonnenen Buildziel wurde erwartungsgemäß durch
`MANAGED_BUILD_IMMUTABLE_OUTPUT` abgewiesen. Ein lokaler Shared-Clone des
Partial-Repositories scheiterte an fehlenden Promisor-Objekten. Der erfolgreiche
abschließende Lauf verwendete eine vollständige Kopie des sauberen minimalen
Checkouts und frische Eingaben in einer getrennten temporären Ablage; kein
Validator und keine Unveränderlichkeitsprüfung wurde abgeschaltet.

Maschinenlesbare Bindungen: [verification.json](verification.json).

## OFFEN

Ausführung des vollständigen neuen Helfers als tatsächlicher WSL-Nutzer mit dem
permanenten Herstellerschlüssel, damit gebundener R8-Einstieg, Veröffentlichung
und öffentlicher Byte-/Signatur-Readback sind noch offen. Die isolierten
tmpfs-Schlüsseltests und der vollständige Testschlüssel-Signierlauf ersetzen
diesen Herstellerlauf nicht. Keine reale ARM64-Ausführung, Pi-/systemd-/APT-
Migration, Backup-Wiederherstellung, Stromausfall- oder physische Anlagenprüfung
durchgeführt. Bestehende offene Abhängigkeitsbefunde bleiben offen. Keine
Produktionsfreigabe oder CRA-/IEC-Konformitätserklärung.
