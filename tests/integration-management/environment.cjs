'use strict';
// Production children must take upstream's normal UUID path. ci-info otherwise
// substitutes an intentionally invalid CI sentinel which the real license core
// correctly rejects. No CI-provider variables or runner credentials are copied.
function productEnvironment() {
    return { PATH: process.env.PATH, LANG: 'C.UTF-8', HOME: '/var/lib/nexowatt-eos/home',
        IOBROKER_DATA_DIR: '/var/lib/nexowatt-eos/iobroker-data', NODE_ENV: 'production',
        CI: 'false', SENTRY_DSN: '', NODE_PATH: '', NODE_OPTIONS: '' };
}
module.exports = { productEnvironment };
