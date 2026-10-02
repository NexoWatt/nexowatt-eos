const path = require('path');
const { tests } = require('@iobroker/testing');

// Unit tests for adapter startup were removed from @iobroker/testing and are essentially a no-op now.
// Keeping this file satisfies CI expectations (test:unit) and allows adding custom unit tests later.
tests.unit(path.join(__dirname, '..'));
