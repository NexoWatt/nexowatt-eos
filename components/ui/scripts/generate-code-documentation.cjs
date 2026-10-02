#!/usr/bin/env node
'use strict';
/**
 * Erzeugt den nachprüfbaren Quellcode-Index aus dem TypeScript-Syntaxbaum.
 * Fachliche Beschreibungen kommen aus den deutschen Kommentaren im Quellcode.
 * Automatisch ermittelt werden Imports, Gegenrichtungen und Funktionsstellen;
 * dynamische Aufrufe sind ausdrücklich keine vollständig aufgelöste Laufzeitkette.
 */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const model = require('./code-documentation-model.cjs');
const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(ROOT, relative));
const escape = value => String(value).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
const link = (from, to) => path.posix.relative(path.posix.dirname(from), to);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function resolveImport(source, specifier) {
  if (!specifier.startsWith('.')) return null;
  const bases = [path.posix.dirname(source)];
  if (source.startsWith('src-ts/runtime-executables/')) bases.push(path.posix.dirname(source.slice('src-ts/runtime-executables/'.length)));
  for (const base of bases) {
    const target = path.posix.normalize(path.posix.join(base, specifier));
    const stem = target.replace(/\.(?:mjs|cjs|js|tsx?)$/, '');
    const candidates = [stem + '.ts', stem + '.tsx', target, target + '/index.ts', target + '/index.tsx', target + '.js', target + '/index.js'];
    for (const candidate of candidates) {
      if (!exists(candidate) || !fs.statSync(path.join(ROOT, candidate)).isFile()) continue;
      if (candidate.startsWith('src-ts/') || candidate.startsWith('src-admin-tab/src/')) return candidate;
      const canonical = 'src-ts/runtime-executables/' + candidate.replace(/\.js$/, '.ts');
      if (exists(canonical)) return canonical;
      // Compiled helpers declare their original source in a generated header.
      for (const match of read(candidate).slice(0, 3000).matchAll(/src-ts\/[a-zA-Z0-9_./-]+\.tsx?/g)) if (exists(match[0])) return match[0];
      return candidate;
    }
  }
  return null;
}

