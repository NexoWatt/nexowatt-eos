'use strict';
// Execute the shipped browser script with a DOM/fetch fixture. Real Response
// streams, no live browser, HTTPS/session, database or Raspberry Pi claim.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/nexowatt-license.js'), 'utf8');
const uuid = '12345678-1234-4234-8234-123456789abc';
const missing = { v: 1, valid: false, code: 'LICENSE_MISSING', uuid, edition: null, expiresAt: null, limits: {}, features: [] };
const active = edition => ({ ...missing, valid: true, code: 'LICENSE_VALID', edition,
    limits: { chargePoints: edition === 'home' ? 3 : 50, batteries: edition === 'home' ? 2 : 10 }, features: ['energy'] });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
async function harness(initial = missing) {
    const elements = Object.fromEntries(['status', 'uuid', 'edition', 'expiry', 'limits', 'features', 'message', 'token', 'refresh', 'activate', 'remove', 'checked', 'statusCard'].map(id => [id,
        { textContent: '', className: '', value: '', disabled: false, dataset: {}, setAttribute() {}, focus() {} }]));
    const replies = [json(initial)], calls = [], timers = new Map();
    const buttons = ['refresh', 'activate', 'remove'].map(id => elements[id]);
    const context = {
        document: { getElementById: id => elements[id], querySelectorAll: () => buttons },
        fetch: async (url, options) => { calls.push({ url, options }); const reply = replies.shift(); if (!reply) throw new Error('missing fixture'); return typeof reply === 'function' ? reply(options) : reply; },
        AbortController, TextDecoder, Date, confirm: () => true,
        setTimeout(fn, ms) { const id = Symbol(); timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); },
    };
    Object.defineProperty(context, 'localStorage', { get() { throw Error('Browser storage must not be used'); } });
    Object.defineProperty(context, 'sessionStorage', { get() { throw Error('Browser storage must not be used'); } });
    vm.runInNewContext(source, context, { filename: 'nexowatt-license.js' });
    const settle = async () => { for (let i = 0; i < 40 && buttons.some(button => button.disabled); i++) await new Promise(setImmediate); assert.ok(buttons.every(button => !button.disabled), 'operation settled'); };
    await settle();
    return { elements, replies, calls, timers, settle, async click(id) { await elements[id].onclick(); await settle(); } };
}

test('activation keeps entered token until a successful server confirmation and prevents double submit', async () => {
    const h = await harness(); let resolve;
    h.replies.push(() => new Promise(done => { resolve = done; }));
    h.elements.token.value = 'NWL3.test-input.signature';
    const pending = h.elements.activate.onclick();
    assert.equal(h.elements.token.value, 'NWL3.test-input.signature');
    assert.equal(h.elements.activate.disabled, true);
    assert.match(h.elements.message.textContent, /geprüft|Prüfung/);
    await h.elements.activate.onclick(); assert.equal(h.calls.length, 2);
    resolve(json(active('home'))); await pending; await h.settle();
    assert.equal(h.elements.token.value, '');
    assert.match(h.elements.message.textContent, /EOS Home.*aktiviert/);
    assert.match(h.elements.message.textContent, /Eingabefeld.*geleert/);
});

for (const edition of ['home', 'pro']) test(`confirmed ${edition} remains visible after a fresh page load without displaying the saved key`, async () => {
    const h = await harness(active(edition));
    assert.match(h.elements.status.textContent, /aktiviert/);
    assert.equal(h.elements.edition.textContent, edition === 'home' ? 'EOS Home' : 'EOS Pro');
    assert.equal(h.elements.expiry.textContent, 'Dauerhaft');
    assert.equal(h.elements.token.value, '');
    assert.notEqual(h.elements.checked.textContent, '');
    assert.equal(h.calls[0].options.credentials, 'same-origin');
    assert.equal(h.calls[0].options.cache, 'no-store');
    assert.equal(h.calls[0].options.redirect, 'error');
});

