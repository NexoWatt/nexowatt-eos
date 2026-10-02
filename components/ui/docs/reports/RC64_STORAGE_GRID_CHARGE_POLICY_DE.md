# NexoWatt UI 0.8.189 RC64 – Speicher-Netzladefreigabe

## Zweck

RC64 korrigiert ausschließlich die wirtschaftliche Freigabe für das Laden von Einzelspeichern und Speicherfarmen aus dem Netz. Die in RC63 eingeführte UND-Verknüpfung aus günstigem Stromtarif und aktivem NT-Fenster war zu streng und entsprach nicht der gewünschten Betriebsweise.

## Verbindliche Regel

Die beiden Betriebsarten sind alternativ:

### Zeitvariables Netzentgelt aktiviert

Das Speicher-Netzladen wird freigegeben, wenn das aktuell gültige, vom Betreiber konfigurierte NT-Fenster aktiv ist. Beim Quartalsmodell werden ausschließlich die für das aktuelle Quartal hinterlegten Q1–Q4-Zeiten verwendet.

Der dynamische Strompreis ist in diesem Modus keine zusätzliche Pflichtbedingung. Ein neutraler, teurer, fehlender oder veralteter Preis hebt ein aktives NT-Fenster nicht auf.

Außerhalb des konfigurierten NT-Fensters bleibt Speicher-Netzladen gesperrt – auch dann, wenn der dynamische Strompreis günstig ist.

### Zeitvariables Netzentgelt deaktiviert

Das Speicher-Netzladen wird freigegeben, wenn:

- der dynamische Tarif aktiviert ist,
- der aktuelle Preis frisch ist,
- der Tarifzustand als `günstig` klassifiziert ist.

Ein manuelles NT-Fenster ist in diesem Modus nicht erforderlich.

## Gemeinsame Masterbedingungen

Unabhängig vom wirtschaftlichen Freigabepfad müssen weiterhin alle folgenden Bedingungen erfüllt sein:

- Netzladen ist in Speicherregelung beziehungsweise Speicherfarm im AppCenter freigegeben,
- die Tarifpriorität gibt den Speicher frei,
- ein beschreibbarer Speicher- beziehungsweise Farm-Writer ist vorhanden,
- eine positive Speicher-Netzladeleistung ist konfiguriert,
- keine übergeordnete Netz-, Safety-, SoC- oder Gerätesperre ist aktiv.

## Freigabematrix

| Zeitvariables Netzentgelt | Aktueller Zustand | Dynamischer Tarif | Ergebnis Speicher-Netzladen |
|---|---|---|---:|
| An | konfiguriertes NT aktiv | beliebig | ✅ erlaubt |
| An | Standard oder HT | günstig | ❌ gesperrt |
| An | NT-Zeiten fehlen | beliebig | ❌ gesperrt |
| Aus | – | günstig und frisch | ✅ erlaubt |
| Aus | – | neutral oder teuer | ❌ gesperrt |
| Aus | – | Preis veraltet/fehlt | ❌ gesperrt |
| Aus | – | dynamischer Tarif aus | ❌ gesperrt |

Die AppCenter-, Prioritäts-, Writer- und Leistungsbedingungen gelten zusätzlich zu jeder Tabellenzeile.

## Zeitfenster

Es werden keine versteckten Standardzeiten verwendet. Maßgeblich sind ausschließlich:

- `netFeeNtStart` / `netFeeNtEnd` beim einfachen HT-/NT-Modell,
- `netFeeQ1NtStart` / `netFeeQ1NtEnd`,
- `netFeeQ2NtStart` / `netFeeQ2NtEnd`,
- `netFeeQ3NtStart` / `netFeeQ3NtEnd`,
- `netFeeQ4NtStart` / `netFeeQ4NtEnd` beim Quartalsmodell.

Zeitfenster über Mitternacht, beispielsweise `22:00–06:00`, werden unterstützt. Fehlende Start- oder Endzeiten sperren den NT-Pfad fail-closed.

## Nicht verändert

- PV- und NVP-basiertes Laden bleibt unabhängig vom Netzlade-Gate möglich.
- Speicherentladung, Eigenverbrauchsoptimierung und NVP-Balancing bleiben aktiv, sofern keine andere Regel sie begrenzt.
- EVCS-Tarifsteuerung und Ladepunktlogik wurden in RC64 nicht verändert.
- Die OCPP21-Availability-/RFID-Korrektur aus RC63 bleibt unverändert erhalten.
