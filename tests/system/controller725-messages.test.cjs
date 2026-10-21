'use strict';
// Published, hash-bound adapter methods with only the DB boundary replaced.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const shutdown = require('../../runtime/controller-profile/v7.2.5/adapter-shutdown.cjs');
for (const row of shutdown.FILES) test(`${row.flavor}: sendTo/sendToHost retain authenticated user and sender; absent user is not elevated`, async () => {
    const bytes = fs.readFileSync(path.join(__dirname, 'controller-profile-fixtures/7.2.5', `${row.flavor}-adapter.original.txt`));
    const text = shutdown.transformFile(row.relativePath, bytes).content, indent = row.flavor === 'cjs' ? '  ' : '    ';
    function method(signature) {
        const start = text.indexOf(indent + signature), end = text.indexOf('\n' + indent + '}', start);
        assert.ok(start > 0 && end > start); return text.slice(start, end + indent.length + 2);
    }
    const messages = [];
    const states = { async pushMessage(target, value) { messages.push({ target, value }); } };
    const adapter = vm.runInNewContext(`class MessageContract {
        #states; #objects;
        constructor() { this.#states = states; this.namespace = this.namespaceLog = 'eos-admin.0'; this._logger = { silly() {}, info() {} }; }
        ${method('#userOf(options) {')}
        ${method('async _sendTo(_options) {')}
        ${method('async _sendToHost(_options) {')}
    }; new MessageContract();`, { states }, { timeout: 1000 });
    for (const user of ['system.user.customer', 'system.user.installer', undefined, '', null]) {
        const options = { command: 'status', message: { user: 'system.user.admin' }, options: { user } };
        await adapter._sendTo({ ...options, instanceName: 'nexowatt-ui.0' });
        await adapter._sendToHost({ ...options, hostName: 'contract' });
        for (const { value } of messages.slice(-2)) {
            assert.equal(value.from, 'system.adapter.eos-admin.0');
            assert.equal(value.user, user || undefined);
            assert.equal(Object.hasOwn(value, 'user'), typeof user === 'string' && user.length > 0);
        }
    }
    assert.equal(messages.length, 10);
    assert.equal(messages[0].target, 'system.adapter.nexowatt-ui.0');
    assert.equal(messages[1].target, 'system.host.contract');
});
