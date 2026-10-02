# RC62 – Cross-App-Stabilisierung

## Zweck

RC62 ist bewusst kein neues Funktionsrelease. Es stabilisiert die vorhandenen Apps und ihre gemeinsamen Laufzeitverträge vor dem letzten anlagenweiten Feldtest.

## Zentrale Regel

Alle produktiven Energie- und Gerätebefehle bleiben an den vorhandenen Single-Writer- und Safety-Vertrag gebunden:

```text
App oder Optimierungslogik
        ↓
fachliches EOS-Modul
        ↓
Netz-, Stations-, §14a-, Parkregler- und Gerätegrenzen
        ↓
Aktor-Arbitrierung / Single Writer
        ↓
Gerät
```

RC62 führt keinen zusätzlichen konkurrierenden Hardware-Writer ein.

## Welche Apps besonders nachgebessert wurden

### AppCenter

Thermik- und Heizstabfelder können wieder ohne JavaScript-Abbruch geändert werden. Die Oberfläche kennzeichnet ungespeicherte Änderungen und setzt die Kennzeichnung nach Laden oder Speichern zurück.

### SmartHome und NexoLogic

Typbeschriftungen, Validierung, Gerätetyp-Icons und verzögerte Refreshs nach Medienbefehlen verwenden wieder existierende Helfer. Dadurch entstehen keine stillen ReferenceErrors mehr, wenn der Kunde Player, Sender, Playlists oder Gerätekonfigurationen bedient.

### Mesh/Microgrid

Receiver-Konfiguration, Peer-Feldtest, Fehlerklassifizierung, Roundtrip-Diagnose und Limitansicht verwenden jetzt jeweils ihren eigenen gültigen Datenkontext. Der echte Zwei-Instanzen-Test bleibt ein Feldtest, da er eine reale Gegenstelle benötigt.

### Lademanagement-Diagnose

Die Diagnoseübergabe ist explizit und unabhängig von einem nicht vorhandenen lokalen Funktionsparameter. Die Ladeentscheidung und der Single Writer bleiben unverändert.

## Unverändert maßgebliche Schutzfunktionen

- Safety-Envelope;
- Aktor-Arbitrierung;
- Netzanschluss- und Phasengrenzen;
- Stations- und Ladepunktgrenzen;
- §14a und Parkregler;
- Speicher-Schutzgrenzen und Speicherfarm-Dispatch;
- Heizstab-Nachtsperre;
- OCPP21-Befehlsbestätigung und Safe-Zero-Vertrag;
- Modbus-/Alfen-Keepalive;
- Messwert-Freshness und Fail-safe-Reaktion.

## Feldteststrategie

Nicht alle Apps gleichzeitig neu aktivieren. Pro Anlage zuerst den bisherigen Normalbetrieb beobachten, danach genau eine zusätzliche Funktion oder Ressource freigeben. Bei Betriebsstrategien zunächst Observe verwenden. Bei manuell zugeordneten Aktoren immer Sollwert, Rückmeldung und tatsächliche Hardwarewirkung gemeinsam prüfen.
