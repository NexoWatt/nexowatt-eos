# CI-Nachprüfung: unveränderter historischer R6-Quellumfang

Anlass: Der Bootstrap-CI-Job `119450459508` für `19c250a` meldete im Test
`valid current Admin seal cannot widen the historical R6 source scope` eine
veraltete Erwartung. Das aktuelle Admin-Siegel enthält zusätzlich die bei der
Sicherheitsaktualisierung bewusst aufgenommenen Frontend-Paketmanifeste.

Ausschließlich die exakte Negativerwartung des Tests wurde ergänzt. Weiterhin
zurückgewiesen werden `components/admin/docs/EOS_NETWORK_DE.md`,
`components/admin/src-admin/package-lock.json` und
`components/admin/src-admin/package.json`. Die Ablehnung des gesamten modernen
Siegels mit `R6_ADMIN_SOURCE_SEAL` bleibt vorgeschrieben. Builder, historische
Quell-Allowlist, gebundene Lieferdateien und Fixture-Hash bleiben unverändert.

Lokale Prüfung unter Node 24.19.0 / Linux x64:
`node --test --test-reporter=tap reports/integration/installable-test3-r6-20261004/build-revision.test.cjs`
bestand mit **8/8 Tests**, ohne Überspringen; die historischen Git-Blobs wurden
erfolgreich gelesen. `git diff --check` bestand ebenfalls. Der geänderte Test
wurde zusätzlich isoliert erfolgreich ausgeführt.

`ci-followup-installer.json` bindet Quellen und Rohprotokoll an SHA-256. Dies ist
kein erneuter CI-, Runtime-Build-, Installations- oder Hardwarebeleg. Der
nachfolgende CI-Lauf bleibt bis zu seiner tatsächlichen Ausführung offen.
