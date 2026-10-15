# Adapter-Core-Testfixtures 7.2.2

`cjs-adapter.original.txt` und `esm-adapter.original.txt` stammen aus den
vollständigen Distributionsdateien von `@iobroker/js-controller-adapter@7.2.2`
im lokal extrahierten R9-Appbaum. Keine Abschaltlogik wurde für die Fixtures
nachgebaut oder verändert. Die Dateien bleiben ausschließlich Prüfeingaben;
das Betriebspaket wird aus dem authentifizierten Lieferbaum transformiert.

Paketquelle laut vorhandenem `system/test-base/app/package-lock.json`:
`https://registry.npmjs.org/@iobroker/js-controller-adapter/-/js-controller-adapter-7.2.2.tgz`.
Paketintegrität: `sha512-oYq9Xyp3+agqo+VlY5Vlls4u14ysF+Wuuh6D6OmQE8Ts2jBaQJtmE+uocmo70r3ykqn4a66M7eH401DjZKx6DQ==`.
Die unveränderte MIT-Lizenz des Pakets liegt in `adapter-7.2.2.LICENSE`.

| Rekonstruierte Distributionsdatei | Bytes | SHA-256 |
| --- | ---: | --- |
| `build/cjs/lib/adapter/adapter.js` | 338797 | `d7e751c93c97636b7cd5772777cb5c79afca716cb921773115a35a6436f5b27b` |
| `build/esm/lib/adapter/adapter.js` | 406177 | `c8ff22090bcda3316a8f39ddb6c943e1320dc806109a0668a48c7bd900eeb7af` |

Die originale ESM-Datei besitzt keinen abschließenden Zeilenumbruch. Die
Textfixture ergänzt genau ein LF für Repository-Werkzeuge; der Test entfernt
dieses vor dem vollständigen Hashvergleich. CJS wird bytegleich gelesen.

Die Regression führt die tatsächlichen `_stop`- und `terminate`-Methoden aus
beiden Dateien aus. Uhr, Logger und Datenbankgrenze sind kontrollierte Fixtures.
Dies ist kein Ersatz für den nativen PostgreSQL-Gesamtlauf oder Pi-Hardwaretests.
