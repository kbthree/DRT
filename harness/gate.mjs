export function requiredChecks(contract) {
  return [...new Set(contract.obligations.map(obligation => obligation.check))];
}

// This enforces the local experiment command. It is not a hosted merge policy.
export function gate(contract, receipts, fingerprint) {
  const errors = [];
  const required = requiredChecks(contract);
  for (const id of required) {
    const found = receipts.filter(receipt => receipt.id === id);
    if (found.length !== 1) errors.push({ check: id, reason: found.length ? 'duplicate receipt' : 'check did not execute' });
    else if (found[0].executed !== true) errors.push({ check: id, reason: 'check did not execute' });
    else if (found[0].status !== 'passed') errors.push({ check: id, reason: 'check failed' });
    else if (!(found[0].assertions > 0)) errors.push({ check: id, reason: 'no assertions executed' });
    else if (found[0].fingerprint !== fingerprint) errors.push({ check: id, reason: 'stale evidence' });
  }
  for (const receipt of receipts) if (!required.includes(receipt.id)) errors.push({ check: receipt.id, reason: 'undeclared receipt' });
  return {
    accepted: errors.length === 0,
    backpressure: errors.map(error => ({
      ...error,
      obligations: contract.obligations.filter(o => o.check === error.check).map(o => o.id),
      returnTo: [...new Set(contract.obligations.filter(o => o.check === error.check).map(o => o.decision))]
    }))
  };
}

export function plan(contract) {
  if (!contract.purpose?.trim() || !contract.decisions.length || !contract.obligations.length || !contract.tasks.length) throw new Error('Empty contract cannot justify acceptance');
  const ids = new Set(contract.decisions.map(d => d.id));
  const obligations = new Set(contract.obligations.map(o => o.id));
  if (ids.size !== contract.decisions.length || obligations.size !== contract.obligations.length) throw new Error('Duplicate decision or obligation');
  for (const decision of contract.decisions) for (const parent of decision.from || []) if (!ids.has(parent)) throw new Error('Unknown parent decision ' + parent);
  for (const obligation of contract.obligations) if (!ids.has(obligation.decision)) throw new Error('Unjustified obligation ' + obligation.id);
  const remaining = [...contract.tasks];
  const taskIds = new Set(remaining.map(t => t.id));
  if (taskIds.size !== remaining.length) throw new Error('Duplicate task');
  for (const task of remaining) {
    if (!ids.has(task.decision) || !task.role || !task.authority) throw new Error('Incomplete assignment ' + task.id);
    for (const dependency of task.dependsOn) if (!taskIds.has(dependency)) throw new Error('Unknown task dependency ' + dependency);
    for (const output of task.produces) if (!obligations.has(output)) throw new Error('Unknown output ' + output);
  }
  for (const obligation of obligations) if (!remaining.some(t => t.produces.includes(obligation))) throw new Error('Unowned obligation ' + obligation);
  const ordered = [];
  while (remaining.length) {
    const index = remaining.findIndex(task => task.dependsOn.every(id => ordered.some(done => done.id === id)));
    if (index < 0) throw new Error('Dependency cycle blocks work');
    ordered.push(remaining.splice(index, 1)[0]);
  }
  return ordered;
}
