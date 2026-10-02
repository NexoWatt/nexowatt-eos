# NexoWatt EOS 1.0.13 – offizielle Stable-Version

## SmartHome-Rechte

| Bereich | User/Kunde | Installer | Admin |
| --- | --- | --- | --- |
| Bereits konfigurierte Geräte bedienen | Ja, nach Kunden-Bedienpolitik | Ja | Ja |
| SmartHome einrichten, importieren, DPs zuordnen | Nein | Ja | Ja |
| Freie Datenpunktsuche/-prüfung und NexoLogic-Editor | Nein | Ja | Ja |
| SMTP-Versand einrichten und Lizenz verwalten | Nein | Nein | Ja |

Diese Rollenregel ersetzt ausdrücklich die Kunden-Einrichtungsfreigabe früherer
Versionen. Sie gilt in der Navigation, bei direkten Seitenaufrufen und im Backend.
Auch `/static/`-Seiten, alte Kunden-Sessions mit Wildcards, offene Kundenbedienung
und deaktivierte Kundenanmeldung dürfen die Einrichtung nicht freigeben.

Die SmartHome-Ansicht lädt ihre Navigation über `/api/smarthome/layout`. Dieses
Lesemodell enthält Etagen, Räume, Funktionen und Seiten, keine Gerätezuordnungen,
Szenen oder internen Metadaten. Bedienendpunkte verwenden weiterhin konfigurierte
Geräte-IDs und prüfen schreibgeschützte Geräte. Vorhandene Zuordnungen bleiben
bestehen; Änderungen nimmt ein Installer oder Admin vor.

## Logo

Der bisherige Verweis `../admin.png` zeigte unter `/mail-setup/` auf den nicht
vorhandenen Endpunkt `/admin.png`. Der gemeinsame React-Seitenkopf importiert
jetzt das vorhandene NexoWatt-Symbol als Vite-Asset. Der Build und die explizite
Paketdateiliste enthalten das Bild. Browserprüfungen kontrollieren die tatsächliche
Bilddekodierung, nicht nur das Vorhandensein eines `img`-Elements.

## Pflege und Update

Die Quellen bleiben deutsch kommentiert; Wegweiser und generierte Verknüpfungen
werden mitgepflegt. PWA-Cache v512 lädt die neue Oberfläche. Nach vollständigem
Adapterupdate den Adapter neu starten und den Browser neu laden.

Die Publish-/Überkopierprüfungen aus 1.0.12 bleiben aktiv. Diese ZIP veröffentlicht
nichts auf GitHub/npm und versendet keine echten Test-E-Mails. Prüfdetails stehen
im zugehörigen Bericht unter `docs/reports/`.
