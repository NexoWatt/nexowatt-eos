#!/usr/bin/env node
'use strict';

// Reconcile the reviewed prebuilt v84 graphic with the already branded source.
// This is a bounded asset transform, not a replacement for a full Vite build.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const LEGACY_LOGO_SHA256 = 'b78157abfbf328c14f1ff62d75b2079d8910fb62c6fc531c6b5e1be88345fe19';
const LOGO_ASSIGNMENT = /IoBrokerLogo=("data:image\/svg\+xml(?:;base64)?,(?:\\.|[^"\\])*")/g;

function sourceLogoLiteral(svg, png) {
    const embedded = svg.match(/<image href="data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
    if (!svg.includes('aria-label="NexoWatt EOS"') || !embedded ||
        !Buffer.from(embedded[1], 'base64').equals(png)) throw new Error('BRANDING_SOURCE_IMAGE_MISMATCH');
    return JSON.stringify(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function transform(source, literal) {
    const matches = [...source.matchAll(LOGO_ASSIGNMENT)];
    if (matches.length !== 1) throw new Error('BRANDING_EXPECTED_ONE_LOGO');
    const previous = matches[0][1];
    if (previous !== literal && digest(previous) !== LEGACY_LOGO_SHA256) {
        throw new Error('BRANDING_UNKNOWN_PREBUILT_LOGO');
    }
    return source.replace(LOGO_ASSIGNMENT, `IoBrokerLogo=${literal}`)
        .replace('src:IoBrokerLogo,style:styles$j.logo,alt:"logo"',
            'src:IoBrokerLogo,style:styles$j.logo,alt:"NexoWatt EOS"')
        .replace('src:LongLogo,alt:"ioBroker"', 'src:LongLogo,alt:"NexoWatt EOS"');
}

function apply() {
    const svgFile = 'src-admin/src/assets/logo.svg';
    const pngFile = 'src-admin/public/img/eos/nexowatt-192.png';
    const runtime = 'adminWww/assets/bootstrap-COulQZax-v84.js';
    const svg = fs.readFileSync(path.join(root, svgFile), 'utf8');
    const png = fs.readFileSync(path.join(root, pngFile));
    const before = fs.readFileSync(path.join(root, runtime), 'utf8');
    const after = transform(before, sourceLogoLiteral(svg, png));
    if (before !== after) fs.writeFileSync(path.join(root, runtime), after);
    return { schemaVersion: 1, method: 'checked prebuilt graphic transform; full frontend build not performed',
        source: { path: svgFile, sha256: digest(svg) }, image: { path: pngFile, sha256: digest(png) },
        runtime: { path: runtime, beforeSha256: digest(before), afterSha256: digest(after) },
        changed: before !== after };
}

module.exports = { sourceLogoLiteral, transform, apply };
if (require.main === module) {
    if (process.argv.length !== 2) throw new Error('BRANDING_USAGE');
    process.stdout.write(`${JSON.stringify(apply(), null, 2)}\n`);
}
