// @ts-nocheck
/**
 * TypeScript-Parallelspiegel: lib/notification-policy.js
 *
 * Zweck:
 * Diese Datei ist die TypeScript-Vorbereitung der bestehenden JavaScript-Runtime-Datei.
 * Sie wird noch nicht produktiv ausgeführt. Die zugehörige erzeugte JavaScript-Laufzeitdatei ist:
 * lib/notification-policy.js
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
 * Original-Hash: cad22c20093b5b73edebbb8c0ff0b5ecba9b9b50b2e65803cadb4f152a3fbf0a
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
 * Quelle: src-ts/runtime-executables/lib/notification-policy.ts
 * Quell-Hash: sha256:a78533c38f54ccb5aae0f1a2c06bf5ff2c58093224341bddd3bdae12b4e2ce7a
 * Erzeugung: npm run sync:ts-runtime-executables
 *
 * Zweck:
 * Diese JavaScript-Datei ist das ausführbare Build-Artefakt für lib/notification-policy.js.
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
 * Aufgabe: Verwaltet Störungszustände, Versandintervalle, Entwarnungen und Wiederholschutz unabhängig vom SMTP-Transport.
 * Daten und Wirkung: Erhält Ereignisse und Zeitstempel; liefert versandfähige Gruppen sowie einen speicherbaren Status. Kritische Fehler werden bei Erkennung fällig, normale im 30-Minuten-Fenster, Hinweise/Erinnerungen täglich.
 * Bei Änderungen: Einheiten, Vorzeichen, Gültigkeit und Aufrufer mitprüfen; Kommentare und docs:build nach fachlichen Änderungen aktualisieren.
 * Verknüpfungen: docs/quellcode/src-ts/runtime-executables/lib/notification-policy.md
 * Einstieg: docs/QUELLCODE_WEGWEISER_DE.md; Pflege: docs/DOKUMENTATIONSSTANDARD_DE.md
 */
'use strict';
const HOUR = 3600000;
const DAY = 24 * HOUR;
const NORMAL_INTERVAL = 30 * 60000;
/**
 * Code-Teil: clean
 *
 * Zweck:
 * Automatisch markierter Arrow-Funktion-Abschnitt aus der ursprünglichen JavaScript-Datei.
 * Dieser Kommentar dient als Orientierung für die schrittweise TypeScript-Migration.
 *
 * Zusammenhang:
 * Die produktive Logik liegt aktuell noch in der JS-Datei. Dieser TS-Spiegel zeigt,
 * welcher konkrete Code-Abschnitt später typisiert, getestet und übernommen werden muss.
 */
const clean = value => String(value || '').replace(/[\r\n]+/g, ' ').slice(0, 400);

