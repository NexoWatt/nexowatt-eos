'use strict';

// Static release contracts: no credentials, dependency downloads or device access.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(root, file));
const digest = file => crypto.createHash('sha256').update(read(file)).digest('hex');
const iconHash = 'c837651adbc7a00a044c4804c7140af99d3efdf54b0f4a97edf359e7b75593e1';

test('all deployed favicon copies match the exact supplied NexoWatt icon', () => {
    for (const file of [
        'components/admin/src-admin/public/favicon.ico', 'components/admin/adminWww/favicon.ico',
        'components/admin/admin/favicon.ico', 'components/admin/www/favicon.ico',
        'components/ui/www/favicon.ico', 'components/ui/admin/admin_logo_.ico',
    ]) assert.equal(digest(file), iconHash, file);
    const icon = read('components/ui/www/favicon.ico');
    assert.equal(icon.readUInt16LE(2), 1);
    assert.equal(icon.readUInt16LE(4), 4);
    const sizes = Array.from({ length: 4 }, (_, i) => icon[6 + i * 16]).sort((a, b) => a - b);
    assert.deepEqual(sizes, [16, 32, 48, 64]);
});

test('Admin source/build logo and manifest remain identical across rebuilds', () => {
    const source = 'components/admin/src-admin/public';
    const built = 'components/admin/adminWww';
    for (const file of ['img/admin.png', 'logo192.png', 'logo512.png', 'manifest.json', 'js/eos-branding-sanitizer.js']) {
        assert.equal(digest(`${source}/${file}`), digest(`${built}/${file}`), file);
    }
    assert.equal(digest(`${source}/img/admin.png`), digest(`${source}/logo192.png`));
    for (const dir of [source, built]) {
        const manifest = JSON.parse(read(`${dir}/manifest.json`));
        assert.equal(manifest.short_name, 'NexoWatt EOS');
        assert.equal(manifest.icons[0].sizes, '16x16 32x32 48x48 64x64');
        for (const icon of manifest.icons) assert.ok(fs.existsSync(path.join(root, dir, icon.src.split('?')[0])));
    }
});

test('each static EOS UI page selects one local product favicon without a competing inline icon', () => {
    const dir = path.join(root, 'components/ui/www');
    const files = fs.readdirSync(dir).filter(file => file.endsWith('.html'));
    assert.ok(files.length >= 20);
    for (const file of files) {
        const html = fs.readFileSync(path.join(dir, file), 'utf8');
        assert.match(html, /<title>NexoWatt EOS(?:[^<]*)<\/title>/, file);
        const icons = html.match(/<link\b[^>]*\brel=["'](?:shortcut )?icon["'][^>]*>/gi) || [];
        assert.equal(icons.length, 1, file);
        assert.match(icons[0], /href="\/favicon\.ico\?v=eos-20261001"/, file);
    }
});

test('legal upstream names and the product support destination stay accurate', () => {
    for (const file of fs.readdirSync(path.join(root, 'components/admin/src-admin/src/i18n'))) {
        if (!file.endsWith('.json')) continue;
        const locale = JSON.parse(read(`components/admin/src-admin/src/i18n/${file}`));
        assert.match(locale['for ioBroker.net portal'], /ioBroker\.net/, file);
        assert.match(locale['The sent data will only be processed by ioBroker GmbH for statistical purposes and will not be shared with any third parties.'], /ioBroker GmbH/, file);
    }
    for (const file of ['components/admin/src-admin/src/App.tsx', 'components/admin/adminWww/assets/bootstrap-COulQZax-v84.js']) {
        assert.match(read(file).toString(), /https:\/\/github\.com\/NexoWatt\/EOS\/issues/);
    }
    assert.ok(fs.existsSync(path.join(root, 'components/admin/THIRD_PARTY_NOTICES.md')));
});


test('product boot logo replaces the upstream CSS Loader before the application starts', () => {
    const source = 'components/admin/src-admin/public';
    const built = 'components/admin/adminWww';
    assert.equal(digest(source + '/css/eos-product-loader.css'), digest(built + '/css/eos-product-loader.css'));
    const css = read(built + '/css/eos-product-loader.css').toString();
    assert.match(css, /\.logo-back > \.logo-div,[\s\S]*?display: none !important/);
    assert.match(css, /nexowatt-eos-brand-wide\.png/);
    assert.match(css, /NexoWatt EOS wird gestartet/);
    assert.ok(!css.includes('http:'), 'boot image must be local');
    for (const file of ['components/admin/src-admin/index.html', built + '/index.html']) {
        const html = read(file).toString();
        assert.ok(html.includes("window.loadingHideLogo = 'true';"), file);
        assert.ok(html.indexOf('eos-product-loader.css') < html.indexOf('eos-role-bootstrap.js'), file);
        assert.ok(html.indexOf("window.loadingHideLogo = 'true';") > html.indexOf("window.loadingHideLogo = '@@loadingHideLogo@@';"), file);
    }
});

test('long product marks use the supplied NexoWatt asset in source, build and installer', () => {
    const logo = read('components/admin/src-admin/public/img/eos/nexowatt-eos-brand-wide.png').toString('base64');
    for (const file of ['components/admin/src-admin/src/assets/longLogo.svg', 'components/admin/adminWww/assets/longLogo-Cq2C5cCK.svg', 'img/logos/ioBroker_Logo_Long_Vector.svg']) {
        const svg = read(file).toString();
        assert.match(svg, /<title>NexoWatt EOS<\/title>/, file);
        assert.ok(svg.includes('data:image/png;base64,' + logo), file);
    }
});

test('backup source and shipped bundle contain the same product icon', () => {
    const backup = read('components/backitup/src-tab/src/assets/nexowatt-backup.png');
    const backupHash = crypto.createHash('sha256').update(backup).digest('hex');
    for (const part of ['src-admin', 'src-tab']) {
        assert.equal(digest('components/backitup/' + part + '/src/assets/iobroker.png'), backupHash);
        assert.equal(digest('components/backitup/' + part + '/public/favicon.ico'), iconHash);
    }
    assert.equal(digest('components/backitup/admin/favicon.ico'), iconHash);
    const built = read('components/backitup/admin/assets/index-WNnhOy0_.js').toString();
    assert.ok(built.includes('data:image/png;base64,' + backup.toString('base64')));
    // This fingerprint is the upstream 2418-byte icon previously left in the shipped tab.
    const embedded = [...built.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)];
    assert.ok(embedded.length > 0);
    for (const match of embedded) {
        const hash = crypto.createHash('sha256').update(Buffer.from(match[1], 'base64')).digest('hex');
        assert.notEqual(hash, '61277a4cb094271e8784aabcc3cceb8cda43b7a5f71514424c307943915459ed');
    }
});


test('backup standalone pages replace any library loading mark with the own local logo', () => {
    const built = 'components/backitup/admin';
    for (const part of ['src-admin', 'src-tab']) {
        assert.equal(digest('components/backitup/' + part + '/public/eos-product-loader.css'), digest(built + '/eos-product-loader.css'));
        assert.equal(digest('components/backitup/' + part + '/public/nexowatt-eos-logo.png'), digest(built + '/nexowatt-eos-logo.png'));
        assert.match(read('components/backitup/' + part + '/index.html').toString(), /eos-product-loader\.css/);
    }
    assert.match(read(built + '/tab_m.html').toString(), /eos-product-loader\.css/);
    assert.match(read(built + '/eos-product-loader.css').toString(), /nexowatt-eos-logo\.png/);
});
