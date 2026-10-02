'use strict';
// Runs against the newly provisioned target cluster BEFORE controller startup.
// Writes only randomly named bounded probe records, removed in finally. Reports
// no credentials, SQL errors, data values or certificate private material.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { validatePostgresql } = require('../transport/databases.cjs');
const { validateConnection } = require('./packages/store/index.cjs');
async function acceptance(config, app) {
    validatePostgresql(config);
    const requireApp = createRequire(path.join(app, 'package.json'));
    const storePath = requireApp.resolve('@nexowatt/eos-postgresql-store');
    const { Client } = createRequire(storePath)('pg');
    const { Store } = requireApp('@nexowatt/eos-postgresql-store');
    const checks = [], stores = [], clients = [];
    const id = `eos-install-probe.${crypto.randomUUID()}`;
    const check = (name, passed) => { checks.push({ id: name, status: passed ? 'pass' : 'fail' }); if (!passed) throw new Error('PG_ACCEPTANCE_FAILED'); };
    const configurations = Object.fromEntries(['objects', 'states'].map(domain => [domain, validateConnection(config[domain], domain)]));
    async function rejected(name, settings, allowedCodes) {
        const client = new Client(settings); client.on('error', () => {});
        let denied = false;
        try { await client.connect(); }
        catch (error) { denied = allowedCodes.includes(error.code); }
        finally { await client.end().catch(() => {}); }
        check(name, denied); // A timeout/refused connection is NOT proof of security rejection.
    }
    try {
        for (const domain of ['objects', 'states']) {
            const client = new Client(configurations[domain]); clients.push(client); client.on('error', () => {});
            await client.connect();
            check(`tls13-${domain}`, client.connection.stream.authorized === true && client.connection.stream.getProtocol() === 'TLSv1.3');
            const store = new Store(config[domain], { domain }); stores.push(store); await store.connect();
            check(`schema-role-${domain}`, true);
            await store.set(id, domain);
            check(`roundtrip-${domain}`, (await store.get(id))?.toString() === domain);
            const foreign = domain === 'objects' ? 'states' : 'objects';
            const hidden = await client.query('SELECT value FROM eos_store.kv WHERE domain=$1 AND key=$2', [foreign, id]);
            check(`rls-read-${domain}`, hidden.rowCount === 0);
            let denied = false;
            try { await client.query('INSERT INTO eos_store.kv(domain,key,value) VALUES($1,$2,$3)', [foreign, id, Buffer.from('probe')]); }
            catch (error) { denied = error.code === '42501'; }
            check(`rls-write-${domain}`, denied);
            const privileges = await client.query("SELECT has_database_privilege(current_user,current_database(),'CREATE') AS create_db, has_database_privilege(current_user,current_database(),'TEMP') AS temp, has_schema_privilege(current_user,'eos_store','CREATE') AS create_schema");
            check(`no-ddl-${domain}`, privileges.rowCount === 1 && Object.values(privileges.rows[0]).every(value => value === false));
        }
        // Both domains now contain the same id; recheck visibility after insertion.
        check('domain-separation', (await stores[0].get(id)).toString() === 'objects' && (await stores[1].get(id)).toString() === 'states');
        const base = configurations.objects;
        await rejected('plaintext-rejected', { ...base, ssl: false }, ['28000']);
        await rejected('missing-client-certificate-rejected', { ...base, ssl: { ...base.ssl, cert: undefined, key: undefined } }, ['28000']);
        await rejected('wrong-client-identity-rejected', { ...base, ssl: configurations.states.ssl }, ['28000']);
        await rejected('tls12-rejected', { ...base, ssl: { ...base.ssl, minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2' } }, ['ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION', 'EPROTO']);
    } catch { if (!checks.some(row => row.status === 'fail')) checks.push({ id: 'execution', status: 'fail' }); }
    finally {
        let cleanup = true;
        for (const store of stores) {
            if (store.connected) try { await store.delete(id); } catch { cleanup = false; }
            try { await store.close(); } catch { cleanup = false; }
        }
        for (const client of clients) try { await client.end(); } catch { cleanup = false; }
        checks.push({ id: 'probe-record-cleanup', status: cleanup ? 'pass' : 'fail' });
    }
    return { schemaVersion: 1, kind: 'eos-postgresql-target-acceptance', at: new Date().toISOString(),
        nodeVersion: process.versions.node, checks, passed: checks.length === 18 && checks.every(row => row.status === 'pass'),
        controllerCompatibilityVerified: false, restartRecoveryVerified: false, perAdapterIsolation: false, productionApproved: false };
}
module.exports = { acceptance };
if (require.main === module) {
    const deadline = setTimeout(() => { process.stderr.write('{"passed":false,"code":"PG_ACCEPTANCE_TIMEOUT"}\n'); process.exit(1); }, 55000);
    Promise.resolve().then(() => {
        const args = process.argv.slice(2);
        if (args.length !== 4 || args[0] !== '--config' || args[2] !== '--app') throw new Error('USAGE');
        const stat = fs.lstatSync(args[1]);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024 || stat.mode & 0o007) throw new Error('CONFIG');
        return acceptance(JSON.parse(fs.readFileSync(args[1], 'utf8')), args[3]);
    }).then(result => { process.stdout.write(JSON.stringify(result) + '\n'); if (!result.passed) process.exitCode = 1; },
        () => { process.stderr.write('{"passed":false,"code":"PG_ACCEPTANCE_FAILED"}\n'); process.exitCode = 1; }).finally(() => clearTimeout(deadline));
}
