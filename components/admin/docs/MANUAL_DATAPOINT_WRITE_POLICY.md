# NexoWatt EOS – manuelle Datenpunkt-Bedienung

Der EOS-Datenpunktbrowser verwendet `common.write` als verbindliche ioBroker-Schreibfreigabe.

- `common.write === false`: immer nur lesend.
- Button/Trigger: typgerechter Direktwert (`common.def`, sonst `true`, `1` oder `"true"`).
- Binärer Schalter: typgerechtes Umschalten, auch für `0/1`, `ON/OFF` und zweistufige `common.states`.
- Mehrstufiger Schalter/Enum: nativer Wertdialog statt falschem Boolean-Toggle.
- Number/String/Enum: nativer Wertdialog mit Typkonvertierung und Min-/Max-Prüfung.
- Array/Object/Mixed: universeller JSON-Editor; `mixed` kann Zahl, Boolean, String, Array oder Objekt enthalten.
- Schreibfehler schließen den Dialog nicht und werden mit der Datenpunkt-ID angezeigt.
- ioBroker-ACLs und adapterseitige Validierung bleiben maßgeblich und werden nicht umgangen.

## Sicherheitsrelevante Befehle

Sicherheitsrelevante Befehle sind nur im Expertenmodus manuell bedienbar. Dazu gehören insbesondere Reset-/Neustartbefehle sowie Lade-, Entlade-, Strom- und Leistungsgrenzen beziehungsweise Sollwerte.

Geräteadapter sollten die Einstufung möglichst ausdrücklich setzen:

```json
{
  "type": "state",
  "common": {
    "type": "number",
    "read": true,
    "write": true,
    "role": "level.power"
  },
  "native": {
    "nexowatt": {
      "manualWriteExpertOnly": true
    }
  }
}
```

Eine nachweislich ungefährliche Schreibadresse kann mit `manualWriteExpertOnly: false` von einer konservativen automatischen Einstufung ausgenommen werden.

Unterstützte Kompatibilitätsstellen:

- `native.nexowatt.manualWriteExpertOnly`
- `native.manualWriteExpertOnly`
- `common.custom.nexowatt.manualWriteExpertOnly`
- `common.custom["nexowatt.eos"].manualWriteExpertOnly`
- `common.custom["eos-admin"].manualWriteExpertOnly`
