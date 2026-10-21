'use strict';
// Run only with a separately verified fresh runtime. NODE_PATH is set before
// Node starts; the guard resolves from the actual source backend, not this file.
require('./controller725-objects-guard.cjs').assertRuntime(process.env.EOS_CONTROLLER725_APP);
require('./objects.test.cjs');
