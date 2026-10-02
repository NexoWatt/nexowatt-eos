#!/usr/bin/env python3
"""Read-only consistency gate for the EOS design; never a runtime security test.

Inputs are bounded JSON, duplicate keys and non-finite values are rejected.
Diagnostics contain fixed codes rather than potentially sensitive field values.
"""
import argparse
import json
import math
import os
import re
import stat
import sys
from pathlib import Path

MAX_BYTES = 2 * 1024 * 1024
MAX_DEPTH = 64
STRIDE = {'Spoofing', 'Tampering', 'Repudiation', 'Information Disclosure', 'Denial of Service', 'Elevation of Privilege'}
TRANS = {'tls13-mtls', 'peer-credential-unix-socket-and-signed-artifact'}
PLAN_KEYS = {'schemaVersion','kind','architectureRevision','status','productReleaseVersion','baseCommit','releaseApproved','runtimeIntegrated','cloudRequiredForOperation','sourceScope','preservation','modules','securityDefaults','connections','releaseGates'}
MODULE_KEYS = {'id','name','zone','targetPrincipal','sourceStatus','version','purpose','isolationImplemented'}
FLOW_KEYS = {'id','source','target','transport','purpose','implemented'}


def read_json(path):
    def pairs(items):
        result = {}
        for k, v in items:
            if k in result:
                raise ValueError('DUPLICATE_KEY')
            result[k] = v
        return result
    def constant(_):
        raise ValueError('NON_FINITE_JSON')
    def finite_float(token):
        value = float(token)
        if not math.isfinite(value):
            raise ValueError('NON_FINITE_JSON')
        return value
    # No final-component symlink traversal or FIFO wait. The descriptor is checked
    # after open, so swapping a path cannot replace the object being inspected.
    if not all(hasattr(os, flag) for flag in ('O_NOFOLLOW', 'O_NONBLOCK', 'O_CLOEXEC')):
        raise ValueError('SAFE_FILE_OPEN_UNAVAILABLE')
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | os.O_CLOEXEC)
    try:
        if not stat.S_ISREG(os.fstat(fd).st_mode):
            raise ValueError('INPUT_NOT_REGULAR_FILE')
        with os.fdopen(fd, 'rb') as stream:
            fd = None
            content = stream.read(MAX_BYTES + 1)
    finally:
        if fd is not None:
            os.close(fd)
    if len(content) > MAX_BYTES:
        raise ValueError('INPUT_TOO_LARGE')
    try:
        value = json.loads(content.decode('utf-8'), object_pairs_hook=pairs,
                           parse_constant=constant, parse_float=finite_float)
    except RecursionError as exc:
        raise ValueError('JSON_DEPTH_LIMIT') from exc
    pending = [(value, 0)]
    while pending:
        item, depth = pending.pop()
        if depth > MAX_DEPTH:
            raise ValueError('JSON_DEPTH_LIMIT')
        if isinstance(item, dict):
            pending.extend((child, depth + 1) for child in item.values())
        elif isinstance(item, list):
            pending.extend((child, depth + 1) for child in item)
    return value


