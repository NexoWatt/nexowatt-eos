> Dev8-Ergänzung vom 02.10.2026: Gehärteter PostgreSQL-Store und separater
> mTLS-Erweiterungskanal; Details, Prüfgrenzen und offene Isolation unter
> `docs/security/ADAPTER_CHANNEL_DEV8_DE.md`. Vorhandene Testinstaller sind unverändert.

# EOS-System: STRIDE-Bedrohungsmodell

Stand: 30.09.2026. **Entwurf**, keine Bestätigung der Wirksamkeit. Die maschinenlesbare Quelle ist [`threat-model.json`](../../system/security/threat-model.json); Anforderungen stehen in [`requirements.json`](../../system/security/requirements.json). Bestehende Befunde `NW-EOS-260930-01` bis `-12` bleiben bestehen; dieses Modell überschreibt weder ihren Status noch ihre Nachweise.

## Grenzen und Angreifer

Schutzgüter sind Anlagen-/Netzgrenzen, Regelverfügbarkeit, Mess- und Sollwerte, Konfiguration, Schlüssel, Lizenzinformationen, Sicherungen und Releaseintegrität. Ein kompromittierter Browser, Adapter, Feldteilnehmer oder Management-Netzteilnehmer wird angenommen. Physischer Zugriff und Datenträgerdiebstahl müssen hardwarebezogen bewertet werden; vollständiger Schutz gegen einen Eigentümer mit Root-/Hardwarekontrolle wird nicht versprochen.

Sechs Grenzen sind getrennt zu prüfen: Browser → Admin/UI; Modul → Bus/Daten; Feldgerät → Regelung; Aussteller/Release → Gerät; Laufzeit → Hostwartung; Sicherung → wiederhergestelltes System. Ein gemeinsamer ioBroker-Benutzer oder Datenbankzugang bildet **keine** Grenze zwischen Adaptern. TLS allein ändert daran nichts.

## Szenarien nach Modul

| Modul | Bedrohung | Geplante Gegenmaßnahme |
| --- | --- | --- |
| OS-Basis | Adapter erlangt Hostrechte | Eigene Dienstidentitäten, minimale Rechte, getrennte Wartung |
| EOS Core | Veraltete/duplizierte Steuerwerte | Frische, Reihenfolge, Grenzen und gerätespezifischer Failsafe |
| EOS Admin | Übernahme oder Teilabschluss der Einrichtung | Authentisierte Einrichtung, atomarer Abschluss, kein HTTP-Fallback |
| NexoWatt UI | Browser umgeht Rollen/Freischaltung | Autorisierung und Lizenzprüfung serverseitig |
| EOS Devices | Manipulierte Feldmesswerte | Gerätebereiche, Schreibrechte, Plausibilität und Aktualität |
| Backitup | Geheimnisverlust oder bösartiger Restore | Authentisierte Verschlüsselung, Pfad-/Format-/Identitätsprüfung |
| EEBUS | Fremdes Pairing oder Nachrichtenflut | Geprüfte Kopplung, Identität, Nachrichten- und Ressourcenlimits |
| Identität/Lizenz | Gefälschte Lizenz oder Schlüsselabfluss | Getrennter Aussteller, lokale Signaturprüfung, minimale Freigaben |
| Kommunikationsbus | Mitlesen oder unzulässiger Modulaufruf | TLS 1.3/mTLS, eigene Identitäten, Autorisierung je Operation |
| Datendienst | Querzugriffe oder verlorene TLS-Konfiguration | Datenrechte, geschlossene Verträge, sichere Migration |
| Update-Dienst | Fremdpaket, Downgrade, Teilupdate | Vertrauenskette, Signatur/Hash, atomare Aktivierung und Rückfall |
| Audit/Health | Manipulierte Ereignisse oder Logflut | Geschützte, begrenzte Protokolle; erkennbarer Überwachungsausfall |

Die vollständigen Szenarien enthalten jeweils STRIDE-Kategorie, Angriffsannahme, Auswirkung, Kontroll-/Anforderungsbezug und positive/negative Testkennungen. Modulübergreifende Szenarien behandeln insbesondere die gemeinsame ioBroker-Identität, Funktionsregression bei Migration und fehlende Schwachstellenbearbeitung.

## Offene Nachweise

Eigene Admin-7-/UI-/Devices-/Backitup-/EEBUS-Quellen und exakte Versionen fehlen im geprüften Installer-Repository. Dessen Admin-8-Nachweise gelten nicht automatisch für EOS Admin 7. Neue Dienstidentitäten und TLS-Verträge sind Zielzustände. Interne File-/JSONL-Server werden nicht durch ein angenommenes `secure: true` zu TLS-Servern.

Nicht verschlüsselbare Geräteprotokolle benötigen begrenzte Kommunikationsbereiche und explizite Restrisikobewertung. Keine Segmentierung darf als Verschlüsselung ausgewiesen werden. Eintrittswahrscheinlichkeit, Schadensschwere und Ziel-Sicherheitslevel bleiben bis zur konkreten Anlagenbewertung offen. Alle hier zugeordneten Laufzeittests stehen auf **geplant**, einschließlich Hardware-, Ausfall- und unabhängiger Sicherheitsprüfungen.
