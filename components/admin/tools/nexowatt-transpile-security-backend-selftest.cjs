#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { loadCommonJSTransformer, transpile } = require('./nexowatt-transpile-security-backend.cjs');
const bundle = process.env.NEXOWATT_BABEL_BUNDLE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '', 'playwright/lib/transform/babelBundle.js');
const transformer = loadCommonJSTransformer(bundle);
const source = `import * as callable from 'callable';
import defaultObject from 'default-object';
import { increment as add } from 'named';
import type { MissingType } from 'must-not-load';
let parentSetterCalls = 0;
class Parent { set value(_value: number) { parentSetterCalls++; } }
class Child extends Parent { value: number = 7; constructor(public parameter: number) { super(); } }
const instance = new Child(3);
export const answer: number = callable(1) + defaultObject.value + add(2);
export const result = [instance.value, instance.parameter, parentSetterCalls];
`;
const output = transpile(source, '/fixture/src/module.ts', '/fixture/build/module.js', transformer);
const moduleFixture = { exports: {} };
const modules = { callable: value => value + 1, 'default-object': { default: { value: 5 } }, named: { increment: value => value + 1 } };
vm.runInNewContext(output.code, { module: moduleFixture, exports: moduleFixture.exports, require: name => {
    assert(Object.hasOwn(modules, name), `unexpected runtime import ${name}`);
    return modules[name];
} });
assert.equal(moduleFixture.exports.answer, 10);
assert.deepEqual(Array.from(moduleFixture.exports.result), [7, 3, 0]);
assert(!output.code.includes('_interopRequire'));
assert.equal(output.map.file, 'module.js');
assert(output.map.sources.some(name => name.endsWith('module.ts')));
assert(output.map.sourcesContent.some(content => content === source));
console.log('PASS: callable namespace imports, tsc-style default imports, named imports, type-import removal, parameter properties, define-field semantics and original-source maps.');
