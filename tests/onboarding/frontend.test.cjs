'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const script = fs.readFileSync(path.join(__dirname, '../../runtime/onboarding/public/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../../runtime/onboarding/public/index.html'), 'utf8');
const policy = require('../../runtime/onboarding/policy.cjs');
const catalog = require('../../runtime/onboarding/device-catalog.json');
// Parse the actual delivered HTML and model disabled fieldset/FormData behavior.
// This is deliberately a logic test, not a claim of browser rendering acceptance.
function fixture(respond, browser = {}) {
    const requests = [], timers = [];
    let clock = 0, timerId = 0;
    class Element {
        constructor(tag) { this.tagName = tag; this.children = []; this.handlers = {}; this.hidden = false; this.disabled = false;
            this.required = false; this.checked = false; this.readOnly = false; this._value = undefined; this._text = ''; this.id = ''; this.name = ''; }
        append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
        replaceChildren(...nodes) { for (const child of this.children) child.parent = null; this.children = []; this._text = ''; this.append(...nodes); }
        remove() { this.parent.children = this.parent.children.filter(row => row !== this); this.parent = null; }
        set textContent(v) { this.replaceChildren(); this._text = v; }
        get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
        set value(v) { this._value = String(v); }
        get value() { return this._value === undefined ? this.tagName === 'select' ? (this.children[0]?.value || '') : '' : this._value; }
        addEventListener(name, callback) { this.handlers[name] = callback; }
        focus() { this.focused = true; this.handlers.focus?.(); }
        select() { this.selectionStart = 0; this.selectionEnd = this.value.length; }
        querySelectorAll(selector) { const tags = selector.split(',').map(s => s.trim()); return descendants(this).filter(n => tags.includes(n.tagName)); }
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
        get elements() { return Object.fromEntries(descendants(this).filter(n => n.name).map(n => [n.name, n])); }
    }
    const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
    const root = new Element('document'), stack = [root];
    const voidTags = new Set(['input', 'meta', 'link', 'br', 'hr', 'img']);
    for (const token of html.match(/<[^>]+>|[^<]+/g)) {
        if (!token.startsWith('<')) { stack.at(-1)._text += token; continue; }
        if (token.startsWith('<!')) continue;
        const closing = /^<\/([a-z0-9-]+)/i.exec(token);
        if (closing) { while (stack.length > 1 && stack.pop().tagName !== closing[1]) {} continue; }
        const tag = /^<([a-z0-9-]+)/i.exec(token)[1];
        if (tag === 'option' && stack.at(-1).tagName === 'option') stack.pop();
        const node = new Element(tag), attrs = token.slice(tag.length + 1, -1);
        for (const match of attrs.matchAll(/([a-zA-Z-]+)(?:="([^"]*)")?/g)) {
            const [, key, value] = match;
            if (key === 'readonly') node.readOnly = true;
            else if (['hidden', 'disabled', 'required', 'checked'].includes(key)) node[key] = true;
            else node[key] = value || '';
        }
        stack.at(-1).append(node);
        if (!voidTags.has(tag)) stack.push(node);
    }
    const element = id => { const node = descendants(root).find(n => n.id === id); assert.ok(node, 'HTML element exists: ' + id); return node; };
    const disabled = node => node.disabled || !!node.parent && disabled(node.parent);
    class FormData {
        constructor(form) { this.values = Object.fromEntries(descendants(form).filter(n => ['input', 'select', 'textarea'].includes(n.tagName) &&
            n.name && !disabled(n) && (n.type !== 'checkbox' || n.checked)).map(n => [n.name, n.type === 'checkbox' ? n.value || 'on' : n.value])); }
        get(name) { return this.values[name] ?? null; }
    }
    const context = vm.createContext({ document: { getElementById: element, createElement: tag => new Element(tag) },
        location: { origin: 'https://eos.test:8443' }, navigator: browser.navigator, URL, FormData, Date, Map, Number, AbortController,
        performance: { now: () => clock },
        fetch: async (url, options) => { requests.push({ url, options }); return respond(url, options, requests.length); },
        setTimeout: (callback, delay = 0) => { const timer = { id: ++timerId, callback, due: clock + delay }; timers.push(timer); return timer.id; },
        clearTimeout: id => { const index = timers.findIndex(timer => timer.id === id); if (index !== -1) timers.splice(index, 1); } });
    vm.runInContext(script, context);
    function set(name, value) { const input = element('setup-form').elements[name]; assert.ok(input, name);
        if (input.type === 'checkbox') input.checked = value; else input.value = value;
        input.handlers.change?.(); return input; }
    async function advance(milliseconds) {
        const target = clock + milliseconds; let count = 0;
        for (;;) {
            const next = timers.filter(timer => timer.due <= target).sort((a, b) => a.due - b.due)[0];
            if (!next) break;
            if (++count > 1000) throw new Error('fixture timer bound');
            timers.splice(timers.indexOf(next), 1); clock = next.due; next.callback(); await flush();
        }
        clock = target; await flush();
    }
    return { element, requests, timers, set, disabled, descendants, advance, formData: form => new FormData(form) };
}
const response = (status, data) => ({ ok: status < 400, status, json: async () => data });
const flush = () => new Promise(resolve => setImmediate(resolve));
const uuid = '550e8400-e29b-41d4-a716-446655440000';
function defaultResponse(url) { return response(200, url === '/api/catalog' ? { templates: catalog.templates, uuid } : { state: 'claimed', authenticated: true, csrf: 'token' }); }
function minimalForm(f) {
    for (const [key, value] of Object.entries({ password: 'A long frontend fixture password', passwordRepeat: 'A long frontend fixture password',
        licenseToken: 'NWL2.frontend-fixture' })) f.set(key, value);
}
async function submit(f) { const form = f.element('setup-form'); await form.handlers.submit({ preventDefault() {}, target: form }); await flush(); }

