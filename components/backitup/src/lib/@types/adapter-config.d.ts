/**
 * Augments `ioBroker.AdapterConfig` - the stub `@iobroker/types` declares for exactly this purpose -
 * with the adapter's own settings, so `adapter.config.<key>` is typed everywhere instead of `any`.
 *
 * The shape lives in lib/types.d.ts and is kept in sync with the `native` section of
 * io-package.json by test/unit/adapterConfigType.test.js.
 */
import type { BackItUpAdapterOptions } from '../types';

declare global {
    namespace ioBroker {
        interface AdapterConfig extends BackItUpAdapterOptions {}
    }
}

export {};
