'use strict';

const https = require('node:https');
const MAX_REQUEST_MS = 5000;
const MAX_BODY_BYTES = 1024 * 1024;

function createHttpSecurity(connection = {}) {
  if (connection.insecureTls || connection.insecureTLS || connection.allowInsecureTls || connection.rejectUnauthorized === false) {
    throw new Error('EOS_HTTP_TLS_VERIFICATION_REQUIRED');
  }
  const ca = connection.caCertificate;
  if (ca !== undefined && (typeof ca !== 'string' || ca.length > 65536 || !ca.includes('-----BEGIN CERTIFICATE-----') || ca.includes('PRIVATE KEY'))) {
    throw new Error('EOS_HTTP_CA_INVALID');
  }
  const requested = Number(connection.timeoutMs || connection.timeout || MAX_REQUEST_MS);
  const timeout = Number.isFinite(requested) && requested > 0 ? Math.min(MAX_REQUEST_MS, Math.trunc(requested)) : MAX_REQUEST_MS;
  return {
    timeout: Math.max(1, timeout),
    httpsAgent: new https.Agent({ rejectUnauthorized: true, minVersion: 'TLSv1.3', ...(ca ? { ca } : {}) }),
    // Redirects could disclose gateway credentials to another origin. Configure the final endpoint explicitly.
    maxRedirects: 0,
    maxContentLength: MAX_BODY_BYTES,
    maxBodyLength: MAX_BODY_BYTES,
    proxy: false,
  };
}

/** Abort covers DNS, connect, TLS and the complete body, including a trickling peer. */
async function requestWithDeadline(client, options, timeoutMs = MAX_REQUEST_MS, method = 'request') {
  const controller = new AbortController();
  const deadline = Math.max(1, Math.min(MAX_REQUEST_MS, timeoutMs));
  const timer = setTimeout(() => controller.abort(), deadline);
  try {
    const cfg = { ...options, signal: controller.signal, timeout: deadline,
      maxRedirects: 0, maxContentLength: MAX_BODY_BYTES, maxBodyLength: MAX_BODY_BYTES };
    return method === 'get' ? await client.get(cfg.url, cfg) : await client.request(cfg);
  } catch (error) {
    // Axios errors may include credentials/URLs/request bodies. Only a fixed code crosses this boundary.
    const safe = new Error(controller.signal.aborted ? 'EOS_HTTP_DEADLINE' : 'EOS_HTTP_REQUEST_FAILED');
    safe.code = safe.message;
    throw safe;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { createHttpSecurity, requestWithDeadline, MAX_REQUEST_MS, MAX_BODY_BYTES };
