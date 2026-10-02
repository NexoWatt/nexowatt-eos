# RC81-Feldtest-Checkliste – zentrale NVP-Zuordnung

- [ ] NexoWatt UI auf Version `0.8.206` aktualisieren und die Instanz vollständig neu starten.
- [ ] Browser mit `Strg + F5` neu laden.
- [ ] Unter **AppCenter → Zuordnung → Allgemein** die Netzanschlussleistung kontrollieren.
- [ ] Dort ebenfalls den signierten NVP-Datenpunkt prüfen: Bezug positiv, Einspeisung negativ.
- [ ] Unter **Netzlimits** darf kein editierbares Hard-Limit und kein zweiter NVP-Datenpunkt mehr erscheinen.
- [ ] Bei 30.000 W Netzanschlussleistung müssen 30.000 W Hard-Limit, 27.000 W Soft-Limit und 3.000 W Reserve angezeigt werden.
- [ ] Bei ungefähr −10.100 W Einspeisung müssen ungefähr 40.100 W Hard-Headroom und 37.100 W Soft-Headroom erscheinen.
- [ ] Einen alten gespeicherten `importHardLimitW`-Wert kontrollieren: Er darf die wirksame Grenze nicht verändern.
- [ ] RLM testweise aktivieren: Es darf die Anschlussgrenze nur absenken.
- [ ] Ohne Netzanschlussleistung muss die Diagnose „unconfigured“ melden; ein RLM- oder Legacy-Wert darf kein verstecktes Hard-Limit erzeugen.
- [ ] 0-Einspeisung prüfen: Sie verwendet weiterhin denselben zentralen NVP aus der Zuordnung.
- [ ] Neue Warnungen oder JS/TS-Abweichungen im Log kontrollieren.
