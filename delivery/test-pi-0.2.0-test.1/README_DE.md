# EOS 0.2.0-test.1 für einen getrennten Test-Pi

Dieses signierte ARM64-Testbundle enthält js-controller 7.2.2, EOS Admin 7.10.11 und NexoWatt UI 1.0.21. Der Quellstand des vollständigen Repositorys lautet 0.2.0-dev.3. Node 24.21.0 wird als separates offizielles ARM64-Archiv mitgeliefert. Linux und Redis müssen auf dem Zielgerät gesondert vorbereitet und geprüft werden.

**Keine Freigabe für reale Geräte-/Mesh-Regelung oder produktiven Anlagenbetrieb.** Der vollständige UI-Testlauf hat einen offenen Mesh-Zeitfehler. Das integrierte Laborprofil startet keinen Mesh-Koordinator und sperrt physische Mutationen; diese Grenzen sind im Komponenten- und Prozesslauf geprüft. Die echte ARM64-/Pi-/Systemd-Abnahme steht noch aus.

Vollständige Schritte: `docs/operations/TEST_PI_INSTALLATION_DE.md`. Zuerst Modell, Betriebssystem und Datenträger auslesen; keine vorhandenen Daten überschreiben. Individuelle Startpasswörter und ein authentifizierter öffentlicher Hersteller-Lizenz-Trust-Export sind Einrichtungsanforderungen. Die eigene Testlizenz muss später zur echten Geräte-UUID passen. Keine Hersteller-Lizenz wird durch dieses Paket erfunden oder vorgetäuscht.

Der SHA256 des öffentlichen **Test**-Releaseschlüssels (`release-public.pem`, PEM-Dateibytes) lautet:

`e4e2465af8ae947574804f42c5ed17072ada8831b9839876f188c0e7c4c08cbe`

Vor Root-Ausführung diesen Wert und die Lieferprüfsumme über den bestätigten Übergabeweg abgleichen. Der private Test-Releaseschlüssel ist nicht enthalten. Das ist kein produktiver Hersteller-Freigabeschlüssel. `bundle.sha256` bindet Laufzeitarchiv, öffentlichen Schlüssel und Node-Archiv; allein mitgelieferte Prüfsummen begründen noch kein Vertrauen in eine fremde Quelle.

Das Archiv entpackt zu `bundle/{manifest.json,manifest.sig,payload/}`. Der signierte Releasebezeichner ist:

`a687feab64ffb230694b8af5342082dafcce771b2e76885445754e7c35025c88`

Die Signatur bindet 17.877 Dateien sowie Dateimodi, Node-Version, ARM64-Ziel und Testprofil. Windows, x64 und andere Node-Versionen dürfen dieses Installationspaket nicht durch Abschalten der Prüfung starten. Die npm-SBOM ist im signierten Payload enthalten; weitere Inventare, Prüfungen und offene Anforderungen stehen im vollständigen Repository.
