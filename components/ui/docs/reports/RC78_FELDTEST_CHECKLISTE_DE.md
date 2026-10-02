# RC78 Feldtest-Checkliste – NVP / reine Bezugsgrenze

## Vorbereitung

- [ ] NexoWatt UI 0.8.203 installieren und Adapter vollständig neu starten.
- [ ] Browser mit `Strg + F5` neu laden.
- [ ] Prüfen, dass der NVP-Datenpunkt frisch ist und das Vorzeichen stimmt: Bezug positiv, Einspeisung negativ.
- [ ] Konfigurierte Netzanschluss-/Bezugsgrenze dokumentieren.

## Einspeisefall

- [ ] Bei realer Einspeisung prüfen, dass `Gesamtbudget = aktuelle geregelte Istlast + Bezugsgrenze − NVP` gilt.
- [ ] Bei 30,0 kW Grenze und ungefähr −10,1 kW NVP muss das Gesamtbudget ungefähr 40,1 kW betragen.
- [ ] Nach 11,0 kW EVCS- und 9,3 kW Speicherreservierung muss das Restbudget ungefähr 19,8 kW betragen.
- [ ] Die Diagnose darf die Einspeisung nicht mehr vom Budget abziehen.

## Bezugsfall und Schutz

- [ ] Bei normalem Bezug darf das Budget die Bezugsgrenze nicht überschreiten.
- [ ] Bei Überschreitung der Bezugsgrenze müssen laufende flexible Verbraucher aktiv reduziert werden.
- [ ] Stations-, Geräte-, Phasen-, §14a-, Parkregler- und Safety-Grenzen weiterhin prüfen.
- [ ] NVP veraltet/unterbrochen simulieren: positive Lastfreigaben müssen fail-closed blockiert werden.

## Parallelverbraucher

- [ ] EVCS und Speicher gleichzeitig anfordern und prüfen, dass der gemeinsame Headroom nur einmal vergeben wird.
- [ ] Fremd gesteuerte Speicherladung ohne aktiven EOS-Writer darf nicht als EOS-Istlast zurückaddiert werden.
- [ ] Keine Sprünge, Doppelreservierungen oder unerklärlichen negativen Restbudgets in der EMS-Diagnose.

## Abschluss

- [ ] Systemlog mindestens 15 Minuten auf Safety-, NVP-, Budget- und Writer-Fehler beobachten.
- [ ] Prognosefunktion aus RC77 erneut kurz kontrollieren.
- [ ] Screenshot der EMS-Diagnose mit NVP, Gesamtbudget, Reservierungen und Restbudget sichern.
