import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAttention} from './attention.mjs';
function fixture() {
  const units=[{id:'a',text:'Observe stored state.'},{id:'b',text:'Preserve output.'}];
  const presentations={flat:{sections:[{title:'All',ids:['a','b']}],order:['a','b']},staged:{sections:[{title:'First',ids:['b']},{title:'Then',ids:['a']}],order:['b','a']}};
  const protocol={conditions:presentations,schedule:[{run:'1',condition:'flat'},{run:'2',condition:'staged'}],controls:{replicatesPerCondition:1,initialTurns:1,fork_turns:'none',model:'fixed',reasoning_effort:'high'}};
  const files={common:'Common YOUR_RUN',units:JSON.stringify({units}),presentations:JSON.stringify(presentations),protocol:JSON.stringify(protocol)};
  const record={protocol:'protocol',obligations:'units',presentations:'presentations',common:'common',templates:{flat:'flat',staged:'staged'},runs:[],summary:'summary'};
  for(const [n,condition] of ['flat','staged'].entries()) {
    const id=String(n+1),p=presentations[condition];
    files[condition]=files.common+'\n'+p.sections.map(s=>'\n## '+s.title+'\n\n'+s.ids.map(i=>i+': '+units.find(u=>u.id===i).text+'\n\n').join('')).join('');
    files['packet'+id]=files[condition].replaceAll('YOUR_RUN','source'+id);
    files['receipt'+id]=JSON.stringify({passed:1,total:2,status:'failed',hashes:{evaluator:'fixed'}});
    record.runs.push({run:id,phase:'initial',packet:'packet'+id,sourceRoot:'source'+id,receipt:'receipt'+id});
  }
  files.summary=JSON.stringify({runs:protocol.schedule.map(r=>({...r,passed:1,total:2,status:'failed'}))});
  return {files,record,read:p=>files[p]};
}
test('same units reordered and faithfully recorded failures are valid',()=>{const f=fixture();assert.equal(validateAttention(f.record,f.read).runs,2);});
test('Windows line endings do not imply changed facts',()=>{const f=fixture();for(const key of ['flat','staged','packet1','packet2'])f.files[key]=f.files[key].replaceAll('\n','\r\n');assert.equal(validateAttention(f.record,f.read).runs,2);});
test('extra or altered facts in one packet are rejected',()=>{const f=fixture();f.files.staged+='Extra knowledge';assert.throws(()=>validateAttention(f.record,f.read),/Identical facts/);});
test('repair results cannot replace an initial outcome',()=>{const f=fixture();f.record.runs[0].phase='final';assert.throws(()=>validateAttention(f.record,f.read),/outside/);});
test('summary cannot silently promote a failed run',()=>{const f=fixture();const s=JSON.parse(f.files.summary);s.runs[0].passed=2;f.files.summary=JSON.stringify(s);assert.throws(()=>validateAttention(f.record,f.read));});
