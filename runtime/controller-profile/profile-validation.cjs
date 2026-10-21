'use strict';
// Validate only the two reviewed release profiles. No semver range or environment switch.
// The legacy guard bytes remain unchanged because historical artifacts pin them.
const legacy = require('./guard.cjs');
const refresh = require('./v7.2.5/guard.cjs');
function implementation(profile) {
    return profile?.controllerVersion === '7.2.5' ? refresh : legacy;
}
function validateProfile(profile) { return implementation(profile).validateProfile(profile); }
function createGuard(profile, nodeModulesRoot) { return implementation(profile).createGuard(profile, nodeModulesRoot); }
module.exports = { validateProfile, createGuard };
