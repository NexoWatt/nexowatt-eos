export function safeId(input: unknown, fallback = 'unknown'): string {
    const raw = String(input ?? '').trim();
    const normalized = raw
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^[._-]+|[._-]+$/g, '')
        .slice(0, 180);

    return normalized || fallback;
}

export function sanitizeTxtValue(input: unknown, fallback = '', maxBytes = 32): string {
    const raw = String(input ?? fallback)
        .trim()
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
        .replace(/[;=]/g, '-')
        .replace(/\s+/g, ' ');

    return truncateUtf8(raw || fallback, maxBytes) || truncateUtf8(fallback, maxBytes);
}

export function sanitizeServiceInstanceName(input: unknown, fallback = 'NexoWatt EOS'): string {
    const raw = String(input ?? fallback)
        .trim()
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
        .replace(/[;=]/g, '-')
        .replace(/\s+/g, ' ');

    return truncateUtf8(raw || fallback, 63) || truncateUtf8(fallback, 63);
}

export function sanitizeCertificateSubjectValue(input: unknown, fallback = 'NexoWatt EOS'): string {
    const raw = String(input ?? fallback)
        .trim()
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
        .replace(/[\\/+",<>;]/g, '-')
        .replace(/\s+/g, ' ');

    return truncateUtf8(raw || fallback, 64) || truncateUtf8(fallback, 64);
}

export function toNumber(input: unknown, fallback: number): number {
    const num = Number(input);
    return Number.isFinite(num) ? num : fallback;
}

export function toBoolean(input: unknown, fallback = false): boolean {
    if (typeof input === 'boolean') return input;
    if (typeof input === 'string') {
        if (['true', '1', 'yes', 'on'].includes(input.toLowerCase())) return true;
        if (['false', '0', 'no', 'off'].includes(input.toLowerCase())) return false;
    }
    return fallback;
}

export function normalizeHex(input: unknown): string {
    return String(input ?? '')
        .replace(/[^a-fA-F0-9]/g, '')
        .toUpperCase();
}

export function jsonStringifySafe(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return JSON.stringify({ error: 'Value could not be serialized' });
    }
}

function truncateUtf8(value: string, maxBytes: number): string {
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
