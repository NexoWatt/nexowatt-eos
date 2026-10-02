#!/usr/bin/env python3
"""Generate a bounded PostgreSQL source/driver supplement; never a target-system BOM."""
import argparse,copy,datetime,hashlib,json,os,subprocess,uuid
from pathlib import Path
from urllib.parse import quote
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--pg-client-root',required=True,type=Path)
p.add_argument('--base-app',required=True,type=Path)
p.add_argument('--node',required=True,type=Path)
a=p.parse_args();repo=Path(__file__).resolve().parents[3];out=repo/'reports/integration/postgresql'
def sha(data):return hashlib.sha256(data).hexdigest()
def bind(file):
 return {'path':str(file.relative_to(repo)) if file.is_relative_to(repo) else str(file),'bytes':file.stat().st_size,'sha256':sha(file.read_bytes())}
def props(items):return [{'name':key,'value':str(value)} for key,value in items.items()]
def inventory(directory):
 js="const {inventoryTree}=require(process.argv[1]); process.stdout.write(JSON.stringify(inventoryTree(process.argv[2])))"
 proc=subprocess.run([str(a.node),'-e',js,str(repo/'runtime/postgresql/integration.cjs'),str(directory)],capture_output=True,check=True)
 return json.loads(proc.stdout),sha(proc.stdout)
assembly_path=out/'controller-integration.json';assembly=json.loads(assembly_path.read_text())
pg_bom_path=out/'pg-client.cdx.json';pg_bom=json.loads(pg_bom_path.read_text())
pg_lock_path=a.pg_client_root/'package-lock.json';pg_lock=json.loads(pg_lock_path.read_text())
actual_driver,driver_hash=inventory(a.pg_client_root/'node_modules')
assert len(actual_driver)==assembly['assembly']['driverFiles']==126
assert driver_hash==assembly['assembly']['driverManifestSha256']
raw_assembly=json.loads((out/'raw/controller-offline-assembly.json').read_text())
assert sha(pg_lock_path.read_bytes())==raw_assembly['expectedPgLockSha256']
assert sha((a.base_app/'package-lock.json').read_bytes())==raw_assembly['expectedBaseLockSha256']
installed=[]
for entry in sorted((a.pg_client_root/'node_modules').iterdir()):
 if entry.name.startswith('.'):continue
 directories=list(entry.iterdir()) if entry.name.startswith('@') else [entry]
 for directory in directories:
  metadata=json.loads((directory/'package.json').read_text());name=metadata['name'];version=metadata['version']
  assert pg_lock['packages']['node_modules/'+name]['version']==version
  installed.append((name,version))
assert sorted(installed)==sorted((c['name'],c['version']) for c in pg_bom['components'])
assert len(installed)==13
package_components=[];source_files=sorted((repo/'runtime/postgresql').rglob('*'))
source_files=[f for f in source_files if f.is_file()]
source_bindings=[bind(f) for f in source_files]
package_dirs={}
for dirname in ['store','db-objects-postgresql','db-states-postgresql']:
 directory=repo/'runtime/postgresql/packages'/dirname
 metadata_path=directory/'package.json';metadata=json.loads(metadata_path.read_text());name=metadata['name'];version=metadata['version'];ref=f'{name}@{version}'
 package_dirs[name]=directory
 expected=next(x for x in assembly['assembly']['copiedPackageBindings'] if x['name']==name)
 actual,_=inventory(directory)
 assert actual==expected['files'],f'Source differs from final assembly: {name}'
 component={'type':'library','bom-ref':ref,'group':name.rsplit('/',1)[0] if '/' in name else '', 'name':name.rsplit('/',1)[-1],'version':version,'scope':'required','purl':'pkg:npm/'+quote(name,safe='/')+'@'+version,'description':metadata.get('description',''),'properties':props({'eos:component:status':'experimental private source; not published or production approved','eos:source:directory':str(directory.relative_to(repo)),'eos:source:packageJsonSha256':sha(metadata_path.read_bytes()),'eos:source:assemblyFileHashesMatched':'true'})}
 if metadata.get('license'):
  license_value=metadata['license'];component['licenses']=[{'license':{'id':license_value}}] if license_value!='UNLICENSED' else [{'license':{'name':'UNLICENSED (declared in source package metadata)'}}]
 else:component['properties'].append({'name':'eos:license:status','value':'not declared in package.json; unresolved release metadata'})
 package_components.append(component)
