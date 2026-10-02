# NexoWatt EOS 0.8.169 RC45 – Zugriffs- und Editorstabilität

## Ziel

RC45 schließt zwei bestätigte Stable-Blocker, ohne die produktiven Energie- und Regelalgorithmen zu verändern:

1. Der NexoLogic-Editor muss auf dem Desktop vollständig erreichbar und in alle Richtungen scrollbar sein.
2. EMS/App-Center, Lizenz und Simulator müssen unabhängig von Kundenfreigaben ausschließlich Installer/Admin zugänglich sein.

## NexoLogic-Scrollbereiche

Die Seite verwendet weiterhin die vollständige Desktopbreite mit Bausteinpalette, großer Zeichenfläche und Eigenschaftenleiste. Zusätzlich gelten nun eindeutige Scrollverträge:

- sichtbare vertikale Seitenscrollleiste bei geringer Fensterhöhe;
- horizontale Seitenscrollleiste, wenn der Desktop schmaler als die vorgesehene Arbeitsbreite ist;
- eigene horizontale und vertikale Scrollleisten innerhalb der Zeichenfläche;
- unabhängige vertikale Scrollleisten für Bausteinpalette und Eigenschaften;
- stabile Scroll-Gutter, damit der Canvas beim Einblenden der Leisten nicht springt.

Ein echter Chromium-Test lädt einen 2800 × 1900 Pixel großen Graphen, verschiebt Canvas und Seite horizontal/vertikal und prüft, dass die untere sowie rechte Arbeitsfläche erreichbar bleiben.

## Strikter Lizenzschutz

Die Lizenzverwaltung verwendet die Capability `license.manage`. Freigegeben sind ausschließlich:

- Admin;
- Installer;
- optional ein ausdrücklich konfigurierter und geheimnisgeschützter Trusted-Header.

Nicht ausreichend sind:

- ein nicht angemeldeter Browser;
- ein Endkundenkonto;
- `protectWrites=false`;
- deaktivierte allgemeine Kunden-Authentifizierung;
- ein direkter Link oder Bookmark;
- `/static/license.html`;
- der alte React-Hash `#/license`.

Die serverseitige Route prüft die Rolle vor der HTML-Auslieferung. Die APIs `/api/license/info` und `/api/license/save` prüfen dieselbe strikte Sitzung. Die Browserseite prüft zusätzlich `license.manage`, lädt erst danach UUID und Schlüssel und löscht beide bei Logout oder Seitenwechsel.

## Rollenaufteilung

| Bereich | Endkunde | Installer/Admin |
|---|---:|---:|
| SmartHome bedienen | Ja | Ja |
| SmartHome konfigurieren und koppeln | Ja | Ja |
| NexoLogic bearbeiten | Ja | Ja |
| Datenpunkte für SmartHome/NexoLogic auswählen | Ja | Ja |
| EMS/App-Center | Nein | Ja |
| Lizenz | Nein | Ja |
| Simulator | Nein | Ja |
| Beliebige fremde Datenpunkte testweise beschreiben | Nein | Ja |

## Unveränderte Kernbereiche

RC45 verändert keine fachlichen Parameter oder Regler in Lade- und Lastmanagement, Netzanschluss-/Phasenschutz, §14a/EEBUS, Speicher, Speicherfarm, FENECON/FEMS, Heizstab, Thermik oder SafetyEnvelope.

## Feldabnahme

1. NexoLogic bei normaler und niedriger Browserhöhe öffnen; die Seite lässt sich bis zum unteren Bereich scrollen.
2. Einen großen Graphen horizontal und vertikal bewegen.
3. Als nicht angemeldeter Benutzer Lizenz, EMS und Simulator per Menü und direkter URL öffnen; es dürfen keine Inhalte sichtbar sein.
4. Als Endkunde SmartHome und NexoLogic öffnen, konfigurieren und speichern.
5. Als Installer anmelden; Lizenzdaten werden erst danach angezeigt und der Schlüssel bleibt verdeckt.
6. Abmelden; UUID und Schlüssel verschwinden sofort aus der Ansicht.
