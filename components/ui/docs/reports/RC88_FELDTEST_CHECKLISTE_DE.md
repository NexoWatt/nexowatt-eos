# RC88 Feldtest-Checkliste

1. Adapter aktualisieren und vollständig neu starten.
2. Mindestens eine Live-Oberfläche öffnen, schließen und über VPN/Netzwerkunterbrechung erneut öffnen.
3. Im Log auf `[sse-guard]`, `[RC88 watchdog]` und `[memory-guard]` achten. Bei niedriger Heap-Auslastung sind keine wiederkehrenden Speicher-/SSE-Warnungen zulässig; echte Schutzmeldungen müssen gedrosselt bleiben.
4. Adapter-RAM/Heap über mindestens 24 Stunden beobachten. Nach UI-Verbindungswechseln muss sich der Heap stabilisieren und darf nicht stetig bis 2 GB wachsen.
5. Einen Ladepunkt offline nehmen. Andere Ladepunkte und der EMS-Regeltick müssen weiterlaufen.
6. NVP-Hard-/Soft-Limit, §14a, Tarifwechsel, Speicherbetrieb, Forecast und 0-Einspeisung gegen RC87 vergleichen; die Sollwerte dürfen sich durch RC88 nicht fachlich ändern.
7. Kontrollieren, dass kein `JavaScript heap out of memory` und kein `SIGABRT` mehr entsteht.
8. Ein kontrollierter Exit-Code 11 darf nur bei anhaltend kritischem Heap als letzte Notbremse auftreten. Im Feld ist zu kontrollieren, dass der aktivierte ioBroker-Adapter anschließend automatisch wieder gestartet wird; ein wiederholter Restart-Zyklus ist nicht zulässig.