function analyze(source, text) {
  const ast = ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true);
  if (ast.parseDiagnostics.length) throw new Error('Syntaxfehler: ' + source);
  const imports = new Map(), functions = [];
  const isFunction = node => (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)
    || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && !!node.body;
  function functionName(node) {
    let name = node.name?.getText(ast);
    if (ts.isConstructorDeclaration(node)) name = 'constructor';
    if (!name && (ts.isVariableDeclaration(node.parent) || ts.isPropertyAssignment(node.parent))) name = node.parent.name.getText(ast);
    if (!name) return null; // Anonymous handlers stay at the visible call site.
    if (ts.isClassDeclaration(node.parent) && node.parent.name) name = node.parent.name.text + '.' + name;
    return name;
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text; imports.set(spec, resolveImport(source, spec));
    }
    if (ts.isCallExpression(node) && (node.expression.getText(ast) === 'require' || node.expression.kind === ts.SyntaxKind.ImportKeyword)
      && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
      const spec = node.arguments[0].text; imports.set(spec, resolveImport(source, spec));
    }
    if (isFunction(node)) {
      const name = functionName(node);
      if (name) {
        const calls = new Set();
        function called(child) {
          if (child !== node && isFunction(child)) return;
          if (ts.isCallExpression(child)) {
            const target = child.expression.getText(ast);
            if (/^[\w.$?]+$/.test(target)) calls.add(target);
          }
          ts.forEachChild(child, called);
        }
        called(node);
        functions.push({ name, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
          parameters: node.parameters.map(p => p.name.getText(ast).replace(/\s+/g, ' ')), calls: [...calls].sort() });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return { imports: [...imports].map(([specifier, target]) => ({ specifier, target })), functions,
    codeHash: model.hash(printer.printFile(ast)) };
}

function build() {
  const records = model.sources(ROOT).map(source => {
    const text = read(source), doc = model.description(text);
    if (Object.values(doc).some(value => value.length < 20)) throw new Error('Deutsche Modulbeschreibung fehlt: ' + source);
    return { source, ...doc, sourceHash: model.hash(text), ...analyze(source, text) };
  });
  const outputs = {};
  for (const record of records) {
    const file = model.documentPath(record.source);
    const users = records.filter(other => other.imports.some(entry => entry.target === record.source));
    const lines = ['# ' + record.source, '', record.purpose, '', '**Daten und Wirkung:** ' + record.data, '', '**Bei Änderungen:** ' + record.maintenance,
      '', `[Originalquelle](${link(file, record.source)}) · [Gesamtübersicht](${link(file, 'docs/QUELLCODE_VERKNUEPFUNGEN_DE.md')})`,
      '', '## Direkte Verknüpfungen', '', 'Statisch gefundene Imports/require-Aufrufe. Ein Import belegt eine Code-Verknüpfung; er beweist nicht, dass der Pfad in jeder Konfiguration ausgeführt wird.', '', '| Import | Aufgelöste Datei |', '| --- | --- |'];
    for (const entry of record.imports) lines.push(`| \`${escape(entry.specifier)}\` | ${entry.target ? `[${entry.target}](${link(file, entry.target)})` : (entry.specifier.startsWith('.') ? 'Nicht statisch aufgelöst; Aufrufstelle prüfen.' : 'Node-Bordmittel oder externe Paketabhängigkeit.')} |`);
    if (!record.imports.length) lines.push('| Keine direkten Imports | Browser-Globals, HTML-Script-Reihenfolge und API-Aufrufe können trotzdem Verbindungen herstellen. |');
    lines.push('', '**Direkt importiert von:**', '');
    lines.push(...(users.length ? users.map(user => `- [${user.source}](${link(file, user.source)})`) : ['Kein direkter Import innerhalb des erfassten Quellbereichs. Mögliche HTML-, Adapter-, Build- oder dynamische Einstiege sind separat zu prüfen.']));
    lines.push('', '## Funktionen und Methoden', '', 'Parameter sind die Namen aus der Signatur, keine geratenen Datenverträge. Die Aufrufliste zeigt direkt sichtbare Ausdrücke ohne Auflösung dynamischer Objekte; anonyme Callbacks und aufgerufene Unterfunktionen sind nicht vollständig darin enthalten.', '', '| Funktion / Methode | Parameter | Direkt sichtbare Aufrufe (Auszug) |', '| --- | --- | --- |');
    for (const fn of record.functions) lines.push(`| [\`${escape(fn.name)}\`](${link(file, record.source)}#L${fn.line}) | ${escape(fn.parameters.join(', ')) || '–'} | ${escape(fn.calls.slice(0, 14).join(', ')) || '–'}${fn.calls.length > 14 ? ' (weitere in der Quelle)' : ''} |`);
    if (!record.functions.length) lines.push('| Keine benannten Funktionen mit Funktionskörper | Typen, Konstanten oder Exporte | Quelle ansehen |');
    outputs[file] = lines.join('\n') + '\n';
  }
  const index = ['# Quellcode-Verknüpfungen – NexoWatt EOS', '', 'Automatisch aus den Originalquellen erzeugter Wegweiser. Einstieg und fachliche Abläufe: [Quellcode verstehen](QUELLCODE_WEGWEISER_DE.md). Pflege: [Dokumentationsstandard](DOKUMENTATIONSSTANDARD_DE.md).',
    '', `Erfasst: ${records.length} selbst gepflegte TS-/TSX-Dateien, ${records.reduce((n, r) => n + r.functions.length, 0)} benannte Funktionen/Methoden. Generierte Spiegel, Testdateien, externe Pakete und Build-Artefakte sind ausgeschlossen.`,
    '', 'Die Funktionslinks zeigen auf die Originalquelle. Statische Imports und dynamische Kommunikation sind verschieden; Backend-API, ioBroker-States und HTML-/Browser-Globals werden im fachlichen Wegweiser erklärt.', '', '| Originalquelle | Aufgabe | Details |', '| --- | --- | --- |'];
  for (const record of records) index.push(`| [${record.source}](${link('docs/QUELLCODE_VERKNUEPFUNGEN_DE.md', record.source)}) | ${escape(record.purpose)} | [Verknüpfungen und Funktionen](${link('docs/QUELLCODE_VERKNUEPFUNGEN_DE.md', model.documentPath(record.source))}) |`);
  outputs['docs/QUELLCODE_VERKNUEPFUNGEN_DE.md'] = index.join('\n') + '\n';
  const manifest = { schema: 1, sources: records.map(({ source, sourceHash, codeHash }) => ({ path: source, sourceHash, codeHash })),
    documents: Object.entries(outputs).map(([file, text]) => ({ path: file, hash: model.hash(text) })) };
  for (const [file, text] of Object.entries(outputs)) { fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true }); fs.writeFileSync(path.join(ROOT, file), text); }
  fs.writeFileSync(path.join(ROOT, 'docs/code-documentation-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[code-docs] ${records.length} Quelldateien und ${Object.keys(outputs).length} Verzeichnisseiten aktualisiert.`);
}
if (require.main === module) { try { build(); } catch (error) { console.error('[code-docs] ' + error.message); process.exitCode = 1; } }
module.exports = { analyze };
