# R5-Reparatureinstieg: CI-Veröffentlichung

Stand 03.10.2026, Ausgangsquellcommit
`1a1a1003da76999dca473a5e6c832ddcef091935`; Änderungen durch Dateihashes gebunden.

Der neue Workflow `eos-r5-repair-entry.yml` baut ausschließlich den Einstieg für
das bereits veröffentlichte, signierte R5-Archiv. Der Helfer
`prepare-public-repair-publication.cjs` prüft einen öffentlichen HTTPS-Rückabruf
gegen die lokalen Archiv-, Schlüssel- und Metadatenbytes und lässt pro Commit
nur die ausdrücklich benannten neuen Lieferdateien zu. Zwei lokale Commits
vermeiden einen selbstbezüglichen Hash: zuerst Skript und Nachweise, danach der
Einzeiler mit dem unveränderlichen ersten Commit. Ein normaler Push setzt einen
unveränderten `main`-Ausgangspunkt voraus. Kein Token wird in Git-Konfiguration,
Dateien, URLs oder Ausgaben gespeichert; der Askpass-Helfer liest die nur im
Push-Schritt vorhandene Token-Umgebungsvariable.

`tests/bootstrap/public-repair-publication.test.cjs` prüft acht Fälle mit echten
temporären Git-Repositories: Byte-/Hashvergleich, beschränkter Dateiumfang,
unveränderte Quellbasis, fremde Dateien, unerlaubte Quellenänderungen, fehlende
oder nachträglich geänderte Dateien, Links sowie die Bindung des konkreten
Befehls an seinen Einstieg-Commit. Zusammen mit den 13 Transportprüfungen sind
21 lokale Tests bestanden. Rohbeleg und Quellhashes:
`public-repair-publication-tests.tap` und
`public-repair-publication-verification.json`.

Die lokalen Tests führen keine GitHub-Veröffentlichung, keinen Netzwerkabruf
und keinen Pi-Update aus. Erst der tatsächliche CI-Lauf kann den öffentlichen
Rückabruf und die Veröffentlichung nachweisen. Native Reparatur,
systemd-Abbruchverhalten, Admin-Login und Hardwaretests bleiben gesonderte
Nachweise. Keine Produktions- oder CRA-Freigabe.
