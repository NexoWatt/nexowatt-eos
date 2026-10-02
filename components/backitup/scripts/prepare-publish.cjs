'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'release-manifest.json');
const controlledRoots = ['admin', 'build', 'docs'];

function fail(message, error) {
    console.error(`\n[NexoWatt EOS Backup] Publish-Vorbereitung fehlgeschlagen: ${message}`);
    if (error) {
        console.error(`  ${error.message}`);
    }
    process.exit(1);
}

function normalizeRelative(relativePath) {
    return relativePath.split(path.sep).join('/').replace(/^\.\//, '');
}

function isControlled(relativePath) {
    return controlledRoots.some(rootName => relativePath === rootName || relativePath.startsWith(`${rootName}/`));
}

function safeAbsolute(relativePath) {
    const normalized = normalizeRelative(relativePath);
    if (!normalized || path.isAbsolute(normalized) || normalized.includes('../') || !isControlled(normalized)) {
        fail(`Unsicherer Bereinigungspfad im Release-Verzeichnis: ${relativePath}`);
    }
    const absolute = path.resolve(root, ...normalized.split('/'));
    const relativeFromRoot = path.relative(root, absolute);
    if (relativeFromRoot.startsWith('..') || path.isAbsolute(relativeFromRoot)) {
        fail(`Pfad verlässt das Projektverzeichnis: ${relativePath}`);
    }
    return absolute;
}

function readManifest() {
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
        fail('release-manifest.json konnte nicht gelesen werden.', error);
    }
    if (!manifest || !Array.isArray(manifest.files)) {
        fail('release-manifest.json enthält keine gültige Dateiliste.');
    }
    return manifest;
}

function walkEntries(relativeDir) {
    const start = path.join(root, relativeDir);
    if (!fs.existsSync(start)) {
        return [];
    }
    const result = [];
    const stack = [start];
    while (stack.length) {
        const current = stack.pop();
        let entries;
        try {
            entries = fs.readdirSync(current, { withFileTypes: true });
        } catch (error) {
            fail(`Verzeichnis konnte nicht gelesen werden: ${path.relative(root, current)}`, error);
        }
        for (const entry of entries) {
            const absolute = path.join(current, entry.name);
            const relative = normalizeRelative(path.relative(root, absolute));
            if (entry.isDirectory() && !entry.isSymbolicLink()) {
                stack.push(absolute);
            } else {
                result.push(relative);
            }
        }
    }
    return result.sort();
}

function removeEntry(relativePath) {
    const absolute = safeAbsolute(relativePath);
    try {
        fs.rmSync(absolute, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (firstError) {
        try {
            fs.chmodSync(absolute, 0o666);
            fs.rmSync(absolute, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch (secondError) {
            fail(`Alte Release-Datei konnte nicht entfernt werden: ${relativePath}`, secondError);
        }
    }
}

function removeEmptyDirectories(relativeDir) {
    const start = path.join(root, relativeDir);
    if (!fs.existsSync(start)) {
        return;
    }
    const directories = [];
    const stack = [start];
    while (stack.length) {
        const current = stack.pop();
        directories.push(current);
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            if (entry.isDirectory() && !entry.isSymbolicLink()) {
                stack.push(path.join(current, entry.name));
            }
        }
    }
    directories
        .sort((a, b) => b.length - a.length)
        .forEach(directory => {
            if (directory === start) {
                return;
            }
            try {
                if (fs.readdirSync(directory).length === 0) {
                    fs.rmdirSync(directory);
                }
            } catch {
                // A non-empty or concurrently changed directory is intentionally kept.
            }
        });
}

const manifest = readManifest();
const expected = new Set(
    manifest.files
        .map(entry => normalizeRelative(entry.path || ''))
        .filter(relativePath => relativePath && isControlled(relativePath)),
);

const actual = controlledRoots.flatMap(walkEntries);
const stale = actual.filter(relativePath => !expected.has(relativePath));

for (const relativePath of stale) {
    removeEntry(relativePath);
}
for (const relativeDir of controlledRoots) {
    removeEmptyDirectories(relativeDir);
}

if (stale.length) {
    console.log(`[NexoWatt EOS Backup] ${stale.length} alte Release-Datei(en) automatisch entfernt.`);
    const preview = stale.slice(0, 12);
    for (const relativePath of preview) {
        console.log(`  - ${relativePath}`);
    }
    if (stale.length > preview.length) {
        console.log(`  - … und ${stale.length - preview.length} weitere`);
    }
} else {
    console.log('[NexoWatt EOS Backup] Release-Verzeichnis ist bereits sauber.');
}