/** Bounded, durable incident transitions. Delivery is committed only after SMTP acceptance. */
class NotificationPolicy {
  /**
   * Ablauf und Zusammenhang: Stellt den persistenten Meldungszustand mit begrenzten Listen wieder her. Zeitangaben sind Millisekunden; die Instanz selbst stellt keine Netzwerkverbindung her.
   */
  constructor(saved = {}) {
    this.records = new Map(Array.isArray(saved.records) ? saved.records.slice(0, 256) : []);
    this.sent = Array.isArray(saved.sent) ? saved.sent.filter(Number.isFinite).slice(-24) : [];
    this.nextAttempt = Number(saved.nextAttempt) || 0;
    this.failures = Number(saved.failures) || 0;
    this.lastTest = Number(saved.lastTest) || 0;
    this.lastDigest = Number(saved.lastDigest) || 0;
    this.lastNormal = Number(saved.lastNormal) || 0;
    this.recipientHash = String(saved.recipientHash || '');
  }
  /**
   * Ablauf und Zusammenhang: Vergleicht den Hash der Kundenadresse. Bei Empfängerwechsel wird die bisherige Ereigniszuordnung gelöscht, damit der neue Empfänger keinen fremden Störungsverlauf erbt.
   */
  setRecipient(hash) {
    if (hash !== this.recipientHash) { this.records.clear(); this.recipientHash = hash; }
  }
  /**
   * Ablauf und Zusammenhang: Gleicht aktuelle Ereignisse mit bereits bekannten Störungen ab. Kurzes Flattern behält den Wiederholschutz; eine Eskalation auf kritisch und eine nach stabiler Erholung neue Störung werden gesondert behandelt.
   */
  observe(events, now, categories) {
    if (!this.lastDigest) this.lastDigest = now;
    if (!this.lastNormal) this.lastNormal = now;
    const seen = new Set();
    for (const event of events.slice(0, 256)) {
      if (!event || !event.id || !categories.has(event.category)) continue;
      seen.add(event.id);
      let r = this.records.get(event.id);
      if (!r && this.records.size >= 256) continue;
      if (!r) r = { active: false, alertSent: false, lastSent: 0, since: now };
      // A stable recovery ends the incident; brief flapping keeps its delivery history.
      const newEpisode = !r.active && r.clearSince && now - r.clearSince >= 300000;
      const escalated = r.meta && r.meta.severity !== 'critical' && event.severity === 'critical' && !r.criticalSent;
      if (newEpisode) r.criticalSent = false;
      if (newEpisode || escalated) { r.alertSent = false; r.lastSent = 0; }
      if (!r.active || escalated) { r.since = now; r.active = true; }
      r.clearSince = 0;
      r.suppressed = event.suppressed === true;
      r.meta = { id: clean(event.id), category: event.category, title: clean(event.title).slice(0, 140), message: clean(event.message).slice(0, 300),
        severity: ['critical', 'warning', 'info'].includes(event.severity) ? event.severity : 'warning', persistMs: event.severity === 'critical' ? 0 : 60000 };
      this.records.set(event.id, r);
    }
    for (const [id, r] of this.records) {
      if (!categories.has(r.meta?.category)) { this.records.delete(id); continue; }
      if (!seen.has(id)) {
        if (r.active) { r.active = false; r.clearSince = now; }
        const pending = !r.lastSent && (r.meta.severity === 'critical' || r.meta.severity === 'info' || r.clearSince - r.since >= 60000);
        if ((!r.alertSent && !r.lastSent && !pending) || (now - (r.clearSince || now) > 2 * DAY)) this.records.delete(id);
      }
    }
  }
  /**
   * Ablauf und Zusammenhang: Prüft Wiederholpause und Testmail-Kontingent. Testmails sind zusätzlich auf drei pro Stunde begrenzt; die reguläre Alarmwahl folgt anschließend in batch.
   */
  quota(now, test = false) {
    this.sent = this.sent.filter(ts => ts > now - DAY && ts <= now + 60000);
    if (now < this.nextAttempt) return false;
    if (test) return (!this.lastTest || now - this.lastTest >= 300000) && this.sent.filter(ts => ts > now - HOUR).length < 3;
    return true;
  }
  /**
   * Ablauf und Zusammenhang: Wählt fällige Meldungen: neue kritische Fehler sofort, normale Fehler gesammelt nach 30 Minuten, Hinweise/Erinnerungen/Entwarnungen täglich. Unterdrückte Folgefehler werden ausgelassen; auch während SMTP-Ausfall bereits behobene unversandte harte Fehler bleiben meldbar.
   */
  batch(now, recovery = true) {
    if (!this.quota(now)) return [];
    const immediate = [], daily = [];
    const digestDue = now - this.lastDigest >= DAY;
    const normalDue = now - this.lastNormal >= NORMAL_INTERVAL;
    for (const [id, r] of this.records) {
      if (r.suppressed) continue;
      if (r.active && now - r.since >= r.meta.persistMs) {
        const item = { ...r.meta, kind: 'alarm', since: r.since };
        if (r.meta.severity === 'warning') {
          if (normalDue && (!r.lastSent || now - r.lastSent >= NORMAL_INTERVAL)) immediate.push({ ...item, normal: true });
        } else if (!r.alertSent && !r.lastSent && r.meta.severity !== 'info') {
          immediate.push(item);
        } else if (digestDue && (!r.lastSent || now - r.lastSent >= DAY)) daily.push({ ...item, daily: true });
      } else if (!r.active && !r.alertSent && !r.lastSent) {
        // Do not lose an undelivered hard fault merely because it cleared while SMTP was down.
        const item = { ...r.meta, kind: 'alarm', since: r.since, resolved: true };
        if (r.meta.severity === 'critical') immediate.push(item);
        else if (r.meta.severity === 'warning') { if (normalDue) immediate.push({ ...item, normal: true }); }
        else if (digestDue) daily.push({ ...item, daily: true });
      } else if (!r.active && r.alertSent && now - r.clearSince >= 300000) {
        if (recovery && digestDue) daily.push({ ...r.meta, kind: 'recovery', since: r.since, daily: true });
        else if (!recovery) r.alertSent = false;
      }
    }
    // Advance empty half-hour windows too; a new warning cannot bypass the collection interval.
    if (normalDue && !immediate.some(item => item.normal)) this.lastNormal = now;
    immediate.sort((a, b) => Number(b.severity === 'critical') - Number(a.severity === 'critical'));
    return immediate.concat(daily).slice(0, 64);
  }
  /**
   * Ablauf und Zusammenhang: Setzt vor dem tatsächlichen Versand eine zweiminütige Versuchsreservierung. Bei Testmails wird zusätzlich deren letzter Versuch festgehalten.
   */
  reserve(now, test = false) {
    this.nextAttempt = now + 120000;
    if (test) this.lastTest = now;
  }
  /**
   * Ablauf und Zusammenhang: Bestätigt Meldungen erst nach SMTP-Annahme. Fehler erhöhen die Wiederholpause exponentiell bis maximal eine Stunde; Erfolg aktualisiert Versandzeiten und hebt die Versuchsreservierung auf.
   */
  complete(batch, now, accepted) {
    if (!accepted) {
      this.failures = Math.min(8, this.failures + 1);
      this.nextAttempt = now + Math.min(HOUR, 120000 * 2 ** (this.failures - 1));
      return;
    }
    this.failures = 0;
    this.nextAttempt = 0;
    if (!batch.length) this.sent.push(now);
    if (batch.some(item => item.daily)) this.lastDigest = now;
    if (batch.some(item => item.normal)) this.lastNormal = now;
    this.sent = this.sent.slice(-24);
    for (const item of batch) {
      const r = this.records.get(item.id);
      if (!r) continue;
      if (item.kind === 'recovery') r.alertSent = false;
      else { r.alertSent = r.active; r.lastSent = now; if (item.severity === 'critical') r.criticalSent = true; }
    }
  }
  /**
   * Ablauf und Zusammenhang: Gibt einen JSON-speicherbaren Zustand zurück. NotificationMail.saveLedger schreibt ihn auf Datenträger, damit Neustarts keine bereits gemeldeten Vorfälle erneut als neu einstufen.
   */
  snapshot() {
    return { records: Array.from(this.records.entries()), sent: this.sent, nextAttempt: this.nextAttempt,
      failures: this.failures, lastTest: this.lastTest, lastDigest: this.lastDigest, lastNormal: this.lastNormal, recipientHash: this.recipientHash };
  }
}
module.exports = { NotificationPolicy };
