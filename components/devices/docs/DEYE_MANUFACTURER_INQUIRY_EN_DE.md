# DEYE manufacturer inquiry – draft, not sent

## English

Subject: Modbus RTU integration with NexoWatt EOS – model coverage, battery data and external control

Dear DEYE Technical Support Team,

We are integrating DEYE equipment into our NexoWatt EOS energy management system. We are preparing three separate Modbus RTU profiles: single-phase hybrid, three-phase low-voltage hybrid and three-phase high-voltage hybrid inverters.

Our references are the supplied single-phase V118 PDF and three-phase V105.4 document, whose revision history includes changes dated January 2025. Before enabling active battery control, please confirm the following:

1. **Supported models and firmware:** Please provide a model/firmware compatibility matrix for both register maps, including the meanings of device types 0x0300, 0x0500, 0x0600 and 0x0601. Which newer models require different maps? Are separate protocols available for string/microinverters, PCS systems and standalone battery/BMS access?

2. **Connection and defaults:** Please confirm 9600 baud, 8 data bits, no parity, 1 stop bit; the factory slave address; direct register addressing; and FC03 reads/FC16 writes. Please provide the correct external EMS port and pinout, timing/polling limits, maximum registers per request and the supported way to coexist with a DEYE logger, meter or another controller.

3. **Measurements and scaling:** Please clarify the contradictory “H:1W H:10W” unit for three-phase register 590, battery charge/discharge and grid import/export signs, LV/HV scaling, temperature offsets and energy-counter units/rollover. Please confirm the 32-bit low/high-word pairs 625/690, 636/694 and 653/659, and how to identify firmware supporting those high words.

4. **Battery and parallel systems:** Does register 590 report battery input 1 or total battery power? How should values from two battery inputs and parallel inverters be combined? Please clarify SOC aggregation and access to battery limits, alarms, SOH and pack data, including whether the 10000+ BMS block uses a separate endpoint or slave address.

5. **Active external control:** Please provide the supported commands for battery charge/discharge power and grid power/export targets for all three families. For registers 1100 onward, please explain remote modes 1–3, activation/deactivation order, watchdog refresh and fallback behaviour. What rated-power reference and sign convention apply to the 0.1% values in 1109/1111? Please resolve the range/value contradictions in 1104/1105 and the overview describing 500–2000 as read-only. What is the equivalent interface for single-phase units?

6. **Configuration and validation:** Please confirm the permitted ranges and persistence of single-phase limits 210/211/230/245 and three-phase limits 108/109/128/143, their interaction with BMS/TOU settings, and any flash-write limits. Please provide example request/response frames and commissioning tests for charge, discharge, zero power and communication loss.

An up-to-date English protocol, preferably with an Excel/CSV register list and model/firmware mapping, would help us complete and validate the integration.

Best regards,
NexoWatt EOS Integration Team

## Deutsch

Betreff: Modbus-RTU-Anbindung an NexoWatt EOS – Modellabdeckung, Batteriedaten und externe Steuerung

Sehr geehrtes DEYE-Support-Team,

wir integrieren DEYE-Geräte in unser Energiemanagementsystem NexoWatt EOS. Dafür bereiten wir drei getrennte Modbus-RTU-Profile vor: einphasige Hybridwechselrichter, dreiphasige Niedervolt-Hybride und dreiphasige Hochvolt-Hybride.

Grundlage sind die bereitgestellte einphasige V118-PDF und das dreiphasige V105.4-Dokument, dessen Änderungshistorie Einträge bis Januar 2025 enthält. Bevor wir die aktive Batteriesteuerung freigeben, bitten wir um Bestätigung folgender Punkte:

1. **Modelle und Firmware:** Bitte senden Sie eine Modell-/Firmware-Matrix für beide Registerpläne einschließlich der Gerätetypen 0x0300, 0x0500, 0x0600 und 0x0601. Welche neueren Modelle benötigen andere Registerpläne? Gibt es separate Protokolle für String-/Mikrowechselrichter, PCS und den direkten Batterie-/BMS-Zugriff?

2. **Anschluss und Vorgaben:** Bitte bestätigen Sie 9600 Baud, 8 Datenbits, keine Parität, 1 Stopbit, die werkseitige Geräteadresse, direkte Registeradressierung sowie FC03 zum Lesen und FC16 zum Schreiben. Wir benötigen den richtigen externen EMS-Anschluss samt Pinbelegung, Zeit-/Abfragegrenzen, maximale Registerzahl je Anfrage und die unterstützte Koexistenz mit DEYE-Logger, Zähler oder einem weiteren Regler.

3. **Messwerte und Skalierung:** Bitte klären Sie die widersprüchliche Angabe „H:1W H:10W“ bei Register 590, die Vorzeichen für Laden/Entladen und Netzbezug/Einspeisung, LV-/HV-Skalierungen, Temperaturoffsets sowie Einheiten und Überläufe der Energiezähler. Bitte bestätigen Sie die 32-Bit-Low-/High-Word-Paare 625/690, 636/694 und 653/659 und die Erkennung kompatibler Firmware.

4. **Batterien und Parallelbetrieb:** Beschreibt Register 590 Batterieeingang 1 oder die gesamte Batterieleistung? Wie werden Werte zweier Batterieeingänge und paralleler Wechselrichter zusammengeführt? Bitte erläutern Sie Gesamt-SOC sowie den Zugriff auf Batteriegrenzen, Alarme, SOH und Packdaten. Liegt der BMS-Block ab 10000 auf einem anderen Anschluss oder einer anderen Geräteadresse?

5. **Aktive externe Steuerung:** Bitte nennen Sie die freigegebenen Befehle für Lade-/Entladeleistung sowie Netzleistungs-/Einspeiseziele aller drei Familien. Für Register ab 1100 benötigen wir die Bedeutung der Remote-Modi 1–3, die Ein-/Ausschaltreihenfolge sowie Watchdog-Erneuerung und Rückfallverhalten. Auf welche Nennleistung beziehen sich die 0,1-%-Werte in 1109/1111, und welches Vorzeichen gilt? Bitte klären Sie auch die widersprüchlichen Bereiche/Werte von 1104/1105 und die Übersicht, die 500–2000 als nur lesbar ausweist. Welche entsprechende Schnittstelle gibt es bei einphasigen Geräten?

6. **Konfiguration und Prüfung:** Bitte bestätigen Sie Wertebereiche und Speicherung der einphasigen Grenzen 210/211/230/245 sowie der dreiphasigen Grenzen 108/109/128/143, deren Zusammenspiel mit BMS-/TOU-Einstellungen und mögliche Flash-Schreibgrenzen. Bitte stellen Sie Beispieltelegramme und Inbetriebnahmetests für Laden, Entladen, Nullleistung und Kommunikationsausfall bereit.

Ein aktuelles englisches Protokoll, möglichst mit einer Excel-/CSV-Registerliste und Modell-/Firmware-Zuordnung, würde uns helfen, die Integration abzuschließen und zu prüfen.

Mit freundlichen Grüßen
NexoWatt EOS Integrationsteam
