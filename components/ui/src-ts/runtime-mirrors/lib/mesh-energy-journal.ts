// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/mesh-energy-journal.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * lib/mesh-energy-journal.js
 *
 * Zusammenhang:
 * Der Spiegel hilft uns, die JS-Datei später schrittweise zu typisieren, zu testen und
 * kontrolliert auf TypeScript umzustellen. Produktive Originalquellen liegen unter
 * src-ts/runtime-executables/ bzw. den im generierten JS genannten TS-Pfaden.
 * Dort ändern, Laufzeit erzeugen und danach die Spiegel synchronisieren.
 * Build-/Prüfskripte ohne TS-Original werden weiterhin unter scripts/ gepflegt.
 *
 * Wichtig für die Migration:
 * - Diese Datei enthält vorübergehend @ts-nocheck.
 * - Der nächste Schritt ist pro Modul echte Typisierung statt pauschalem No-Check.
 * - Fachliche Kommentare markieren die Abschnitte, die später einzeln migriert werden.
 *
 * Original-Hash: ae9a186c6d1cd23068eb10f56529d3b04b61447e79d15ad1d6214017a1a528b1
 */

/**
 * Code-Teil: Runtime-Spiegel der kompletten Datei
 *
 * Zweck:
 * Dieser Abschnitt enthält den ursprünglichen JavaScript-Code als TypeScript-Parallelkopie.
 * Einzelne Funktionen werden später pro Modul weiter typisiert; Dateien ohne eigene
 * Funktionsdeklarationen bleiben trotzdem über diesen Dateikommentar dokumentiert.
 */

/**
 * AUTO-GENERATED RUNTIME FILE - NICHT MANUELL BEARBEITEN.
 *
 * Quelle: src-ts/runtime-executables/lib/mesh-energy-journal.ts
 * Quell-Hash: sha256:d1761c5dad8ae0fb539770f6b75440513ce3b0aa9bb838ef95a27c2df595ed70
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/mesh-energy-journal.js.
 * Die fachliche Bearbeitung erfolgt ab 0.7.131 in der TypeScript-Quelle.
 * Ab 0.7.132 sind doppelte Legacy-JS-Bäume wie .nwcore entfernt.
 *
 * Pflege-Regel:
 * 1. Änderung zuerst in src-ts/runtime-executables/ vornehmen.
 * 2. npm run sync:ts-runtime-executables ausführen.
 * 3. npm run test:runtime-executables prüfen.
 */
