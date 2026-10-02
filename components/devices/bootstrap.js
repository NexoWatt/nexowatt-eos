'use strict';

require('./lib/sungrowFastFeedbackPatch').install();
const startAdapter = require('./main');

if (module.parent) {
  module.exports = startAdapter;
} else {
  startAdapter();
}
