'use strict';

/**
 * RC90 regression: the LIVE resync callback must not capture the local
 * nwBuildPublicStateSnapshot symbol from startServer(). The callback is created
 * earlier and therefore has to use the builder exported on the adapter instance.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);

function walk(dir, result = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ignored.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, result);
        else if (/\.(?:js|cjs|mjs)$/.test(entry.name)) result.push(full);
    }
    return result;
}

function matchingBrace(text, openIndex) {
    let depth = 0;
    let state = 'code';
    for (let i = openIndex; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1] || '';
        if (state === 'line') {
            if (char === '\n') state = 'code';
            continue;
        }
        if (state === 'block') {
            if (char === '*' && next === '/') { state = 'code'; i++; }
            continue;
        }
        if (state === 'single' || state === 'double' || state === 'template') {
            if (char === '\\') { i++; continue; }
            if ((state === 'single' && char === "'") ||
                (state === 'double' && char === '"') ||
                (state === 'template' && char === '`')) state = 'code';
            continue;
        }
        if (char === '/' && next === '/') { state = 'line'; i++; continue; }
        if (char === '/' && next === '*') { state = 'block'; i++; continue; }
        if (char === "'") { state = 'single'; continue; }
        if (char === '"') { state = 'double'; continue; }
        if (char === '`') { state = 'template'; continue; }
        if (char === '{') depth++;
        else if (char === '}' && --depth === 0) return i;
    }
    throw new Error('Unclosed callback body');
}

// Do not scan this regression test itself: it intentionally contains the
// marker strings below and would otherwise be mistaken for a production
// callback. Restrict the assertion to executable adapter/runtime files.
const thisFile = path.resolve(__filename);
const targets = walk(root).filter(file => {
    if (path.resolve(file) === thisFile) return false;
    const relative = path.relative(root, file).replace(/\\/g, '/');
    if (relative.startsWith('test/') || relative.startsWith('tests/')) return false;
    const text = fs.readFileSync(file, 'utf8');
    return text.includes('getSnapshotChunk:') && text.includes('_nwBuildPublicStateSnapshot');
});
assert.ok(targets.length > 0, 'No RC90 SSE callback found');

for (const file of targets) {
    const source = fs.readFileSync(file, 'utf8');
    const marker = source.indexOf('getSnapshotChunk:');
    const arrow = source.indexOf('=>', marker);
    const open = source.indexOf('{', arrow);
    const close = matchingBrace(source, open);
    const body = source.slice(open + 1, close);
    const callback = new Function('client', body);

    let builds = 0;
    const warnings = [];
    const adapter = {
        stateCache: { publicState: { val: 1 }, secretState: { val: 2 } },
        _nwBuildPublicStateSnapshot(cache) {
            builds++;
            return { publicState: cache.publicState };
        },
        log: { warn: message => warnings.push(String(message)) },
    };

    const first = callback.call(adapter, { internal: false });
    const second = callback.call(adapter, { internal: false });
    assert.equal(first, second, `${file}: immediate resync should reuse one serialized chunk`);
    assert.equal(builds, 1, `${file}: public snapshot should be built once inside the 250 ms coalescing window`);
    assert.match(first, /"type":"init"/);
    assert.match(first, /publicState/);
    assert.doesNotMatch(first, /secretState/);

    const internal = callback.call(adapter, { internal: true });
    assert.match(internal, /secretState/, `${file}: internal snapshot may contain internal states`);

    adapter._nwSseSnapshotChunkCache = Object.create(null);
    adapter._nwBuildPublicStateSnapshot = () => { throw new Error('forced regression test'); };
    const degraded = callback.call(adapter, { internal: false });
    assert.match(degraded, /"degraded":true/);
    assert.match(degraded, /snapshot-unavailable/);
    assert.equal(warnings.length, 1, `${file}: snapshot failures must be rate limited`);

    // A second failure inside the warning window must stay bounded and silent.
    adapter._nwSseSnapshotChunkCache = Object.create(null);
    const degradedAgain = callback.call(adapter, { internal: false });
    assert.match(degradedAgain, /"degraded":true/);
    assert.equal(warnings.length, 1);
}

console.log(`[RC90 SSE resync] OK (${targets.length} runtime callback(s))`);
