# SBOM-Bindung für lokal gehärtete Laufzeitpakete

Der Release-Gate prüft jetzt zusätzlich, dass die SBOM die tatsächlich vom Controller-Profil veränderten Komponenten als lokale Derivate beschreibt. Gleiche npm-Versionen und unveränderte Lockdateien reichen hierfür nicht aus. `build-bundle.cjs` übergibt das unabhängig geprüfte Ergebnis von `verifyBuildProfile` verbindlich an `verifySbomBinding`.

Der Python-Binder erzeugt pro betroffener Komponente `eos:transform:file-table-sha256`: SHA-256 über UTF-8-kodiertes kompaktes JSON der nach `relativePath` sortierten Objekte `{relativePath, sha256}`. Der JavaScript-Gate berechnet denselben Wert aus dem geprüften Profil, gleicht dessen Dateihashes mit der Release-Dateitabelle ab und verlangt `modified: true`, eine passende ursprüngliche Paketidentität unter `pedigree.ancestors` sowie das Fehlen irreführender Top-Level-Archivhashes. Die eigentlichen Dateien und das Profil bleiben unabhängig vom signierten Release und dessen Verifikation geschützt.

Zusätzlich werden manifestlose Pakete, bekannte vendorte Verzeichnisse ohne Manifest sowie nicht inventarisierte npm-Auflösungsgrenzen innerhalb von Paketunterverzeichnissen abgewiesen. Node kann auch aus `lib/node_modules/name/index.js` laden; eine reine Suche nach `package.json` oder Zuordnung zum äußeren Paket wäre unzureichend.

## Bedrohungsanalyse

| STRIDE | Konkreter Fall | Gegenmaßnahme und Test |
| --- | --- | --- |
| Tampering | Eine alte SBOM nennt die unveränderte Upstream-Komponente, obwohl der Controller danach lokal gehärtet wurde. | Verpflichtendes Profil-Binding; signierte veraltete SBOM wird im Release-CLI-Test abgelehnt. |
| Tampering | Eine passende Paketidentität verdeckt andere Transformationsdateien, falsche Hashes oder eine falsche Vorfahrenversion. | Exakte sortierte Dateitabelle, Abgleich mit Release-Dateihashes und Vorfahrenidentität; negative Tests für alle drei Fälle. |
| Repudiation | Upstream-Archivhashes erscheinen als Hash des lokal geänderten Artefakts. | Archivhashes dürfen bei veränderten Komponenten nur im Vorfahrennachweis stehen; Top-Level-Hashfeld wird abgewiesen. |
| Tampering | Zusätzlicher Node-Code wird ohne Manifest oder unter einer tieferen npm-Auflösungsgrenze mitgeliefert. | Dateibasierte Paketzuordnung und Verbot uninventarisierter Auflösungsgrenzen; negative Fixtures. |

65 Prüfungen bestanden: 30 JavaScript-Tests für SBOM/Release/Installationsvorprüfung unter Node 24.21.0, 29 Python-Binder-Tests einschließlich einer tatsächlichen Python→JavaScript-Paritätsprüfung und 6 bestehende Embedded-SBOM-Tests. Die Prüfungen nutzen isolierte Fixtures und führen keinen Online-Audit aus. Der zuvor offline erzeugte Abhängigkeitsbaum enthält beim begrenzten Dateipfad-Gegencheck keine von der neuen Regel abgewiesenen tieferen npm-Auflösungsgrenzen.

Grenzen: Der Abhängigkeitsgraph wird auf gültige Referenzen geprüft, nicht auf vollständige Übereinstimmung jeder Kante mit der Node-Auflösung. Die npm-Identitätsprüfung ist kein Hashvergleich jedes Paketinhalts mit seinem Upstream-Archiv. Unbekannte gebündelte Frontend-Abhängigkeiten, OS/Node-Binaries/Firmware sowie Hardware- und native ABI-Abnahmen bleiben außerhalb dieser SBOM-Prüfung. Die Tests sind weder CRA-Konformitätserklärung noch Produktfreigabe. Produktbäume wurden durch diese Änderung nicht bearbeitet; ihre SBOM muss vor dem nächsten Bundle mit dem aktualisierten Binder neu erzeugt werden.
