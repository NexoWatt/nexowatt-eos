'use strict';
const { createRequire } = require('node:module');
const path = require('node:path');
// Only this trusted service reads the States database credential. An extension
// receives its own gateway certificate and never the controller iobroker.json.
async function createPostgresqlBackend({ app, connection }) {
    const load = createRequire(path.join(app, 'package.json'));
    const { Client } = load('@iobroker/db-states-postgresql');
    const client = new Client({ connection, autoConnect: false });
    try { await client.connectDb(); } catch (error) { await client.destroy(); throw error; }
    return {
        async getState(id, { check }) { check(); const result = await client.getState(id); check(); return result; },
        async setState(id, state, { check }) {
            // Check the request's identity, revocation and deadline before commit.
            // A disconnect must not let a queued write commit later.
            return client.store.transaction(async () => { check(); await client.setState(id, state); check(); });
        },
        close: () => client.destroy(),
    };
}
module.exports = { createPostgresqlBackend };
