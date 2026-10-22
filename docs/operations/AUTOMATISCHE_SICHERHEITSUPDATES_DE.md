# Automatische Aktualisierung von Node.js und Linux

Stand: 22.10.2026. Ziel ist die selbstständige Installation von
Linux-Sicherheitsupdates und freigegebenen Node-24-Aktualisierungen ohne
Bedienklick. Die Funktion gehört zur neuen Managed-Basis ab Sequenz 15.
Für einen vollständig eingerichteten R8-Teststand ist ein eigener direkter
[Übergang implementiert](R8_DIREKT_MANAGED_UPDATE_DE.md); R9–R11 müssen dabei
nicht nacheinander installiert werden.
Ein Quellcommit verändert keinen Pi. Die signierte Auslieferung und die
Abnahme auf dem Test-Pi sind weiterhin erforderlich.

## Node.js als Bestandteil der EOS-Lieferung

Die neue Frischbasis verwendet Node **24.22.1** und js-controller **7.2.5**.
Der [offizielle Sicherheitsrelease vom 21.10.2026](https://nodejs.org/en/blog/release/v24.22.1)
ersetzt für diese Lieferung den zuvor vorgesehenen Node-Stand 24.21.0.
Der bisherige native Nachweis am Quellcommit
`a2733fa5561f7327ff3689b7464f8727760fb670` bleibt ein Nachweis für seinen
damaligen Stand; er qualifiziert diese neue Laufzeit nicht.
Der neue Stand `06ed52f636d0da58d56a86646cdbe4ba601f1776` besitzt inzwischen
seinen eigenen erfolgreichen Linux-x64-Nachweis mit sechs Adaptern, Lizenzen,
Backup und Neustart. Das erzeugte unsignierte Archiv wurde zurückgelesen und
gegen Quell-, Stücklisten- und native Nachweise geprüft. Die ARM64-/Pi-Abnahme
und die signierte Auslieferung stehen weiterhin aus.

Der Hersteller übernimmt eine genaue offizielle Node-Datei, prüft deren
SHA-256 und bindet Binärdatei, Lizenztext, Versionsmetadaten und SBOM in die
signierte EOS-Lieferung ein. Die Anlagen beziehen keine beliebige neueste
Node-Version von npm oder einem Installationsskript. Die gemeinsame Lieferung
erhält einen neuen Quell-, Build- und Integrationsnachweis.

Im EOS-Admin zeigt **EOS-Updates** die installierte und die angebotene
Node-Version. Reine Node-Updates erhalten eine gesonderte Herstellerfreigabe
im signierten Feed. Der Empfänger prüft zusätzlich, dass sämtliche Anwendungs-,
Adapterkatalog- und Hostdateien unverändert sind. Nur die Node-Dateien und ihre
gebundenen Build-/Stücklistennachweise dürfen sich ändern.

Diese Pakete werden im täglichen Zeitfenster **02:30 bis 03:00 Uhr,
Europe/Berlin**, automatisch installiert und durch einen kontrollierten
EOS-Dienstneustart aktiviert. Es gibt keinen nachgeholten Start tagsüber und
höchstens einen automatischen Versuch pro Kalendertag. Signatur, Zeitgültigkeit,
Ausgangszustand und Wartungssperre werden erneut geprüft. Ein unterbrochener
Vorgang mit ungeklärtem Zustand sperrt weitere Installationen.

Der Releasezeiger verbindet Anwendung und Node-Laufzeit; bei einem
fehlgeschlagenen Start müssen beide auf den überprüften Vorgänger zurückfallen.
Eine unvollständige Wiederherstellung bleibt als Fehler sichtbar. Allgemeine
EOS-Änderungen werden weiterhin über den Updateknopf bestätigt. Die
Node-Automatik behauptet keine vom Benutzer bestätigte Sicherung.

Zugelassen sind geprüfte, signierte Aktualisierungen innerhalb von Node 24 ab
24.22.1 ohne Versionsrückschritt. Ein Node-Hauptversionswechsel oder ein Wechsel
zu js-controller 8 ist dadurch nicht freigeschaltet. Die vorhandenen Grenzen
für Adapterversionen, Abhängigkeiten und Datenbankmigrationen gelten weiter.
Die aktuelle automatische Aktivierung gilt für den verifizierten Testbetrieb
mit `physicalControlEnabled: false`. Daraus wird keine unbeaufsichtigte
Neustartfreigabe für eine physisch regelnde Energieanlage abgeleitet.

Die vollständigen Pakete einschließlich Node können größer als das
GitHub-Git-Dateilimit sein. Neue große Pakete werden als GitHub-Release-Assets
mit Release-ID im Namen des Tags bereitgestellt. Die Anlage prüft weiterhin
Signatur, genaue Größe und vollständigen SHA-256; die Hostingadresse allein
berechtigt nicht zur Installation. Der Hersteller liest die veröffentlichten
Bytes vor Freigabe eines Feedangebots vollständig zurück.

## Linux-Sicherheitsupdates

Der getrennte root-eigene OS-Dienst aktualisiert die freigegebenen,
signaturgeprüften Debian-Quellen täglich im vorgesehenen nächtlichen Zeitfenster.
Das stabile Basisarchiv ist einbezogen, weil Sicherheitskorrekturen dort mit
Punktveröffentlichungen zusammengeführt werden. Für Raspberry Pi kommen die
vorgesehenen signierten stabilen Herstellerquellen hinzu. Ein Wechsel der
Debian-Hauptversion erfolgt nicht automatisch.

EOS- und OS-Updates benutzen dieselbe geschützte Wartungssperre. Ein bereits
laufender Paketvorgang wird nicht von einer parallelen EOS-Transaktion gestört.
Der Paketdienst begrenzt CPU-/I/O-Priorität und meldet Fehler, nicht erreichbare
Quellen, zurückgehaltene Pakete und veraltete Prüfstände. Die tatsächlich
installierten Betriebssystempakete werden in einer gesonderten SBOM erfasst.

Node gehört zur signierten EOS-Lieferung. Das Debian-Paketmanagement ersetzt
diese Laufzeit deshalb nicht. Fremdquellen, manuell installierte Programme und
nicht durch die freigegebenen Quellen versorgte Firmware bleiben gesondert zu
pflegen und dürfen nicht als vollständig abgesichert angezeigt werden.

## Neustarts und Betrieb der Anlage

Heruntergeladene oder installierte Dateien bedeuten noch nicht, dass alle
laufenden Prozesse und der Kernel den neuen Stand verwenden. EOS zeigt
ausstehende Dienstaktivierungen und einen erforderlichen Neustart getrennt an.
Automatische OS-Läufe erteilen keine pauschale Freigabe für einen Anlagenneustart.
Standardisierte Paket-Dienstneustarts werden während dieses Laufs zurückgestellt;
Paket-Maintainerskripte sind privilegierter Distributionscode und können eigene
Aktionen ausführen. Eine unterbrechungsfreie Regelung wird daraus nicht abgeleitet.

Vor der Zielabnahme sind zwei aufeinanderfolgende Node-/EOS-Updates,
Rückfall, Neustart des Updatedienstes, gleichzeitiger OS-Startversuch, echte
APT-Transaktionen und Aktivierung ausstehender Kernel-/Dienstupdates zu prüfen.
Die Energieanlage benötigt dabei ihren geprüften sicheren Betriebszustand.
Die 50-/100-ms-Reaktionszeitziele bleiben gesonderte Mess- und Abnahmekriterien.

Automatisierung reduziert die laufende Arbeit. Sie ersetzt weder die
Herstellerprüfung neuer Lieferungen noch die Behandlung von Fehlern und
notwendigen Wartungsneustarts.

[Umsetzungs- und Prüfbericht zur automatischen Installation](../../reports/integration/automatic-security-updates-20261022/automatic-install/README_DE.md)
· [Herstellerablauf für reine Node-Updates](NODE_AUTOMATIK_HERSTELLER_DE.md)
· [Frischinstallation und Updateknopf](MANAGED_TEST_UPDATES_DE.md)
· [OS-Komponente und Vertrauensgrenzen](../../runtime/os-updates/README.md)
