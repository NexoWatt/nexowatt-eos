# R8 direkt zur verwalteten Basis: Hostübernahme

Der neue Helfer übernimmt die 14 festen EOS-Systemd-Units aus dem authentifizierten R8-Zustand direkt in die signierte Zielbasis. Er installiert den dauerhaften öffentlichen Update-Prüfschlüssel, den getrennten Update-Dienst und den vorhandenen Netzwerkhelfer zunächst ohne eingerichtetes Gerätenetz. Der Koordinator muss beide vollständigen Releases prüfen, den Plan privat sichern, die Aktivierungssperre halten und alle Runtime-Prozesse stoppen. Der Helfer verändert weder Datenbank noch Benutzer-, Lizenz-, Zertifikats- oder Anlagenkonfiguration.

Die Aktivierung der Update-Automatik erfolgt erst, wenn Releasezeiger und Releasezustand die neue Basis bestätigen. Der Rückfall stellt die ursprünglichen Unit-Bytes nur bei weiterhin passenden Dateihashes wieder her. Fremde Änderungen führen zum Abbruch. Nichtleere Update-Protokolle bleiben erhalten; die bestehende Netzwerk-Rücknahme behält ihr Journal und das unprivilegierte Konto. Eine erneute Migration nach solchen Resten benötigt Prüfung.

**Tatsächlich geprüft:** 14/14 lokale Dateisystem- und Befehlsvertragsprüfungen, einschließlich Teilfehler, fremder Dateiänderung, manipulierter Planpfade und verfrühter Aktivierung. Systemd- und Netzwerkbefehle sind Test-Doubles. Dateihashes, Umgebung und Roh-TAP stehen neben diesem Bericht. **Nicht geprüft:** echter R8-Pi, Systemd-Migration, ARM64-Laufzeit und Anlage. Keine Produktionsfreigabe.

**Voraussetzung:** Die bereits vorhandenen Netzwerkwerkzeuge `ip`, `nft` und `dnsmasq` müssen vertrauenswürdig verfügbar sein. Der Helfer lädt keine Systempakete herunter und ersetzt keinen Neuinstallationslauf.

Der Zertifikatsprüf-Timer wird für den Wechsel pausiert; er prüft nur den Zustand und erneuert keine Zertifikate. Ein bereits laufender oder gerade startender Prüfdienst wird nicht beendet: die Übernahme bricht ab. Aktivierungszustand und Ein-/Ausschaltung des Timers bleiben erhalten. Beim Rückfall darf der Koordinator `restoreCertificateTimer` erst nach Wiederherstellung der alten Units, des Releasezeigers und des betriebsbereiten R8-Zustands aufrufen.

Die Unit-Dateien erhalten ihren vorgesehenen Modus `0644` bereits vor dem atomaren Austausch durch `fchmod`, auch bei einer Root-Umask von `0077`. Ein separater Test prüft dies für Installation und Rückfall.
