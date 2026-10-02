'use strict';
/** Isolated test PostgreSQL. Requires a real unprivileged OS account.
 * Creates only an owned temporary directory, ephemeral certificates, and a
 * loopback listener. It never installs packages or changes system services.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawnSync } = require('node:child_process');

async function unusedLoopbackPort() {
  const server = net.createServer();
  await new Promise((resolve,reject)=>{ server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  const {port} = server.address();
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  return port; // PostgreSQL must still bind successfully: no assumption of a reservation.
}
function run(command,args,options={}) {
  const result = spawnSync(command,args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,...options});
  if(result.error || result.status!==0) {
    const error = new Error(`${path.basename(command)} failed (${result.status ?? result.error?.code}): ${String(result.stderr||'').slice(0,2000)}`);
    error.code = 'EOS_PG_LAB_COMMAND_FAILED';
    throw error;
  }
  return result.stdout;
}
async function startLab({binDirectory=process.env.EOS_PG_BIN_DIRECTORY,schemaFile}={}) {
  if(typeof process.getuid!=='function' || process.getuid()===0) {
    const error=new Error('PostgreSQL laboratory requires an unprivileged OS account; root execution is refused.');
    error.code='EOS_PG_LAB_REQUIRES_NONROOT'; throw error;
  }
  if(!binDirectory || !path.isAbsolute(binDirectory)) throw new Error('An absolute PostgreSQL binDirectory is required');
  const bin=name=>path.join(binDirectory,name);
  const version=run(bin('postgres'),['--version']).trim();
  if(!/^postgres \(PostgreSQL\) 17\.11(?:\s|$)/.test(version)) throw new Error('This fixture is bound to PostgreSQL 17.11; requalify before changing it');
  const username=os.userInfo().username;
  if(!/^[a-zA-Z0-9_.-]{1,64}$/.test(username)) throw new Error('OS username is not supported by this test fixture');
  const directory=await fsp.mkdtemp(path.join(os.tmpdir(),'eos-postgresql-lab-'));
  await fsp.chmod(directory,0o700);
  const marker=path.join(directory,'.eos-owned-lab');
  await fsp.writeFile(marker,'ephemeral-postgresql-test-fixture\n',{mode:0o600,flag:'wx'});
  const dataDirectory=path.join(directory,'data');
  const socketDirectory=path.join(directory,'socket');
  const certDirectory=path.join(directory,'certs');
  let started=false,cleaned=false;
  const stop=async()=>{
    if(cleaned)return;
    if(started) {
      // pg_ctl targets this exact private data directory, never host clusters.
      const status=spawnSync(bin('pg_ctl'),['-D',dataDirectory,'status'],{encoding:'utf8',timeout:5000});
      if(status.status===0)run(bin('pg_ctl'),['-D',dataDirectory,'-m','fast','-w','-t','10','stop'],{timeout:15000});
      else if(status.status!==3)throw new Error('Cannot establish that laboratory server is stopped; preserve its directory');
      started=false;
    }
    if(path.dirname(directory)!==os.tmpdir() || !path.basename(directory).startsWith('eos-postgresql-lab-')) throw new Error('Unexpected cleanup path');
    const st=await fsp.lstat(directory);
    if(!st.isDirectory() || st.isSymbolicLink() || st.uid!==process.getuid()) throw new Error('Unexpected cleanup ownership');
    if(await fsp.readFile(marker,'utf8')!=='ephemeral-postgresql-test-fixture\n') throw new Error('Missing cleanup marker');
    await fsp.rm(directory,{recursive:true,force:false}); cleaned=true;
  };
  try {
    await fsp.mkdir(socketDirectory,{mode:0o700});
    await fsp.mkdir(certDirectory,{mode:0o700});
    const cert=name=>path.join(certDirectory,name);
    const newKeyArgs=['-newkey','ec','-pkeyopt','ec_paramgen_curve:prime256v1','-nodes','-sha256'];
    run('openssl',['req','-new',...newKeyArgs,'-x509','-days','2','-subj','/CN=EOS ephemeral PostgreSQL laboratory CA','-addext','basicConstraints=critical,CA:TRUE','-addext','keyUsage=critical,keyCertSign,cRLSign','-keyout',cert('ca.key'),'-out',cert('ca.crt')]);
    for(const name of ['server','eos_objects','eos_states','eos_tls_probe','wrong_client']) {
      const cn=name==='server'?'localhost':name;
      const extensions=['basicConstraints=critical,CA:FALSE','keyUsage=critical,digitalSignature',`extendedKeyUsage=${name==='server'?'serverAuth':'clientAuth'}`];
      if(name==='server')extensions.push('subjectAltName=DNS:localhost,IP:127.0.0.1');
      await fsp.writeFile(cert(`${name}.ext`),`${extensions.join('\n')}\n`,{mode:0o600});
      run('openssl',['req','-new',...newKeyArgs,'-subj',`/CN=${cn}`,'-keyout',cert(`${name}.key`),'-out',cert(`${name}.csr`)]);
      run('openssl',['x509','-req','-sha256','-days','2','-in',cert(`${name}.csr`),'-CA',cert('ca.crt'),'-CAkey',cert('ca.key'),'-CAcreateserial','-extfile',cert(`${name}.ext`),'-out',cert(`${name}.crt`)]);
    }
    run('openssl',['req','-new',...newKeyArgs,'-x509','-days','2','-subj','/CN=EOS wrong test CA','-keyout',cert('wrong-ca.key'),'-out',cert('wrong-ca.crt')]);
    for(const entry of await fsp.readdir(certDirectory))await fsp.chmod(cert(entry),entry.endsWith('.key')?0o600:0o644);
    run(bin('initdb'),['-D',dataDirectory,'--username=eos_lab_owner','--auth-local=peer','--auth-host=scram-sha-256','--encoding=UTF8','--no-locale','--data-checksums']);
    const port=await unusedLoopbackPort();
    // Values originate exclusively in this private generated directory.
    const conf=["listen_addresses='127.0.0.1'",`port=${port}`,`unix_socket_directories='${socketDirectory.replaceAll("'","''")}'`,'unix_socket_permissions=0700','max_connections=40',"shared_buffers='32MB'",'ssl=on',"ssl_min_protocol_version='TLSv1.3'",`ssl_cert_file='${cert('server.crt').replaceAll("'","''")}'`,`ssl_key_file='${cert('server.key').replaceAll("'","''")}'`,`ssl_ca_file='${cert('ca.crt').replaceAll("'","''")}'`,"password_encryption='scram-sha-256'","authentication_timeout='5s'","statement_timeout='5s'","idle_in_transaction_session_timeout='5s'","log_statement='none'","log_min_error_statement='panic'",'logging_collector=off'];
    await fsp.writeFile(path.join(dataDirectory,'postgresql.conf'),`${conf.join('\n')}\n`,{mode:0o600});
    await fsp.writeFile(path.join(dataDirectory,'pg_hba.conf'),'local all eos_lab_owner peer map=lab_owner\nlocal all all reject\nhostnossl all all 0.0.0.0/0 reject\nhostssl eos_lab eos_objects,eos_states 127.0.0.1/32 cert\nhostssl eos_tls_probe eos_tls_probe 127.0.0.1/32 cert\nhostssl all all 0.0.0.0/0 reject\nhost all all ::0/0 reject\n',{mode:0o600});
    await fsp.writeFile(path.join(dataDirectory,'pg_ident.conf'),`lab_owner ${username} eos_lab_owner\n`,{mode:0o600});
    started=true; // Even a startup timeout must take the stop/status path before cleanup.
    run(bin('pg_ctl'),['-D',dataDirectory,'-l',path.join(directory,'server.log'),'-w','-t','10','start'],{timeout:15000});
    const psqlArgs=['-X','-v','ON_ERROR_STOP=1','-h',socketDirectory,'-p',String(port),'-U','eos_lab_owner'];
    run(bin('psql'),[...psqlArgs,'-d','postgres'],{input:'CREATE DATABASE eos_lab;\nCREATE ROLE eos_tls_probe LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;\nCREATE DATABASE eos_tls_probe;\nREVOKE ALL ON DATABASE eos_tls_probe FROM PUBLIC;\nGRANT CONNECT ON DATABASE eos_tls_probe TO eos_tls_probe;\n'});
    if(schemaFile)run(bin('psql'),[...psqlArgs,'-d','eos_lab','-f',path.resolve(schemaFile)]);
    const metadata={labOnly:true,version,directory,dataDirectory,socketDirectory,binDirectory,host:'127.0.0.1',port,database:'eos_lab',bootstrapDbUser:'eos_lab_owner',osUid:process.getuid(),serverName:'localhost',caFile:cert('ca.crt'),roles:Object.fromEntries(['eos_objects','eos_states','eos_tls_probe'].map(role=>[role,{certFile:cert(`${role}.crt`),keyFile:cert(`${role}.key`)}]))};
    return {metadata,stop,psql(sql,database='eos_lab'){return run(bin('psql'),[...psqlArgs,'-d',database],{input:sql});}};
  }catch(error){
    try{await stop();}catch(cleanupError){error.cleanupError=cleanupError.message;}
    throw error;
  }
}
module.exports={startLab};
if(require.main===module) {
  startLab({schemaFile:process.env.EOS_PG_SCHEMA_FILE}).then(lab=>{
    process.stdout.write(`${JSON.stringify(lab.metadata,null,2)}\n`);
    let stopping=false;
    const close=()=>{if(stopping)return;stopping=true;lab.stop().then(()=>process.exit(0),error=>{process.stderr.write(`${error.message}\n`);process.exit(1);});};
    process.on('SIGINT',close);process.on('SIGTERM',close);
    setInterval(()=>{},60000);
  }).catch(error=>{process.stderr.write(`${error.code||'EOS_PG_LAB_ERROR'}: ${error.message}\n`);process.exitCode=1;});
}
