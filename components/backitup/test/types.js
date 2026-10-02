const { readFileSync } = require('node:fs');
const path = require('node:path');
// node:assert rather than chai: chai is ESM-only from v5 on, and this file is CommonJS.
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');

/**
 * `BackItUpAdapterOptions` in lib/types.d.ts is what gives `adapter.config` its type. Nothing forces
 * it to stay in step with the `native` defaults in io-package.json, and in the first TypeScript
 * attempt (PR #1190) it had drifted by 13 keys before anyone noticed. This test makes that drift a
 * test failure instead of a silent lie in the type system.
 *
 * A key may be intentionally absent from `native` while still being declared - deprecated settings
 * that main.js only reads to migrate older instance configurations. Those must be marked optional,
 * which is how this test tells "deliberately kept" apart from "forgotten".
 */
describe('Adapter config typing', () => {
    const native = JSON.parse(readFileSync(path.join(ROOT, 'io-package.json'), 'utf8')).native;
    const types = readFileSync(path.join(ROOT, 'src', 'lib', 'types.d.ts'), 'utf8');

    const start = types.indexOf('export interface BackItUpAdapterOptions');
    const body = types.slice(start, types.indexOf('\n}', start));

    const declared = new Map();
    for (const m of body.matchAll(/^ {4}(\w+)(\??):/gm)) {
        declared.set(m[1], { optional: m[2] === '?' });
    }

    it('finds the interface and its members', () => {
        assert.ok(start > -1, 'BackItUpAdapterOptions not found in lib/types.d.ts');
        assert.ok(declared.size > 100, `only ${declared.size} members found`);
    });

    it('declares every key from io-package.json native', () => {
        const missing = Object.keys(native).filter(key => !declared.has(key));
        assert.deepStrictEqual(missing, [], `not declared in BackItUpAdapterOptions: ${missing.join(', ')}`);
    });

    it('marks keys that are no longer in native as optional', () => {
        const stale = [...declared.entries()]
            .filter(([key, info]) => !(key in native) && !info.optional)
            .map(([key]) => key);
        assert.deepStrictEqual(
            stale,
            [],
            `declared as required but absent from io-package.json native - remove them, or mark ` +
                `them optional and @deprecated if main.js still reads them: ${stale.join(', ')}`,
        );
    });
});
