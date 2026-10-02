#!/usr/bin/env node
'use strict';
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
const read=(r)=>fs.readFileSync(path.join(root,r),'utf8');
const fail=(m)=>{console.error('[heating-rod-hard-fallback-only] ERROR: '+m);process.exit(1);};
const must=(t,m,l)=>{if(!t.includes(m))fail(`${l} fehlt: ${m}`)};
const runtime=read('ems/modules/heating-rod-control.js'), mirror=read('src-ts/runtime-mirrors/ems/modules/heating-rod-control.ts'), main=read('main.js'), ui=read('www/ems-apps.js');
for(const [m,l] of [['heatingRod.summary.tsFallbackPolicyJson','Fallback-Policy-State'],["mode: heatingRodTsNormalSource && heatingRodTsNormalSource.ready ? 'hard-blockers-only'",'Hard-Blockers-Only-Modus'],['legacyJsReferenceMode','JS-Referenz nur Diagnose'],['blockingReferenceMismatches','blockierende Zielstufenmismatches getrennt'],['diagnosticReferenceMismatches','reine Wattdiagnose getrennt'],["fallback('ts-js-stage-mismatch'",'Schaltkonflikt-Fallback'],['referenceMismatches','Referenzmismatches getrennt'],['jsReferenceDecisionUsed','JS-Entscheidung Policy']]) must(runtime,m,'runtime: '+l);
must(main,'heatingRodTsFallbackPolicyJson','main.js liest Fallback-Policy'); must(ui,'JS-Fallback-Modus','UI Fallbackmodus'); must(ui,'JS-Referenz','UI JS-Referenz'); must(mirror,'Heating-Rod Runtime-Migrationshinweis (DE)','Mirror Migrationskommentar'); must(mirror,'jsFallbackLimitedToHardBlockers','Mirror Notfallback-Marker');
console.log('[heating-rod-hard-fallback-only] OK: Heizstab-JS-Pfad ist auf Notfallback vorbereitet.');
