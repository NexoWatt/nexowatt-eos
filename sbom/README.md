# Beobachteter Quellstand – keine vollständige EOS-SBOM

`eos-installer-source.cdx.json` ist eine **unvollständige CycloneDX-1.7-Quell-SBOM** des root Installer-Manifests. Die tatsächlichen Quellen, Versionen, Laufzeiten und OS-Pakete eines gemeinsamen EOS-Systems sind damit noch nicht inventarisiert. `eos-installer-source.coverage.json` enthält die fehlenden Bereiche und die ausschließlich deklarierten, nicht aufgelösten Paketbereiche.

Die Dateien wurden mit `tools/sbom/source_sbom.py` erstellt. Git-HEAD und `package.json`-SHA-256 stehen in beiden Dateien; der gesamte Arbeitsbaum wird ausdrücklich nicht als vollständig erfasst ausgegeben. Der gespeicherte HEAD ist der bei der Erzeugung gelesene **Ausgangsstand**, nicht automatisch der spätere Commit, in dem diese Nachweisdateien eingecheckt werden. Der Manifesthash bindet die tatsächlich ausgewerteten Bytes.

Eine CI-Ausführung erzeugt jeweils neue Dateien außerhalb dieser versionierten Momentaufnahme. Verbrauchende Releaseprozesse dürfen diesen vorbereitenden Snapshot nicht als aktuelle Build-/Geräte-SBOM weiterreichen. Geltungsbereich, Erzeugung, Tests und Bedrohungsmodell: `docs/security/SBOM_PIPELINE.md`.
