# Geräte-CA für den geschützten Erststart unter Windows

Stand: 03.10.2026. Gilt für den gemeldeten Zustand
`HTTPS_FIRST_START_READY`. Der Installer wird dafür nicht erneut gestartet.

## Öffentliches Zertifikat übertragen

Mit der bereits vertrauenswürdig eingerichteten WinSCP-/SSH-Verbindung als
normaler Pi-Benutzer ausschließlich `/etc/nexowatt-eos/web/ca.crt` in den
Windows-Ordner `%USERPROFILE%\Downloads` übertragen. Im aktuellen signierten
Hostinstaller ist diese öffentliche Datei mit Modus 0644 lesbar; die relevanten
Elternverzeichnisse sind 0755. Private Schlüssel bleiben auf dem Pi.

Den vom Installer über das vertrauenswürdige Terminal angezeigten vollständigen
SHA-256-Zertifikatsfingerabdruck bereithalten. Er bezieht sich auf die DER-Bytes
des Zertifikats. `Get-FileHash ca.crt` über die PEM-Textdatei liefert einen
anderen Wert und ist hierfür nicht geeignet.

## Prüfen und für den aktuellen Windows-Benutzer importieren

Windows PowerShell normal öffnen. Der folgende Block fragt den Fingerabdruck
vom Terminal ab, prüft ihn und importiert erst bei Übereinstimmung in den
Vertrauensspeicher des aktuellen Benutzers. Der gesamte Block wird zusammen
eingefügt; bei Fehlern endet der Block vor dem Import.

```powershell
& {
    $ErrorActionPreference = 'Stop'
    $eosFile = Join-Path $env:USERPROFILE 'Downloads\ca.crt'
    $eosExpected = (Read-Host 'SHA-256-Fingerabdruck aus dem Pi-Terminal').Replace(':', '').Trim().ToUpperInvariant()
    if ($eosExpected -notmatch '^[0-9A-F]{64}$') { throw 'Ungueltiger Fingerabdruck.' }
    $eosCert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($eosFile)
    $eosSha = [System.Security.Cryptography.SHA256]::Create()
    try { $eosActual = ([System.BitConverter]::ToString($eosSha.ComputeHash($eosCert.RawData))).Replace('-', '') }
    finally { $eosSha.Dispose(); $eosCert.Dispose() }
    if ($eosActual -ne $eosExpected) { throw 'Fingerabdruck stimmt nicht. Kein Import.' }
    Import-Certificate -FilePath $eosFile -CertStoreLocation Cert:\CurrentUser\Root -ErrorAction Stop
}
```

Eine zugehörige Windows-Rückfrage zur Aufnahme dieser CA erst nach erfolgreichem
Abgleich bestätigen. Chrome berücksichtigt ausdrücklich hinzugefügte lokale
Vertrauensanker im Windows-Benutzerspeicher. Browser schließen, neu öffnen und
die vom Installer genannte HTTPS-Adresse auf Port 8443 aufrufen. Bei weiter
angezeigter Zertifikatswarnung Fehlercode melden; nicht übergehen. Verwaltete
Windows-Richtlinien können Benutzerimporte beschränken.

## Einrichtungscode

Der Besitzcode gilt zehn Minuten ab Erzeugung. Nach erfolgtem Zertifikatsimport
bei abgelaufenem Code ausschließlich im vertrauenswürdigen Root-Terminal auf
dem Pi einen neuen ausstellen und lokal anzeigen:

```bash
/usr/bin/node /opt/nexowatt/eos/current/runtime/onboarding/issue-code.cjs &&
cat /etc/nexowatt-eos/setup-code.txt
```

Dies erneuert Code und Sitzung für eine noch offene Einrichtung, startet aber
keine Neuinstallation. Der Dienst muss dafür nicht neu gestartet werden.
Nach begonnenem verbindlichem Abschluss oder abgeschlossener Einrichtung wird
die Erneuerung abgewiesen. Code und Passwörter nicht in Berichte übernehmen.

Im Assistenten werden Standort, Geräte-UUID/Lizenz, Anlagenplan und persönliches
Servicepasswort bearbeitet. Eine ausdrücklich gewählte Einrichtung ohne Lizenz
erteilt keine Steuerrechte. Fehlende Anlagendaten bleiben als offen markiert.
Browserabschluss, Login, Neustart und Geräte-/Anlagenabnahme sind eigene Prüfungen.

## Quellen und Prüfgrenze

Hostpfade und Ablauf wurden mit `tools/bootstrap/first-start.cjs`,
`runtime/transport/web-certificates.cjs`, `runtime/onboarding/issue-code.cjs`
und der Erststart-Anleitung abgeglichen. Dieser Vermerk ist eine Anleitung,
kein auf dem Windows-Rechner des Nutzers ausgeführter Import- oder Browsertest.

- [Microsoft: Import-Certificate, Beispiel CurrentUser\\Root](https://learn.microsoft.com/en-us/powershell/module/pki/import-certificate?view=windowsserver2025-ps)
- [Microsoft: DER-Zertifikatsdaten](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.x509certificates.x509certificate.getrawcertdata?view=netframework-4.8.1)
- [Chromium: lokale Vertrauensanker unter Windows](https://chromium.googlesource.com/chromium/src/+/HEAD/net/data/ssl/chrome_root_store/faq.md)
- [Installation und verbleibende Pi-Abnahme](STABILITY_TEST4_DE.md)
