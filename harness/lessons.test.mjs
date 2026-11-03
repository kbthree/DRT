import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLessonPlan,validateLessonAudit} from './lessons.mjs';
const claims=[{id:'HC-TRANSFER'}],read=p=>({'source.txt':'origin','receipt.json':'executed observation'}[p]||'');
const plan={subject:'new-repo',authority:'parent',scope:'Scoped reapplication',lessons:[{id:'representation',claimId:'HC-TRANSFER',sources:['source.txt'],relevantBecause:'New exporter shares a display transformation',localPolicy:'Retain deliberate formatting and change transport only',doNotTransfer:'Do not import previous raw-mode default',action:'Decode output and compare intended strings',expectedEvidence:'receipt.json'}]};
const audit={owner:'parent',scope:'Evidence review, not efficacy proof',results:[{id:'representation',status:'applied',reason:'Executed decoded-value checks match local policy',evidence:['receipt.json']}]};
test('lesson transfer requires applicability and explicit local versus nontransferable policy',()=>{
  assert.equal(validateLessonPlan(plan,claims,read).bindings,1);
  for(const field of ['relevantBecause','localPolicy','doNotTransfer','action']){
    const bad=structuredClone(plan);delete bad.lessons[0][field];assert.throws(()=>validateLessonPlan(bad,claims,read),new RegExp(field));
  }
  assert.throws(()=>validateLessonPlan(plan,[],read),/Unknown scoped claim/);
});
test('remembering a lesson cannot substitute for a complete evidence-backed application audit',()=>{
  assert.equal(validateLessonAudit(plan,audit,claims,read).counts.applied,1);
  assert.throws(()=>validateLessonAudit(plan,{...audit,results:[]},claims,read),/Every planned lesson/);
  for(const status of ['recovered','agreed','passed-memory-check'])assert.throws(()=>validateLessonAudit(plan,{...audit,results:[{...audit.results[0],status}]},claims,read),/not application evidence/);
  assert.throws(()=>validateLessonAudit(plan,{...audit,results:[{...audit.results[0],evidence:['missing']}]},claims,read),/Missing lesson evidence/);
  assert.throws(()=>validateLessonAudit(plan,{...audit,results:[{...audit.results[0],evidence:['source.txt']}]},claims,read),/predeclared evidence/);
  for(const status of ['missed-then-repaired','not-exercised'])assert.equal(validateLessonAudit(plan,{...audit,results:[{...audit.results[0],status}]},claims,read).counts[status],1);
});
