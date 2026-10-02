# NexoWatt EOS Admin 7.9.89 – Stable

Version 7.9.89 ist die freigegebene Produktlinie für NexoWatt-EOS-Verkaufssysteme auf Basis der bewährten Admin-7-Laufzeit.

## Produktfunktionen

- Rollenmodell **Admin / Service**, **Installateur** und **Gast / Endkunde**.
- Expertenmodus ausschließlich für Admin / Service.
- Installateurzugriff für Inbetriebnahme, Konfiguration und Fehlersuche.
- Endkundenzugriff für freigegebenes Smart Home, Räume, Funktionen und NexoWatt-Bedienbereiche.
- Erstanmeldung von `installer` und `guest` direkt in der normalen Anmeldekarte: Benutzerstufe wählen, Passwort einmalig leer lassen und anschließend zwingend ein persönliches Passwort vergeben.
- Passwort-Reset: Admin / Service darf Installateur und Endkunde zurücksetzen; Installateur ausschließlich Endkunde.
- EOS Assist im Kopfbereich ohne Überlagerung der Inhaltsfläche.
- Zugangsverwaltung ausschließlich unter **Zugänge & Rechte**.
- Moderne aktuelle **Übersicht**; die Easy-Übersicht wird nicht als Produktstartseite verwendet.
- Interner System-Admin und interne BackItUp-Notfallreserve nur für Admin / Service sichtbar.
- NexoWatt Sicherung für die dafür freigegebenen Rollen nutzbar.
- Standardport 8081; interne Admin-Reserve auf 127.0.0.1:18081.

## Sicherheitsprinzip

Ausgeblendete Bedienelemente sind nicht die einzige Schutzschicht. Kritische Aktionen werden zusätzlich über Rollenprüfung, Socket-Guard und Objekt-ACLs abgesichert. Fehlende oder unbekannte Rollen fallen auf die geringsten Endkundenrechte zurück.

## Rückfallstand

Die vorherige Stable 7.9.86 bleibt als dokumentierter Rückfallstand erhalten. Vor einem Produktupdate ist ein vollständiges Backup vorgeschrieben.