for (const code of ['LICENSE_KEY_UNKNOWN', 'LICENSE_UUID_MISMATCH', 'LICENSE_SIGNATURE_INVALID', 'LICENSE_NOT_YET_VALID', 'LICENSE_ADMIN_REQUIRED']) {
    test(`rejected activation ${code} keeps input, shows a useful fixed error and can refresh the preserved previous license`, async () => {
        const h = await harness(active('home'));
        h.elements.token.value = 'NWL3.test-input.signature'; h.replies.push(json({ error: code }, 400));
        await h.click('activate');
        assert.equal(h.elements.token.value, 'NWL3.test-input.signature');
        assert.match(h.elements.message.textContent, new RegExp(code));
        assert.doesNotMatch(h.elements.message.textContent, /test-input/);
        assert.match(h.elements.status.textContent, /nicht bestätigt/);
        assert.equal(h.elements.edition.textContent, '–');
        h.replies.push(json(active('home'))); await h.click('refresh');
        assert.match(h.elements.status.textContent, /EOS Home.*aktiviert/);
    });
}

test('empty input and false or malformed successful responses never produce an activation success', async () => {
    const empty = await harness(); await empty.click('activate');
    assert.equal(empty.calls.length, 1, 'empty input is not transmitted');
    for (const data of [missing, { ...active('home'), valid: 'true' }, { ...active('home'), edition: 'premium' },
        { ...active('home'), code: 'LICENSE_MISSING' }, { ...active('home'), limits: null }, { ...active('home'), expiresAt: 'forever' }]) {
        const h = await harness(); h.elements.token.value = 'NWL3.test-input.signature'; h.replies.push(json(data));
        await h.click('activate');
        assert.equal(h.elements.token.value, 'NWL3.test-input.signature');
        assert.doesNotMatch(h.elements.message.textContent, /verschlüsselt gespeichert/);
        assert.match(h.elements.status.textContent, /nicht bestätigt/);
    }
});

test('a timed-out write is explicitly unconfirmed, aborts at five seconds and retains input for diagnosis', async () => {
    const h = await harness(); let signal;
    h.replies.push(options => new Promise((_resolve, reject) => {
        signal = options.signal; signal.addEventListener('abort', () => reject(Object.assign(Error('private failure'), { name: 'AbortError' })), { once: true });
    }));
    h.elements.token.value = 'NWL3.test-input.signature'; const pending = h.elements.activate.onclick();
    assert.equal(h.timers.size, 1); const timeout = [...h.timers.values()][0]; assert.equal(timeout.ms, 5000);
    timeout.fn(); await pending; await h.settle();
    assert.equal(signal.aborted, true); assert.equal(h.timers.size, 0);
    assert.equal(h.elements.token.value, 'NWL3.test-input.signature');
    assert.match(h.elements.message.textContent, /Status aktualisieren/);
    assert.match(h.elements.status.textContent, /nicht bestätigt/);
    assert.equal(h.calls[1].options.headers['X-EOS-License'], '1');
    assert.equal(h.calls[1].options.method, 'POST');
});

test('HTML, oversized responses and arbitrary exception text never show a success or disclose response content', async () => {
    for (const reply of [new Response('private-failure-body', { status: 503, headers: { 'Content-Type': 'text/html' } }),
        json({ error: 'private-failure-body' }, 400), json({ ...active('pro'), unexpected: 'x'.repeat(40000) })]) {
        const h = await harness(active('home')); h.replies.push(reply); await h.click('refresh');
        assert.match(h.elements.status.textContent, /nicht bestätigt/);
        assert.equal(h.elements.edition.textContent, '–');
        assert.doesNotMatch(h.elements.message.textContent, /private-failure-body|xxxx/);
        assert.equal(h.timers.size, 0);
    }
});

test('confirmed removal clears edition and reports removal separately from an unconfirmed request', async () => {
    const h = await harness(active('pro')); h.replies.push(json(missing)); await h.click('remove');
    assert.equal(h.elements.edition.textContent, '–');
    assert.match(h.elements.status.textContent, /Keine Lizenz aktiviert/);
    assert.match(h.elements.message.textContent, /Lizenz entfernt/);
});

test('license page explains NWL3 input, retained activation status and intentional post-success clearing', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/nexowatt-license.html'), 'utf8');
    assert.match(html, /placeholder="NWL3/);
    assert.match(html, /id="checked"/);
    assert.match(html, /erst nach.*bestätigten Aktivierung/);
    assert.doesNotMatch(html, /erwartet das signierte Format NWL2|muss dafür noch angebunden/);
});
