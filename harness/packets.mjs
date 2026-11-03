import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {win32,posix} from 'node:path';
const digest=value=>createHash('sha256').update(value).digest('hex');
function local(path){
  assert.ok(typeof path==='string'&&path.trim()&&!win32.isAbsolute(path)&&!posix.isAbsolute(path)&&!path.split(/[\\/]/).includes('..'),'Repository-relative context path required');
  return path;
}
// Subject-neutral successor to the duration-only packet. It declares capabilities;
// native dispatch and OS enforcement remain responsibilities of the host.
export function buildPacket(spec,read){
  for(const key of ['subject','role','objective','model','authority'])assert.ok(spec[key]?.trim(),key+' required');
  assert.ok(spec.lenses?.length&&spec.writeScope?.length,'Scoped lenses and write authority required');
  assert.ok(spec.execution?.executable?.trim()&&spec.execution?.sourceRoot?.trim()&&spec.execution?.importCheck?.trim()&&spec.execution?.evidence?.length,'Pinned runtime, source root, import check and executed evidence required');
  const paths=[...new Set([spec.contract,spec.state,...spec.contextFiles,...spec.execution.evidence])];
  const snapshots=paths.map(path=>({path:local(path),sha256:digest(read(path))}));
  const contract=JSON.parse(read(spec.contract));assert.ok(contract.purpose?.trim()&&contract.decisions?.length,'Grounded contract required');
  const result={version:1,...structuredClone(spec),purpose:contract.purpose,snapshots,scopeBoundary:'Declared context and write scope, not sandbox isolation. Read original source when needed; report missing information. Runtime/import verification is mandatory before attributing execution failure to the product.'};
  return {...result,fingerprint:digest(JSON.stringify(result))};
}
export function assertPacketFresh(packet,read){
  const {fingerprint,...body}=packet;assert.equal(digest(JSON.stringify(body)),fingerprint,'Packet was changed');
  for(const {path,sha256} of packet.snapshots)assert.equal(digest(read(local(path))),sha256,'Stale context: '+path);
  return true;
}
