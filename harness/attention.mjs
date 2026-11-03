import assert from 'node:assert/strict';

// This validates a declared comparison, not its causal interpretation or isolation.
export function validateAttention(record, read) {
  const json = path => JSON.parse(read(path));
  // Presentation text is compared across LF/CRLF hosts; frozen byte hashes stay exact.
  const text = path => read(path).replace(/\r\n/g, '\n');
  const protocol = json(record.protocol);
  const units = json(record.obligations).units;
  const presentations = json(record.presentations);
  const common = text(record.common);
  const ids = units.map(unit => unit.id);
  assert.equal(new Set(ids).size, ids.length, 'Distinct canonical obligation IDs');
  assert.ok(ids.length > 0);
  const byId = Object.fromEntries(units.map(unit => [unit.id, unit.text]));
  const conditions = Object.keys(presentations);
  assert.ok(conditions.length >= 2);
  assert.deepEqual(protocol.conditions, presentations);
  for (const condition of conditions) {
    const presentation = presentations[condition];
    const order = presentation.sections.flatMap(section => section.ids);
    assert.deepEqual(order, presentation.order);
    assert.deepEqual([...order].sort(), [...ids].sort(), 'Same obligations, exactly once');
    const expected = common + '\n' + presentation.sections.map(section =>
      '\n## ' + section.title + '\n\n' + section.ids.map(id => id + ': ' + byId[id] + '\n\n').join('')).join('');
    assert.equal(text(record.templates[condition]), expected, 'Identical facts; headings/order only');
  }
  const schedule = protocol.schedule;
  assert.equal(new Set(schedule.map(run => run.run)).size, schedule.length);
  for (const condition of conditions) assert.equal(schedule.filter(run => run.condition === condition).length, protocol.controls.replicatesPerCondition);
  assert.equal(schedule.length, conditions.length * protocol.controls.replicatesPerCondition);
  assert.equal(protocol.controls.initialTurns, 1);
  assert.equal(protocol.controls.fork_turns, 'none');
  assert.ok(protocol.controls.model && protocol.controls.reasoning_effort);
  assert.equal(record.runs.length, schedule.length);
  assert.equal(new Set(record.runs.map(run => run.run)).size, schedule.length);
  for (const run of record.runs) {
    const declaration = schedule.find(item => item.run === run.run);
    assert.ok(declaration);
    assert.equal(run.phase, 'initial', 'Review/repair is outside the comparison');
    assert.equal(text(run.packet), text(record.templates[declaration.condition]).replaceAll('YOUR_RUN', run.sourceRoot));
  }
  const summary = json(record.summary);
  assert.equal(summary.runs.length, schedule.length);
  assert.equal(new Set(summary.runs.map(run => run.run)).size, schedule.length);
  const evaluatorHashes = new Set();
  for (const run of record.runs) {
    const receipt = json(run.receipt);
    const result = summary.runs.find(item => item.run === run.run);
    assert.ok(result);
    assert.equal(result.condition, schedule.find(item => item.run === run.run).condition);
    assert.equal(result.passed, receipt.passed);
    assert.equal(result.total, receipt.total);
    assert.equal(result.status, receipt.status);
    evaluatorHashes.add(receipt.hashes.evaluator);
  }
  assert.equal(evaluatorHashes.size, 1, 'Same evaluator for all initial outcomes');
  return { runs: schedule.length, obligations: ids.length, conditions: conditions.length, scope: 'Content parity and receipt fidelity; no proof of isolation, equal compute, semantic lesson use or general efficacy.' };
}
