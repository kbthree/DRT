import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadSubject,allocationProposal} from './loop.mjs';
test('a subject resolves its contract, state and evidence relative to its own manifest',()=>{
  const subject=JSON.parse(readFileSync(new URL('subject.json',import.meta.url),'utf8'));
  const directory=fileURLToPath(new URL('.',import.meta.url));
  assert.ok(loadSubject(subject,directory).contract.purpose);
  assert.throws(()=>loadSubject({...subject,state:'../outside'},directory),/leaves repository/);
});
test('size alone does not create an unmeasured headcount threshold',()=>{
  assert.equal(allocationProposal({invariantCount:10000,independentQuestions:[]}).contexts,1);
  assert.equal(allocationProposal({mechanicalOnly:true}).contexts,0);
  const focused=allocationProposal({attentionFailuresObserved:true});assert.equal(focused.contexts,1);assert.equal(focused.lensPasses,true);
  const large=allocationProposal({exceedsWorkingSet:true,largeObligationSet:true});assert.match(large.contextStrategy,/bounded source/);assert.match(large.verificationStrategy,/cross-boundary/);
});
test('bounded distinct questions scale either loop within declared capacity',()=>{
  const independentQuestions=[{id:'numeric',question:'Which selected population defines the denominator?',boundary:'Selection-arithmetic contract'},{id:'display',question:'What must exported values mean?',boundary:'Raw-formatted value contract'}];
  assert.equal(allocationProposal({independentQuestions}).contexts,3);
  assert.equal(allocationProposal({independentQuestions},{maxContexts:2}).contexts,2);
  assert.throws(()=>allocationProposal({independentQuestions:[{id:'vague'}]}),/boundary contracts/);
});
test('integration pressure leads to boundary repair, not automatic fragmentation',()=>{
  const result=allocationProposal({crossBoundaryFailuresObserved:true});assert.equal(result.contexts,1);assert.match(result.integration,/Repair/);
});
test('stateful subjects preserve transition obligations without increasing headcount',()=>{
  const stateTransitions=[{id:'return',initial:'Saved selection excludes B',event:'B disappears and returns',expected:'B stays excluded',preserved:'The exclusion policy'}];
  const p=allocationProposal({stateTransitions});assert.equal(p.contexts,1);assert.match(p.verificationStrategy,/transition sequences/);assert.deepEqual(p.transitionObligations,stateTransitions);
  p.transitionObligations[0].expected='changed';assert.equal(stateTransitions[0].expected,'B stays excluded');
  assert.throws(()=>allocationProposal({stateTransitions:[{id:'vague'}]}),/preserved meaning/);
});

test('later failure coverage requires reachable prerequisites and preserves independent obligations',()=>{
  const failureBoundaries=[{id:'vertical-default',reachCondition:'Fresh name and valid horizontal default; explicit invalid vertical default',operation:'Add automatic index',expected:'Reject invalid vertical default',preserved:'Headers, rows, raw defaults and effective settings'}];
  const result=allocationProposal({failureBoundaries});
  assert.equal(result.contexts,1);assert.deepEqual(result.failureObligations,failureBoundaries);
  assert.match(result.failureVerification,/earlier exception is not evidence/);
  result.failureObligations[0].reachCondition='wrong';assert.match(failureBoundaries[0].reachCondition,/valid horizontal/);
  assert.throws(()=>allocationProposal({failureBoundaries:[{...failureBoundaries[0],reachCondition:''}]}),/reachable condition/);
  assert.throws(()=>allocationProposal({failureBoundaries:[failureBoundaries[0],failureBoundaries[0]]}),/distinct ids/);
});
