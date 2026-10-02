'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const net = require('node:net');
const { X509Certificate } = require('node:crypto');
const PROFILE_DIRECTORY = '/etc/nexowatt-eos/ocpp21';

function readProtectedFile(directory, name, secret = false) {
  const filename = path.resolve(directory, name);
  // No mutable ancestor or symlink may redirect a trusted transport profile.
  let ancestor = path.dirname(filename);
  for (;;) {
    const stat = fs.lstatSync(ancestor);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o022)) throw new Error('EOS_OCPP_PROFILE_DIRECTORY_UNSAFE');
    const parent = path.dirname(ancestor);
    if (ancestor === parent) break;
    ancestor = parent;
  }
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== 0 || stat.nlink !== 1 || (stat.mode & 0o022)
        || (secret && (stat.mode & 0o007)) || stat.size < 1 || stat.size > 65536) throw new Error('EOS_OCPP_PROFILE_FILE_UNSAFE');
    const data = Buffer.alloc(65537);
    let used = 0, length;
    do { length = fs.readSync(fd, data, used, data.length - used, null); used += length; } while (length && used < data.length);
    if (used > 65536) throw new Error('EOS_OCPP_PROFILE_FILE_LIMIT');
    return data.subarray(0, used).toString('utf8');
  } finally { fs.closeSync(fd); }
}

function validateSettings(value) {
  const allowed = ['schemaVersion', 'profile', 'host', 'port', 'identities'];
  if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).some(key => !allowed.includes(key))
      || value.schemaVersion !== 1 || value.profile !== 'eos-ocpp-mtls-v1' || !net.isIP(value.host)
      || !Number.isSafeInteger(value.port) || value.port < 1024 || value.port > 65535
      || !Array.isArray(value.identities) || value.identities.length < 1 || value.identities.length > 128) {
    throw new Error('EOS_OCPP_PROFILE_INVALID');
  }
  const identities = new Map(), sans = new Set();
  for (const entry of value.identities) {
    if (!entry || Object.keys(entry).length !== 2 || typeof entry.identity !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(entry.identity)
        || typeof entry.dnsName !== 'string' || entry.dnsName.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(entry.dnsName)
        || identities.has(entry.identity) || sans.has(entry.dnsName)) throw new Error('EOS_OCPP_IDENTITY_MAP_INVALID');
    identities.set(entry.identity, entry.dnsName); sans.add(entry.dnsName);
  }
  return Object.freeze({ host: value.host, port: value.port, identities });
}

function loadTransportProfile(directory = PROFILE_DIRECTORY) {
  const settings = validateSettings(JSON.parse(readProtectedFile(directory, 'transport.json')));
  const cert = readProtectedFile(directory, 'server.crt');
  const key = readProtectedFile(directory, 'server.key', true);
  const ca = readProtectedFile(directory, 'client-ca.crt');
  if (cert.includes('PRIVATE KEY') || ca.includes('PRIVATE KEY')) throw new Error('EOS_OCPP_CERTIFICATE_INVALID');
  return Object.freeze({ ...settings, tls: Object.freeze({ cert, key, ca, minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: true, handshakeTimeout: 5000 }) });
}

function authenticateHandshake(profile, handshake) {
  const identity = handshake?.identity;
  const socket = handshake?.request?.socket;
  if (typeof identity !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(identity) || !profile.identities.has(identity)
      || handshake.endpoint !== '/ocpp' || socket?.encrypted !== true || socket.authorized !== true
      || socket.getProtocol?.() !== 'TLSv1.3') return false;
  const raw = socket.getPeerCertificate?.(true)?.raw;
  if (!raw) return false;
  try {
    const certificate = new X509Certificate(raw);
    const expected = profile.identities.get(identity);
    // No CN fallback or wildcard SAN can impersonate a differently enrolled station.
    return certificate.checkHost(expected, { subject: 'never', wildcards: false, partialWildcards: false,
      multiLabelWildcards: false, singleLabelSubdomains: false }) === expected;
  } catch { return false; }
}

function createTransport(rpc, profile) {
  const server = https.createServer(profile.tls, (_request, response) => { response.writeHead(404); response.end(); });
  server.maxConnections = 128;
  server.headersTimeout = 5000;
  server.requestTimeout = 5000;
  server.on('tlsClientError', () => {}); // No certificate/request details in logs.
  server.on('upgrade', (request, socket, head) => {
    // Validate before the dependency parses URL/allocates a station. Reject ambiguous paths/queries.
    if (typeof request.url !== 'string' || !/^\/ocpp\/[A-Za-z0-9_-]{1,64}$/.test(request.url)
        || socket.authorized !== true || socket.getProtocol() !== 'TLSv1.3') { socket.destroy(); return; }
    const timer = setTimeout(() => socket.destroy(), 5000);
    Promise.resolve(rpc.handleUpgrade(request, socket, head)).catch(() => socket.destroy()).finally(() => clearTimeout(timer));
  });
  return server;
}

module.exports = { PROFILE_DIRECTORY, loadTransportProfile, validateSettings, authenticateHandshake, createTransport, readProtectedFile };
