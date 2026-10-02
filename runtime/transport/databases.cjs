'use strict';
// Fixed backend selection only. A database type can never name arbitrary code.
const { validateConnection } = require('../postgresql/packages/store/index.cjs');
const reject = code => { throw Object.assign(new Error(code), { code }); };
function backend(config) {
    const type = config?.objects?.type;
    if (!['redis', 'postgresql'].includes(type) || config?.states?.type !== type) reject('DATABASE_BACKEND_REJECTED');
    return type;
}
function validatePostgresql(config) {
    if (backend(config) !== 'postgresql') reject('POSTGRESQL_PROFILE_REQUIRED');
    for (const domain of ['objects', 'states']) {
        const db = config[domain];
        validateConnection(db, domain);
        if (db.host !== '127.0.0.1' || db.port !== 15432 || db.database !== 'eos') reject('POSTGRESQL_LOCAL_PROFILE_REQUIRED');
    }
    if (config.objects.options.ssl.ca !== config.states.options.ssl.ca ||
        config.objects.options.ssl.cert === config.states.options.ssl.cert ||
        config.objects.options.ssl.key === config.states.options.ssl.key) reject('POSTGRESQL_IDENTITY_SEPARATION');
    return config;
}
function clients(requireApp, config) {
    return backend(config) === 'postgresql'
        ? { Objects: requireApp('@iobroker/db-objects-postgresql').Client, States: requireApp('@iobroker/db-states-postgresql').Client }
        : { Objects: requireApp('@iobroker/db-objects-redis').Client, States: requireApp('@iobroker/db-states-redis').Client };
}
module.exports = { backend, validatePostgresql, clients };
