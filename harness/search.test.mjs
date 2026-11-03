import test from 'node:test';
import assert from 'node:assert/strict';
import {searchProposal} from './search.mjs';
const question={id:'ownership',question:'Is the callback bound to the old owner?',kind:'concrete',evidence:['rename reproducer'],probe:{action:'Diverge schemas and mutate derived formatting',predictions:['only derived changes','source changes or rejects derived schema']}};
test('routing needs a grounded question and a discriminating probe, not a failure count',()=>{
  const p=searchProposal({questions:[question]});assert.equal(p.model,'gpt-6.1-terra');assert.equal(p.probes.length,1);
  p.probes[0].predictions.push('mutated');assert.equal(question.probe.predictions.length,2);
  assert.throws(()=>searchProposal({questions:[{...question,probe:{action:'repeat',predictions:['same','same']}}]}),/distinct predictions/);
  assert.throws(()=>searchProposal({questions:[{...question,evidence:[]}]}),/grounded questions/);
});
test('constraint conflict proposes Astra max while stagnant probes demand grounding repair',()=>{
  const questions=[{...question,kind:'constraint',question:'Does a divider belong to a row or its boundary?'}];
  assert.equal(searchProposal({questions}).model,'gpt-6-astra');assert.equal(searchProposal({questions}).reasoningEffort,'max');
  const p=searchProposal({questions,stagnant:true});assert.equal(p.action,'repair-grounding');assert.equal(p.model,undefined);
});
test('green checks cannot erase a counterexample or substitute for a stopping judgment',()=>{
  assert.equal(searchProposal({acceptedChecksPass:true,knownCounterexamples:['callback aliases']}).action,'repair');
  assert.equal(searchProposal({}).action,'ground-and-check');
  assert.throws(()=>searchProposal({acceptedChecksPass:true}),/value judgment/);
  assert.equal(searchProposal({acceptedChecksPass:true,nextProbeValue:{worthwhile:false,reason:'All scoped obligations have evidence and no named new discriminating probe remains.'}}).action,'stop-scoped-batch');
});
