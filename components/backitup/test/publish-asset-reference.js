'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
// Execute the actual validator's pure resolver; no copied implementation.
const source = fs.readFileSync(path.join(__dirname, '../scripts/validate-publish.cjs'), 'utf8');
const begin = source.indexOf('function resolveTabScriptAsset(');
const end = source.indexOf('\nconst tabHtml =', begin);
assert.ok(begin >= 0 && end > begin);
const resolveAsset = vm.runInNewContext(`(${source.slice(begin, end)})`, Object.create(null));
const script = reference => `<script type="module" crossorigin src="${reference}"></script>`;
test('actual dashboard and legacy unversioned script resolve to query-free local file', () => {
    for (const ref of ['./assets/index-WNnhOy0_.js', './assets/index-WNnhOy0_.js?v=eos-20261004']) {
        assert.equal(resolveAsset(script(ref)), 'admin/assets/index-WNnhOy0_.js');
    }
    const html = fs.readFileSync(path.join(__dirname, '../admin/tab_m.html'), 'utf8');
    assert.equal(resolveAsset(html), 'admin/assets/index-WNnhOy0_.js');
});
test('external, absolute, encoded and traversal paths are rejected', () => {
    for (const ref of ['https://example.invalid/evil.js', '//example.invalid/evil.js', '/assets/evil.js',
        './assets/../evil.js', './assets/sub/evil.js', './assets/%2e%2e%2fevil.js', './assets/a\\evil.js',
        './assets/.js', './assets/a.js/evil.js', './assets/a.js#fragment']) assert.equal(resolveAsset(script(ref)), null);
});
test('only a single known EOS version parameter is permitted', () => {
    for (const ref of ['./assets/a.js?v=x', './assets/a.js?v=eos-20261004&next=../../secret',
        './assets/a.js?url=https://example.invalid', './assets/a.js?v=eos-20261004?v=x',
        './assets/a.js?v=eos-20261004#hash', './assets/a.js?v=eos-2026100', './assets/a.js?v=eos-202610040']) {
        assert.equal(resolveAsset(script(ref)), null);
    }
    assert.equal(resolveAsset('<script type="module" data-src="./assets/a.js"></script>'), null);
    assert.equal(resolveAsset(script('./assets/a.js') + script('./assets/b.js')), null);
    assert.equal(resolveAsset('<link src="./assets/a.js">'), null);
});
