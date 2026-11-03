import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPacket,assertPacketFresh} from './packets.mjs';
function fixture(){
  const files={contract:JSON.stringify({purpose:'Keep report columns coherent',decisions:[{id:'rename'}]}),state:'Scoped state',source:'Pinned implementation',runtimeReceipt:'Verified interpreter and import'};
  const spec={subject:'table',role:'worker',objective:'Repair positional rename',model:'gpt-6.1-sol',authority:'Bounded implementation',lenses:['identity'],writeScope:['product/core.py'],contract:'contract',state:'state',contextFiles:['source'],execution:{executable:'local/venv/python',sourceRoot:'product/src',importCheck:'assert imported path is under source root',evidence:['runtimeReceipt']}};
  return {files,spec,read:p=>files[p]};
}
test('executable evidence and import verification cannot be omitted from a coding packet',()=>{
  const f=fixture();assertPacketFresh(buildPacket(f.spec,f.read),f.read);
  delete f.spec.execution.importCheck;assert.throws(()=>buildPacket(f.spec,f.read),/Pinned runtime/);
});
test('stale source, altered authority and paths outside the repository are rejected',()=>{
  const f=fixture(),p=buildPacket(f.spec,f.read);f.files.source='changed';assert.throws(()=>assertPacketFresh(p,f.read),/Stale context/);
  const g=fixture(),q=buildPacket(g.spec,g.read);q.authority='expanded';assert.throws(()=>assertPacketFresh(q,g.read),/Packet was changed/);
  g.spec.contextFiles=['../external'];assert.throws(()=>buildPacket(g.spec,g.read),/Repository-relative/);
});
