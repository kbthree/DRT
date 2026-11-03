import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const digest=s=>createHash('sha256').update(s).digest('hex');
const json=(read,path)=>JSON.parse(read(path));
// Subjects declare their own artifact vocabulary; preserve historical JS adapters.
function artifacts(submission){
  const result=submission.artifacts??{candidateSource:submission.source,candidateJS:submission.built};
  assert.ok(Object.keys(result).length>0,'Submission needs artifacts');
  assert.ok(Object.entries(result).every(([key,path])=>key&&typeof path==='string'&&path.trim()),'Artifact paths required');
  return result;
}

export function experimentInputs(adapter,read){
  const freeze=json(read,adapter.freeze);
  const amendments=adapter.amendments?json(read,adapter.amendments).amendments:[];
  return [adapter.freeze,...Object.keys(freeze.hashes),...(adapter.amendments?[adapter.amendments]:[]),...amendments.map(a=>a.previousArtifact),...adapter.submissions.flatMap(s=>[s.receipt,...Object.values(artifacts(s))]),...(adapter.acceptance?experimentInputs(adapter.acceptance,read):[])];
}

// A failed candidate can be valid evidence. A changed evaluator must have an
// explicit retained predecessor, reason and authority, never a silently new freeze.
export function validateExperiment(adapter,read){
  const freeze=json(read,adapter.freeze), effective={...freeze.hashes};let assertions=0;
  const revisions=Object.fromEntries(Object.entries(freeze.hashes).map(([path,sha])=>[path,new Set([sha])]));
  const amendments=adapter.amendments?json(read,adapter.amendments).amendments:[];
  const ids=new Set();
  for(const a of amendments){
    assert.ok(a.id&&!ids.has(a.id),'Unique amendment id');ids.add(a.id);
    for(const field of ['at','authority','reason','scope'])assert.ok(a[field]?.trim(),field);
    assert.equal(a.from,effective[a.path],'Amendment must extend the recorded chain');
    assert.equal(digest(read(a.previousArtifact)),a.from,'Retain the previous artifact');
    assert.notEqual(a.to,a.from,'Amendment must identify a change');
    effective[a.path]=a.to;revisions[a.path].add(a.to);assertions+=8;
  }
  for(const [path,sha] of Object.entries(effective)){assert.equal(digest(read(path)),sha,path);assertions++;}
  assert.ok(Number.isInteger(freeze.control.total)&&freeze.control.total>0);
  for(const s of adapter.submissions){
    const r=json(read,s.receipt);
    assert.equal(r.total,freeze.control.total);assert.equal(r.cases.length,r.total);
    assert.equal(new Set(r.cases.map(c=>c.name)).size,r.total,'Unique executed cases');
    if(adapter.requiredCases)assert.deepEqual(r.cases.map(c=>c.name).sort(),[...adapter.requiredCases].sort(),'Required acceptance cases');
    assert.ok(r.cases.every(c=>['passed','failed'].includes(c.status)&&c.obligations?.length),'Executed status and obligation required');
    assert.equal(r.passed,r.cases.filter(c=>c.status==='passed').length);
    assert.equal(r.status,r.passed===r.total?'passed':'failed');
    for(const [key,sha] of Object.entries(s.inputRevisions??{}))assert.ok(revisions[adapter.receiptInputs[key]]?.has(sha),'Receipt revision must be in the retained amendment chain');
    for(const [key,path] of Object.entries(adapter.receiptInputs))assert.equal(r.hashes[key],s.inputRevisions?.[key]??effective[path],key);
    for(const [key,path] of Object.entries(artifacts(s)))assert.equal(r.hashes[key],digest(read(path)),key);
    assertions+=6+Object.keys(artifacts(s)).length+Object.keys(adapter.receiptInputs).length;
  }
  if(adapter.requireFinalPass){
    const finalSubmission=adapter.submissions.at(-1);
    assert.equal(finalSubmission?.phase,'final','Completed experiment must end with final acceptance');
    assert.equal(json(read,finalSubmission.receipt).status,'passed','Final acceptance must pass');
    assertions+=2;
  }
  let acceptance;
  if(adapter.acceptance){
    acceptance=validateExperiment(adapter.acceptance,read);
    const finalSubmission=adapter.submissions.at(-1), closureSubmission=adapter.acceptance.submissions.at(-1);
    assert.equal(finalSubmission.phase,'final','Acceptance must bind the final submission');
    assert.equal(closureSubmission.phase,'final','Acceptance must end with final closure');
    const final=json(read,finalSubmission.receipt),closure=json(read,closureSubmission.receipt);
    assert.equal(final.status,'passed','Final product checks must pass');
    assert.equal(closure.status,'passed','Post-review acceptance must pass');
    assert.ok(closure.hashes.candidateSource,'Acceptance needs a source binding');
    assert.equal(closure.hashes.candidateSource,final.hashes.candidateSource,'Acceptance must cover the same final source');
    assertions+=acceptance.assertions+6;
  }
  return {assertions:assertions+1,submissions:adapter.submissions.length,amendments:amendments.length,...(acceptance?{acceptance}:{} )};
}
