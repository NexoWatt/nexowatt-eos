'use strict';

// Contract against the delivered React Loader, not a second handwritten DOM.
// A dependency rebuild that changes the loader shape must be reviewed again.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const admin = path.resolve(__dirname, '../../components/admin');
const read = file => fs.readFileSync(path.join(admin, file), 'utf8');
const css = read('adminWww/css/eos-startup-branding.css');

test('startup branding is preloaded identically in source and delivered HTML', () => {
    assert.equal(css, read('src-admin/public/css/eos-startup-branding.css'));
    for (const file of ['adminWww/index.html', 'src-admin/index.html']) {
        const html = read(file);
        assert.match(html, /class="eos-native-shell"/);
        assert.match(html, /<link rel="stylesheet" href="(?:\.\/)?css\/eos-startup-branding\.css\?eos=20261004" \/>/);
        assert.match(html, /<link rel="stylesheet" href="(?:\.\/)?css\/eos-product-loader\.css\?eos=20261004" \/>/);
        assert.ok(html.indexOf('css/eos-startup-branding.css') < html.indexOf('js/eos-role-bootstrap.js'));
        assert.ok(html.indexOf('css/eos-product-loader.css') < html.indexOf('js/eos-role-bootstrap.js'));
    }
});

test('replacement reuses the existing local NexoWatt image with no remote asset', () => {
    const source = fs.readFileSync(path.join(admin, 'src-admin/public/img/eos/nexowatt-192.png'));
    const built = fs.readFileSync(path.join(admin, 'adminWww/img/eos/nexowatt-192.png'));
    assert.deepEqual(source, built);
    // Pin the reviewed existing product asset, so an upstream logo cannot return
    // simply by replacing a same-named file.
    assert.equal(crypto.createHash('sha1').update(Buffer.concat([
        Buffer.from(`blob ${built.length}\0`), built,
    ])).digest('hex'), 'ad0b19ff4a645d801f8b030d2480ce5d00c5df52');
    assert.equal(built.readUInt32BE(16), 192);
    assert.equal(built.readUInt32BE(20), 192);
    assert.match(css, /url\('\.\.\/img\/eos\/nexowatt-192\.png'\)/);
    assert.doesNotMatch(css, /https?:|@import|!important/);
});

test('all six upstream loader shapes and its halo have scoped replacement rules', () => {
    const shared = read('adminWww/assets/index-D2ymscJA-v84.js');
    const start = shared.indexOf('function sa(s){Q.useEffect(');
    const end = shared.indexOf('const oa=', start);
    assert.ok(start > 0 && end > start, 'review changed shared Loader before release');
    const createElement = (tag, props, ...children) => ({ tag, props: props || {}, children });
    const run = theme => vm.runInNewContext(`${shared.slice(start, end)}; sa({themeType: '${theme}'})`, {
        Q: { useEffect() {} }, a: { createElement, Fragment: 'fragment' }, window: {},
    }, { timeout: 1000 });
    for (const theme of ['light', 'colored', 'dark', 'blue']) {
        const root = run(theme);
        assert.equal(root.props.className, `logo-back logo-background-${theme}`);
        const [mark, halo] = root.children[0].children;
        assert.equal(mark.props.className, 'logo-div');
        assert.equal(mark.children.length, 6);
        assert.ok(halo.props.className.startsWith('logo-animate-grow '));
        for (const child of mark.children) {
            const shape = child.props.className.split(' ')[0];
            assert.ok(['logo-top', 'logo-border', 'logo-i', 'logo-i-top'].includes(shape));
            assert.ok(css.includes(`html.eos-native-shell .logo-back > .logo-div > .${shape}`));
        }
    }
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]+)\}/g);
    let hidden = 0;
    for (const [, selectors, declarations] of rules) {
        for (const selector of selectors.split(',')) {
            assert.ok(selector.trim().startsWith('html.eos-native-shell .logo-back > '), selector);
        }
        if (/display:\s*none/.test(declarations)) {
            hidden++;
            assert.equal(selectors.split(',').length, 5);
            assert.match(selectors, /\.logo-back > \.logo-animate-grow/);
            assert.match(declarations, /animation:\s*none/);
        }
    }
    assert.equal(hidden, 1);
    assert.match(css, /content:\s*'NexoWatt EOS'/);
    // The dependency's MIT copyright remains present in the delivered file.
    assert.match(shared, /Copyright 2018-2024 Denis Haev/);
});
