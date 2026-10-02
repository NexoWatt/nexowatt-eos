# NexoWatt EOS Admin v7.9.72 – Datenpunkte, Updates und Laufzeitstabilität

- Ordner, Kanäle, Geräte und Meta-Objekte zeigen in der Wertespalte kein irreführendes `(null)` mehr.
- `common.write=false` bleibt ausschließlich lesbar.
- `common.write=true` nutzt wieder den nativen ObjectBrowser-Klick-/Wertdialogpfad.
- Button- und Switch-Datenpunkte verwenden das native ioBroker-Verhalten; Schreibfehler werden sichtbar gemeldet.
- Installations- und Updatebefehle warten bis zu 60 Sekunden auf eine stabile EOS-Verbindung statt während des initialen Ladens fehlzuschlagen.
- Temporäre WebSocketfehler bei der Navigation werden begrenzt wiederholt und unterbrechen die Oberfläche nicht.
- Der gemeinsame DOM-Koordinator verwirft reine Tabellenmutationen auf großen Ansichten, bevor Branding-, Rollen- und Security-Layer arbeiten.
- Ein aktiver v72-Frontendgraph verhindert gemischte Cache-/Runtime-Stände.
