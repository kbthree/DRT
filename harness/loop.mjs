import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
function local(root,path){
  if(typeof path!=='string'||isAbsolute(path))throw new Error('Expected repository-relative path');
  const absolute=resolve(root,path);const rel=relative(root,absolute);
  if(rel==='..'||rel.startsWith('..\\')||rel.startsWith('../')||isAbsolute(rel))throw new Error('Path leaves repository');
  return absolute;
}
export function loadSubject(subject, subjectRoot=root){
  if(!subject.id||!subject.kind||!subject.workload?.description||!subject.adapter?.scope)throw new Error('Incomplete subject');
  const contract=JSON.parse(readFileSync(local(subjectRoot,subject.contract),'utf8'));
  if(!contract.purpose?.trim()||!contract.decisions?.length)throw new Error('Subject lacks purpose and decisions');
  const state=readFileSync(local(subjectRoot,subject.state),'utf8');
  if(!state.includes('Synchrony_Quiddity'))throw new Error('Continuation lacks synchrony');
  if(!subject.evidence.length)throw new Error('Subject needs evidence locations');
  for(const path of subject.evidence)readFileSync(local(subjectRoot,path));
  return {subject,contract,state};
}
export function allocationProposal(observation,{maxContexts=3}={}){
  if(!Number.isInteger(maxContexts)||maxContexts<1)throw new Error('Positive context limit required');
  if(observation.mechanicalOnly)return {contexts:0,lensPasses:false,reason:'Use an executable check for this obligation.',status:'proposal'};
  const questions=observation.independentQuestions||[];
  const distinct=new Set(questions.map(q=>q.id));
  if(distinct.size!==questions.length||questions.some(q=>!q.id||!q.question||!q.boundary))throw new Error('Specialist work needs distinct questions and boundary contracts');
  const transitions=observation.stateTransitions||[];
  if(new Set(transitions.map(t=>t.id)).size!==transitions.length||transitions.some(t=>['id','initial','event','expected','preserved'].some(k=>!t[k]?.trim())))throw new Error('Stateful work needs distinct transitions with initial state, event, expected effect and preserved meaning');
  const failures=observation.failureBoundaries||[];
  if(!Array.isArray(failures)||new Set(failures.map(f=>f.id)).size!==failures.length||failures.some(f=>['id','reachCondition','operation','expected','preserved'].some(k=>typeof f[k]!=='string'||!f[k].trim())))throw new Error('Failure boundaries need distinct ids, a reachable condition, operation, expected failure and preserved state');
  // No line-count or invariant-count trigger. Extra contexts need scoped work.
  const contexts=Math.min(maxContexts,1+questions.length);
  return {contexts,lensPasses:!!observation.attentionFailuresObserved||!!observation.crossBoundaryFailuresObserved,
    contextStrategy:observation.exceedsWorkingSet?'Retrieve bounded source and decision closures; preserve adjacent constraints and allow source recovery.':'Use the current relevant source and decision set.',
    verificationStrategy:transitions.length?'Execute declared transition sequences; check both expected changes and preserved meaning.':observation.largeObligationSet?'Partition checks by affected obligations, then reconcile cross-boundary checks.':'Execute the bounded relevant checks and integration obligations.',
    transitionObligations:transitions.map(t=>({...t})),
    ...(failures.length?{failureObligations:structuredClone(failures),failureVerification:'Make each declared reach condition true, provoke that failure, and compare preserved state; an earlier exception is not evidence for a later boundary.'}:{}),
    integration:observation.crossBoundaryFailuresObserved?'Repair shared boundary understanding before further partitioning.':'Retain an accountable integration owner.',
    reason:questions.length?'Explicit independent questions justify bounded specialist proposals.':'No independent work is specified; keep one context and test focus within it.',
    status:'revisable proposal; no agent is spawned',
    retireWhen:'Questions are integrated or observed benefit no longer justifies coordination.',
    countIsNotOptimalityClaim:true};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const manifest=process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('subject.json',import.meta.url));
  const subject=JSON.parse(readFileSync(manifest,'utf8'));
  const loaded=loadSubject(subject,dirname(manifest));
  console.log(JSON.stringify({id:subject.id,purpose:loaded.contract.purpose,decisions:loaded.contract.decisions.length,proposal:allocationProposal(subject.workload)},null,2));
}
