'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sourceLogoLiteral, transform } = require('../tools/nexowatt-build-branding-assets.cjs');
const root = path.resolve(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'src-admin/src/assets/logo.svg'), 'utf8');
const png = fs.readFileSync(path.join(root, 'src-admin/public/img/eos/nexowatt-192.png'));
const literal = sourceLogoLiteral(svg, png);

test('small bundled icon decodes to the existing approved source SVG and PNG', () => {
    const url = JSON.parse(literal);
    assert.equal(Buffer.from(url.split(',')[1], 'base64').toString(), svg);
    assert.throws(() => sourceLogoLiteral(svg, Buffer.from('unreviewed image')), /SOURCE_IMAGE_MISMATCH/);
    assert.throws(() => sourceLogoLiteral(svg.replace('aria-label="NexoWatt EOS"', ''), png), /SOURCE_IMAGE_MISMATCH/);
});

test('unknown or duplicate prebuilt graphics fail closed', () => {
    assert.throws(() => transform('const IoBrokerLogo="data:image/svg+xml,unknown";', literal), /UNKNOWN_PREBUILT_LOGO/);
    assert.throws(() => transform('const Logo="unrelated";', literal), /EXPECTED_ONE_LOGO/);
    assert.throws(() => transform(`IoBrokerLogo=${literal};IoBrokerLogo=${literal};`, literal), /EXPECTED_ONE_LOGO/);
});

test('transform changes only the product graphic and its two accessible labels', () => {
    const product = `const IoBrokerLogo=${literal};`;
    const labels = 'src:IoBrokerLogo,style:styles$j.logo,alt:"logo";src:LongLogo,alt:"ioBroker";';
    const preserved = '/* MIT Copyright ioBroker contributors */const provider="iobroker.net";const id="system.adapter.admin.0";';
    const output = transform(product + labels + preserved, literal);
    assert.equal(output, product + 'src:IoBrokerLogo,style:styles$j.logo,alt:"NexoWatt EOS";src:LongLogo,alt:"NexoWatt EOS";' + preserved);
    assert.equal(transform(output, literal), output);
});

test('served wizard and credentials share the exact source graphic', () => {
    const bootstrap = fs.readFileSync(path.join(root, 'adminWww/assets/bootstrap-COulQZax-v84.js'), 'utf8');
    assert.ok(bootstrap.includes(`IoBrokerLogo=${literal}`));
    assert.equal(transform(bootstrap, literal), bootstrap);
    assert.ok(bootstrap.includes('src:IoBrokerLogo,style:styles$j.logo,alt:"NexoWatt EOS"'));
    assert.ok(bootstrap.includes('src:LongLogo,alt:"NexoWatt EOS"'));
});
