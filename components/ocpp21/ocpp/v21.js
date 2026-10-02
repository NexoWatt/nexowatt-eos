'use strict';
const { registerV2Handlers } = require('./v2base');
function registerHandlers(client, ctx) { return registerV2Handlers(client, ctx, 'ocpp2.1'); }
module.exports = { registerHandlers };
