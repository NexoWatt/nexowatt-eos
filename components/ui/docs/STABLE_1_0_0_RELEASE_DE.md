# NexoWatt EOS 1.0.0 – offizielle Stable-Version

**Veröffentlichungsdatum:** 2026-09-06  
**Status:** Official Stable / produktiver Verkaufsstand

## Freigegebener Funktionsstand

NexoWatt EOS 1.0.0 übernimmt den abschließend geprüften Funktionsstand der RC93-Baseline. Bei der Stable-Promotion wurden keine EMS-Regelalgorithmen, Hardware-Writer, Schutzgrenzen oder Prioritäten verändert. Geändert wurden ausschließlich Versions-, Release-, Dokumentations- und sichtbare Stable-Kennzeichnungen sowie die dazugehörige Release-Prüfung.

## Netzlimit und Einspeisebegrenzung

Die Netzlimit-App kann ohne EZA-/Parkregler eine lokale maximale Einspeisung am Netzverknüpfungspunkt vorgeben. `0 W` bedeutet echte Nulleinspeisung; positive Werte begrenzen die maximal zulässige Nettoeinspeisung in Watt.

Ein zertifizierter EZA-/Parkregler wird nur dann als bevorzugte Führungsquelle verwendet, wenn dessen App und Schnittstelle aktiviert, die Inbetriebnahme bestätigt, die Installateurfreigaben gesetzt und eine gültige Wirkleistungsvorgabe vorhanden sind. Fehlt eine dieser Voraussetzungen, bleibt EOS die führende Regelung.

Die wirksame Grenze ist stets der strengere Wert aus lokaler Sicherheitsobergrenze und gültiger externer Vorgabe. Die Netzbetreiber-Schnittstelle schreibt nicht direkt auf Anlagenkomponenten; der `GridConstraints Export Guard` bleibt der einzige produktive Asset-Writer.

## Sicherheitsinvarianten

- signierter NVP: Netzbezug positiv, Einspeisung negativ;
- lokale Sicherheitsobergrenze kann durch externe Vorgaben nicht erhöht werden;
- fehlende, leere oder ungültige externe Werte werden nicht als `0 W` interpretiert;
- ausdrückliche `0-W`-Vorgaben, Trip und Sperre bleiben echte Nulleinspeisung;
- TTL, Qualität, Gültigkeit, Rückfall und begrenzte Haltezeit werden überwacht;
- PV-Überschuss wird zuerst durch lokale Verbraucher, freigegebene Ladepunkte und flexible Verbraucher, danach durch zulässige Speicherladung und optional Mesh/Microgrid genutzt; erst der verbleibende Rest wird abgeregelt;
- PV-Abregelung und Speicherentladung dürfen nicht gleichzeitig als Normalzustand bestehen.

## Abgrenzung der Stable-Freigabe

Die Stable-Freigabe bestätigt den reproduzierbar geprüften Softwarestand. Sie ersetzt keine projektspezifische Inbetriebnahme, Netzbetreiberfreigabe, Anlagenzertifizierung oder Herstellerabnahme. Da Parkregler- und reale Einspeisebegrenzungs-Hardware nicht in jeder Testanlage verfügbar ist, müssen Vorzeichen, Messwertfrische, Schreibpfad, ACK/Rückmeldung, Kommunikationsausfall und Rückfallart bei jeder Kundenanlage zunächst im Diagnosemodus und anschließend kontrolliert im Aktivmodus geprüft und dokumentiert werden.

## Release- und Update-Grundsatz

Für Support und Verkauf ist dieses vollständige Repository der Referenzstand. Spätere Fehlerkorrekturen werden als reguläre Patch-Versionen ab `1.0.1` veröffentlicht; Funktionsänderungen erfolgen nachvollziehbar über Minor- oder Major-Versionen.
