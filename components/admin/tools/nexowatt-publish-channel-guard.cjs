#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function validatePublishChannel(pkg, env = process.env) {
    const version = String(pkg?.version || '').trim();
    const configuredTag = String(pkg?.publishConfig?.tag || '').trim();
    const requestedTag = String(env.npm_config_tag || env.NPM_CONFIG_TAG || configuredTag || 'latest').trim();
    const isPrerelease = version.includes('-');
    const policy = pkg?.nexowattReleasePolicy || {};

    if (!version) {
        return { ok: false, message: 'package.json version is missing' };
    }
    if (configuredTag !== 'latest' || requestedTag !== 'latest') {
        return {
            ok: false,
            message: `${version} is approved only for npm dist-tag latest, got configured=${configuredTag || '<unset>'}, requested=${requestedTag || '<unset>'}`,
        };
    }

    if (isPrerelease) {
        if (policy.distTag !== 'latest' || policy.acceptedPrerelease !== version) {
            return {
                ok: false,
                message: `Prerelease ${version} may move latest only when nexowattReleasePolicy explicitly accepts this exact version`,
            };
        }
        return { ok: true, version, tag: 'latest', prerelease: true, explicitlyAccepted: true };
    }

    if (policy.acceptedPrerelease) {
        return {
            ok: false,
            message: `Stable version ${version} must remove stale acceptedPrerelease policy ${policy.acceptedPrerelease}`,
        };
    }
    return { ok: true, version, tag: 'latest', prerelease: false, explicitlyAccepted: false };
}

if (require.main === module) {
    const root = path.resolve(__dirname, '..');
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const result = validatePublishChannel(pkg, process.env);

    if (!result.ok) {
        console.error(`[NexoWatt EOS publish guard] ${result.message}`);
        process.exit(1);
    }

    console.log(
        `[NexoWatt EOS publish guard] OK (${result.version}, npm dist-tag latest${result.explicitlyAccepted ? '; exact prerelease acceptance recorded' : ''})`,
    );
}

module.exports = { validatePublishChannel };
