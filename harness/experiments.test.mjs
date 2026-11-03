import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {experimentInputs,validateExperiment} from './experiments.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
  const files={task:'same task',evaluator:'new evaluator',previous:'old evaluator',source:'candidate',built:'compiled candidate'};
  files.freeze=JSON.stringify({control:{total:1},hashes:{task:hash(files.task),evaluator:hash(files.previous)}});
  files.amendments=JSON.stringify({amendments:[{id:'repair',at:'now',authority:'test repair',reason:'false rejection',scope:'instrumentation only',path:'evaluator',from:hash(files.previous),to:hash(files.evaluator),previousArtifact:'previous'}]});
  files.receipt=JSON.stringify({total:1,passed:0,status:'failed',cases:[{name:'real failure',status:'failed',obligations:['correctness']}],hashes:{evaluator:hash(files.evaluator),task:hash(files.task),candidateSource:hash(files.source),candidateJS:hash(files.built)}});
  return {files,read:p=>files[p],adapter:{freeze:'freeze',amendments:'amendments',receiptInputs:{evaluator:'evaluator',task:'task'},submissions:[{receipt:'receipt',source:'source',built:'built'}]}};
}
test('failed candidates remain valid evidence under a traceable evaluator repair',()=>{const f=fixture();assert.equal(validateExperiment(f.adapter,f.read).amendments,1);});

test('declared completed experiment requires passing final while retaining failed initial evidence',()=>{
  const f=fixture();f.adapter.requireFinalPass=true;
  assert.throws(()=>validateExperiment(f.adapter,f.read),/end with final/);
  f.adapter.submissions[0].phase='final';assert.throws(()=>validateExperiment(f.adapter,f.read),/Final acceptance must pass/);
  f.adapter.submissions[0].phase='initial';const r=JSON.parse(f.files.receipt);r.passed=1;r.status='passed';r.cases[0].status='passed';f.files.final=JSON.stringify(r);
  f.adapter.submissions.push({phase:'final',receipt:'final',source:'source',built:'built'});
  assert.equal(validateExperiment(f.adapter,f.read).submissions,2);
});
test('unrecorded evaluator changes or lost predecessors are rejected',()=>{const f=fixture();f.files.evaluator+=' hidden edit';assert.throws(()=>validateExperiment(f.adapter,f.read));const g=fixture();g.files.previous='rewritten history';assert.throws(()=>validateExperiment(g.adapter,g.read),/previous artifact/);});
test('fabricated success and duplicate case substitution are rejected',()=>{const f=fixture(),r=JSON.parse(f.files.receipt);r.passed=1;r.status='passed';f.files.receipt=JSON.stringify(r);assert.throws(()=>validateExperiment(f.adapter,f.read));const g=fixture(),fr=JSON.parse(g.files.freeze),gr=JSON.parse(g.files.receipt);fr.control.total=2;gr.total=2;gr.cases.push(gr.cases[0]);g.files.freeze=JSON.stringify(fr);g.files.receipt=JSON.stringify(gr);assert.throws(()=>validateExperiment(g.adapter,g.read),/Unique executed/);});
test('Python artifacts need no invented JavaScript build and every declared file is bound',()=>{
  const f=fixture();f.files.packageInit='package initializer';
  f.adapter.submissions=[{receipt:'receipt',artifacts:{candidateSource:'source',moduleInit:'packageInit'}}];
  const r=JSON.parse(f.files.receipt);delete r.hashes.candidateJS;r.hashes.moduleInit=hash(f.files.packageInit);f.files.receipt=JSON.stringify(r);
  assert.equal(validateExperiment(f.adapter,f.read).submissions,1);
  assert.ok(experimentInputs(f.adapter,f.read).includes('packageInit'));
  assert.ok(!experimentInputs(f.adapter,f.read).includes('built'));
  f.files.packageInit+=' hidden change';assert.throws(()=>validateExperiment(f.adapter,f.read),/moduleInit/);
});
test('empty or missing artifact declarations cannot silently bypass artifact verification',()=>{
  const f=fixture();f.adapter.submissions=[{receipt:'receipt',artifacts:{}}];assert.throws(()=>validateExperiment(f.adapter,f.read),/needs artifacts/);
  f.adapter.submissions=[{receipt:'receipt',source:'source'}];assert.throws(()=>experimentInputs(f.adapter,f.read),/paths required/);
});
test('pre-repair receipts bind explicitly to retained revisions without accepting unknown hashes',()=>{
  const f=fixture(),r=JSON.parse(f.files.receipt);r.hashes.evaluator=hash(f.files.previous);f.files.receipt=JSON.stringify(r);
  assert.throws(()=>validateExperiment(f.adapter,f.read));
  f.adapter.submissions[0].inputRevisions={evaluator:hash(f.files.previous)};assert.equal(validateExperiment(f.adapter,f.read).submissions,1);
  f.adapter.submissions[0].inputRevisions.evaluator='unretained evaluator';assert.throws(()=>validateExperiment(f.adapter,f.read),/retained amendment chain/);
});

function closureFixture(){
  const f=fixture(),r=JSON.parse(f.files.receipt);r.passed=1;r.status='passed';r.cases[0].status='passed';f.files.receipt=JSON.stringify(r);
  f.adapter.submissions[0].phase='final';
  f.files.closure=JSON.stringify(r);
  f.adapter.acceptance={freeze:f.adapter.freeze,amendments:f.adapter.amendments,receiptInputs:f.adapter.receiptInputs,requiredCases:['real failure'],submissions:[{phase:'final',receipt:'closure',source:'source',built:'built'}]};
  return f;
}
test('post-review acceptance is source-bound and included in audit inputs',()=>{const f=closureFixture();assert.equal(validateExperiment(f.adapter,f.read).acceptance.submissions,1);assert.ok(experimentInputs(f.adapter,f.read).includes('closure'));});
test('green initial metrics cannot substitute for failing post-review acceptance',()=>{const f=closureFixture(),r=JSON.parse(f.files.closure);r.status='failed';r.passed=0;r.cases[0].status='failed';f.files.closure=JSON.stringify(r);assert.throws(()=>validateExperiment(f.adapter,f.read),/Post-review acceptance/);});
test('post-review acceptance cannot silently certify different code or omit a required case',()=>{const f=closureFixture(),r=JSON.parse(f.files.closure);f.files.other='different product';r.hashes.candidateSource=hash(f.files.other);f.files.closure=JSON.stringify(r);f.adapter.acceptance.submissions[0].source='other';assert.throws(()=>validateExperiment(f.adapter,f.read),/same final source/);const g=closureFixture();g.adapter.acceptance.requiredCases=['omitted requirement'];assert.throws(()=>validateExperiment(g.adapter,g.read),/Required acceptance cases/);});
