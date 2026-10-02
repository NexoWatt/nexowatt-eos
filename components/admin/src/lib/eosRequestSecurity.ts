/** Origin check for EOS writes. Proxy deployments must preserve Host and TLS scheme. */
export function isEosSameOriginRequest(headers: Record<string, unknown>, protocol?: string): boolean {
    const origin = typeof headers.origin === 'string' ? headers.origin.trim() : '';
    if (!origin) {
        // Explicit bearer clients have no ambient cookie authority. Browsers must send Origin.
        return !headers.cookie && typeof headers.authorization === 'string'
            && /^Bearer [^\s]+$/.test(headers.authorization);
    }
    try {
        const parsed = new URL(origin);
        const host = typeof headers.host === 'string' ? headers.host.trim().toLowerCase() : '';
        if (!host || parsed.origin !== origin || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
            || (protocol && parsed.protocol !== protocol) || parsed.host.toLowerCase() !== host) return false;
        // X-Forwarded-Host is deliberately not trusted from arbitrary clients.
        const fetchSite = String(headers['sec-fetch-site'] || '').trim().toLowerCase();
        return !fetchSite || fetchSite === 'same-origin' || fetchSite === 'none';
    } catch {
        return false;
    }
}
