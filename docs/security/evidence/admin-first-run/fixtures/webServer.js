"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebServer = void 0;
const node_tls_1 = __importDefault(require("node:tls"));
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const certificateManager_1 = require("./certificateManager");
const acmeChallenge_1 = require("./acmeChallenge");
class WebServer {
    constructor(options) {
        this.secure = !!options.secure;
        this.adapter = options.adapter;
        this.app = options.app || undefined;
        if (this.secure) {
            this.certManager = new certificateManager_1.CertificateManager({ adapter: options.adapter });
        }
        this.accessControl = options.accessControl;
        this.acmeChallenge = options.acmeChallenge !== false;
    }
    /**
     * Wrap the app with everything that has to run in front of it.
     *
     * Called from every branch of init() because each of them creates the
     * server from `this.app` and there is no single point after it.
     */
    prepareApp() {
        this.initAccessControl();
        // Outermost, so a challenge is answered without collecting CORS headers
        // it has no use for.
        this.initAcmeChallenge();
    }
    /**
     * Put the ACME HTTP-01 challenge lookup in front of the app.
     *
     * In front rather than in a route because the CA is anonymous and the
     * lookup therefore has to happen before any authentication the app
     * installs. Requests that are not a published challenge are handed on
     * untouched, so nothing the app serves is shadowed.
     */
    initAcmeChallenge() {
        if (!this.acmeChallenge) {
            return;
        }
        const app = this.app;
        const passOn = (req, res) => {
            if (app) {
                app(req, res);
            }
            else {
                // Without an app there is nobody left to answer.
                res.writeHead(404);
                res.end();
            }
        };
        this.app = (req, res) => {
            var _a;
            // Cheap string test first: this runs for every single request.
            if (!((_a = req.url) === null || _a === void 0 ? void 0 : _a.startsWith(acmeChallenge_1.ACME_CHALLENGE_PREFIX))) {
                passOn(req, res);
                return;
            }
            (0, acmeChallenge_1.serveAcmeChallenge)(this.adapter, req, res).then(served => {
                if (!served) {
                    passOn(req, res);
                }
            }, (e) => {
                this.adapter.log.warn(`Could not answer ACME challenge: ${e.message}`);
                passOn(req, res);
            });
        };
    }
    /**
     * Put the configured CORS headers in front of the app.
     *
     * Outermost rather than as a route, so every answer carries them - including the ones the app
     * produces before any middleware it registered later would run, such as the OAuth2 token
     * endpoint or a 401 out of the authorization middleware.
     */
    initAccessControl() {
        const accessControl = this.accessControl;
        if (!accessControl ||
            (accessControl.accessControlAllowCredentials === undefined &&
                !accessControl.accessControlAllowHeaders &&
                !accessControl.accessControlAllowMethods &&
                !accessControl.accessControlAllowOrigin &&
                !accessControl.accessControlExposeHeaders &&
                accessControl.accessControlMaxAge === undefined &&
                !accessControl.accessControlRequestHeaders &&
                !accessControl.accessControlRequestMethod)) {
            return;
        }
        // The deprecated `Request-*` options are request headers and were never valid on a
        // response, so whoever set them meant the `Allow-*` ones. They only fill in when the
        // correct option is absent.
        const allowHeaders = accessControl.accessControlAllowHeaders || accessControl.accessControlRequestHeaders;
        const allowMethods = accessControl.accessControlAllowMethods || accessControl.accessControlRequestMethod;
        this.originalApp = this.app;
        this.app = (req, res) => {
            if (accessControl.accessControlAllowCredentials !== undefined) {
                res.setHeader('Access-Control-Allow-Credentials', accessControl.accessControlAllowCredentials ? 'true' : 'false');
            }
            if (allowHeaders) {
                res.setHeader('Access-Control-Allow-Headers', allowHeaders);
            }
            if (allowMethods) {
                res.setHeader('Access-Control-Allow-Methods', allowMethods);
            }
            const origin = typeof accessControl.accessControlAllowOrigin === 'function'
                ? accessControl.accessControlAllowOrigin(req.headers.origin)
                : accessControl.accessControlAllowOrigin;
            if (origin) {
                res.setHeader('Access-Control-Allow-Origin', origin);
                if (origin !== '*') {
                    // The answer depends on the origin, so a cache must not hand it to another one.
                    res.setHeader('Vary', 'Origin');
                }
            }
            if (accessControl.accessControlExposeHeaders) {
                res.setHeader('Access-Control-Expose-Headers', accessControl.accessControlExposeHeaders);
            }
            if (accessControl.accessControlMaxAge !== undefined) {
                res.setHeader('Access-Control-Max-Age', accessControl.accessControlMaxAge.toString());
            }
            // @ts-expect-error this.originalApp is set
            return this.originalApp(req, res);
        };
    }
    /**
     * Initialize a new https / http server; according to configuration, it will be present on `this.server`
     */
    async init() {
        if (!this.certManager) {
            this.adapter.log.debug('Secure connection not enabled - using http createServer');
            this.prepareApp();
            this.server = node_http_1.default.createServer(this.app);
            return this.server;
        }
        const config = this.adapter.config;
        // Load self-signed or custom certificates for fallback
        const customCertificates = await this.getCustomCertificates();
        // Load certificate collections
        this.adapter.log.debug('Loading all certificate collections...');
        let collections;
        // true => use all collections, false => do not use collections, string => use the collection with this ID
        const collectionId = config.leCollection;
        if (collectionId && typeof collectionId === 'string') {
            collections = {
                [collectionId]: await this.certManager.getCollection(collectionId),
            };
        }
        else if (collectionId !== false) {
            collections = await this.certManager.getAllCollections();
            if (!collections || !Object.keys(collections).length) {
                this.adapter.log.warn('Could not find any certificate collections - check ACME installation or consider installing');
                this.prepareApp();
                if (customCertificates) {
                    this.adapter.log.warn('Falling back to self-signed certificates or to custom certificates');
                    this.server = node_https_1.default.createServer(customCertificates, this.app);
                }
                else {
                    // This really should never happen as customCertificatesContext should always be available
                    this.adapter.log.error('Could not find self-signed certificate - falling back to insecure http createServer');
                    this.server = node_http_1.default.createServer(this.app);
                }
                return this.server;
            }
        }
        else {
            // fallback to self-signed or custom certificates
            collections = null;
            this.prepareApp();
            if (customCertificates) {
                this.adapter.log.debug('Use self-signed certificates or custom certificates');
                this.server = node_https_1.default.createServer(customCertificates, this.app);
            }
            else {
                // This really should never happen as customCertificatesContext should always be available
                this.adapter.log.error('Could not find self-signed certificate - falling back to insecure http createServer');
                this.server = node_http_1.default.createServer(this.app);
            }
            return this.server;
        }
        let contexts;
        const customCertificatesContext = customCertificates ? node_tls_1.default.createSecureContext(customCertificates) : null;
        if (collections) {
            contexts = this.buildSecureContexts(collections);
            this.certManager.subscribeCollections(collectionId === true ? null : collectionId || null, (err, collections) => {
                if (!err && collections) {
                    this.adapter.log.silly(`collections update ${JSON.stringify(collections)}`);
                    contexts = this.buildSecureContexts(collections);
                    if (!Object.keys(contexts).length) {
                        this.adapter.log.warn('Could not find any certificate collections after update');
                        if (!customCertificatesContext) {
                            this.adapter.log.error('No certificate collections or self-signed certificate available - HTTPS requests will now fail');
                            // This is very bad, and perhaps the adapter should also terminate itself?
                        }
                    }
                    // contexts are now up to date and will be utilized in SNICallback - nothing more to do.
                }
                else if (err) {
                    this.adapter.log.error(`Error updating certificate collections: ${err.toString()}`);
                }
                else {
                    this.adapter.log.error(`${collectionId ? `Collection "${collectionId}" was` : 'All collections were'} removed from certificate collections and now we cannot update certificates`);
                }
            });
        }
        const options = {
            SNICallback: (serverName, callback) => {
                var _a, _b;
                // Find which context to use for this server
                let context;
                if (contexts) {
                    if (serverName in contexts) {
                        // Easy - name is explicitly mentioned
                        if (((_a = this.adapter.common) === null || _a === void 0 ? void 0 : _a.loglevel) === 'debug') {
                            this.adapter.log.debug(`Using explicit context for "${serverName}"`);
                        }
                        context = contexts[serverName];
                    }
                    else {
                        // Check for wildcard
                        const serverParts = serverName.split('.');
                        if (serverParts.length > 1) {
                            serverParts.shift();
                            serverParts.unshift('*');
                            const wildcard = serverParts.join('.');
                            if (wildcard in contexts) {
                                // OK - wildcard found
                                if (((_b = this.adapter.common) === null || _b === void 0 ? void 0 : _b.loglevel) === 'debug') {
                                    this.adapter.log.debug(`Using wildcard context for "${serverName}"`);
                                }
                                context = contexts[wildcard];
                            }
                        }
                    }
                }
                if (!context) {
                    // Not found above.
                    if (customCertificatesContext) {
                        // Use custom context
                        // Don't spit out warnings here as this may be a common occurrence
                        // and one already emitted at startup.
                        context = customCertificatesContext;
                    }
                    else if (contexts) {
                        // See the note above about terminating - if that is implemented, no need for this check.
                        if (!Object.keys(contexts).length) {
                            // No customCertificatesContext and no contexts - this is very bad!
                            this.adapter.log.error(`Could not derive secure context for "${serverName}"`);
                        }
                        else {
                            this.adapter.log.warn(`No matching context for "${serverName}" - using first certificate collection which will likely cause browser security warnings`);
                            context = contexts[Object.keys(contexts)[0]];
                        }
                    }
                    else {
                        this.adapter.log.error(`Could not find any certificates for "${serverName}"`);
                    }
                }
                callback(null, context);
            },
        };
        this.prepareApp();
        this.adapter.log.debug('Using https createServer');
        this.server = node_https_1.default.createServer(options, this.app);
        return this.server;
    }
    /**
     * Assemble the certificate a secure context has to present for a collection.
     *
     * `cert` holds the leaf only - the issuing chain lives in `chain`, and without it every
     * client that does not already know the intermediate rejects the connection. Producers
     * disagree on whether `chain` repeats the leaf, so it is normalized here.
     *
     * @param collection the certificate collection
     */
    static buildCertificateChain(collection) {
        const leaf = WebServer.splitCertificates(collection.cert);
        const issuers = WebServer.splitCertificates(collection.chain).filter(cert => !leaf.includes(cert));
        const bundle = leaf.concat(issuers);
        if (!bundle.length) {
            // Nothing parseable in there - hand the raw value on and let TLS report what is wrong.
            return collection.cert.toString();
        }
        // Joined by a newline, never by an empty string: OpenSSL only recognizes a BEGIN marker
        // at the start of a line and would silently drop every certificate after the first.
        return `${bundle.join('\n')}\n`;
    }
    /**
     * Cut a collection field into its individual PEM certificates.
     *
     * The field may be a single certificate, a whole concatenated chain or an array of either,
     * as string or as Buffer - which one it is depends on who wrote the collection.
     *
     * @param source the collection field to read
     */
    static splitCertificates(source) {
        const parts = Array.isArray(source) ? source : source ? [source] : [];
        const certificates = [];
        for (const part of parts) {
            // A base64 body never contains a dash, so the end of a block is unambiguous.
            const found = part.toString().match(/-----BEGIN CERTIFICATE-----[^-]+-----END CERTIFICATE-----/g);
            if (found) {
                certificates.push(...found);
            }
        }
        return certificates;
    }
    /**
     * Build secure context from certificate collections
     *
     * @param collections the certificate collections
     */
    buildSecureContexts(collections) {
        this.adapter.log.debug('buildSecureContexts...');
        const contexts = {};
        if (typeof collections === 'object') {
            for (const [collectionId, collection] of Object.entries(collections)) {
                const context = node_tls_1.default.createSecureContext({
                    key: collection.key,
                    cert: WebServer.buildCertificateChain(collection),
                });
                for (const domain of collection.domains) {
                    this.adapter.log.debug(`${domain} -> ${collectionId}`);
                    contexts[domain] = context;
                }
            }
        }
        return contexts;
    }
    /**
     * Get the custom certificates as text
     */
    async getCustomCertificates() {
        const config = this.adapter.config;
        const defaultPublic = config.certPublic || 'defaultPublic';
        const defaultPrivate = config.certPrivate || 'defaultPrivate';
        const defaultChain = config.certChained || '';
        const customCertificates = await this.adapter.getCertificatesAsync(defaultPublic, defaultPrivate, defaultChain);
        this.adapter.log.debug(`Loaded custom certificates: ${JSON.stringify(customCertificates && customCertificates[0])}`);
        if (customCertificates && customCertificates[0]) {
            const certs = customCertificates[0];
            if (certs.key.endsWith('.pem')) {
                this.adapter.log.error(`Cannot load custom certificates. File "${certs.key}" does not exists or iobroker user has no rights for it.`);
            }
            else if (certs.cert.endsWith('.pem')) {
                this.adapter.log.error(`Cannot load custom certificates. File "${certs.cert}" does not exists or iobroker user has no rights for it.`);
            }
            else if (certs.ca && typeof certs.ca === 'string' && certs.ca.endsWith('.pem')) {
                this.adapter.log.error(`Cannot load custom certificates. File "${certs.ca}" does not exists or iobroker user has no rights for it.`);
            }
            else {
                return certs;
            }
        }
        return null;
    }
    /**
     * Get the custom certificates context
     */
    async getCustomCertificatesContext() {
        try {
            const customCertificates = await this.getCustomCertificates();
            if (customCertificates) {
                // All good
                return node_tls_1.default.createSecureContext(customCertificates);
            }
        }
        catch (e) {
            this.adapter.log.error(e.message);
        }
        // If we got here, then we either failed to load or use self-signed certificate or custom certificates.
        this.adapter.log.warn('Could not create custom context for fallback use');
        return null;
    }
}
exports.WebServer = WebServer;
//# sourceMappingURL=webServer.js.map