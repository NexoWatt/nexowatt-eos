# NexoWatt EOS 1.0.16

Dies ist die offizielle Stable-Version 1.0.16 vom 19.09.2026.

Microgrid ist jetzt durchgängig eine EMS-App. **EMS Apps → Apps → EOS Mesh/Microgrid** verwaltet Installation und Aktivierung. Der zugehörige Reiter umfasst Master/Slave-Einrichtung, Trafo-Grenzen, Teilnehmerübersicht und optionales Zählerarchiv samt Abrechnungsentwürfen. Der zusätzliche Einstieg auf der Installer-Startseite entfällt.

Ohne gespeicherte Installation sind Seite und zugehörige APIs gesperrt. Im inaktiven Zustand ist Einrichtung möglich, Regelkommunikation und Aufzeichnung bleiben aus. Installer und Admin behalten die technischen Rechte; normale Nutzer erhalten keinen Konfigurationszugriff.

Bestehende Verbünde aus 1.0.14/15 werden einmalig mit unveränderten Paarungen und Sicherheitsdaten in das AppCenter übernommen. Bereits aktive oder verriegelte Regelkonfigurationen dürfen weder per Schalter noch per Backup-Import ausgeschaltet/deinstalliert werden. Eine geplante physische Stillsetzung bleibt erforderlich; keine automatische Freigabe bestehender Schutzgrenzen. Gespeicherte Archive werden beim Ausschalten einer Diagnose-App nicht gelöscht.

Die vorhandenen Leistungsregler, DC-/AC-Minimalgrenzen, Trafo-Verteilung und getrennten Archivkanäle bleiben erhalten. Geräte-Watchdogs und die Prüfung mit echten Messwerten und Stellgeräten sind weiterhin Voraussetzung der aktiven Inbetriebnahme. Speicherfarmen und bislang gesperrte Herstellersonderpfade sind dadurch nicht zusätzlich freigegeben.

Die beschleunigte npm-Veröffentlichung bleibt unverändert: `npm publish` führt die vorhandenen Prüfungen am fertig gebauten Artefakt aus. Weder Produktdateien noch Freigabeprüfsummen werden beim Veröffentlichen neu erzeugt.

[Einrichtung und Sicherheitsvertrag](MICROGRID_MASTER_SLAVE_DE.md) · [Prüfbericht](reports/STABLE_1_0_16_VALIDATION_DE.md)
