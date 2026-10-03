'use strict';
// Input validation never grants permission to control a physical installation.
const { isDeepStrictEqual } = require('node:util');
const configuration = require('./configuration.cjs');
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value) &&
    isDeepStrictEqual(Object.keys(value).sort(), [...keys].sort());
function validateOrigin(value) {
    let url; try { url = new URL(value); } catch { fail('SETUP_ORIGIN'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
        url.origin !== value || !url.hostname || url.hostname.includes('*')) fail('SETUP_ORIGIN');
    return url;
}
function validateSettings(value) {
    if (!exact(value, ['siteName', 'language', 'timeZone', 'licenseMode', 'deviceMode', 'safetyAcknowledged', 'plant', 'devicePlan']) ||
        typeof value.siteName !== 'string' || value.siteName.trim() !== value.siteName ||
        [...value.siteName].length < 1 || [...value.siteName].length > 120 || /[\x00-\x1f\x7f]/.test(value.siteName) ||
        !['de', 'en'].includes(value.language) || typeof value.timeZone !== 'string' || value.timeZone.length > 64 ||
        !['verified', 'unlicensed'].includes(value.licenseMode) || value.deviceMode !== 'disabled-pending-acceptance' ||
        value.safetyAcknowledged !== true) fail('SETUP_SETTINGS');
    try { new Intl.DateTimeFormat('en', { timeZone: value.timeZone }).format(); } catch { fail('SETUP_TIMEZONE'); }
    configuration.plant(value.plant); configuration.devicePlan(value.devicePlan);
    return structuredClone(value);
}
function validateConfiguration(value) {
    if (!exact(value, ['settings', 'license'])) fail('SETUP_INPUT');
    const settings = validateSettings(value.settings), license = configuration.licenseInput(value.license);
    if (settings.licenseMode !== (license.mode === 'activate' ? 'verified' : 'unlicensed')) fail('SETUP_SETTINGS');
    return { settings, license };
}
function validateFinish(value) {
    if (!exact(value, ['password', 'passwordRepeat', 'settings', 'license']) || value.password !== value.passwordRepeat) fail('SETUP_INPUT');
    require('../bootstrap/enrollment.cjs').validatePassword(value.password);
    return { password: value.password, ...validateConfiguration({ settings: value.settings, license: value.license }) };
}
function validateHandoff(value, releaseId) {
    if (!exact(value, ['schemaVersion', 'releaseId', 'setupId', 'passwordHash', 'settings', 'license']) || value.schemaVersion !== 2 ||
        value.releaseId !== releaseId || !/^[a-f0-9]{64}$/.test(value.releaseId) || !/^[a-f0-9]{32}$/.test(value.setupId)) fail('SETUP_HANDOFF');
    require('../bootstrap/enrollment.cjs').strongHash(value.passwordHash);
    validateConfiguration({ settings: value.settings, license: value.license });
    return structuredClone(value);
}
module.exports = { fail, exact, validateOrigin, validateSettings, validateConfiguration, validateFinish, validateHandoff };
