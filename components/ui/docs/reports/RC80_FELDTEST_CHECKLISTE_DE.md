# RC80-Feldtest-Checkliste – festes 10-%-Soft-Limit

- [ ] NexoWatt UI auf Version `0.8.205` aktualisieren und die Instanz vollständig neu starten.
- [ ] Browser mit `Strg + F5` neu laden.
- [ ] AppCenter → Netzlimits öffnen.
- [ ] Prüfen, dass kein manuelles Feld für Soft-Limit oder Soft-Reserve mehr angeboten wird.
- [ ] Bei 30.000 W Hard-Limit muss die Anzeige 3.000 W Reserve und 27.000 W Soft-Limit zeigen.
- [ ] Bei einer abweichenden Vorgabe, beispielsweise 50.000 W, müssen 5.000 W Reserve und 45.000 W Soft-Limit erscheinen.
- [ ] In `gridConstraints.importLimits.*` müssen `softLimitMode=fixed-10-percent`, `reserveW=10 %` und `softLimitW=90 %` veröffentlicht werden.
- [ ] Netzbezug unterhalb des Soft-Limits: Stufe `normal`.
- [ ] Netzbezug ab Soft-Limit: Stufe `soft` und keine weitere unkontrollierte Laststeigerung.
- [ ] Netzbezug ab Hard-Limit: Stufe `hard` und aktive Reduktion flexibler Lasten.
- [ ] Einspeisung muss den Headroom weiterhin erhöhen.
- [ ] 0-Einspeisung, PV-Prognose, Speicher und Lademanagement anschließend auf Regressionen prüfen.
