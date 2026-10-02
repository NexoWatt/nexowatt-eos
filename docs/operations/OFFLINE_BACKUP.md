# Offline-Sicherung und Wiederherstellung: verbindlicher Entwurf

Stand 01.10.2026. **In diesem Lieferstand ist kein freigegebenes EOS-Backup-/
Restore-Werkzeug implementiert.** Der vorhandene NexoWatt-Backup-Adapter bleibt
deaktiviert. Seine Shell-, Mount-, HTTP-Transfer- und Restorewege sind nicht für
den signierten, schreibgeschützten EOS-Aufbau zugelassen. Dieses Dokument und
`offline-backup-contract.json` beschreiben den noch umzusetzenden Vertrag.

Es wird ausdrücklich kein ausführbares `offline-backup.cjs` ausgeliefert, das
mit unzureichend geprüfter Archivverarbeitung Zugangsdaten exportieren oder
einen vorhandenen Rechner überschreiben könnte. Für den aktuellen VM-Test ist
der vor der Installation erzeugte Hypervisor-Snapshot der vorgesehene Rückfall.
Ein VM-Snapshot selbst benötigt geschützte Ablage und ist keine bewiesene
verschlüsselte Produktsicherung.

## Geprüfte Formatentscheidung

Vorgesehen ist ein standardisiertes CMS-Format mit OpenSSL, keine eigene
Kryptoprotokoll-Implementierung:

1. Ein kanonisches, begrenztes Archiv samt Dateimanifest wird mit CMS SignedData
   signiert. Eigener freigegebener Backup-Signierschlüssel, ECDSA P-256/SHA-256.
2. SignedData wird in CMS AuthEnvelopedData mit AES-256-GCM verpackt; geprüfter
   Offline-Empfänger über ECDH P-256 und AES-256-Key-Wrap.
3. Wiederherstellung entschlüsselt zunächst ausschließlich in eine frische,
   root-private Quarantäne, prüft Exitstatus und authentisierten Container,
   anschließend die Signatur gegen einen **extern vorab vertrauten**
   Backup-Signierer. Ein mit dem Archiv gelieferter Signierschlüssel ist kein
   Vertrauensanker.
4. Erst nach erfolgreicher Entschlüsselung und Signaturprüfung werden
   Archivmetadaten gelesen. Noch keine Extraktion in Liveverzeichnisse.

AES-GCM allein beweist bei Public-Key-Verschlüsselung nicht den Absender:
Jeder mit dem öffentlichen Empfängerzertifikat könnte ein neues gültig
verschlüsseltes Archiv erzeugen. Die getrennte Absendersignatur ist erforderlich.
Ebenso müssen Hersteller-Releases mit dem separat verankerten Hersteller-
Release-Schlüssel geprüft werden, nicht allein mit einer im Backup enthaltenen
Public-Key-Datei.

Tatsächlich ausgeführte **Primitive-Machbarkeitsprüfung** mit OpenSSL 3.0.13 im
Labor: CMS-Verschlüsselungs-/Entschlüsselungsrunde, Signaturprüfung mit explizit
vorgegebenem Signierer, Manipulationsablehnung, falscher Empfängerschlüssel und
falscher Signierer. Alle fünf Prüfungen positiv; Ergebnisdatei
`reports/integrated/backup/cms-feasibility.json`. Dies prüft weder einen
Snapshot, ein Archivformat noch eine EOS-Wiederherstellung und ist keine
Freigabe dieser OpenSSL-Version für das spätere Produkt.

**Reproduzierter Fall:** Trotz fehlgeschlagener GCM-Authentifizierung legte
OpenSSL bereits eine 803-Byte-Ausgabedatei an. Eine Pipeline direkt in `tar`, ein
Parser oder das Live-Dateisystem wäre daher unsicher. Nicht authentisierte
Ausgabe darf weder verarbeitet noch als Erfolg gewertet werden. Auch eine
Signaturprüfung kann vor dem abschließenden Fehler Ausgabe schreiben.

Private Testschlüssel, Passphrase-Dateien und Entschlüsselungsausgaben wurden
nur in einem root-privaten temporären Verzeichnis erzeugt und danach gelöscht;
sie gehören nicht zum Repository oder Lieferpaket. Die Passphrase gelangte
über eine geschützte Datei an OpenSSL, nie als Klartextargument.

