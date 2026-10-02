(() => {
    'use strict';

    const VERSION = 'v91-product-role-access';
    const protectedAdapters = new Set([
        'admin', 'eos-admin', 'backitup', 'nexowatt-devices', 'nexowatt-device', 'nexowatt-dev', 'nexowatt-ui',
    ]);

    const normalizeTarget = value => {
        let raw = String(value || '').trim().toLowerCase();
        raw = raw
            .replace(/^system\.adapter\./, '')
            .replace(/^iobroker\./, '')
            .replace(/^@nexowatt\/iobroker\./, '')
            .replace(/^@nexowatt\//, '');
        const match = raw.match(/^([a-z0-9_-]+)(?:\.(\d+))?$/);
        return match ? { adapter: match[1], instance: match[2] } : { adapter: raw.replace(/\.\d+$/, ''), instance: undefined };
    };

    const policy = () => window.NEXOWATT_EOS_POLICY_CLIENT?.getPolicy?.() || null;
    const isAdmin = () => {
        const value = policy();
        return !!(value?.isAdmin || value?.isEosAdminGroup || value?.isAdministrator || /^(?:admin|administrator)$/.test(String(value?.role || '').toLowerCase()));
    };

    window.NEXOWATT_EOS_SECURITY = Object.freeze({
        version: VERSION,
        getPolicy: policy,
        isAdminUser: isAdmin,
        isProtectedAdapter(value) {
            const { adapter } = normalizeTarget(value);
            return protectedAdapters.has(adapter);
        },
        shouldBlockAdapterDelete(value) {
            const { adapter } = normalizeTarget(value);
            return protectedAdapters.has(adapter);
        },
        shouldBlockInstanceDelete(value) {
            const { adapter, instance } = normalizeTarget(value);
            if (!protectedAdapters.has(adapter)) return false;
            if (adapter === 'admin' || adapter === 'eos-admin') return instance === undefined || instance === '0';
            return true;
        },
    });
})();
