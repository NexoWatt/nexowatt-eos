"""Offline security/behavior tests; never execute APT or mutate this host."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
import subprocess
import os
import jsonschema
from unittest.mock import patch, Mock

# Test imports must not add unsigned __pycache__ files to release inputs.
sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('eos_os_updates', ROOT / 'runtime/os-updates/runner.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def origin(codename='trixie-security', trusted=True, origin='Debian', label='Debian-Security', component='main'):
    return types.SimpleNamespace(codename=codename, trusted=trusted, origin=origin, label=label, component=component)


def package(name='openssl', installed='1', versions=None, candidate=None):
    versions = versions or [types.SimpleNamespace(version='2', origins=[origin()])]
    return types.SimpleNamespace(name=name, is_installed=True, installed=types.SimpleNamespace(version=installed), versions=versions,
                                 candidate=versions[0] if candidate is None else candidate)


def compare(a, b):
    return (int(a) > int(b)) - (int(a) < int(b))


class FakeCommands:
    calls = []
    fail = None
    def __init__(self, *args): pass
    def run(self, args, code, **kwargs):
        self.calls.append(args)
        if self.fail and args[0] == self.fail:
            raise m.MaintenanceError(code)
        if 'apt-daily-upgrade.timer' in args:
            return 0, 'ActiveState=inactive\nUnitFileState=disabled\n'
        output = {
            '/usr/bin/systemctl': 'ActiveState=active\nUnitFileState=enabled\n',
            '/usr/bin/dpkg': 'amd64\n', '/usr/bin/apt-get': '', '/usr/bin/unattended-upgrade': '',
            '/usr/bin/apt-mark': '', '/usr/sbin/needrestart': 'NEEDRESTART-VER: 3.6\nNEEDRESTART-KSTA: 1\n',
            '/usr/bin/dpkg-query': 'openssl\t3.0.20-1~deb12u2\tamd64\tinstalled\nold\t1\tall\tconfig-files\n',
        }[args[0]]
        return 0, output


class PureContracts(unittest.TestCase):
    def test_schema_status_policy_and_generated_sbom(self):
        schema=json.loads((ROOT/'runtime/os-updates/status.schema.json').read_text())
        validator=jsonschema.Draft202012Validator(schema,format_checker=jsonschema.FormatChecker())
        validator.validate(m.initial_status())
        for state in ['running','disabled','error']:
            s=m.initial_status();s['state']=state;s['generatedAt']='2026-10-01T02:00:00Z'
            if state=='error':s['lastError']={'code':'apt-refresh-failed','message':'Fixed safe message'}
            validator.validate(s)
        bad=m.initial_status();bad['state']='healthy-whatever'
        with self.assertRaises(jsonschema.ValidationError):validator.validate(bad)
        policy_schema=json.loads((ROOT/'runtime/os-updates/policy.schema.json').read_text())
        jsonschema.validate({'schemaVersion':1,'enabled':False},policy_schema)
        with self.assertRaises(jsonschema.ValidationError):jsonschema.validate({'schemaVersion':1,'enabled':True,'args':'arbitrary'},policy_schema)
        bom=m.dpkg_sbom('openssl\t3.0.20-1~deb12u2\tarm64\tinstalled\n','2026-10-01T02:00:00Z')
        schema_path=ROOT/'tools/integration/vendor/cyclonedx-1.5/bom-1.5.schema.json'
        bom_schema=json.loads(schema_path.read_text())
        from referencing import Registry, Resource
        resources=[]
        for item in schema_path.parent.glob('*.schema.json'):
            doc=json.loads(item.read_text())
            for uri in {doc.get('$id',''),'http://cyclonedx.org/schema/'+item.name,'https://cyclonedx.org/schema/'+item.name}-{''}:
                resources.append((uri,Resource.from_contents(doc)))
        registry=Registry().with_resources(resources)
        jsonschema.Draft7Validator(bom_schema,registry=registry,format_checker=jsonschema.FormatChecker()).validate(bom)

    def test_actual_apt_config_isolation_read_only_no_package_commands(self):
        config,_,_=m.apt_configuration(Path('/var/lib/nexowatt-eos-os-updates/private'),'trixie','arm64',True)
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            p=Path(tmp)/'apt.conf';p.write_text(config)
            result=subprocess.run(['/usr/bin/apt-config','dump'],env={'PATH':'/usr/bin:/bin','APT_CONFIG':str(p)},capture_output=True,text=True,check=True,timeout=10)
        for key in ['parts','main','sourceparts','netrc','netrcparts']:
            self.assertIn('Dir::Etc::'+key+' "-";',result.stdout)
        self.assertNotIn('DPkg::Pre-Install-Pkgs',result.stdout)
        self.assertIn('Acquire::https::Verify-Peer "true";',result.stdout)
        self.assertIn('APT::Get::AllowUnauthenticated "false";',result.stdout)

    def test_separate_distro_timer_is_reported_active_unknown_or_disabled(self):
        c=Mock()
        c.run.return_value=(0,'ActiveState=active\nUnitFileState=enabled\n')
        self.assertEqual(m.distro_automation_gap(c),'independent-distro-update-automation-active')
        c.run.return_value=(0,'ActiveState=inactive\nUnitFileState=disabled\n')
        self.assertIsNone(m.distro_automation_gap(c))
        c.run.return_value=(0,'')
        self.assertEqual(m.distro_automation_gap(c),'independent-distro-update-automation-unknown')

    def test_upgrade_timeout_sigint_only_preserves_child_and_inherited_lock(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            child=Mock()
            child.wait.side_effect=[subprocess.TimeoutExpired('fixed-test',0),subprocess.TimeoutExpired('fixed-test',0)]
            with patch.object(m.subprocess,'Popen',return_value=child) as popen:
                with self.assertRaises(m.MaintenanceError) as error:
                    m.Commands({},Path(tmp),123).run(['/usr/bin/unattended-upgrade'],'upgrade-failed',timeout=1,upgrade=True)
                self.assertEqual(error.exception.code,'upgrade-timeout')
                child.send_signal.assert_called_once_with(m.signal.SIGINT)
                child.kill.assert_not_called()
                child.terminate.assert_not_called()
                self.assertEqual(popen.call_args.kwargs['pass_fds'],(123,))
                self.assertNotIn('shell',popen.call_args.kwargs)

    def test_signal_stops_subsequent_commands_and_no_nonroot_or_cli_execution(self):
        child=Mock();child.poll.return_value=None
        with patch.object(m,'ACTIVE_CHILD',child),patch.object(m,'STOP_REQUESTED',False):
            m.signal_stop(m.signal.SIGTERM,None)
            child.send_signal.assert_called_once_with(m.signal.SIGINT)
            with patch.object(m.subprocess,'Popen') as popen:
                with self.assertRaises(m.MaintenanceError):m.Commands({},Path('/none'),123).run(['/usr/bin/apt-get','update'],'apt-refresh-failed')
                popen.assert_not_called()
        with patch.object(m.os,'geteuid',return_value=1000),patch.object(m,'trusted_path') as trust:
            self.assertEqual(m.main(),2);trust.assert_not_called()
        with patch.object(m.os,'geteuid',return_value=0),patch.object(sys,'argv',['runner.py','--untrusted']),patch.object(m,'trusted_path') as trust:
            self.assertEqual(m.main(),2);trust.assert_not_called()

    def test_supported_versions_and_unknown_rejection(self):
        for major, code in [('12','bookworm'),('13','trixie')]:
            self.assertEqual(m.parse_os_release(f'ID=debian\nVERSION_ID="{major}.4"\nVERSION_CODENAME={code}\n'), (major,code))
        for value in ['14','13;exec','12$(id)','13.foo']:
            with self.assertRaises(m.MaintenanceError):
                m.parse_os_release(f'ID=debian\nVERSION_ID={value}\nVERSION_CODENAME=trixie\n')

    def test_sources_require_exact_codenames_keyrings_and_disable_host_configuration(self):
        config, sources, origins = m.apt_configuration(Path('/var/lib/nexowatt-eos-os-updates/private'), 'trixie', 'arm64', True)
        self.assertIn('Dir::Etc::parts "-";', config)
        self.assertIn('Dir::Etc::main "-";', config)
        self.assertIn('Dir::Etc::netrc "-";', config)
        self.assertIn('Dir::Etc::netrcparts "-";', config)
        self.assertIn('APT::Update::Error-Mode "any";', config)
        self.assertIn('Acquire::https::Verify-Peer "true";', config)
        self.assertIn('Acquire::AllowInsecureRepositories "false";', config)
        self.assertIn('Unattended-Upgrade::Automatic-Reboot "false";', config)
        self.assertIn('"^nodejs$"; "^npm$";', config)
        self.assertIn('Signed-By: /usr/share/keyrings/raspberrypi-archive-keyring.gpg', sources)
        self.assertNotIn('beta', sources)
        self.assertNotIn('untested', sources)
        self.assertNotIn('trusted=yes', sources)
        self.assertEqual(len(origins), 4)
        with self.assertRaises(m.MaintenanceError):
            m.apt_configuration(Path('/tmp/inject";'), 'trixie', 'arm64', True)

    def test_origin_rejects_spoof_untrusted_wrong_release_and_pi_beta(self):
        for bad in [origin(trusted=False),origin(codename='forky-security'),origin(origin='Fake'),origin(label='Debian')]:
            self.assertFalse(m.origin_allowed(bad,'trixie',True))
        pi = origin(codename='trixie',origin='Raspberry Pi Foundation',label='Raspberry Pi Foundation')
        self.assertTrue(m.origin_allowed(pi,'trixie',True))
        self.assertFalse(m.origin_allowed(pi,'trixie',False))
        pi.component='beta'
        self.assertFalse(m.origin_allowed(pi,'trixie',True))

    def test_security_counts_include_holds_and_runtime_pin(self):
        pending, outside = m.pending_packages([package(),package('nodejs'),package('held')], compare, {'held'}, 'trixie', False)
        self.assertEqual((pending['securityCount'],pending['heldSecurityCount'],pending['blockedSecurityCount']),(3,1,3))
        self.assertEqual(outside,0)
        self.assertEqual(pending['packages'][1]['blockedReason'],'runtime-version-pin')
        self.assertEqual(pending['packages'][2]['blockedReason'],'package-held')

    def test_multiarch_hold_and_kernel_package_service_profile(self):
        p=package('openssl');p.fullname='openssl:arm64'
        pending,_=m.pending_packages([p],compare,{'openssl:arm64'},'trixie',False)
        self.assertEqual(pending['heldSecurityCount'],1)
        unit=(ROOT/'system/test-base/systemd/nexowatt-eos-os-updates.service').read_text()
        self.assertNotIn('ProtectKernelModules=yes',unit)
        self.assertIn('SendSIGKILL=no',unit)
        self.assertIn('KillMode=process',unit)

    def test_security_versions_detected_despite_pinned_candidate(self):
        old = types.SimpleNamespace(version='1',origins=[])
        pending, _ = m.pending_packages([package(candidate=old)],compare,set(),'trixie',False)
        self.assertEqual(pending['securityCount'],1)
        self.assertEqual(pending['packages'][0]['blockedReason'],'candidate-pinned-or-untrusted')

    def test_vendor_unclassified_does_not_fake_security_count(self):
        v=types.SimpleNamespace(version='2',origins=[origin(codename='trixie',origin='Raspberry Pi Foundation',label='Raspberry Pi Foundation')])
        pending,_=m.pending_packages([package(versions=[v])],compare,set(),'trixie',True)
        self.assertEqual(pending['vendorCount'],1)
        self.assertEqual(pending['securityCount'],0)
        self.assertEqual(pending['availableCount'],1)

    def test_pending_bounds_preserve_total(self):
        pending,_=m.pending_packages([package('pkg'+str(i)) for i in range(150)],compare,set(),'trixie',False)
        self.assertEqual(pending['securityCount'],150)
        self.assertEqual(len(pending['packages']),50)
        self.assertTrue(pending['truncated'])

    def test_restart_marker_absence_is_unknown(self):
        reboot,activation=m.restart_status('')
        self.assertEqual(reboot['state'],'unknown')
        self.assertEqual(activation['state'],'unknown')
        reboot,activation=m.restart_status('NEEDRESTART-VER: 3.6\nNEEDRESTART-KSTA: 1\nNEEDRESTART-SVC: eos.service\n')
        self.assertEqual(reboot['state'],'not-required')
        self.assertEqual(activation['state'],'required')
        self.assertEqual(activation['serviceRestartCount'],1)
        self.assertEqual(m.restart_status('NEEDRESTART-VER: 3.6\nNEEDRESTART-KSTA: 0\n')[0]['state'],'unknown')
        self.assertEqual(m.restart_status('',True)[0]['state'],'required')

    def test_sbom_uses_only_actual_installed_rows_no_invented_versions(self):
        bom=m.dpkg_sbom('libssl3:arm64\t3.0.20-1~deb12u2\tarm64\tinstalled\nremoved\t1\tall\tconfig-files\n','2026-10-01T00:00:00Z')
        self.assertEqual(len(bom['components']),1)
        self.assertEqual(bom['components'][0]['version'],'3.0.20-1~deb12u2')
        self.assertNotIn('licenses',bom['components'][0])
        with self.assertRaises(m.MaintenanceError):m.dpkg_sbom('garbage','2026-10-01T00:00:00Z')

    def test_no_false_green_for_gap_pending_disabled_timer_activation_unknown(self):
        s=m.initial_status()
        s['pending']['availableCount']=0
        s['coverage']={'state':'complete-for-configured-origins','gaps':[]}
        s['reboot']['state']=s['activation']['state']='not-required'
        s['timers']={'enabled':True,'active':True,'checkedAt':'2026-10-01T00:00:00Z'}
        self.assertEqual(m.classify(s),'ok')
        for field in ['reboot','activation']:
            s[field]['state']='unknown'
            self.assertEqual(m.classify(s),'attention')
            s[field]['state']='not-required'
        s['timers']['enabled']=False
        self.assertEqual(m.classify(s),'attention')
        s['policy']['automatic']=False
        self.assertEqual(m.classify(s),'disabled')

    def test_symlink_and_world_writable_parent_rejected(self):
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            base=Path(tmp)
            file=base/'safe';file.write_text('safe')
            symlink=base/'redirect';symlink.symlink_to(file)
            with self.assertRaises(m.MaintenanceError):m.trusted_path(symlink)
            base.chmod(0o777)
            with self.assertRaises(m.MaintenanceError):m.trusted_path(file)
            base.chmod(0o700)


class Workflow(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(dir=ROOT)
        self.base=Path(self.tmp.name)
        (self.base/'private').mkdir(mode=0o711)
        self.policy=self.base/'policy.json'
        self.policy.write_text('{"schemaVersion":1,"enabled":true}')
        self.previous=m.initial_status()
        self.previous['lastSuccessAt']='2026-09-30T02:00:00Z'
        (self.base/'status.json').write_text(json.dumps(self.previous))
        FakeCommands.calls=[];FakeCommands.fail=None
        self.patchers=[patch.object(m,'STATE',self.base),patch.object(m,'POLICY',self.policy),
                       patch.object(m,'Commands',FakeCommands),patch.object(m,'TOOLS',()),patch.object(m,'parse_os_release',return_value=('13','trixie')),
                       patch.object(m,'trusted_path',side_effect=lambda p,directory=False:Path(p)),
                       patch.object(sys,'argv',['runner.py']),
                       patch.dict(sys.modules,{'apt':types.SimpleNamespace(Cache=lambda:[]),
                           'apt_pkg':types.SimpleNamespace(init_config=lambda:None,init_system=lambda:None,version_compare=compare)})]
        for p in self.patchers:p.start()
    def tearDown(self):
        for p in reversed(self.patchers):p.stop()
        self.tmp.cleanup()
    def status(self):
        data=json.loads((self.base/'status.json').read_text())
        schema=json.loads((ROOT/'runtime/os-updates/status.schema.json').read_text())
        jsonschema.Draft202012Validator(schema,format_checker=jsonschema.FormatChecker()).validate(data)
        return data
    def test_success_actual_inventory_hash_binding(self):
        self.assertEqual(m.main(),0)
        s=self.status()
        self.assertEqual(s['state'],'ok')
        bom=(self.base/'installed-packages.cdx.json').read_bytes()
        self.assertEqual(s['sbom']['sha256'],m.hashlib.sha256(bom).hexdigest())
        self.assertEqual(s['sbom']['components'],1)
        self.assertTrue(any(c[0]=='/usr/bin/unattended-upgrade' for c in FakeCommands.calls))
    def test_failed_refresh_never_runs_upgrade_or_claims_current(self):
        FakeCommands.fail='/usr/bin/apt-get'
        self.assertEqual(m.main(),1)
        s=self.status()
        self.assertEqual(s['lastError']['code'],'apt-refresh-failed')
        self.assertEqual(s['lastSuccessAt'],self.previous['lastSuccessAt'])
        self.assertIsNone(s['pending']['securityCount'])
        self.assertFalse(any(c[0]=='/usr/bin/unattended-upgrade' for c in FakeCommands.calls))
    def test_upgrade_failure_retains_success_history_without_new_sbom(self):
        FakeCommands.fail='/usr/bin/unattended-upgrade'
        self.assertEqual(m.main(),1)
        self.assertEqual(self.status()['state'],'error')
        self.assertEqual(self.status()['lastSuccessAt'],self.previous['lastSuccessAt'])
        self.assertFalse((self.base/'installed-packages.cdx.json').exists())
    def test_disabled_no_package_commands(self):
        self.policy.write_text('{"schemaVersion":1,"enabled":false}')
        self.assertEqual(m.main(),0)
        self.assertEqual(self.status()['state'],'disabled')
        self.assertFalse(any(c[0] in {'/usr/bin/apt-get','/usr/bin/unattended-upgrade'} for c in FakeCommands.calls))
    def test_unknown_policy_fields_fail_closed(self):
        self.policy.write_text('{"schemaVersion":1,"enabled":true,"command":"id"}')
        self.assertEqual(m.main(),1)
        self.assertEqual(self.status()['lastError']['code'],'configuration-invalid')
        self.assertEqual(FakeCommands.calls,[])

if __name__=='__main__':unittest.main(verbosity=2)