## Abgrenzung und minimale Rechte

Nur ein lokaler Root-Operator darf die Sicherung anstoßen. Kein Adapter erhält
sudo, allgemeine Shell-Kommandos, Mountrechte, private Offline-Empfängerschlüssel
oder eine privilegierte Backup-Webschnittstelle. Schlüssel-Passphrasen werden
über bereits geöffnete Dateideskriptoren oder verifizierte Dateien mit 0600
übergeben, nicht über Argumentwerte, Umgebungsvariablen oder Logs. Nicht benötigte
Umgebungsvariablen, OpenSSL-Konfigurations-/Providerpfade und Suchpfade werden
für Unterprozesse entfernt. Programme werden über feste absolute Pfade und
Argumentlisten ohne Shell aufgerufen.

Sicherungsinhalt sind ausschließlich:

* `/var/lib/nexowatt-eos`: persistente EOS-/Datenbankdaten und die tatsächlich
  verwendeten Lizenz-/Anwendungsdaten.
* `/etc/nexowatt-eos`: Konfiguration, interne Transportidentität, Web-CA und
  Web-Zertifikate, Lizenzvertrauen und weitere tatsächlich benötigte
  Wiederherstellungsgeheimnisse.
* Das signierte Release als **geprüfte Referenz**: Release-ID, Sequenz,
  Hersteller-Key-Fingerprint, Manifest-/Signaturhash, Node-/Plattformbindung.
  Die unveränderlichen Programmdateien werden aus dem separat geprüften
  passenden Release wiederhergestellt; beliebiger Code aus einer
  Datensicherung wird nicht ausgeführt.

Logs, beliebige Hostpfade, Umgebungsdateien, SSH-/Tailscale-Identitäten anderer
Systemdienste, `/etc/shadow` und zusätzliche NAS-/Cloud-Verzeichnisse gehören
nicht automatisch zum Umfang. Eine Erweiterung erfordert einen neuen Vertrag.
Eine frische Sicherung während einer offenen Update-, Onboarding- oder
Zertifikatstransaktion ist verboten; solche Journale dürfen nicht einfach
weggelassen und der Rest als konsistente Sicherung bezeichnet werden.

## Konsistenter Snapshot

Das zukünftige Werkzeug muss den vorhandenen exklusiven Root-Wartungslock
verwenden und den Controller sowie beide fest benannten Redis-Dienste über
`/usr/bin/systemctl` stoppen. Für jeden Dienst müssen `ActiveState` und `MainPID`
geprüft werden. Zusätzlich muss feststehen, dass keine weiteren Prozesse des
dedizierten Laufzeitkontos in den Snapshot schreiben. Ein gestoppter MainPID
allein beweist das nicht. Ein Dateisystem-Snapshot oder eine gleichwertig
nachgewiesene Schreibsperre muss den konsistenten Lesestand bereitstellen.

Erst dann wird die feste Pfadmenge ohne Symlink-Folgen aufgenommen. Herkunft,
Eigentümer und Rechte, reguläre Datei-/Verzeichnistypen, Größen und Anzahl werden
vor und während des Lesens geprüft. Laufzeitkonten besitzen Datenverzeichnisse;
ein einfacher `lstat`-vor-`readFile`-Ablauf verhindert dort keine Austauschrennen.
Die genaue Snapshot-/Deskriptorstrategie ist daher noch ein Implementierungs-
und Testblocker. Es darf kein Archiv als erfolgreich ausgegeben werden, wenn
Konsistenz, Signatur, Verschlüsselung, Dateisystem-Sync oder atomare finale
Bereitstellung scheitern.

## Validierung vor einer Wiederherstellung

Die zukünftige reine Prüffunktion muss zuerst Budgetgrenzen für verschlüsseltes
Artefakt, Klartextmenge, Dateianzahl, Einzeldateien und Pfadlängen durchsetzen.
Limits werden anhand realer Datenmengen dimensioniert und dokumentiert, nicht
nachträglich im laufenden Parser erhöht. Dekompressionsbomben und verschachtelte
Container dürfen das Budget nicht umgehen.

