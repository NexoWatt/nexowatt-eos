(() => {
    'use strict';
    const VERSION = 'v20261001-product-branding';
    const existing = window.NEXOWATT_EOS_BRANDING_SANITIZER;
    if (existing?.version === VERSION) return;
    existing?.destroy?.();
    const abort = new AbortController();
    let unsubscribe = null;
    const skip = new Set(['SCRIPT','STYLE','CODE','PRE','TEXTAREA','NOSCRIPT']);
    const preserved = 'script,style,code,pre,textarea,noscript,[data-eos-preserve-attribution],.third-party-notices,#third-party-notices';
    // Only complete product labels are branding. Arbitrary text may contain a
    // package ID, an error, an adapter description or an upstream attribution.
    // Never globally rewrite such technical or legal evidence.
    const labels = new Map([
        ['ioBroker', 'NexoWatt EOS'],
        ['ioBroker.admin', 'NexoWatt EOS Admin'],
        ['ioBroker Admin', 'NexoWatt EOS Admin'],
        ['Waiting for connection of ioBroker...', 'Verbindung zu NexoWatt EOS wird hergestellt …'],
    ]);
    const rewrite = value => {
        const text = String(value || '');
        const label = text.trim();
        return labels.has(label) ? text.replace(label, labels.get(label)) : text;
    };
    const rewriteElement = root => {
        if (!root) return;
        const start = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
        if (!start || start.closest?.(preserved)) return;
        const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let count = 0;
        let node = start;
        while (node && count++ < 12000) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (!skip.has(node.parentElement?.tagName || '') && !node.parentElement?.closest?.(preserved)) {
                    const next = rewrite(node.nodeValue);
                    if (next !== node.nodeValue) node.nodeValue = next;
                }
            } else if (!skip.has(node.tagName) && !node.closest?.(preserved)) {
                for (const attr of ['title','aria-label','alt','placeholder']) {
                    const value = node.getAttribute?.(attr);
                    if (value) {
                        const next = rewrite(value);
                        if (next !== value) node.setAttribute(attr, next);
                    }
                }
            }
            node = walker.nextNode();
        }
    };
    const apply = mutations => {
        document.title = 'NexoWatt EOS – Energy Operation System';
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.content = 'NexoWatt EOS – Energy Operation System';
        if (!mutations?.length) rewriteElement(document.body);
        else mutations.forEach(mutation => {
            if (mutation.type === 'characterData') rewriteElement(mutation.target);
            for (const node of mutation.addedNodes || []) rewriteElement(node);
        });
    };
    const connect = () => {
        const coordinator = window.NEXOWATT_EOS_DOM_COORDINATOR;
        if (!coordinator?.subscribe) return window.setTimeout(connect, 150);
        unsubscribe = coordinator.subscribe(mutations => apply(mutations));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { apply([]); connect(); }, { once: true, signal: abort.signal });
    else { apply([]); connect(); }
    window.NEXOWATT_EOS_BRANDING_SANITIZER = Object.freeze({ version: VERSION, refresh: () => apply([]), destroy() { unsubscribe?.(); abort.abort(); } });
})();
