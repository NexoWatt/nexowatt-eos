# Betrieb und Abnahme der OS-Sicherheitsupdates

Stand `0.2.0-dev.5`, 01.10.2026. **Entwicklungsquellen; keine Freigabe zur
Installation auf dem bestehenden Pi.** `EOS-HOST-REDIS-20261001` bleibt offen.
Die folgenden Angaben beschreiben den vorbereiteten Zielbetrieb und die
spätere Abnahme; sie bescheinigen keinen bereits ausgeführten Update-Lauf.

## Vorgesehener Ablauf

Der signierte Installer legt auf einem freigegebenen frischen Host die
rootgeschützte Richtlinie und einen täglichen Timer an. Starten muss ausdrücklich
angefordert sein; `--start false` aktiviert keinen Update-Timer. Die
Voraussetzungen werden geprüft, nicht vom Installer ungefragt nachinstalliert.

Der EOS-Timer startet zwischen 02:00 und etwa 02:15 Uhr in der Zeitzone
`Europe/Berlin`. Ein verpasstes Fenster wird nicht überraschend am Tag
nachgeholt. Ohne erreichbare und erfolgreich geprüfte Paketquellen gibt es
keine Erfolgsmeldung. Ein manuell oder durch andere Dienste gesetztes Paket-Hold
wird nicht übergangen. Ein bereits vorhandener Debian-Updatetimer ist ein
separater Pfad und muss bei der Host-Abnahme berücksichtigt werden; die
Einstellungen dieses Timers werden nicht still überschrieben.

Die neue Karte in den Einstellungen zeigt angemeldeten Benutzern den letzten
Versuch, den letzten erfolgreichen Durchlauf, offene und blockierte Updates,
den Stand des Nachweises sowie ausstehende Neustarts. Mehr als 36 Stunden alte
Angaben, fehlende Dateien, nicht prüfbare Zustände, ein inaktiver Timer oder
fehlgeschlagene Läufe erzeugen keine grüne Anzeige. Ein Erfolg bedeutet einen
abgeschlossenen Wartungslauf, nicht die garantierte Behebung aller bekannten
Produktlücken. Die Anzeige fordert selbst keinen Root-Befehl an.

Das Updateprotokoll bleibt beim Hostdienst; die UI zeigt nur feste Diagnosecodes
und geprüfte Zusammenfassungen. Status und CycloneDX-Paketinventar stehen unter
`/var/lib/nexowatt-eos-os-updates`. Dieses Verzeichnis darf dem EOS-Dienstkonto
nicht zum Schreiben übergeben werden.

## Wartungsentscheidungen

Automatische Updates sind in der rootverwalteten Richtlinie standardmäßig
aktiv. Ein berechtigter Host-Service kann sie durch `enabled: false` in
`/etc/nexowatt-eos-os-updates/policy.json` vorübergehend aussetzen. Dateirechte
und atomare Bereitstellung müssen erhalten bleiben; bestehende
Pakettransaktionen werden dabei nicht unterbrochen. Der nächste Timerlauf
meldet die Deaktivierung. Bis dahin zeigt die UI die letzte Beobachtung samt
Zeitpunkt. Ein benutzerfreundlicher produktweiter Aufschub-/Opt-out-Ablauf
ist vor Serienfreigabe noch zu ergänzen; es gibt hier keinen versteckten
Administratorzugang für Endbenutzer.

Ein erforderlicher Rechnerneustart erfolgt nicht automatisch. Er muss vom
Service mit den betrieblichen Schutzfunktionen der Anlage koordiniert werden.
Paket-Installationsskripte können bereits während des Wartungslaufs einzelne
Dienste neu starten. Das Wartungsfenster allein belegt daher noch keinen
störungsfreien Anlagenbetrieb. Eine laufende Pakettransaktion niemals mit
`kill -9`, Stromtrennung oder durch Löschen der dpkg-Locks abbrechen.

## Erforderliche Tests auf isoliertem Zielhost

Nach Behebung des Redis-Befunds, neuem signiertem Paket und Sicherung des
bestehenden Systems sind folgende Abnahmen durchzuführen:

1. Debian 13 ARM64/Pi 5 zuerst, danach das gesonderte Debian-12-Profil. Wirkliche
   Paketstände, OS-/Kernel-/Firmwareherkunft, Node-Bindung und Schlüsselringe
   aufnehmen. Keine Live-Gerätesteuerung im ersten Lauf.
2. Uhrzeit/Zeitzone, EOS- und Distributions-Timer, Paketquellen, APT-Holds und
   geschützte Pfade prüfen. Ein vorhandenes altes EOS wird nicht vom
   Neuinstallationspfad übernommen.
3. Einen tatsächlichen Sicherheitsupdate-Lauf mit bekannten Vorher-/Nachher-
   Paketständen ausführen. Signaturfehler, nicht erreichbare Quelle,
   abgelaufene Metadaten und Paket-Locks müssen sichtbar fehlschlagen.
4. Anzeigen für fehlenden/veralteten Status, abgeschaltete Automatik,
   zurückgehaltene Pakete, fremde Paketquellen und nötige Neustarts abnehmen.
   Nicht authentifizierte Zugriffe müssen abgelehnt werden.
5. Aktivierung von Kernel-/Bibliothekskorrekturen nach geplantem Neustart
   nachweisen. Eine unveränderte Versionsanzeige eines laufenden Prozesses ist
   kein erfolgreicher Aktivierungsnachweis.
6. Auf einer entbehrlichen Kopie Datenträgerdruck, Speicherdruck, Prozessabbruch
   und Stromverlust sowie Reparatur/Wiederherstellung prüfen. RAM-Grenzen des
   Updaters können einen Paketprozess unter Last beenden; die Rückgewinnung
   eines konsistenten dpkg-Zustands ist noch nicht auf Hardware nachgewiesen.
7. Die erzeugte CycloneDX-SBOM mit `dpkg-query` und den Transaktionsbelegen
   abgleichen. EOS-/npm-, manuell installierte und Firmware-Komponenten
   gesondert inventarisieren. Backup und Rückfall auf einen abgenommenen
   Gesamtstand nachweisen.

Die lokale Statuskarte ersetzt keine ständig besetzte Überwachung. Bei einem
Offline-Gerät oder ausgefallenen System kann sie keine neue Information
übermitteln. Ein Herstellerprozess für überfällige Geräte und dringende
Korrekturen gehört zusätzlich in die Serienfreigabe.

Architektur, STRIDE und regulatorische Einordnung:
[`OS_SECURITY_UPDATES_DE.md`](../security/OS_SECURITY_UPDATES_DE.md).
