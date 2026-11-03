// Evidence-guided allocation proposal, not an autonomous dispatcher or efficacy claim.
// Values and unresolved meaning stay explicit; extra compute is not itself a repair.
export function searchProposal(observation){
  const {acceptedChecksPass=false,knownCounterexamples=[],questions=[],nextProbeValue,stagnant=false}=observation;
  if(!Array.isArray(knownCounterexamples)||!Array.isArray(questions))throw new Error('Explicit evidence arrays required');
  const ids=new Set();
  for(const q of questions){
    if(!q.id||ids.has(q.id)||!q.question?.trim()||!q.evidence?.length||!['concrete','constraint'].includes(q.kind))throw new Error('Distinct grounded questions required');
    ids.add(q.id);
    if(q.probe&&(!q.probe.action?.trim()||new Set(q.probe.predictions).size<2))throw new Error('A probe needs distinct predictions');
  }
  const base={status:'revisable proposal; no agent is spawned',questionIds:questions.map(q=>q.id),evidence:questions.flatMap(q=>q.evidence),efficacy:'unmeasured',preserve:'Retain initial outcomes; record later model, context, turn and evidence changes separately.'};
  if(stagnant)return {...base,action:'repair-grounding',reason:'Repeated observations did not discriminate. Revise the question or probe before spending more compute.'};
  const conflicts=questions.filter(q=>q.kind==='constraint');
  if(conflicts.length)return {...base,action:'synthesis',model:'gpt-6-astra',reasoningEffort:'max',questionIds:conflicts.map(q=>q.id),reason:'A grounded conflict between obligations or abstractions needs reconciliation.'};
  const probes=questions.filter(q=>q.kind==='concrete'&&q.probe);
  if(probes.length)return {...base,action:'bounded-probes',model:'gpt-6.1-terra',probes:probes.map(q=>({id:q.id,action:q.probe.action,predictions:[...q.probe.predictions]})),reason:'Named observations can distinguish competing concrete explanations; reconcile them before integration.'};
  if(knownCounterexamples.length)return {...base,action:'repair',reason:'A known in-scope counterexample prevents stopping, even if the existing checks pass.'};
  if(questions.length||!acceptedChecksPass)return {...base,action:'ground-and-check',reason:'Resolve the remaining question or obtain missing acceptance evidence.'};
  if(!nextProbeValue?.reason?.trim()||typeof nextProbeValue.worthwhile!=='boolean')throw new Error('Stopping needs an explicit value judgment');
  return nextProbeValue.worthwhile
    ?{...base,action:'probe',reason:nextProbeValue.reason}
    :{...base,action:'stop-scoped-batch',reason:nextProbeValue.reason,limitation:'Finite evidence and a revisable value judgment; no proof of optimality.'};
}