reused_path=a.base_app/'node_modules/@iobroker/db-objects-redis/package.json';reused=json.loads(reused_path.read_text())
assert reused['name']=='@iobroker/db-objects-redis' and reused['version']=='7.2.2'
reused_ref='@iobroker/db-objects-redis@7.2.2'
reused_component={'type':'library','bom-ref':reused_ref,'group':'@iobroker','name':'db-objects-redis','version':'7.2.2','scope':'required','purl':'pkg:npm/%40iobroker/db-objects-redis@7.2.2','description':'Existing ioBroker Objects domain library reused by experimental PostgreSQL backend; transitive base runtime outside this supplement','properties':props({'eos:component:status':'observed in existing laboratory base app; not newly released','eos:source:packageJsonSha256':sha(reused_path.read_bytes()),'eos:dependency:coverage':'incomplete; full historical base runtime is separate'})}
if reused.get('license'):reused_component['licenses']=[{'license':{'name':reused['license']}}]
files=[{'type':'file','bom-ref':'source:'+row['path'],'name':row['path'],'hashes':[{'alg':'SHA-256','content':row['sha256']}],'properties':props({'eos:source:bytes':row['bytes'],'eos:source:scope':'current PostgreSQL development source and package documentation'})} for row in source_bindings]
root_ref='nexowatt-eos-postgresql-source@0.2.0-dev.6'
dependencies=[{'ref':root_ref,'dependsOn':[c['bom-ref'] for c in package_components]}, {'ref':'@nexowatt/eos-postgresql-store@0.1.0-dev.1','dependsOn':['pg@8.23.1']},{'ref':'@iobroker/db-objects-postgresql@0.1.0-dev.1','dependsOn':['@nexowatt/eos-postgresql-store@0.1.0-dev.1',reused_ref]},{'ref':'@iobroker/db-states-postgresql@0.1.0-dev.1','dependsOn':['@nexowatt/eos-postgresql-store@0.1.0-dev.1']}]
driver_refs={c['bom-ref'] for c in pg_bom['components']}
for dep in pg_bom['dependencies']:
 if dep['ref'] in driver_refs:dependencies.append(copy.deepcopy(dep))
bom={'$schema':'http://cyclonedx.org/schema/bom-1.5.schema.json','bomFormat':'CycloneDX','specVersion':'1.5','serialNumber':'urn:uuid:'+str(uuid.uuid4()),'version':1,'metadata':{'timestamp':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'lifecycles':[{'phase':'pre-build'}],'component':{'type':'application','bom-ref':root_ref,'name':'NexoWatt EOS PostgreSQL source and driver supplement','version':'0.2.0-dev.6','description':'Experimental source/component supplement, not a new released runtime or Raspberry Pi system inventory'},'properties':props({'eos:scope':'3 new backend packages; 14 runtime source/documentation files; 13 actually installed public pg dependencies; 1 reused historical ioBroker library reference','eos:runtime:released':'false','eos:target:raspberryPiInventory':'false','eos:target:hardwareAccepted':'false','eos:coverage:fullRuntime':'false','eos:excluded':'native PostgreSQL laboratory binaries; PGlite test engine; full historical ioBroker dependency closure; Debian OS; firmware; physical adapters','eos:driver:manifestSha256':driver_hash,'eos:driver:lockSha256':sha(pg_lock_path.read_bytes()),'eos:driver:sbomSha256':sha(pg_bom_path.read_bytes())})},'components':package_components+[reused_component]+copy.deepcopy(pg_bom['components'])+files,'dependencies':dependencies,'compositions':[{'aggregate':'incomplete','assemblies':[root_ref],'dependencies':[root_ref,reused_ref]}],'externalReferences':[{'type':'bom','url':'urn:cdx:'+pg_bom['serialNumber'].removeprefix('urn:uuid:')+'/'+str(pg_bom['version']),'comment':'Matching standalone actual public pg driver tree BOM; file reports/integration/postgresql/pg-client.cdx.json','hashes':[{'alg':'SHA-256','content':sha(pg_bom_path.read_bytes())}]}]}
source_bom=out/'source-supplement.cdx.json';source_bom.write_text(json.dumps(bom,indent=2)+'\n')
# Validate both actual output bytes through the repository-owned offline validator.
verification_path=out/'sbom-verification.json'
initial_validation=None
if verification_path.exists():
 previous=json.loads(verification_path.read_text())
 if 'results' in previous and any(not x.get('valid') for x in previous['results']):initial_validation=previous
