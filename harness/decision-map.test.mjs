import test from 'node:test';
import assert from 'node:assert/strict';
import {activate} from './decision-map.mjs';

test('a caller activates its own rule and flags a conditional neighbor outside the changed file', () => {
  const rule = {authority:'local contract', decision:'order', counterexample:'cancellation', probe:'observe handoff', evidence:'trial', related:[]};
  const map = {decisions:[
    {...rule, id:'queue', paths:['sync/mutex.rs'], cues:['queue order'], related:[{id:'owner', when:'a queued request can be dropped'}]},
    {...rule, id:'owner', paths:['sync/permits/'], cues:['permit refund']},
  ]};
  assert.deepEqual(activate(map,['unrelated change']), []);
  assert.deepEqual(activate(map,['scope']), []);
  assert.deepEqual(activate(map,['sync/permits/count.rs']).map(x=>x.id), ['owner']);
  const [hit] = activate(map,['queue-order regression', 'sync/mutex.rs']);
  assert.deepEqual(hit.reasons, ['queue-order regression', 'sync/mutex.rs']);
  assert.equal(hit.related[0].id, 'owner');
  assert.equal(hit.related[0].probe, 'observe handoff');
  map.decisions.pop();
  assert.throws(() => activate(map,['queue order']), /dependency/);
});
