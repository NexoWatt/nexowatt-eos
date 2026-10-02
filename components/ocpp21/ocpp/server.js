'use strict';

const { RPCServer } = require('ocpp-rpc');
const { loadTransportProfile, authenticateHandshake, createTransport } = require('./secure-transport');
const { registerHandlers: register16 } = require('./v16');
const { registerHandlers: register201 } = require('./v201');
const { registerHandlers: register21 } = require('./v21');

class OcppRpcServer {
  constructor(ctx, opts) {
    this.ctx = ctx;
    this.opts = opts;
    // EOS profile is root-owned and mandatory; adapter native options cannot select plaintext.
    this.transportProfile = loadTransportProfile();
    this.server = new RPCServer({
      protocols: opts.protocols,
      strictMode: opts.strictMode ?? true,
      respondWithDetailedErrors: false,
      wssOptions: { maxPayload: 262144, perMessageDeflate: false },
      maxBadMessages: 3,
      callTimeoutMs: Math.max(5000, Number(ctx.config.callTimeoutSec || 20) * 1000),
    });
    this.server.on('error', (err) => this.ctx.log.error(`NexoWatt OCPP RPCServer error: ${err && err.stack || err}`));
    this.server.auth((accept, reject, handshake) => {
      try {
        const identity = handshake && handshake.identity;
        if (!authenticateHandshake(this.transportProfile, handshake)) return reject(403, 'Station certificate rejected');
        if (this.ctx.config.identityAllowlist && this.ctx.config.identityAllowlist.length) {
          const ok = this.ctx.config.identityAllowlist.includes(identity);
          if (!ok) return reject(403, 'Identity not allowed');
        }
        accept({ session: { connectedAt: Date.now(), identity } });
      } catch (e) {
        reject(500, 'auth error');
      }
    });
    this.server.on('client', (client) => {
      this.onClient(client).catch((e) => this.ctx.log.error(`Client initialization failed: ${e && e.stack || e}`));
    });
  }

  async listen() {
    this.httpsServer = createTransport(this.server, this.transportProfile);
    await new Promise((resolve, reject) => {
      this.httpsServer.once('error', reject);
      this.httpsServer.listen(this.transportProfile.port, this.transportProfile.host, () => {
        this.httpsServer.removeListener('error', reject); resolve();
      });
    });
    this.httpsServer.on('error', () => this.ctx.log.error('EOS OCPP TLS listener failed'));
    this.ctx.log.info(`NexoWatt OCPP TLS 1.3/mTLS ready on port ${this.transportProfile.port}`);
  }

  async close() {
    await this.server.close({ force: true });
    if (this.httpsServer) {
      this.httpsServer.closeAllConnections();
      await new Promise(resolve => this.httpsServer.close(resolve));
      this.httpsServer = null;
    }
  }

  async onClient(client) {
    const proto = client.protocol;
    const rawIdentity = client.identity;
    const stateIdentity = this.ctx.runtime.resolveIdentity(rawIdentity);
    client.stateIdentity = stateIdentity;
    client.rawIdentity = rawIdentity;

    this.ctx.log.info(`Charging station connected: ${rawIdentity} (${stateIdentity}) via ${proto}`);
    this.ctx.runtime.indexClient(stateIdentity, proto, client, rawIdentity);

    if (proto === 'ocpp1.6') register16(client, this.ctx);
    else if (proto === 'ocpp2.0.1') register201(client, this.ctx);
    else if (proto === 'ocpp2.1') register21(client, this.ctx);
    else this.ctx.log.warn(`Unsupported negotiated OCPP protocol for ${rawIdentity}: ${proto}`);

    client.on('socketError', (err) => this.ctx.log.warn(`OCPP socket error (${rawIdentity}): ${err && err.message || err}`));
    client.on('close', (details = {}) => {
      const finalize = async () => {
        if (this.ctx.runtime && typeof this.ctx.runtime.noteDisconnect === 'function') {
          await this.ctx.runtime.noteDisconnect(stateIdentity, client, details || {});
        }
        const removed = this.ctx.runtime.unindexClient(stateIdentity, client);
        if (removed) await this.ctx.states.setConnection(stateIdentity, false, { socketConnected: false });
      };
      finalize().catch((error) => this.ctx.log.warn(`Disconnect processing failed (${rawIdentity}): ${error && error.message || error}`));
      this.ctx.log.info(`Charging station disconnected: ${rawIdentity}${details && details.reason ? ` (${details.reason})` : ''}`);
    });

    await this.ctx.states.setConnection(stateIdentity, true, { socketConnected: true, rawIdentity, protocol: proto });
  }
}

module.exports = { OcppRpcServer };
