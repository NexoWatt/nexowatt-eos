# Korrektur der vollständigen Abhängigkeitsauflösung

Der erste CI-Lauf verweigerte die neue Runtime mit `DEPENDENCY_POLICY_REFRESH_PIN`: Die UI verlangte noch Adapterkern 3.4.1. Ihr separater Folgepatch setzt den exakten Pin auf 3.4.3 und übernimmt dessen Common-DB-7.2.5-Vertrag. Die Paketbaumrichtlinie bleibt unverändert streng.

Die Fehlerausgabe enthält jetzt ausschließlich bekannte öffentliche Paketnamen und Fehlercodes, begrenzte numerische Versionen sowie eine Einordnung als Wurzel-/Unterpaket. Eingabepfade, freie Fehlermeldungen und beliebige Metadaten werden nicht veröffentlicht. 23 gezielte Richtlinienprüfungen bestanden.

Eine tatsächliche Diagnoseauflösung aller neun Quellpakete mit deaktivierten Lifecycle-Skripten bestand die Prüfung des installierten Paketbaums. Der Diagnosehost verwendet Node 24.19/npm 11.9; dies ersetzt weder den verbindlichen Build unter Node 24.21/npm 11.19 noch native Tests, Signatur oder Pi-Abnahme. `diagnostic.json` enthält die beobachteten Versionen und Hashes, `verification.json` bindet Quellen und Prüfausgaben. Kein neues Lieferpaket freigegeben.