test('frontend consumes code in POST body and keeps cookie/CSRF credentials out of URLs and persistent browser storage', async () => {
    const f = fixture(async url => url === '/api/claim' ? response(200, { csrf: 'token', authenticated: true }) :
        url === '/api/catalog' ? defaultResponse(url) : response(200, { state: 'awaiting-code', authenticated: false }));
    await flush();
    assert.equal(f.element('setup-form').hidden, true); assert.equal(f.element('copy-uuid').disabled, true);
    assert.equal(f.element('license-uuid').value, ''); assert.deepEqual(f.requests.map(row => row.url), ['/api/session']);
    f.element('code').value = 'ephemeral-code';
    await f.element('claim-form').handlers.submit({ preventDefault() {}, target: f.element('claim-form') });
    assert.equal(f.requests[1].url, '/api/claim'); assert.equal(JSON.parse(f.requests[1].options.body).code, 'ephemeral-code');
    assert.equal(f.requests[1].options.credentials, 'same-origin');
    assert.equal(f.element('code').value, ''); assert.equal(f.element('setup-form').hidden, false);
    assert.equal(f.element('license-uuid').value, uuid);
    assert.doesNotMatch(script, /localStorage|sessionStorage|console\.|innerHTML/);
});
test('authenticated catalog UUID is visible, read-only and selectable before any license or password entry', async () => {
    const f = fixture(defaultResponse); await flush();
    const input = f.element('license-uuid'), button = f.element('copy-uuid'), form = f.element('setup-form');
    assert.equal(input.tagName, 'input'); assert.equal(input.readOnly, true); assert.equal(input.name, '');
    assert.equal(button.type, 'button'); assert.equal(button.disabled, false); assert.equal(input.value, uuid);
    for (let node = input; node; node = node.parent) assert.equal(node.hidden, false);
    assert.equal(form.elements.password.value, ''); assert.equal(f.element('license-token').value, '');
    assert.deepEqual(f.requests.map(row => row.url), ['/api/session', '/api/catalog']);
    input.focus(); assert.equal(input.selectionStart, 0); assert.equal(input.selectionEnd, uuid.length);
    assert.equal(f.formData(form).get('uuid'), null); assert.equal(f.formData(form).get('license-uuid'), null);
});
test('copy uses complete authenticated catalog UUID including vendor prefix and reports success only after Clipboard resolves', async () => {
    const copied = [], prefixed = 'nw' + uuid; let resolveCopy;
    const f = fixture(url => url === '/api/catalog' ? response(200, { templates: catalog.templates, uuid: prefixed }) : defaultResponse(url),
        { navigator: { clipboard: { writeText(value) { copied.push(value); return new Promise(resolve => { resolveCopy = resolve; }); } } } });
    await flush(); assert.equal(f.element('license-uuid').value, prefixed);
    const pending = f.element('copy-uuid').handlers.click();
    assert.deepEqual(copied, [prefixed]); assert.equal(f.element('copy-uuid').disabled, true);
    assert.doesNotMatch(f.element('uuid-copy-status').textContent, /Zwischenablage kopiert/);
    resolveCopy(); await pending;
    assert.match(f.element('uuid-copy-status').textContent, /Zwischenablage kopiert/); assert.equal(f.element('copy-uuid').disabled, false);
    assert.deepEqual(f.requests.map(row => row.url), ['/api/session', '/api/catalog']);
});
test('Clipboard absent or rejected selects the complete UUID and gives manual instructions without claiming success', async () => {
    for (const navigator of [undefined, {}, { clipboard: { writeText: async () => { throw new Error('denied'); } } }]) {
        const f = fixture(defaultResponse, { navigator }); await flush();
        await f.element('copy-uuid').handlers.click(); const input = f.element('license-uuid');
        assert.equal(input.focused, true); assert.equal(input.selectionStart, 0); assert.equal(input.selectionEnd, uuid.length);
        assert.equal(input.value, uuid); assert.equal(f.element('copy-uuid').disabled, false);
        assert.match(f.element('uuid-copy-status').textContent, /Kopieren Sie sie manuell/);
        assert.doesNotMatch(f.element('uuid-copy-status').textContent, /Zwischenablage kopiert/);
    }
});
test('missing or invalid catalog UUID never enables copying, displays response text, or creates an identity', async () => {
    for (const invalid of [undefined, null, '', 'test-uuid', uuid.toUpperCase(), ' ' + uuid, 'nw-' + uuid, 'abc' + uuid,
        '<img src=x onerror=alert(1)>', { uuid }]) {
        const copied = [];
        const f = fixture(url => url === '/api/catalog' ? response(200, { templates: catalog.templates, uuid: invalid }) : defaultResponse(url),
            { navigator: { clipboard: { writeText: async value => copied.push(value) } } });
        await flush(); assert.equal(f.element('license-uuid').value, ''); assert.equal(f.element('copy-uuid').disabled, true);
        await f.element('copy-uuid').handlers.click(); assert.deepEqual(copied, []);
        assert.match(f.element('uuid-copy-status').textContent, /Keine gültige Geräte-UUID verfügbar/);
        assert.equal(f.element('license-uuid').focused, undefined);
    }
});
test('minimal delivered form sends only schema, signed license and admin passwords, never commissioning data or device identity', async () => {
    const f = fixture(async url => url === '/api/finish' ? response(202, { state: 'committing', licenseConfigured: true }) : defaultResponse(url));
    await flush(); minimalForm(f);
    const active = f.descendants(f.element('setup-form')).filter(n => n.required && !f.disabled(n)).map(n => n.name).filter(Boolean);
    assert.deepEqual(active.sort(), ['licenseToken', 'password', 'passwordRepeat']);
    assert.deepEqual(Object.keys(f.element('setup-form').elements).sort(), active);
    await submit(f);
    const payload = JSON.parse(f.requests.find(r => r.url === '/api/finish').options.body);
    const accepted = policy.validateFinish(payload);
    assert.deepEqual(Object.keys(payload).sort(), ['license', 'password', 'passwordRepeat', 'schemaVersion']);
    assert.equal(payload.schemaVersion, 3); assert.equal(payload.license.mode, 'activate');
    assert.deepEqual(accepted.settings.commissioning, { status: 'deferred', reason: 'customer-plant-not-connected' });
    assert.equal(Object.hasOwn(payload, 'uuid'), false); assert.equal(Object.hasOwn(payload, 'settings'), false);
    assert.equal(Object.hasOwn(payload.license, 'uuid'), false); assert.equal(JSON.stringify(payload).includes(uuid), false);
    assert.equal(f.element('login').href, 'https://eos.test:8081/'); assert.equal(f.element('login').hidden, false);
    assert.match(f.element('login').textContent, /Statusprüfung/);
    assert.equal(f.element('setup-form').elements.password.value, ''); assert.equal(f.element('license-token').value, '');
    assert.match(f.element('finish-status').textContent, /OFFEN/);
    assert.doesNotMatch(html, /name="(?:siteName|language|timeZone|plantMode|deviceStatus|licenseMode|safetyAcknowledged)"/);
});
test('check uses the same minimal contract and license result shows edition without adapter/count restrictions', async () => {
    const f = fixture(async url => url === '/api/configuration/check' ? response(200, { licenseConfigured: true }) :
        url === '/api/license/verify' ? response(200, { edition: 'home', expiresAt: null,
            limits: { chargePoints: 3, batteries: 2 }, adapters: ['sensitive-internal-scope'] }) : defaultResponse(url));
    await flush(); minimalForm(f);
    await f.element('check-configuration').handlers.click();
    const payload = JSON.parse(f.requests.find(r => r.url === '/api/configuration/check').options.body);
    assert.deepEqual(Object.keys(payload).sort(), ['license', 'schemaVersion']);
    assert.doesNotThrow(() => policy.validateConfiguration(payload));
    assert.match(f.element('review-status').textContent, /Kundenanlage wird später eingerichtet/);
    await f.element('verify-license').handlers.click();
    assert.match(f.element('license-status').textContent, /HOME-Lizenz/);
    assert.match(f.element('license-status').textContent, /unbefristet/);
    assert.doesNotMatch(f.element('license-status').textContent, /1970/);
    assert.doesNotMatch(f.element('license-status').textContent, /Ladepunkte|Speicher|Adapter|sensitive-internal-scope/);
});
test('202 handoff and lost setup connection never claim completed installation', async () => {
    let handedOff = false;
    const f = fixture(async url => {
        if (url === '/api/finish') { handedOff = true; return response(202, { state: 'committing' }); }
        if (url === '/api/session' && handedOff) throw new Error('server stopped');
        return defaultResponse(url);
    });
    await flush(); minimalForm(f); await submit(f);
    assert.equal(f.element('login').hidden, false);
    assert.notEqual(f.element('finished').querySelector('h2').textContent, 'Geschützter Zugang eingerichtet');
    assert.match(f.element('message').textContent, /bestätigt keinen erfolgreichen Start/);
});
test('only explicit root completion shows access success; plant acceptance remains open', async () => {
    const closed = fixture(async () => response(410, { code: 'SETUP_CLOSED' })); await flush();
    assert.equal(closed.element('finished').querySelector('h2').textContent, 'Geschützter Zugang eingerichtet');
    assert.match(closed.element('finished').querySelector('p').textContent, /Anlagenabnahme bleibt offen/);
    assert.equal(closed.element('login').href, 'https://eos.test:8081/');
    const pending = fixture(async () => response(200, { state: 'committing', authenticated: false })); await flush();
    assert.equal(pending.element('login').hidden, false);
    assert.notEqual(pending.element('finished').querySelector('h2').textContent, 'Geschützter Zugang eingerichtet');
});
const never = () => new Promise(() => {});
test('claim header timeout aborts at five seconds, releases the button and never retries or exposes the code', async () => {
    const f = fixture(url => url === '/api/claim' ? never() : response(200, { state: 'awaiting-code', authenticated: false }));
    await flush(); const form = f.element('claim-form'); f.element('code').value = 'synthetic-secret-possession-code';
    const pending = form.handlers.submit({ preventDefault() {}, target: form }); await flush();
    const sent = f.requests.find(row => row.url === '/api/claim');
    assert.ok(sent.options.signal instanceof AbortSignal);
    await f.advance(4999); assert.equal(form.querySelector('button').disabled, true); assert.equal(sent.options.signal.aborted, false);
    await f.advance(1); await pending;
    assert.equal(sent.options.signal.aborted, true); assert.equal(form.querySelector('button').disabled, false);
    assert.match(f.element('message').textContent, /nicht rechtzeitig/);
    assert.equal(f.element('message').textContent.includes('synthetic-secret-possession-code'), false);
    assert.equal(f.requests.filter(row => row.url === '/api/claim').length, 1); assert.equal(f.timers.length, 0);
});
test('one five-second budget includes late headers and a stalled JSON body; a late body cannot reopen setup', async () => {
    let sendHeaders, sendBody;
    const f = fixture(url => url === '/api/claim' ? new Promise(resolve => { sendHeaders = resolve; }) : response(200, { state: 'awaiting-code', authenticated: false }));
    await flush(); const form = f.element('claim-form'); f.element('code').value = 'synthetic-code';
    const pending = form.handlers.submit({ preventDefault() {}, target: form }); await flush();
    await f.advance(4000);
    sendHeaders({ ok: true, status: 200, json: () => new Promise(resolve => { sendBody = resolve; }) }); await flush();
    await f.advance(999); assert.equal(form.querySelector('button').disabled, true);
    await f.advance(1); await pending;
    assert.equal(f.requests.find(row => row.url === '/api/claim').options.signal.aborted, true);
    assert.equal(form.querySelector('button').disabled, false); assert.equal(f.element('setup-form').hidden, true);
    sendBody({ authenticated: true, csrf: 'late-token' }); await flush();
    assert.equal(f.element('setup-form').hidden, true); assert.equal(f.requests.some(row => row.url === '/api/catalog'), false);
    assert.equal(f.timers.length, 0);
});
test('initial session JSON timeout is bounded and successful requests clear their deadline timers', async () => {
    const stalled = fixture(() => ({ ok: true, status: 200, json: never })); await flush();
    await stalled.advance(5000);
    assert.equal(stalled.requests[0].options.signal.aborted, true); assert.match(stalled.element('message').textContent, /nicht rechtzeitig/);
    assert.equal(stalled.timers.length, 0);
    const ok = fixture(defaultResponse); await flush();
    assert.equal(ok.timers.length, 0); assert.ok(ok.requests.every(row => row.options.signal.aborted === false));
});
test('ambiguous finish aborts, clears secrets, checks server state and never resubmits a committing handoff', async () => {
    let finished = false;
    const f = fixture(url => {
        if (url === '/api/finish') { finished = true; return never(); }
        if (url === '/api/session' && finished) return response(200, { state: 'committing', authenticated: false });
        return defaultResponse(url);
    });
    await flush(); minimalForm(f); const form = f.element('setup-form');
    const pending = form.handlers.submit({ preventDefault() {}, target: form }); await flush();
    await form.handlers.submit({ preventDefault() {}, target: form });
    assert.equal(f.requests.filter(row => row.url === '/api/finish').length, 1);
    await f.advance(5000); await pending;
    assert.equal(f.requests.find(row => row.url === '/api/finish').options.signal.aborted, true);
    assert.equal(f.element('finish-button').disabled, true); assert.equal(form.hidden, true);
    assert.equal(form.elements.password.value, ''); assert.equal(form.elements.passwordRepeat.value, ''); assert.equal(f.element('license-token').value, '');
    assert.deepEqual(f.requests.slice(2, 4).map(row => row.url), ['/api/finish', '/api/session']);
    assert.match(f.element('message').textContent, /ausschließlich der Gerätestatus/);
    await form.handlers.submit({ preventDefault() {}, target: form });
    await f.advance(180000);
    assert.equal(f.requests.filter(row => row.url === '/api/finish').length, 1);
    assert.equal(f.timers.length, 0); assert.match(f.element('finish-status').textContent, /dauert länger/);
    assert.notEqual(f.element('finished').querySelector('h2').textContent, 'Geschützter Zugang eingerichtet');
});
test('a confirmed authenticated claimed state permits only an explicit new finish with fresh credentials', async () => {
    let finishes = 0;
    const f = fixture(url => {
        if (url === '/api/finish') return ++finishes === 1 ? never() : response(202, { state: 'committing' });
        if (url === '/api/session' && finishes === 1) return response(200, { state: 'claimed', authenticated: true, csrf: 'fresh-token' });
        return defaultResponse(url);
    });
    await flush(); minimalForm(f); const form = f.element('setup-form');
    const pending = form.handlers.submit({ preventDefault() {}, target: form }); await flush();
    await f.advance(5000); await pending;
    assert.equal(finishes, 1); assert.equal(form.hidden, false); assert.equal(f.element('finish-button').disabled, false);
    assert.equal(form.elements.password.value, ''); assert.match(f.element('review-status').textContent, /bewusst absenden/);
    minimalForm(f); await submit(f);
    assert.equal(finishes, 2); assert.equal(f.requests.filter(row => row.url === '/api/finish')[1].options.headers['x-eos-csrf'], 'fresh-token');
});
test('lost finish and unreachable state stay closed to resubmission and end bounded polling after timeouts', async () => {
    let finished = false;
    const f = fixture(url => {
        if (url === '/api/finish') { finished = true; return never(); }
        if (url === '/api/session' && finished) return never();
        return defaultResponse(url);
    });
    await flush(); minimalForm(f); const form = f.element('setup-form');
    const pending = form.handlers.submit({ preventDefault() {}, target: form }); await flush();
    await f.advance(10000); await pending;
    assert.equal(f.element('finish-button').disabled, true); assert.equal(form.hidden, true);
    await f.advance(180000); const requestCount = f.requests.length;
    await f.advance(60000);
    assert.equal(f.requests.length, requestCount); assert.equal(f.timers.length, 0);
    assert.equal(f.requests.filter(row => row.url === '/api/finish').length, 1);
    assert.ok(f.requests.filter(row => row.url === '/api/session').length <= 30);
    assert.match(f.element('finish-status').textContent, /dauert länger/);
    assert.notEqual(f.element('finished').querySelector('h2').textContent, 'Geschützter Zugang eingerichtet');
});
test('reload while committing bounds even a permanently stalled poll and accepts only an explicit completion marker', async () => {
    let sessions = 0;
    const f = fixture(() => ++sessions === 1 ? response(200, { state: 'committing', authenticated: false }) : never());
    await flush(); await f.advance(180000);
    assert.equal(f.timers.length, 0); assert.ok(sessions <= 28);
    assert.match(f.element('finish-status').textContent, /dauert länger/);
    let completedSessions = 0;
    const completed = fixture(() => ++completedSessions === 1 ? response(200, { state: 'committing', authenticated: false }) : response(410, { code: 'SETUP_CLOSED' }));
    await flush();
    assert.equal(completed.element('finished').querySelector('h2').textContent, 'Geschützter Zugang eingerichtet');
    assert.equal(completed.timers.length, 0);
});
test('local reissue CLI refuses password arguments and never prints the argument', () => {
    const secret = 'ThisMustNeverAppearInProcessOutput';
    const result = spawnSync(process.execPath, [path.join(__dirname, '../../runtime/onboarding/issue-code.cjs'), '--password', secret], { encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.equal(result.stdout.includes(secret), false); assert.equal(result.stderr.includes(secret), false);
    assert.match(result.stderr, /SETUP_CODE_REISSUE_FAILED/);
});
