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
