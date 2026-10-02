#!/usr/bin/env node
'use strict';
/**
 * Regressionstest 0.8.49: Mesh/Microgrid Zielgruppen-Strategie.
 * Sichert die App-Center-Regel und die Sicherheitsgrenze: Zielgruppen dürfen
 * nur neutrale Command-Intents begrenzen/priorisieren, niemals Hardware direkt.
 */
const fs = require('fs');
function read(p){ return fs.readFileSync(p,'utf8'); }
function must(file, needle){ const s=read(file); if(!s.includes(needle)){ console.error(`[mesh-target-groups] Missing in ${file}: ${needle}`); process.exit(1); } }
function mustNot(file, needle){ const s=read(file); if(s.includes(needle)){ console.error(`[mesh-target-groups] Forbidden in ${file}: ${needle}`); process.exit(1); } }
const releasePkg = JSON.parse(read('package.json'));
const releaseIo = JSON.parse(read('io-package.json'));
if (!releasePkg.version || !releaseIo.common || releasePkg.version !== releaseIo.common.version) {
  console.error(`Version mismatch: package.json=${releasePkg.version || ''}, io-package.json=${releaseIo.common && releaseIo.common.version || ''}`);
  process.exit(1);
}
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','nexowatt.mesh-microgrid-target-group-fairness.v1');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','function normalizeTargetGroups');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','function buildTargetGroupPlan');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','_meshGroupLimitForCommand');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','meshMicrogrid.targetGroups.groupsJson');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','targetGroupSummary');
must('src-ts/runtime-executables/www/ems-apps.ts','meshMicrogridTargetGroupsJson');
must('src-ts/runtime-executables/www/ems-apps.ts','Zielgruppen-Strategie');
must('src-ts/runtime-executables/www/mesh-microgrid.ts','renderTargetGroups');
must('www/mesh-microgrid.html','meshTargetGroupRows');
must('src-ts/runtime-executables/main.ts','targetGroups: snapshot.targetGroups');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','directHardwareWrite: false');
must('src-ts/runtime-executables/ems/modules/mesh-microgrid.ts','neutralCommandOnly: true');
mustNot('src-ts/runtime-executables/www/ems-apps.ts','appsList.appendChild(buildMeshMicrogridCard())');
console.log('OK: Mesh/Microgrid Zielgruppen-Strategie ist app-center-konform und hardware-neutral abgesichert.');