Nach erfolgreicher kryptografischer Prüfung werden **alle** Archivmetadaten
vor Extraktion validiert. Zulässig sind nur kanonische relative Pfade unter
den beiden definierten Wurzeln. Verboten sind absolute Pfade, `..`, leere oder
doppelte Segmente, alternative Separatoren, NUL-/Steuerzeichen, doppelte oder
mehrdeutige Namen, Symlinks, Hardlinks, Sockets, Geräte, FIFOs, Setuid/-gid,
Dateicapabilities sowie unerwartete ACLs, Sparse-/PAX-/GNU-Override-Metadaten.
Ein Dateimanifest bindet jede erlaubte Datei an Größe und SHA-256. Diese Regeln
dürfen nicht nur auf der lesbaren Ausgabe von `tar -t` beruhen: Dateinamen können
deren Ausgabeformat mehrdeutig machen.

Anschließend: Produkt-/Schemaversion, Release-Signatur, Gerätebindung,
Abhängigkeiten, Eigentümer-/Gruppenabbildung, Zertifikate/Schlüsselpaare und
Datenbank-/Lizenzkonfiguration prüfen. Ein gültig signiertes altes Backup ist
nicht automatisch eine zulässige Software-Rückstufung. Anti-Rollback- und
Wiederherstellungsentscheidungen müssen getrennt und nachvollziehbar erfolgen.

Die Prüffunktion gibt lediglich einen bereinigten Bericht zurück. Sie startet
keine Dienste und führt kein enthaltenes Skript aus. Eine echte Wiederherstellung
braucht einen separaten, bewusst gestarteten Vorgang auf einem frischen Ziel oder
eine geprüfte Transaktion mit eigenem Rückfallsnapshot, Schreibsperre und
Abnahmeschritten. **Liveüberschreiben bestehender Daten ist nicht vorgesehen.**

## Gerätewechsel und Schlüsselverlust

Das Kopieren eines Backups auf einen zweiten Rechner darf nicht unbemerkt zwei
identische Geräte-/Serveridentitäten, Lizenzen oder Fernwartungsidentitäten
erzeugen. Wiederherstellung desselben Geräts und Migration auf andere Hardware
benötigen getrennte Abläufe. Bei Migration sind Identitäten und Zertifikate neu
auszustellen und die Lizenzbindung erneut zu prüfen. Ohne privaten
Offline-Empfängerschlüssel ist Entschlüsselung nicht möglich; dessen geschützte
Aufbewahrung und Wiederherstellungsprobe sind Teil des Betriebsprozesses.

## STRIDE und offene Freigabekriterien

| Kennung | Grenze / Bedrohung | Noch erforderlicher Nachweis |
|---|---|---|
| EOS-BACKUP-01 | Spoofing: fremd erzeugtes gültig verschlüsseltes Backup | Gepinnte Absendersignatur und separat verankerter Hersteller-Release-Schlüssel |
| EOS-BACKUP-02 | Tampering: Artefaktänderung, Rückstufung, Pfad-/Archivtricks | AEAD + Signatur + kanonisches Dateimanifest + adversariale Archivtests |
| EOS-BACKUP-03 | Repudiation: nicht zuordenbarer Stand | Release-/Quell-/Snapshotbindung und bereinigtes, geschütztes Prüfprotokoll |
| EOS-BACKUP-04 | Disclosure: DB-Passwörter, Vault-/CA-Schlüssel, unbestätigter Klartext | Verschlüsselte Ausgabe, root-private Quarantäne, Fehler-/Abbruchbereinigung |
| EOS-BACKUP-05 | DoS: große Archive, voller Datenträger, abgebrochener Restore | Ressourcenlimits, echte Abbrüche, Stromausfall-/Speichermangel-/Recoverytests |
| EOS-BACKUP-06 | Elevation: privilegierte Archiveinträge/Hookausführung | Kein Symlink/Specialfile/Setuid/Hook, strikt feste Zielwurzeln |
| EOS-BACKUP-07 | Physische Verfügbarkeit: inkonsistente Sollwerte/Wiederanlauf | Gestoppene konsistente Daten, kontrollierter Wiederanlauf und Gerätetests |

Alle sieben Kriterien sind für das tatsächliche Backup-/Restore-Werkzeug offen.
Die fünf CMS-Machbarkeitsprüfungen schließen sie nicht. In diesen Arbeiten wurde
keine Produktivdatei gesichert, keine Testschlüsseldatei veröffentlicht und kein
Zielsystem wiederhergestellt.
