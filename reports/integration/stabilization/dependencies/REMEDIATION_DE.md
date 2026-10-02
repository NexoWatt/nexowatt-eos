# EOS-RUNTIME-DEPENDENCIES-001 – esbuild-Abhängigkeitskette

Die drei moderaten Paketknoten im bisherigen Laufzeitbericht betreffen dieselbe
Meldung **GHSA-67mh-4wv8-2f99**, keine drei unabhängigen CVEs. Der Maintainer nennt
kein bekanntes CVE-Kennzeichen. Betroffen sind esbuild-Versionen bis 0.24.2; ab
0.25.0 ist die Meldung behoben. Die Schwachstelle betrifft die CORS-Behandlung des
Entwicklungsservers, über die eine fremde Webseite ausgelieferte Quellen lesen
konnte. Primärquelle:
https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99

Im bisherigen integrierten Baum wurde `iobroker.js-controller@7.2.2` mit
`@alcalzone/esbuild-register@2.5.1-1` und `esbuild@0.11.23` tatsächlich aufgelöst.
Die geprüften Controllerpfade laden den Hook für TypeScript-Adapter-Einstiegspunkte.
Der Hook verwendet `transformSync`; ein Entwicklungsserver-Aufruf wurde dort
nicht gefunden. Das aktuelle EOS-Profil lässt nur kompilierte JS/CJS/MJS-Dateien
zu und sperrt den Compact-Modus. Das grenzt den beobachteten Laufzeitpfad ein;
es ist kein universeller Nachweis der Nichtausnutzbarkeit.

Die Änderung ersetzt ausschließlich esbuild durch **0.28.2**, die beim Abruf
aktuelle veröffentlichte Version; der Controller und sein Loader behalten ihre
Versionen. Die vollständige Lockdateiprüfung ergab nur diese Versionsänderung
und 26 zusätzliche optionale Plattformpaket-Einträge von esbuild. Tatsächlich
installiert und ausgeführt wurde hier `@esbuild/linux-x64@0.28.2`. Eine Lockdatei
mit weiteren Architekturen ist kein Beleg ihrer Ausführung auf einem Raspberry Pi.

Der Override liegt am Installations-Root:

```json
{
  "iobroker.js-controller@7.2.2": {
    "@alcalzone/esbuild-register": {
      "esbuild": "0.28.2"
    }
  }
}
```

Ein zunächst geprüfter exakter Selektor für die Prerelease-Version des Loaders
wirkte bei der transitiven Abhängigkeit nicht: npm/semver bewertet die
Überschneidung von `^2.5.1-1` und `2.5.1-1` hier als falsch. Der stabile
Controller-Selektor behebt dies. Zusätzlich prüft die neue Build-Policy die
**tatsächlich von Node aufgelöste** Kette, die genaue Loader-Version, Lockbindung
und weitere esbuild-Einträge. Abweichungen, veraltete Kopien und widersprüchliche
Overrides stoppen den Build. Eine nominelle Override-Zeile allein gilt nicht als
Nachweis eines Fixes.

Ausgeführt wurden 18 Policy-/Builder-Tests sowie sechs Tests gegen den wirklichen
Controller/Loader: TS mit Interfaces und Enum, JSX, TSX, Syntaxfehler, originale
Stacktrace-Zeilen und das reale Entwicklungsserver-Verhalten. Die native
TypeScript-Entfernung von Node war ausgeschaltet, damit der Loader tatsächlich
benötigt wurde. Der lokale Testserver lieferte am erlaubten Host HTTP 200, gab
keine CORS-Freigabe für die fremde Origin aus und wies einen fremden Host mit 403
ab. Ein weiterer Integrationstest beweist, dass ein leeres Paketcache explizit
mit `BUILD_OFFLINE_CACHE_MISS` scheitert, selbst wenn die aufrufende Umgebung
npm in den Online-Modus versetzen möchte.

Der ausschließlich öffentliche Loader-Probeaufbau meldete beim npm-Audit keine
Befunde. **Ein neuer vollständiger EOS-Audit wird nicht als bestanden ausgewiesen:**
die automatische Freigabeprüfung hat das Senden des vollständigen
EOS-Abhängigkeitsmanifests an die npm-Registry wegen privater Paketmetadaten
abgelehnt. Auch der entsprechende Online-Installationsversuch wurde blockiert.
Beide Ablehnungen sind in `approval-blocks.json` dokumentiert. Weitere solche
Registry-Aufrufe wurden nicht vorgenommen. Der vollständige lokale Baum wurde
anschließend ausschließlich aus dem Cache, mit deaktivierten Lifecycle-Skripten
und abgeschalteten Netzwerkzugriffen aufgebaut. Der Builder erzwingt diesen
Offline-Modus jetzt ohne Online-Ausweichpfad. Fehlende öffentliche Pakete müssen
getrennt beschafft werden.

Der konkrete esbuild-Befund ist im geprüften lokalen Abhängigkeitsbaum durch
Versionsersatz behoben. Eine Aussage „alle EOS-Abhängigkeiten ohne aktuelle
Schwachstellen“ folgt daraus nicht. Der neue endgültige Produktbuild muss die
Policy erneut bestehen und eine neue SBOM erhalten. Die vollständige
Controller-/Admin-/UI-Prozessprüfung, die ARM64-/RPi-Prüfung und die
Produktfreigabe werden im übergeordneten Systemnachweis geführt.

Maschinenlesbare Belege: `verification.json`, `reachability.json`,
`installed-policy.json`, `lock-change-review.json`,
`public-loader-probe-audit.json` sowie die TAP-Rohberichte in `raw/`.
Die Probe-Lockdatei ist als Nachweis enthalten; das zugehörige lokale Paketarchiv
und spätere endgültige Release-Lockdateien werden getrennt im Lieferpaket geführt.