def check(plan, requirements, model):
    errors = []
    def fail(code):
        if code not in errors:
            errors.append(code)
    def records(obj, key):
        value = obj.get(key) if isinstance(obj, dict) else None
        if not isinstance(value, list) or not value or not all(isinstance(x,dict) for x in value):
            fail('INVALID_RECORD_COLLECTION')
            return []
        return value
    def ids(items):
        values = [x.get('id') for x in items]
        if not all(isinstance(x,str) and x for x in values):
            fail('INVALID_IDENTIFIER')
            return set()
        if len(values) != len(set(values)):
            fail('DUPLICATE_IDENTIFIER')
        return set(values)
    def references(value, allowed, code):
        if not isinstance(value,list) or not value or not all(isinstance(x,str) and x in allowed for x in value):
            fail(code)
            return set()
        return set(value)
    if not all(isinstance(x,dict) for x in (plan,requirements,model)):
        return {'status':'DESIGN_REJECTED','errors':['ROOT_NOT_OBJECT'],'runtimeSecurityVerified':False}
    if set(plan) != PLAN_KEYS or plan.get('schemaVersion') != 1 or isinstance(plan.get('schemaVersion'),bool):
        fail('INVALID_PLAN_SHAPE')
    if plan.get('kind') != 'eos-system-architecture-plan' or plan.get('status') != 'design-and-tooling-only':
        fail('INVALID_DESIGN_PHASE')
    if plan.get('releaseApproved') is not False or plan.get('runtimeIntegrated') is not False or plan.get('productReleaseVersion') is not None:
        fail('UNSUPPORTED_RELEASE_CLAIM')
    if plan.get('cloudRequiredForOperation') is not False:
        fail('OFFLINE_REQUIREMENT_CHANGED')
    preserve = plan.get('preservation')
    if not isinstance(preserve,dict) or preserve.get('uiDesign') != 'must-preserve' or preserve.get('functionalBehavior') != 'must-preserve-with-reviewed-security-migrations' or preserve.get('autoUpgradeAdminMajor') is not False or type(preserve.get('currentAdminMajorReportedByUser')) is not int or preserve.get('currentAdminMajorReportedByUser') != 7:
        fail('PRESERVATION_REQUIREMENT_CHANGED')
    if isinstance(preserve,dict) and (preserve.get('baselineCaptured') is not False or preserve.get('regressionVerified') is not False):
        fail('UNSUPPORTED_BASELINE_CLAIM')
    defaults = plan.get('securityDefaults')
    false_keys = ['defaultCredentials','debugPorts','sshEnabled','publicDatabaseListener','publicAdminBeforeEnrollment','arbitraryAdapterInstallation','safetyFunctionsDependOnCommercialLicense','securityMaintenanceDependsOnCommercialLicense']
    true_keys = ['internalNetworkMutualAuthentication','licenseRequiredForInitialCommercialActivation','protectedEnrollmentRequired']
    if not isinstance(defaults,dict) or set(defaults) != set(false_keys+true_keys+['internalNetworkMinimumTLS']) or any(defaults.get(k) is not False for k in false_keys) or any(defaults.get(k) is not True for k in true_keys) or defaults.get('internalNetworkMinimumTLS') != 'TLSv1.3':
        fail('INSECURE_DESIGN_DEFAULT')
    modules=records(plan,'modules'); mids=ids(modules)
    principals = set()
    for m in modules:
        if set(m) != MODULE_KEYS or m.get('isolationImplemented') is not False or m.get('version') is not None or m.get('sourceStatus') not in {'missing','planned','partial-installer-only','source-observed'}:
            fail('INVALID_MODULE_OR_UNSUPPORTED_IMPLEMENTATION_CLAIM')
        if not all(isinstance(m.get(k),str) and 0<len(m[k])<=500 for k in ['name','zone','targetPrincipal','purpose']):
            fail('INVALID_MODULE_METADATA')
        principal = m.get('targetPrincipal')
        # Validate declared design separation, never claim actual OS isolation.
        if not isinstance(principal,str) or re.fullmatch(r'[a-z][a-z0-9-]{0,63}',principal) is None or principal in {'root','iobroker'}:
            fail('INVALID_TARGET_PRINCIPAL')
        elif principal in principals:
            fail('SHARED_TARGET_PRINCIPAL')
        else:
            principals.add(principal)
    flows=records(plan,'connections');ids(flows)
    for f in flows:
        if set(f)!=FLOW_KEYS or f.get('source') not in mids or f.get('target') not in mids or f.get('source')==f.get('target'):
            fail('INVALID_FLOW_ENDPOINT')
        if f.get('transport') not in TRANS or f.get('implemented') is not False:
            fail('INSECURE_FLOW_OR_UNSUPPORTED_IMPLEMENTATION_CLAIM')
    gates=records(plan,'releaseGates');ids(gates)
    if any(g.get('status')!='open' for g in gates):fail('UNSUPPORTED_GATE_CLOSURE')
    reqs=records(requirements,'requirements');rids=ids(reqs)
    if requirements.get('status')!='designed':fail('INVALID_REQUIREMENTS_PHASE')
    if requirements.get('implementationClaim') is not False:fail('UNSUPPORTED_REQUIREMENTS_IMPLEMENTATION_CLAIM')
    if references(requirements.get('moduleIds'),mids,'REQUIREMENT_MODULE_SET')!=mids:fail('REQUIREMENT_MODULE_SET')
    covered=set(); testids=set(); test_links={}
    for req in reqs:
        covered |= references(req.get('moduleIds'),mids,'UNKNOWN_REQUIREMENT_MODULE')
        if req.get('status')!='designed' or req.get('testStatus')!='planned':fail('UNSUPPORTED_RUNTIME_TEST_CLAIM')
        acc=req.get('acceptance')
        if not isinstance(acc,dict) or not all(isinstance(acc.get(k),str) and acc[k].strip() for k in ['positive','negative']):fail('MISSING_POSITIVE_NEGATIVE_ACCEPTANCE')
        ts=req.get('testIds')
        if not isinstance(ts,list) or len(ts)!=2 or not all(isinstance(t,str) for t in ts) or not any(t.endswith('-P') for t in ts) or not any(t.endswith('-N') for t in ts):fail('MISSING_POSITIVE_NEGATIVE_TEST_IDS')
        else:
            if testids.intersection(ts):fail('DUPLICATE_TEST_IDENTIFIER')
            testids.update(ts)
            for tid in ts:
                kind = 'positive' if tid.endswith('-P') else 'negative'
                test_links[tid] = (req.get('id'), kind, acc.get(kind) if isinstance(acc,dict) else None)
    if covered!=mids:fail('UNMODELLED_REQUIREMENT_MODULE')
    threats=records(model,'threats');ids(threats)
    if model.get('status')!='designed':fail('INVALID_THREAT_MODEL_PHASE')
    evaluation = model.get('evaluation')
    evidence_keys = {'runtimeTestsExecuted','productSecurityValidated','CRAConformityClaimed','IECConformityClaimed'}
    if not isinstance(evaluation,dict) or set(evaluation)!=evidence_keys or any(evaluation.get(k) is not False for k in evidence_keys):
        fail('UNSUPPORTED_MODEL_EVIDENCE_CLAIM')
    if references(model.get('moduleIds'),mids,'THREAT_MODULE_SET')!=mids:fail('THREAT_MODULE_SET')
    assets=ids(records(model,'assets'));boundaries=ids(records(model,'trustBoundaries'))
    seen_m=set();seen_s=set();seen_r=set()
    for threat in threats:
        seen_m |= references(threat.get('moduleIds'),mids,'UNKNOWN_THREAT_MODULE')
        seen_s |= references(threat.get('stride'),STRIDE,'INVALID_STRIDE_CATEGORY')
        threat_rids = references(threat.get('requirementIds'),rids,'UNKNOWN_THREAT_REQUIREMENT')
        seen_r |= threat_rids
        references(threat.get('assetIds'),assets,'UNKNOWN_ASSET')
        references(threat.get('trustBoundaryIds'),boundaries,'UNKNOWN_TRUST_BOUNDARY')
        if threat.get('status')!='planned':fail('UNSUPPORTED_THREAT_CLOSURE')
        planned=records(threat,'plannedTests')
        ids(planned)
        for t in planned:
            if t.get('id') not in testids or t.get('status')!='planned' or t.get('type') not in {'positive','negative'}:
                fail('INVALID_PLANNED_RUNTIME_TEST')
                continue
            req_id, expected_kind, expected_scenario = test_links[t['id']]
            if req_id not in threat_rids or t.get('type') != expected_kind or t.get('scenario') != expected_scenario:
                fail('PLANNED_TEST_REQUIREMENT_MISMATCH')
    if seen_m!=mids:fail('UNMODELLED_THREAT_MODULE')
    if seen_s!=STRIDE:fail('STRIDE_CATEGORY_MISSING')
    if seen_r!=rids:fail('REQUIREMENT_WITHOUT_THREAT_LINK')
    return {'status':'DESIGN_REJECTED' if errors else 'DESIGN_REFERENCES_CONSISTENT','errors':errors,'moduleCount':len(mids),'requirementCount':len(rids),'threatCount':len(threats),'plannedRuntimeTestCount':len(testids),'runtimeSecurityVerified':False,'functionalBaselineVerified':False,'craConformityDeclared':False}


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2])
    args=parser.parse_args(argv)
    try:
        data=[read_json(args.root/f) for f in ['system/product-plan.json','system/security/requirements.json','system/security/threat-model.json']]
        result=check(*data)
    except (OSError,ValueError,RecursionError,TypeError):
        result={'status':'DESIGN_INPUT_ERROR','errors':['INVALID_OR_UNREADABLE_INPUT'],'runtimeSecurityVerified':False}
    print(json.dumps(result,indent=2))
    return 0 if result['status']=='DESIGN_REFERENCES_CONSISTENT' else 1

if __name__=='__main__':sys.exit(main())
