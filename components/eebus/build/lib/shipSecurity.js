"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certificateIdentity = certificateIdentity;
exports.peerIdentity = peerIdentity;
exports.matchesDiscoveredIdentity = matchesDiscoveredIdentity;
const node_crypto_1 = require("node:crypto");
/** Peer identity always comes from the proved TLS public key, never from mDNS. */
function certificateIdentity(raw) {
    const certificate = new node_crypto_1.X509Certificate(raw);
    const now = Date.now();
    if (!(Date.parse(certificate.validFrom) <= now && now < Date.parse(certificate.validTo))) {
        throw new Error('SHIP_CERTIFICATE_EXPIRED_OR_NOT_YET_VALID');
    }
    const jwk = certificate.publicKey.export({ format: 'jwk' });
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || typeof jwk.x !== 'string' || typeof jwk.y !== 'string') {
        throw new Error('SHIP_CERTIFICATE_KEY_UNSUPPORTED');
    }
    const x = Buffer.from(jwk.x, 'base64url');
    const y = Buffer.from(jwk.y, 'base64url');
    if (x.length !== 32 || y.length !== 32)
        throw new Error('SHIP_CERTIFICATE_KEY_INVALID');
    // SHIP's legacy SKI is an identifier, not a certificate-signature algorithm.
    // Hash the EC subjectPublicKey bits, not the complete SPKI wrapper.
    const ski = (0, node_crypto_1.createHash)('sha1').update(Buffer.concat([Buffer.from([4]), x, y])).digest('hex').toUpperCase();
    return { ski, fingerprint: certificate.fingerprint256.replace(/:/g, '').toUpperCase() };
}
function peerIdentity(socket) {
    const raw = socket?.getPeerCertificate?.(true)?.raw;
    if (!raw)
        throw new Error('SHIP_PEER_CERTIFICATE_REQUIRED');
    return { ...certificateIdentity(raw), remoteAddress: String(socket.remoteAddress || '').replace(/^::ffff:/, '') };
}
function matchesDiscoveredIdentity(peer, node) {
    // Discovery is only a locator. It cannot grant trust or substitute a TLS identity.
    const ski = typeof node?.ski === 'string' ? node.ski.replace(/:/g, '').toUpperCase() : '';
    const fingerprint = typeof node?.fingerprint === 'string' ? node.fingerprint.replace(/:/g, '').toUpperCase() : '';
    return /^[A-F0-9]{40}$/.test(ski) && ski === peer.ski
        && (!fingerprint || (/^[A-F0-9]{64}$/.test(fingerprint) && fingerprint === peer.fingerprint));
}
//# sourceMappingURL=shipSecurity.js.map