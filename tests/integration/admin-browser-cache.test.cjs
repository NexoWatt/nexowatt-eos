'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { VERSION, SEEDS, LOCAL_JS, closure, versionSource } = require('../../tools/integration/version-admin-browser-assets.cjs');
const root = path.resolve(__dirname, '../..');
const assets = path.join(root, 'components/admin/adminWww/assets');
const modules = new Map(fs.readdirSync(assets).filter(name => name.endsWith('.js'))
    .map(name => [name, fs.readFileSync(path.join(assets, name), 'utf8')]));
const affected = closure(modules);

test('source and shipped HTML refresh the role bootstrap, entry and product loader stylesheet', () => {
    for (const file of ['components/admin/adminWww/index.html', 'components/admin/src-admin/index.html']) {
        const html = fs.readFileSync(path.join(root, file), 'utf8');
        assert.ok(html.includes(`data-eos-entry="${file.includes('adminWww') ? './assets/index-CQZugZ1z-v84.js' : 'src/index.tsx'}?eos=${VERSION}"`), file);
        assert.match(html, new RegExp(`eos-role-bootstrap\\.js\\?eos=${VERSION}"`));
        assert.match(html, new RegExp(`eos-product-loader\\.css\\?eos=${VERSION}"`));
        assert.ok(html.includes(`name="nexowatt-eos-asset-version" content="${VERSION}"`));
    }
});

test('all bootstrap importers, their dynamic preload maps and reverse importers use the same new cache namespace', () => {
    assert.ok(affected.size >= 20);
    let references = 0;
    for (const [name, source] of modules) {
        for (const match of source.matchAll(LOCAL_JS)) {
            if (!affected.has(path.basename(match[2]))) continue;
            references++;
            assert.ok(match[0].includes(`?eos=${VERSION}`), `${name} -> ${match[2]}`);
            assert.ok(fs.existsSync(path.join(assets, path.basename(match[2]))));
        }
        assert.equal(versionSource(source, affected), source, `idempotent ${name}`);
    }
    assert.ok(references > affected.size);
    for (const seed of SEEDS) assert.ok(affected.has(seed));
});

test('cache rewriting preserves unrelated library imports and follows dependency cycles', () => {
    const fixture = new Map([
        [SEEDS[0], `import("./${SEEDS[1]}")`],
        [SEEDS[1], 'import("./screen.js");import "./library.js"'],
        ['screen.js', `import {x} from "./${SEEDS[1]}"`],
        ['library.js', 'export const x=1;'],
    ]);
    const members = closure(fixture);
    assert.ok(members.has('screen.js'));
    assert.equal(members.has('library.js'), false);
    const revised = versionSource(fixture.get(SEEDS[1]), members);
    assert.ok(revised.includes(`./screen.js?eos=${VERSION}`));
    assert.ok(revised.includes('"./library.js"'));
    assert.equal(versionSource(revised, members), revised);
});
