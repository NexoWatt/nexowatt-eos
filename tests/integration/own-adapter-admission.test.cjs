'use strict';
// Source/compiled-entry regression; real positive EOS startup is qualified by
// the separate disposable native PostgreSQL Admin/UI laboratory.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const ts = createRequire(path.join(root, 'components/ui/package.json'))('typescript');
const copies = ['admin/packages', 'ui/packages', 'devices/lib', 'eebus/packages', 'ocpp21/packages', 'backitup/packages'];

test('all six own adapters carry the exact central EOS platform/lease client', () => {
    for (const name of ['index.js', 'eos-platform.js', 'index.d.ts', 'package.json']) {
        const canonical = fs.readFileSync(path.join(root, 'components/admin/packages/eos-license-client', name));
        for (const copy of copies) assert.deepEqual(fs.readFileSync(path.join(root, 'components', copy, 'eos-license-client', name)), canonical, copy + '/' + name);
    }
});

function readyMethod(file) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const methods = [];
    function visit(node) {
        if (ts.isMethodDeclaration(node) && node.name?.getText(source) === 'onReady') methods.push(node.getText(source));
        if (ts.isPropertyDeclaration(node) && node.name?.getText(source) === 'onReady' && ts.isArrowFunction(node.initializer)) {
            // Class arrow fields bind the instance. Preserve that binding when
            // executing the complete unchanged body on the isolated instance.
            methods.push('async onReady() ' + node.initializer.body.getText(source));
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(methods.length, 1, 'exact compiled lifecycle entry');
    return methods[0];
}

for (const [component, entry] of [['admin', 'build/main.js'], ['ui', 'main.js']]) {
    test(component + ' actual shipped onReady refuses standalone ioBroker before listeners or state effects', async () => {
        assert.equal(fs.existsSync('/etc/nexowatt-eos/release-state.json'), false, 'isolated source fixture requires no installed EOS');
        const file = path.join(root, 'components', component, entry);
        const messages = [];
        const adapter = vm.runInNewContext('({' + readyMethod(file) + '})', { require: createRequire(file) });
        adapter.log = { error: value => messages.push(value) };
        // No filesystem/client/adapter helper is mocked: the shipped platform
        // check must deny before any other lifecycle dependency is reached.
        await adapter.onReady();
        assert.deepEqual(messages, ['EOS_PLATFORM_REQUIRED']);
        assert.deepEqual(Object.keys(adapter).sort(), ['log', 'onReady']);
    });
}

test('UI typed lifecycle mirror retains the same platform admission as executable source', () => {
    const executable = path.join(root, 'components/ui/src-ts/runtime-executables/main.ts');
    const mirror = path.join(root, 'components/ui/src-ts/runtime-mirrors/main.ts');
    // Type-only additions may differ elsewhere; compare the complete lifecycle
    // method after TypeScript erasure to catch a mirror that merely updated its hash.
    const options = { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.CommonJS };
    const erase = file => ts.transpileModule('({' + readyMethod(file) + '})', { compilerOptions: options }).outputText;
    assert.equal(erase(executable), erase(mirror));
});
