"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeId = safeId;
exports.sanitizeTxtValue = sanitizeTxtValue;
exports.sanitizeServiceInstanceName = sanitizeServiceInstanceName;
exports.sanitizeCertificateSubjectValue = sanitizeCertificateSubjectValue;
exports.toNumber = toNumber;
exports.toBoolean = toBoolean;
exports.normalizeHex = normalizeHex;
exports.jsonStringifySafe = jsonStringifySafe;
function safeId(input, fallback = 'unknown') {
    const raw = String(input ?? '').trim();
    const normalized = raw
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^[._-]+|[._-]+$/g, '')
        .slice(0, 180);
    return normalized || fallback;
}
function sanitizeTxtValue(input, fallback = '', maxBytes = 32) {
    const raw = String(input ?? fallback)
        .trim()
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
        .replace(/[;=]/g, '-')
        .replace(/\s+/g, ' ');
    return truncateUtf8(raw || fallback, maxBytes) || truncateUtf8(fallback, maxBytes);
}
function sanitizeServiceInstanceName(input, fallback = 'NexoWatt EOS') {
    const raw = String(input ?? fallback)
        .trim()
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
        .replace(/[;=]/g, '-')
        .replace(/\s+/g, ' ');
    return truncateUtf8(raw || fallback, 63) || truncateUtf8(fallback, 63);
}
function sanitizeCertificateSubjectValue(input, fallback = 'NexoWatt EOS') {
    const raw = String(input ?? fallback)
        .trim()
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
        .replace(/[\\/+",<>;]/g, '-')
        .replace(/\s+/g, ' ');
    return truncateUtf8(raw || fallback, 64) || truncateUtf8(fallback, 64);
}
function toNumber(input, fallback) {
    const num = Number(input);
    return Number.isFinite(num) ? num : fallback;
}
function toBoolean(input, fallback = false) {
    if (typeof input === 'boolean')
        return input;
    if (typeof input === 'string') {
        if (['true', '1', 'yes', 'on'].includes(input.toLowerCase()))
            return true;
        if (['false', '0', 'no', 'off'].includes(input.toLowerCase()))
            return false;
    }
    return fallback;
}
function normalizeHex(input) {
    return String(input ?? '')
        .replace(/[^a-fA-F0-9]/g, '')
        .toUpperCase();
}
function jsonStringifySafe(value) {
    try {
        return JSON.stringify(value, null, 2);
    }
    catch {
        return JSON.stringify({ error: 'Value could not be serialized' });
    }
}
function truncateUtf8(value, maxBytes) {
    let result = '';
    for (const char of value) {
        const candidate = result + char;
        if (Buffer.byteLength(candidate, 'utf8') > maxBytes) {
            break;
        }
        result = candidate;
    }
    return result.trim();
}
//# sourceMappingURL=sanitizer.js.map