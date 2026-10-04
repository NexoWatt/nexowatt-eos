'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const read = name => fs.readFileSync(path.join(root, name));
const digest = name => crypto.createHash('sha256').update(read(name)).digest('hex');
const git = args => cp.execFileSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
const record = JSON.parse(read('reports/integration/branding-main-20261004/backup-assets-merge.json'));

test('all 30 scoped source assets match the reviewed merge record', () => {
    assert.equal(record.paths.length, 30);
    for (const item of record.paths) {
        assert.match(item.path, /^(components\/backitup\/|img\/logos\/)/);
        assert.ok(['new', 'safe-local-only'].includes(item.status));
        assert.equal(digest(item.path), record.sha256[item.path], item.path);
        if (item.remote) assert.equal(git(['rev-parse', record.baseCommit + ':' + item.path]).toString().trim(), item.remote);
    }
});

test('all backup HTML entries select the product loading CSS and local image', () => {
    const built = 'components/backitup/admin';
    const css = read(built + '/eos-product-loader.css').toString();
    assert.match(css, /\.logo-back > \.logo-div,[\s\S]*?display: none !important/);
    assert.match(css, /url\('\.\/nexowatt-eos-logo\.png'\)/);
    for (const part of ['src-admin', 'src-tab']) {
        assert.equal(digest('components/backitup/' + part + '/public/eos-product-loader.css'), digest(built + '/eos-product-loader.css'));
        assert.equal(digest('components/backitup/' + part + '/public/nexowatt-eos-logo.png'), digest(built + '/nexowatt-eos-logo.png'));
        assert.match(read('components/backitup/' + part + '/index.html').toString(), /eos-product-loader\.css\?v=20261004/);
    }
    const html = read(built + '/tab_m.html').toString();
    assert.match(html, /index-WNnhOy0_\.js\?v=eos-20261004/);
    assert.match(html, /eos-product-loader\.css\?v=20261004/);
});

test('backup favicons and compatibility icons use the current own source assets', () => {
    const iconHash = digest('components/admin/src-admin/public/favicon.ico');
    const backupHash = digest('components/backitup/src-tab/src/assets/nexowatt-backup.png');
    for (const part of ['src-admin', 'src-tab']) {
        assert.equal(digest('components/backitup/' + part + '/public/favicon.ico'), iconHash);
        assert.equal(digest('components/backitup/' + part + '/src/assets/iobroker.png'), backupHash);
    }
    assert.equal(digest('components/backitup/admin/favicon.ico'), iconHash);
});

test('backup compiled JavaScript differs from current main only by the known embedded logo bytes', () => {
    const name = 'components/backitup/admin/assets/index-WNnhOy0_.js';
    const original = git(['show', record.baseCommit + ':' + name]).toString();
    const oldIcon = git(['show', record.baseCommit + ':components/backitup/src-tab/src/assets/iobroker.png']).toString('base64');
    const ownIcon = read('components/backitup/src-tab/src/assets/nexowatt-backup.png').toString('base64');
    assert.equal(original.split(oldIcon).length - 1, 1);
    assert.equal(read(name).toString(), original.replace(oldIcon, ownIcon));
});

test('installer compatibility logos contain current NexoWatt product assets', () => {
    const source = 'components/admin/src-admin/public';
    const ownWide = read(source + '/img/eos/nexowatt-eos-brand-wide.png').toString('base64');
    assert.ok(read('img/logos/ioBroker_Logo_Long_Vector.svg').toString().includes(ownWide));
    for (const name of ['ioBroker_Logo_Vector_Big.svg', 'ioBroker_Logo_Vector_Small.svg']) {
        assert.equal(digest('img/logos/' + name), digest(source + '/img/eos/eos-logo.svg'));
    }
    for (const name of ['favicon.ico', 'admin_logo.ico']) assert.equal(digest('img/logos/' + name), digest(source + '/favicon.ico'));
    for (const size of [64, 128, 256, 512]) assert.equal(digest('img/logos/ioBroker_Logo_' + size + 'px.png'), digest(source + '/img/eos/nexowatt-' + size + '.png'));
});

test('existing delivery remains unchanged by this source-only integration', () => {
    assert.equal(git(['diff', '--name-only', 'HEAD', '--', 'delivery']).toString(), '');
});