command=[os.environ.get('EOS_SBOM_PYTHON','python3'),'-B',str(repo/'tools/integration/validate-sbom.py'),str(source_bom),str(pg_bom_path),'--output',str(verification_path)]
proc=subprocess.run(command,capture_output=True,text=True,check=True)
validation=json.loads(verification_path.read_text());assert all(x['valid'] for x in validation['results'])
verification={'schemaVersion':1,'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'schema-and-source-bindings-verified-supplement-only','counts':{'newSourcePackages':3,'reusedHistoricalLibraryReferences':1,'actualPublicDriverPackages':13,'sourceFilesIncludingPackageReadmes':len(files),'sourceSupplementComponents':len(bom['components']),'actualDriverFiles':len(actual_driver)},'claimScope':{'newReleasedRuntimeSbom':False,'fullIoBrokerRuntimeClosure':False,'raspberryPiInstalledSystemSbom':False,'nativePostgresqlServerIncluded':False,'pgliteIncluded':False,'securityVulnerabilityClearance':False,'licenseReviewComplete':False},'sourceBindings':source_bindings,'componentBindings':[bind(package_dirs[n]/'package.json') for n in sorted(package_dirs)]+[bind(reused_path)],'driver':{'actualTreeMatchesNpmSbomNamesAndVersions':True,'actualTreeMatchesAssemblyFileManifest':True,'fileCount':len(actual_driver),'fileManifestSha256':driver_hash,'driverLock':bind(pg_lock_path),'omittedOptionalPackages':assembly['assembly']['omittedOptionalPackages'],'upstreamTarballSignaturesVerifiedByThisCheck':False,'integrityHashMeaning':'npm CycloneDX component SHA512 fields originate from lockfile tarball integrity; actual installed bytes separately bound by assembly file manifest'},'evidenceBindings':[bind(pg_bom_path),bind(source_bom),bind(assembly_path),bind(out/'raw/controller-offline-assembly.json'),bind(repo/'runtime/postgresql/integration.cjs'),bind(Path(__file__).resolve()),bind(repo/'tools/integration/validate-sbom.py')],'offlineSchemaValidation':validation,'validationCommand':command,'validationStdout':proc.stdout.strip(),'limits':['Supplement describes development source and the actually observed public pg driver tree only','Historical full runtime and target Debian/firmware inventory remain separate and unchanged','Native PostgreSQL17.11 laboratory toolchain and PGlite18.3WASM test engine are excluded from product components','New store package has no declared license in package.json; licensing metadata requires resolution before release','Objects package declares UNLICENSED; package metadata is reproduced, no licensing approval inferred','The reused ioBroker Objects library has further base-runtime dependencies that are outside this incomplete supplement']}
if initial_validation:verification['generationCorrection']={'issue':'Existing package declares Apache 2.0 as a license name, not the SPDX ID Apache-2.0; first generator incorrectly placed it in id. Preserve the declared text under license.name. No source metadata changed.','initialValidation':initial_validation}
verification_path.write_text(json.dumps(verification,indent=2)+'\n')
print(json.dumps({'sourceComponents':len(bom['components']),'sourceFiles':len(files),'driverComponents':len(installed),'sourceSupplementSha256':sha(source_bom.read_bytes()),'driverSbomSha256':sha(pg_bom_path.read_bytes()),'verificationSha256':sha(verification_path.read_bytes()),'valid':True}))