/**
 * NexoWatt Quellcode-Erklärung (DE)
 * Aufgabe: Dauerhaftes, segmentiertes Originalarchiv für Haus-NVP-Zählerstände.
 * Daten und Wirkung: Append + fsync vor ACK; 1.000 Datensätze je Datei, SHA-256-Kette,
 * laufende Sequenz und unveränderte Originale auf Slave und Master. Keine Gerätesteuerung.
 * Bei Änderungen: Absturz, unvollständige Zeilen, Dubletten, Wiederholung und Datenträgerfehler testen.
 * Verknüpfungen: mesh-energy-service überträgt unabhängig vom schnellen Regelkanal.
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
/**
 * Code-Teil: hash
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const hash = record => { const { hash: ignored, receivedAt: ignoredReceipt, ...body } = record; return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex'); };
/**
 * Code-Teil: segment
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const segment = seq => `${String(Math.floor((seq - 1) / 1000)).padStart(12, '0')}.jsonl`;
/**
 * Code-Teil: immediate
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const immediate = () => new Promise(resolve => setImmediate(resolve));
/**
 * Code-Teil: EnergyJournal
 *
 * Zweck:
 * Automatisch markierter Klasse-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
class EnergyJournal {
  constructor(directory, maxBytes = 1024 * 1024 * 1024) { this.directory = directory; this.maxBytes = maxBytes; this.last = null; this.bytes = 0; this.tail = Promise.resolve(); this.ready = false; this.files = []; }
  /** Nur eine Mutation je Journal; ein Fehler sperrt das Archiv, nicht das EMS.
   * Eine gerissene letzte Zeile wird bewusst NICHT stillschweigend entfernt. */
  async init() {
    if (this.ready) return; if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      this.files = (await fs.readdir(this.directory)).filter(f => /^\d{12}\.jsonl$/.test(f)).sort();
      let last = null; let index = 0;
      for (const file of this.files) {
        if (file !== `${String(index++).padStart(12, '0')}.jsonl`) throw new Error('archive_segment_gap');
        this.bytes += (await fs.stat(path.join(this.directory, file))).size;
        for (const record of await this.readSegment(file)) {
          this.validateNext(record, last); this.observe(record); last = record;
        }
        await immediate();
      }
      this.last = last; this.ready = true;
    })().catch(error => { this.failure = error.message; throw error; });
    return this.initializing;
  }
  async readSegment(file) {
    if ((await fs.stat(path.join(this.directory, file))).size > 4000000) throw new Error('archive_segment_invalid');
    const text = await fs.readFile(path.join(this.directory, file), 'utf8');
    if (!text.endsWith('\n')) throw new Error('archive_incomplete_tail');
    const lines = text.trimEnd().split('\n');
    if (lines.length > 1000 || text.length > 4000000) throw new Error('archive_segment_invalid');
    return lines.map(line => { const r = JSON.parse(line); if (r.hash !== hash(r)) throw new Error('archive_hash_conflict'); return r; });
  }
  validateNext(record, previous) {
    if (!Number.isSafeInteger(record.seq) || record.seq !== (previous?.seq || 0) + 1 || record.hash !== hash(record)
      || record.previousHash !== (previous?.hash || '') || (previous && (record.stream !== previous.stream || record.siteId !== previous.siteId || record.nodeId !== previous.nodeId))) throw new Error('archive_chain_conflict');
  }
  /** Rücksprünge bleiben über Messlücken und Neustarts verriegelt, bis eine neue
   * ausdrücklich zugeordnete Zählerepoche beginnt. */
  observe(r) {
    const identity = `${r.meter?.id}/${r.meter?.epoch}`;
    if (identity !== this.meterIdentity) { this.meterIdentity = identity; this.counterFault = false; this.baseline = null; }
    if (r.quality === 'reset' || this.baseline && r.importMilliWh !== null && r.exportMilliWh !== null && (r.importMilliWh < this.baseline.importMilliWh || r.exportMilliWh < this.baseline.exportMilliWh)) this.counterFault = true;
    if (r.quality === 'ok' && !this.counterFault) this.baseline = r;
  }
  async get(seq) {
    if (!Number.isSafeInteger(seq) || seq < 1 || seq > (this.last?.seq || 0)) return null;
    return (await this.readSegment(segment(seq))).find(r => r.seq === seq) || null;
  }
  /** ACK erst nach synchronisiertem Inhalt und neuem Verzeichniseintrag. Bei einem
   * Fehler nach dem Schreiben wird bis zur erneuten Prüfung nichts mehr bestätigt. */
  append(record) {
    const job = this.tail.then(async () => {
      await this.init(); if (this.failure) throw new Error(this.failure);
      if (record.seq <= (this.last?.seq || 0)) {
        const saved = await this.get(record.seq);
        if (!saved || saved.hash !== record.hash || record.hash !== hash(record)) throw new Error('archive_duplicate_conflict');
        return saved;
      }
      this.validateNext(record, this.last);
      const bytes = Buffer.from(JSON.stringify(record) + '\n');
      if (bytes.length > 4000 || this.bytes + bytes.length > this.maxBytes) { this.warning = 'archive_capacity_exhausted'; throw new Error(this.warning); }
      const filename = segment(record.seq); const isNew = !this.files.includes(filename);
      try {
        const handle = await fs.open(path.join(this.directory, filename), 'a', 0o600);
        try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
        if (isNew && process.platform !== 'win32') { const dir = await fs.open(this.directory, 'r'); try { await dir.sync(); } finally { await dir.close(); } }
      } catch (error) { this.failure = 'archive_write_failed'; throw error; }
      if (isNew) this.files.push(filename);
      this.warning = ''; this.bytes += bytes.length; this.observe(record); this.last = JSON.parse(JSON.stringify(record)); return record;
    });
    this.tail = job.catch(() => {}); return job;
  }
  async batch(after, count = 32) {
    await this.init(); const end = this.last?.seq || 0; const result = [];
    for (let seq = after + 1; seq <= end && result.length < count;) {
      const rows = await this.readSegment(segment(seq));
      for (const r of rows) if (r.seq >= seq && result.length < count) result.push(r);
      seq = rows.at(-1).seq + 1;
    }
    return result;
  }
  /** Snapshot endet bei der zu Beginn festgehaltenen Sequenz. Neue Messungen dürfen
   * gleichzeitig weitergeschrieben werden; die Auswertung blockiert kein Steuersignal. */
  async *records(end = this.last?.seq || 0) {
    let previous = null;
    for (const file of [...this.files]) {
      for (const r of await this.readSegment(file)) { if (r.seq > end) return; this.validateNext(r, previous); previous = r; yield r; }
      await immediate();
    }
  }
  summary() { return { sequence: this.last?.seq || 0, stream: this.last?.stream || null, hash: this.last?.hash || null, last: this.last, bytes: this.bytes, maxBytes: this.maxBytes, failure: this.failure || this.warning || '' }; }
}
module.exports = { EnergyJournal, hash };
