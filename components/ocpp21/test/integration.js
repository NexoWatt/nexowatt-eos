const path = require('path');
const { tests } = require('@iobroker/testing');

// Integration tests against a real JS-Controller instance.
tests.integration(path.join(__dirname, '..'));
