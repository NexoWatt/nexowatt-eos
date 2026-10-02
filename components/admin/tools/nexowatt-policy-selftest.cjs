#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const code = fs.readFileSync(path.resolve(__dirname, '..', 'adminWww/js/eos-policy-client.js'), 'utf8');

async function run(fetchImpl, refreshAgain = false) {
    let observerCount = 0;
    const longTimers = [];
    class MockMutationObserver {
        constructor() { observerCount += 1; }
        observe() {}
        disconnect() {}
    }
    class MockCustomEvent {
        constructor(type, options) { this.type = type; this.detail = options?.detail; }
    }
    const document = {
        readyState: 'complete',
        documentElement: {},
        hidden: false,
        currentScript: { src: 'http://eos/js/eos-policy-client.js' },
        querySelector: () => null,
        addEventListener: () => undefined,
    };
    const windowObject = {
        location: { href: 'http://eos/' },
        setTimeout(fn, ms) {
            const id = setTimeout(fn, ms);
            if (ms > 100) longTimers.push(id);
            return id;
        },
        clearTimeout,
        requestAnimationFrame: fn => setTimeout(fn, 0),
        addEventListener: () => undefined,
        dispatchEvent: () => undefined,
    };
    const context = {
        window: windowObject,
        document,
        fetch: fetchImpl,
        MutationObserver: MockMutationObserver,
        CustomEvent: MockCustomEvent,
        URL,
        AbortController,
        queueMicrotask,
        console,
        setTimeout,
        clearTimeout,
        Object,
        Set,
        Error,
    };
    vm.createContext(context);
    vm.runInContext(code, context, { filename: 'eos-policy-client.js' });
    await new Promise(resolve => setTimeout(resolve, 30));
    if (refreshAgain) {
        await windowObject.NEXOWATT_EOS_POLICY_CLIENT.refresh();
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    longTimers.forEach(clearTimeout);
    return {
        status: windowObject.NEXOWATT_EOS_POLICY_CLIENT.getStatus(),
        policy: windowObject.NEXOWATT_EOS_POLICY_CLIENT.getPolicy(),
        observerCount,
    };
}

(async () => {
    const success = await run(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ role: 'admin', isAdmin: true, user: 'system.user.admin' }),
    }));
    const failure = await run(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    let calls = 0;
    const stale = await run(async () => {
        calls += 1;
        return calls === 1
            ? { ok: true, status: 200, json: async () => ({ role: 'admin', isAdmin: true, user: 'system.user.admin' }) }
            : { ok: false, status: 503, json: async () => ({}) };
    }, true);
    if (success.status !== 'ready' || success.policy?.role !== 'admin' || success.observerCount !== 1) {
        throw new Error(`success path invalid: ${JSON.stringify(success)}`);
    }
    if (failure.status !== 'unknown' || failure.policy !== null || failure.observerCount !== 1) {
        throw new Error(`failure path downgraded or duplicated observer: ${JSON.stringify(failure)}`);
    }
    if (stale.status !== 'stale' || stale.policy?.role !== 'admin' || stale.observerCount !== 1) {
        throw new Error(`last-good policy was not retained: ${JSON.stringify(stale)}`);
    }
    console.log('[NexoWatt EOS policy self-test] OK');
})().catch(error => {
    console.error(`[NexoWatt EOS policy self-test] ${error.stack || error}`);
    process.exit(1);
});
