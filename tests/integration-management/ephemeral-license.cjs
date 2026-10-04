'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
async function provision({ core, uuid, issuer, trust, directory }) {
    const now = Date.now(), claims = { v: 2, kid: 'nativeManagementLab', licenseId: 'ephemeral-native-management', uuid, edition: 'home',
        issuedAt: now - 1000, notBefore: now - 1000, expiresAt: now + 1800000, adapters: ['nexowatt-ui'], limits: { chargePoints: 1, batteries: 0 } };
    const message = 'NWL2.' + Buffer.from(JSON.stringify(claims)).toString('base64url');
    const token = message + '.' + crypto.sign(null, Buffer.from(message), issuer).toString('base64url');
    core.verifyLicense(token, { uuid, publicKeys: trust });
    const store = new core.EncryptedLicenseStore({ directory, uuid });
    await store.save({ token, highWaterMark: now });
    if ((await store.load()).token !== token || fs.readFileSync(directory + '/license.enc', 'utf8').includes(token)) throw new Error('MANAGEMENT_LICENSE_STORAGE_FAILED');
}
module.exports = { provision };
