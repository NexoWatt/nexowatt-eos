'use strict';

const startAdapter = require('./main');

if (module.parent) {
  module.exports = startAdapter;
} else {
  startAdapter();
}
