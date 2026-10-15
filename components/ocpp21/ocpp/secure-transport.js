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
  const ancestors = [];
  let ancestor = path.dirname(filename);
  for (;;) {
    ancestors.unshift(ancestor);
    const parent = path.dirname(ancestor);
    if (ancestor === parent) break;
    ancestor = parent;
  }
  // Check from the root down: a missing leaf must not hide an unsafe parent.
  for (const ancestor of ancestors) {
    const stat = fs.lstatSync(ancestor);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 0o022)) throw new Error('EOS_OCPP_PROFILE_DIRECTORY_UNSAFE');
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
  let raw;
  try { raw = readProtectedFile(directory, 'transport.json'); } catch (error) {
    // Only absence of the enrollment manifest (or a safe missing directory)
    // means unconfigured. Missing credentials after enrollment remain an error.
    if (error.code === 'ENOENT') throw new Error('EOS_OCPP_TRANSPORT_NOT_ENROLLED');
    throw error;
  }
  let settings;
  try { settings = validateSettings(JSON.parse(raw)); } catch (error) {
    if (error instanceof SyntaxError) throw new Error('EOS_OCPP_PROFILE_INVALID');
    throw error;
  }
  let cert, key, ca;
  try {
    cert = readProtectedFile(directory, 'server.crt');
    key = readProtectedFile(directory, 'server.key', true);
    ca = readProtectedFile(directory, 'client-ca.crt');
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('EOS_OCPP_PROFILE_INCOMPLETE');
    throw error;
  }
  if (cert.includes('PRIVATE KEY') || ca.includes('PRIVATE KEY')) throw new Error('EOS_OCPP_CERTIFICATE_INVALID');
  return Object.freeze({ ...settings, tls: Object.freeze({ cert, key, ca, minVersion: 'TLSv1.3',
    maxVersion: 'TLSv1.3', requestCert: true, rejectUnauthorized: true, handshakeTimeout: 5000 }) });
}

// A finite diagnostic vocabulary keeps OS errors, paths and TLS material out
// of the database and logs. Never classify arbitrary ENOENT as unconfigured.
function startupFailure(error) {
  const codes = new Set(['EOS_OCPP_TRANSPORT_NOT_ENROLLED', 'EOS_OCPP_PROFILE_DIRECTORY_UNSAFE',
    'EOS_OCPP_PROFILE_FILE_UNSAFE', 'EOS_OCPP_PROFILE_FILE_LIMIT', 'EOS_OCPP_PROFILE_INVALID',
    'EOS_OCPP_PROFILE_INCOMPLETE', 'EOS_OCPP_IDENTITY_MAP_INVALID', 'EOS_OCPP_CERTIFICATE_INVALID',
    'EOS_OCPP_PROTOCOLS_REQUIRED', 'EOS_OCPP_START_ABORTED']);
  const reason = codes.has(error?.message) ? error.message
    : error?.code === 'EACCES' ? 'EOS_OCPP_PROFILE_UNREADABLE'
      : error?.code === 'EADDRINUSE' ? 'EOS_OCPP_LISTENER_IN_USE' : 'EOS_OCPP_START_FAILED';
  return { state: reason === 'EOS_OCPP_TRANSPORT_NOT_ENROLLED'
    ? 'awaiting_transport_enrollment' : 'configuration_rejected', reason };
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

module.exports = { PROFILE_DIRECTORY, loadTransportProfile, validateSettings, authenticateHandshake, createTransport, readProtectedFile, startupFailure };
