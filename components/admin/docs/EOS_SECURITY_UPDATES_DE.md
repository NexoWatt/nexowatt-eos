# EOS- und Linux-Sicherheitsupdates im Admin

Stand: 22.10.2026. Bereich: System/Grundeinstellungen → EOS-Updates.

Die Anzeige trennt den signierten EOS-Lieferstand einschließlich Node.js von
der täglichen Linux-Paketwartung. Ein erfolgreiches EOS-Update bestätigt nicht,
dass sämtliche Linux-Pakete aktuell oder bereits in laufenden Prozessen wirksam
sind. Der js-controller bleibt beim vereinbarten Hauptstand 7.

## Anzeige und Bedienung

- Der Dialog zeigt die installierte Node.js-Version und die im angebotenen
  signierten EOS-Paket enthaltene Version. Die bestehende Wartungsbestätigung
  bleibt vor der Installation erforderlich. EOS und die passende Laufzeit
  werden gemeinsam durch den getrennten Systemdienst installiert und geprüft.
- Für Linux erscheinen die tatsächlich beobachtete Automatik und Zeitsteuerung,
  letzter Versuch und erfolgreicher Durchlauf, offene/blockierte/zurückgehaltene
  Sicherheitsupdates sowie der Aktivierungs- und Neustartbedarf.
- Unbekannte, veraltete, fehlerhafte oder unvollständige Daten werden nicht als
  vollständig aktualisiert angezeigt. Ein früher erfolgreicher Durchlauf ist
  kein aktueller Gesundheitsnachweis. Zurückgestellte Paket-Dienstaktionen
  bleiben ausdrücklich sichtbar, auch wenn kein einzelner Dienst gezählt wird.
- Linux-Wartung und EOS-Installation können aufeinander warten. Der Dialog zeigt
  diesen Zustand. Er löst weder einen Linux-Neustart noch einen unkontrollierten
  Paketlauf aus. Erforderliche Neustarts gehören in die koordinierte Wartung.
- Bei einem Neustart des Updatedienstes bleibt dessen nicht erreichbarer Status
  ausdrücklich erkennbar. Soweit der Admin antwortet, wird der getrennte
  Linux-Status weiterhin angezeigt. Der Browser fragt bei laufenden Updates
  oder Verbindungsfehlern nach fünf Sekunden erneut ab; ansonsten wird der
  geöffnete Dialog alle 30 Sekunden aktualisiert.

## Grenzen und Herkunft der Daten

`src/lib/eosOsUpdateStatus.js` liest ausschließlich die feste Datei
`/var/lib/nexowatt-eos-os-updates/status.json`. Alle Pfadvorfahren müssen
root-eigene Verzeichnisse ohne Gruppen-/Weltschreibrecht sein. Die Datei muss
regulär, root-eigen, ohne zusätzliche Hardlinks und ebenfalls ohne diese
Schreibrechte sein. `O_NOFOLLOW`, `O_NONBLOCK`, ein fester 64-KiB-Grenzwert,
UTF-8-Prüfung und Metadatenvergleich begrenzen den Lesevorgang. Gleichzeitige
Anfragen teilen einen Lesevorgang und einen fünf Sekunden langen Cache.

Der typgeprüfte Status enthält nur Zeitpunkte, Zähler und feste Zustandswerte.
Paketlisten, Quellenadressen, SBOM-Pfade, private Rohfehler und freie Texte aus
der Wartungsdatei werden nicht an den Browser weitergegeben. Frische wird
serverseitig bestimmt. Der ergänzende boolesche Wert `maintenanceDeferred`
wird ausschließlich aus dem festen Kennzeichen `eos-maintenance-in-progress`
abgeleitet. Unbekannte Vertragswerte führen zur Warnanzeige.

Die vorhandene HTTPS-/Rollenprüfung von
`/nexowatt/managed-updates/status|check|install` bleibt erhalten. Nur Service und
Installateur können diese Admin-Schnittstelle nutzen; jede Anfrage prüft die
aktuelle Berechtigung. Schreibzugriffe verlangen zusätzlich Same-Origin und
den bestehenden benannten Header. Es wurde kein neuer privilegierter
Aktionsendpunkt eingeführt. Browserinhalte werden mit `textContent` erzeugt.

Quelle und ausgelieferte JavaScript-/CSS-Dateien werden gemeinsam gepflegt;
der Backend-Build kopiert bereits ausführbares JavaScript unverändert. Der
vorhandene Prebuilt-Vertrag versiegelt diese Dateien nach den Prüfungen.

## Prüfgrenze

Der Änderungsnachweis liegt unter
`reports/integration/automatic-security-updates-20261022/admin/` im EOS-Repository.
Die lokalen Status-/HTTP-Vertragsprüfungen sind keine Installation, kein
Paketlauf und keine Anlagenabnahme. Die erweiterten Chromium-Szenarien gehören
zum vorhandenen Managed-Updates-CI-Job; fehlende lokale Browserausführung wird
im Prüfbericht ausdrücklich ausgewiesen. Pi-/systemd-/Hardwareabnahme bleibt
offen.
