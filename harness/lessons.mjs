import assert from 'node:assert/strict';
import {win32,posix} from 'node:path';
const required=(o,keys)=>keys.forEach(k=>assert.ok(typeof o[k]==='string'&&o[k].trim(),k+' required'));
function evidence(paths,read){
  assert.ok(Array.isArray(paths)&&paths.length,'Evidence locations required');
  for(const p of paths){assert.ok(typeof p==='string'&&!win32.isAbsolute(p)&&!posix.isAbsolute(p)&&!p.split(/[\\/]/).includes('..'),'Local evidence path required');assert.ok(read(p).length,'Missing lesson evidence: '+p);}
}
export function validateLessonPlan(plan,claims,read){
  required(plan,['subject','authority','scope']);assert.ok(plan.lessons?.length,'Applicable lessons required');
  assert.equal(new Set(plan.lessons.map(l=>l.id)).size,plan.lessons.length,'Distinct lesson bindings');
  for(const lesson of plan.lessons){
    required(lesson,['id','claimId','relevantBecause','localPolicy','doNotTransfer','action','expectedEvidence']);
    assert.ok(claims.some(c=>c.id===lesson.claimId),'Unknown scoped claim');evidence(lesson.sources,read);
  }
  return {bindings:plan.lessons.length,meaning:'Applicability and target checks declared; this does not establish that a worker used a lesson.'};
}
export function validateLessonAudit(plan,audit,claims,read){
  validateLessonPlan(plan,claims,read);required(audit,['owner','scope']);
  assert.equal(audit.results?.length,plan.lessons.length,'Every planned lesson needs a disposition');
  assert.equal(new Set(audit.results.map(r=>r.id)).size,audit.results.length,'Duplicate lesson disposition');
  const counts={applied:0,'missed-then-repaired':0,'not-exercised':0};
  for(const result of audit.results){
    assert.ok(plan.lessons.some(l=>l.id===result.id),'Unknown lesson binding');
    assert.ok(Object.hasOwn(counts,result.status),'Memory recovery alone is not application evidence');
    required(result,['reason']);evidence(result.evidence,read);
    if(result.status==='applied')assert.ok(result.evidence.includes(plan.lessons.find(l=>l.id===result.id).expectedEvidence),'Applied lesson needs its predeclared evidence artifact');
    counts[result.status]++;
  }
  return {bindings:plan.lessons.length,counts,meaning:'Checks complete, scoped evidence records. Semantic application remains an accountable reviewer judgment, not inferred from agreement or a passing memory quiz.'};
}
