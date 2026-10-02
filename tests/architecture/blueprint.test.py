#!/usr/bin/env python3
"""Validate design traceability and reject misleading claims, not runtime security."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('blueprint',ROOT/'tools/architecture/check-blueprint.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class BlueprintTests(unittest.TestCase):
    def setUp(self):
        self.docs=[mod.read_json(ROOT/p) for p in ['system/product-plan.json','system/security/requirements.json','system/security/threat-model.json']]
    def reject(self,code):
        out=mod.check(*self.docs)
        self.assertEqual(out['status'],'DESIGN_REJECTED')
        self.assertIn(code,out['errors'])
    def test_current_design_links_are_consistent_without_security_claim(self):
        out=mod.check(*self.docs)
        self.assertEqual(out['status'],'DESIGN_REFERENCES_CONSISTENT')
        self.assertEqual(out['moduleCount'],12)
        self.assertEqual(out['plannedRuntimeTestCount'],40)
        for k in ['runtimeSecurityVerified','functionalBaselineVerified','craConformityDeclared']:self.assertIs(out[k],False)
    def test_source_observation_does_not_approve_runtime_isolation(self):
        module=next(m for m in self.docs[0]['modules'] if m['id']=='eos-core')
        module['sourceStatus']='source-observed'
        self.assertEqual(mod.check(*self.docs)['status'],'DESIGN_REFERENCES_CONSISTENT')
        module['isolationImplemented']=True
        self.reject('INVALID_MODULE_OR_UNSUPPORTED_IMPLEMENTATION_CLAIM')
    def test_unknown_interface_endpoint_is_rejected(self):
        self.docs[0]['connections'][0]['target']='unknown-adapter'
        self.reject('INVALID_FLOW_ENDPOINT')
    def test_duplicate_module_id_is_rejected(self):
        self.docs[0]['modules'].append(copy.deepcopy(self.docs[0]['modules'][0]))
        self.reject('DUPLICATE_IDENTIFIER')
    def test_missing_modelled_module_is_rejected(self):
        self.docs[2]['moduleIds'].pop()
        self.reject('THREAT_MODULE_SET')
    def test_requirement_without_threat_is_rejected(self):
        for t in self.docs[2]['threats']:
            t['requirementIds']=[x for x in t['requirementIds'] if x!='EOS-REQ-020']
        self.reject('REQUIREMENT_WITHOUT_THREAT_LINK')
    def test_unimplemented_test_cannot_be_declared_passed(self):
        self.docs[1]['requirements'][0]['testStatus']='passed'
        self.reject('UNSUPPORTED_RUNTIME_TEST_CLAIM')
    def test_requirement_implementation_cannot_be_claimed(self):
        self.docs[1]['implementationClaim']=True
        self.reject('UNSUPPORTED_REQUIREMENTS_IMPLEMENTATION_CLAIM')
    def test_model_cannot_claim_runtime_validation_or_conformity(self):
        for key in self.docs[2]['evaluation']:
            with self.subTest(key=key):
                self.docs[2]['evaluation'][key]=True
                self.reject('UNSUPPORTED_MODEL_EVIDENCE_CLAIM')
                self.docs[2]['evaluation'][key]=False
    def test_model_evaluation_cannot_omit_an_open_claim(self):
        self.docs[2]['evaluation'].pop('runtimeTestsExecuted')
        self.reject('UNSUPPORTED_MODEL_EVIDENCE_CLAIM')
    def test_model_must_remain_a_design(self):
        self.docs[2]['status']='validated'
        self.reject('INVALID_THREAT_MODEL_PHASE')
    def test_release_cannot_be_declared_approved_in_design_plan(self):
        self.docs[0]['releaseApproved']=True
        self.reject('UNSUPPORTED_RELEASE_CLAIM')
    def test_unsafe_defaults_and_weakened_transport_rejected(self):
        self.docs[0]['securityDefaults']['debugPorts']=True
        self.docs[0]['connections'][0]['transport']='plain-http'
        self.reject('INSECURE_DESIGN_DEFAULT')
        self.reject('INSECURE_FLOW_OR_UNSUPPORTED_IMPLEMENTATION_CLAIM')
    def test_removing_negative_acceptance_is_rejected(self):
        self.docs[1]['requirements'][0]['acceptance'].pop('negative')
        self.reject('MISSING_POSITIVE_NEGATIVE_ACCEPTANCE')
    def test_ui_and_admin_major_preservation_required(self):
        self.docs[0]['preservation']['autoUpgradeAdminMajor']=True
        self.reject('PRESERVATION_REQUIREMENT_CHANGED')
    def test_current_admin_seven_baseline_cannot_change_silently(self):
        for value in [8, '7', True]:
            with self.subTest(value=value):
                self.docs[0]['preservation']['currentAdminMajorReportedByUser']=value
                self.reject('PRESERVATION_REQUIREMENT_CHANGED')
    def test_target_principals_cannot_use_root_or_shared_legacy_identity(self):
        for value in ['root','iobroker','0','Invalid Principal']:
            with self.subTest(value=value):
                self.docs[0]['modules'][1]['targetPrincipal']=value
                self.reject('INVALID_TARGET_PRINCIPAL')
    def test_target_principals_must_be_distinct_in_design(self):
        self.docs[0]['modules'][1]['targetPrincipal']=self.docs[0]['modules'][2]['targetPrincipal']
        self.reject('SHARED_TARGET_PRINCIPAL')
    def test_planned_test_must_belong_to_threat_requirement(self):
        self.docs[2]['threats'][0]['plannedTests'][0]['id']='EOS-TEST-009-P'
        self.reject('PLANNED_TEST_REQUIREMENT_MISMATCH')
    def test_planned_test_kind_must_match_its_identifier(self):
        self.docs[2]['threats'][0]['plannedTests'][0]['type']='negative'
        self.reject('PLANNED_TEST_REQUIREMENT_MISMATCH')
    def test_planned_test_scenario_must_match_requirement(self):
        self.docs[2]['threats'][0]['plannedTests'][0]['scenario']='unrelated scenario'
        self.reject('PLANNED_TEST_REQUIREMENT_MISMATCH')
    def test_duplicate_test_within_threat_rejected(self):
        self.docs[2]['threats'][0]['plannedTests'].append(copy.deepcopy(self.docs[2]['threats'][0]['plannedTests'][0]))
        self.reject('DUPLICATE_IDENTIFIER')
    def test_unknown_root_field_rejected(self):
        self.docs[0]['unreviewedAllowRoot']=True
        self.reject('INVALID_PLAN_SHAPE')
    def test_strict_bounded_json_duplicate_and_nonfinite(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'data.json'
            for text in ['{"key":1,"key":2}','{"n":NaN}','{"n":Infinity}','{"n":1e999}','{"n":-1e999}',' '* (mod.MAX_BYTES+1)]:
                p.write_text(text)
                with self.assertRaises(ValueError):mod.read_json(p)
    def test_finite_json_numbers_remain_valid(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'data.json';p.write_text('{"fraction":1.25,"exponent":1e200}')
            self.assertEqual(mod.read_json(p),{'fraction':1.25,'exponent':1e200})
    def test_invalid_utf8_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'data.json'
            for raw in [b'\xff',b'{"value":"\xed\xa0\x80"}']:
                p.write_bytes(raw)
                with self.assertRaises(ValueError):mod.read_json(p)
    def test_json_nesting_limit_and_parser_recursion_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'data.json'
            p.write_text('['*mod.MAX_DEPTH+'0'+']'*mod.MAX_DEPTH)
            self.assertIsInstance(mod.read_json(p),list)
            for depth in [mod.MAX_DEPTH+1,2000]:
                p.write_text('['*depth+'0'+']'*depth)
                with self.assertRaisesRegex(ValueError,'JSON_DEPTH_LIMIT'):mod.read_json(p)
    def test_final_component_symlink_is_not_followed(self):
        with tempfile.TemporaryDirectory() as td:
            target=Path(td)/'target.json';target.write_text('{"value":1}')
            link=Path(td)/'link.json';link.symlink_to(target)
            with self.assertRaises(OSError):mod.read_json(link)
            self.assertEqual(target.read_text(),'{"value":1}')
    def test_non_regular_directory_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaisesRegex(ValueError,'INPUT_NOT_REGULAR_FILE'):mod.read_json(Path(td))
    def test_fifo_is_rejected_without_waiting_for_a_writer(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);fifo=root/'system/product-plan.json';fifo.parent.mkdir()
            os.mkfifo(fifo)
            r=subprocess.run(['python3',str(ROOT/'tools/architecture/check-blueprint.py'),'--root',str(root)],capture_output=True,text=True,timeout=3)
            self.assertNotEqual(r.returncode,0)
            self.assertEqual(json.loads(r.stdout)['status'],'DESIGN_INPUT_ERROR')
            self.assertNotIn(td,r.stdout+r.stderr)
    def test_input_error_is_sanitized_and_read_only(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);p=root/'system/product-plan.json';p.parent.mkdir()
            raw=b'{"secret":"SYNTHETIC_SECRET_DO_NOT_PRINT",invalid}'
            p.write_bytes(raw)
            r=subprocess.run(['python3',str(ROOT/'tools/architecture/check-blueprint.py'),'--root',str(root)],capture_output=True,text=True)
            self.assertNotEqual(r.returncode,0)
            self.assertNotIn('SYNTHETIC_SECRET',r.stdout+r.stderr)
            self.assertNotIn(td,r.stdout+r.stderr)
            self.assertEqual(p.read_bytes(),raw)
            self.assertEqual(json.loads(r.stdout)['status'],'DESIGN_INPUT_ERROR')

if __name__=='__main__':unittest.main(verbosity=2)
