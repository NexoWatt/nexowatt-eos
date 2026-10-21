# Zusätzliche exakte Bare-Paketverträge für den frischen Laufzeitbaum

Der CI-Lauf `39668069277`, Job `119458285632`, zum Quellstand
`745dcefef3f24aa768fec7feb5d48789494738df` bestand die vollständige
Abhängigkeitsauflösung. Die anschließende Vorbereitung brach mit
`FRESH_BUILD_ARCHITECTURE` ab, bevor der neue native Gesamtlauf begann.

Eine Diagnosekopie des tatsächlichen neu aufgelösten ARM64-Paketbaums wurde
mit der bestehenden exakten Serialport-Normalisierung behandelt. Danach
blieben ausschließlich 26 nicht freigegebene Bare-Assets: `bare-fs 4.8.4`
und `bare-url 2.5.5`. Die bisherige Architekturliste kannte nur 4.8.2 bzw.
2.5.4. `bare-path 3.1.2`, die Esbuild-Datei und beide Serialport-Pakete
bestanden ihre bestehenden Prüfungen.

Die neue Richtlinie ergänzt ausschließlich diese zwei exakten Paketversionen.
Ihre Registry-URL, SHA512-Integrität, Manifest- und Loaderhashes sowie Größe
und SHA256 aller 26 nativen Dateien sind fest gebunden. Die bestehenden
Format-, Plattform-, Varianten- und Node-ABI-Prüfungen bleiben erhalten.
Die historischen Bare-Verträge werden nicht umgeschrieben. Andere Versionen
erhalten keine pauschale Freigabe.

Beide npm-Cachearchive wurden unabhängig anhand ihrer SHA512- und SHA256-Werte
geprüft. Sämtliche 27 Dateien je Paket stimmen bytegenau mit dem installierten
Baum überein. Der Bare-Loader verwendet `require.addon()`; die untersuchten
Node-Eltern lösen `fs` als eingebautes Node-Modul auf. Das ist keine allgemeine
Behauptung, die Assets seien unter allen Umständen unerreichbar.

Nachweise:

- 31 Architekturvertragsprüfungen bestanden. Die neuen Negativfälle weisen
  geänderte Inhalte mit weiterhin gültigen Headern sowie Registry-, SRI-,
  Manifest-, Loader- und Dateivollständigkeitsabweichungen zurück.
- Der tatsächliche normalisierte Diagnosebaum besteht die statische Prüfung:
  42 native Dateien, darunter 39 als Bare-Laufzeitassets klassifizierte Dateien.
- Je eine echte ARM64-Datei von `bare-fs` und `bare-url` wurde hinter den
  unveränderten Headern um genau ein Byte verändert. Beide Fälle werden mit
  `ARCH_BARE_NATIVE_CONTENT` abgewiesen; Originalbytes anschließend wiederhergestellt.

Die Diagnose lief lokal unter Node 24.19.0. Es wurde kein ARM64-Binärcode
ausgeführt und kein Lieferpaket freigegeben. Die statische Klassifikation als
Bare-Asset ist keine Freigabe als Node-Addon, keine ABI-Laufzeitprüfung und
keine Pi-/Hardwareabnahme. Der erneute vollständige Build unter Node 24.21.0,
native Integration, Signatur und Pi-Abnahme bleiben erforderlich.
