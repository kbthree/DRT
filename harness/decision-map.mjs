// Query a repository's versioned decisions before editing an entry point or consumer.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function activate(map, inputs) {
  const byId = new Map(map.decisions.map(d => [d.id, d]));
  assert.equal(byId.size, map.decisions.length, 'Duplicate decision ID');
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const matched = [];
  for (const d of map.decisions) {
    for (const key of ['id', 'authority', 'decision', 'counterexample', 'probe', 'evidence']) {
      assert.ok(typeof d[key] === 'string' && d[key].trim(), key + ' required');
    }
    assert.ok(d.paths.length && d.cues.length, 'Paths and question cues required');
    for (const edge of d.related) {
      assert.ok(byId.has(edge.id) && edge.when?.trim(), 'Unresolved decision dependency');
    }
    const reasons = inputs.filter(input => d.paths.some(p => p === input || (p.endsWith('/') && input.startsWith(p)))
      || d.cues.some(c => (' ' + normalize(input) + ' ').includes(' ' + normalize(c) + ' ')));
    if (reasons.length) matched.push({...d, reasons});
  }
  return matched.map(d => ({...d, related: d.related.map(edge => ({...edge,
    decision: byId.get(edge.id).decision, probe: byId.get(edge.id).probe}))}));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, ...inputs] = process.argv.slice(2);
  if (!file || !inputs.length) throw new Error('Usage: node harness/decision-map.mjs MAP "change question" [repo-relative paths...]');
  const found = activate(JSON.parse(readFileSync(file, 'utf8')), inputs);
  console.log(JSON.stringify(found, null, 2));
}
