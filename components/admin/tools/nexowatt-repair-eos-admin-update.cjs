#!/usr/bin/env node
'use strict';
/** Repair installed EOS Admin flags that can block in-app updates from older builds. */
const cp = require('node:child_process');
function run(cmd) {
  console.log(`$ ${cmd}`);
  cp.execFileSync('/bin/sh', ['-lc', cmd], { stdio: 'inherit' });
}
run('iobroker object set system.adapter.eos-admin common.stopBeforeUpdate=false || true');
run('iobroker object set system.adapter.eos-admin common.dontDelete=false || true');
run('iobroker object set system.adapter.eos-admin common.nondeletable=false || true');
run('iobroker object set system.adapter.eos-admin.0 common.dontDelete=false || true');
run('iobroker object set system.adapter.eos-admin.0 common.nondeletable=false || true');
console.log('EOS Admin update flags repaired. Deletion protection remains enforced by EOS ACL/UI guard, while updates stay possible.');
console.log('Next: iobroker upgrade eos-admin https://iobroker.live/repo/repo-nexowatt.json');
