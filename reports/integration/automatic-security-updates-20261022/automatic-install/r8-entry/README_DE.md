# Direkter R8-Einstieg in die Managed-Basis

Stand: 22.10.2026. Ausgangscommit und genaue Dateihashes stehen in
`verification.json`. Herstellerwerkzeug:
`tools/bootstrap/build-public-r8-managed-entry.cjs`.

Das Werkzeug bereitet den einmaligen Einstieg für das vollständig eingerichtete,
gesunde R8 mit Sequenz 11 direkt in Sequenz 15 vor. Es verlangt das tatsächlich
signierte Archiv aus `delivery/managed-test-15`, Node 24.22.1 als Zielstand und
den bestehenden dauerhaften öffentlichen Herstellerschlüssel. Es prüft die
Archivsignatur, Größe, Hash, Releaseidentität sowie die genaue Bindung des neuen
R8-Koordinators und seiner drei Migrationsquellen. Historische Lieferdateien
werden nicht verändert. Die Quelländerung erzeugt keine Signatur.

Der generierte Einstieg prüft die vorhandene R8-Laufzeit Node 24.21.0 und
benötigte Basiswerkzeuge einschließlich nft, ip und dnsmasq vor dem Download.
Er installiert selbst keine Linux-Pakete. Der Umstieg startet unter systemd
mit begrenzter Laufzeit, privater UMask 0077 und einer an dieselbe Invocation
gebundenen `ExecStopPost`-Aufräumprüfung. Die neue Node-Binärdatei bleibt Teil
des signierten Zielarchivs; der Einstieg überschreibt `/usr/bin/node` nicht.

`download-r8-managed.py` nutzt ausschließlich die vorhandene begrenzte
GitHub-Release-Transportfunktion aus `prepare-managed-host.py`. Deren
Frischinstallations- und APT-Ablauf wird nicht aufgerufen. Exakt ein Archiv mit
festem Tag, Release-ID, Größe und SHA-256 ist zugelassen. Der vollständige Hash
wird vor der begrenzten Datenextraktion geprüft; anschließend überprüft der
Koordinator seine Signaturen und die genaue Ausgangsanlage.

Aufruf auf dem Herstellerrechner, nach Erstellung des echten signierten Pakets:

```bash
node tools/bootstrap/build-public-r8-managed-entry.cjs --output /absoluter/neuer/ausgabeordner
```

Dies erstellt `update.sh` und `preparation.json` ohne Anwenderbefehl. Erst nach
Veröffentlichung des kleinen Einstiegs an einem unveränderlichen Git-Commit:

```bash
node tools/bootstrap/build-public-r8-managed-entry.cjs \
  --finalize-command /absoluter/neuer/ausgabeordner \
  --entry-base-url https://raw.githubusercontent.com/NexoWatt/nexowatt-eos/COMMIT_MIT_40_HEXZEICHEN/delivery/public-r8-managed
```

Der Platzhalter ist kein gültiger oder ausführbarer Anwenderbefehl.
Die Finalisierung bindet die lokalen Einstiegbytes und erzeugt
`R8_UPDATE_COMMAND.txt`. Sie prüft keine öffentliche Erreichbarkeit. Vor einer
Übergabe müssen Einstieg und Release-Asset öffentlich bytegenau zurückgelesen
werden. Ausgabeordner und Befehlsdateien werden nicht überschrieben.

Tatsächlich bestanden: **7 Node-Vertragsprüfungen** und **3 Python-Prüfungen**.
Geprüft sind Schlüsselaustausch, falscher Zielstand, unzulässige URLs und Größen,
Bash-Syntax, genaue eingebettete Helfer, unveränderlicher Einstieg-Pin,
manipulierte Vorbereitung, exklusives Schreiben, bereinigte Supervisorumgebung,
reale Prüfsummenberechnung sowie fehlerhafte/mehrdeutige Downloadkonfiguration.

Die Tests verwenden synthetische Archivbeschreibungen mit dem bereits
öffentlichen Herstellerschlüssel und ersetzen Netzwerk sowie `execve` durch
Testfunktionen. Kein neu signiertes Archiv wurde erstellt, kein echter
öffentlicher Download und kein R8-/Pi-/APT-/systemd-Umstieg ausgeführt. Die
Integration mit dem echten Zielpaket, öffentliche Auslieferung und Zielabnahme
bleiben offen. Rohbelege: `contracts.tap`, `python.txt`, `verification.json`.
