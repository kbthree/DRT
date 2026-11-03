import {createHash} from 'node:crypto';
import {appendFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

// A kit is reviewed source supplied by the outer loop. This installer copies
// it; it never executes a command from a kit or infers business policy.
function local(root, name) {
  if (typeof name !== 'string' || !name || /[\\:<>|"?*\x00-\x1f]/.test(name) ||
      name.split('/').some(part => !part || part.toLowerCase() === '.git' || /[. ]$/.test(part) ||
          /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part))) {
    throw new Error('Expected a repository-relative path: ' + name);
  }
  let current = root;
  for (const part of name.split('/')) {
    current = join(current, part);
    const stat = lstatSync(current, {throwIfNoEntry:false});
    if (stat?.isSymbolicLink()) throw new Error('Refusing a linked path: ' + name);
    if (stat && current !== join(root, name) && !stat.isDirectory()) {
      throw new Error('Expected a directory on path: ' + name);
    }
  }
  return current;
}

function assets(root, prefix = '') {
  const entries = [];
  for (const entry of readdirSync(join(root, prefix), {withFileTypes:true})) {
    const name = prefix ? prefix + '/' + entry.name : entry.name;
    const path = local(root, name);
    if (entry.isDirectory()) entries.push(...assets(root, name));
    else if (entry.isFile()) entries.push([name, readFileSync(path)]);
    else throw new Error('Unsupported kit entry: ' + name);
  }
  return entries;
}

function agentInstructions(contract) {
  const domainInstructions = contract.model?.domain ? ' Review the product-specific v22 restatement with its original prompt and evidence. Discover its whatness, related ideas, resonance, dissonance, useful probes and changes over time as open-ended lenses. Continue that understanding in the language of this task before making the trace. When its evidence changes, review and revise the restatement and provenance.' : '';
  const modelInstructions = contract.model ? `\nBefore editing, run \`node maintenance/model.mjs prepare --question "USER NEED"\` and follow \`maintenance/semantic-activation.md\` to reason from the full purpose narrative and graph, including semantic connections that lexical lookup can miss.${domainInstructions} Freeze a trace before coding and validate it with \`node maintenance/model.mjs trace FILE\`. Use \`node maintenance/model.mjs impact PATH...\` for affected paths and \`impact --question\` for lexical leads. Trace the user journey and affected consumers; distinguish implementation dependencies from product obligations. When sources or decisions change, generate a candidate with \`node maintenance/inventory.mjs . maintenance/dependencies.json maintenance/dependencies.draft.json\`, then review the graph and intent together, preserve the previous evidence, update fingerprints, and run \`node maintenance/model.mjs check\`. The trace and structural checks do not establish semantic correctness or completeness.\n` : '';
  return `<!-- ness:local-maintenance -->
## Maintaining this repository

${contract.purpose}

Read \`maintenance/contract.json\` for entry points, the authority and scope of each rule, its checks and unresolved questions. Read \`maintenance/STATE.md\` for the latest evidence and next action.
${modelInstructions}

1. Trace the request from a public entry point. Identify which decisions and neighboring behaviors it touches.
2. Reproduce current behavior. When two explanations fit, choose an input on which they predict different results. Treat a characterized quirk as an observation.
3. For a repair, reproduce the defect before editing. For an authorized behavior change, record its source, add or revise the decision and make its check fail against the old behavior first.
4. Make the smallest coherent change. Run \`${contract.verify}\` from the repo root. Resolve failures by checking the implementation, fixture and decision. Retain the old evidence when revising a rule.
5. Update \`maintenance/STATE.md\` with the change, actual checks, unresolved questions and next useful action. Ordinary maintenance belongs here. Bring a product-policy conflict to the person who owns that decision.
<!-- /ness:local-maintenance -->
`;
}

export function install(kitPath, repoPath) {
  const kit = realpathSync(kitPath), repo = realpathSync(repoPath);
  const contractBytes = readFileSync(local(kit,'contract.json'));
  const contract = JSON.parse(contractBytes);
  if (!contract.purpose?.trim() || !contract.verify?.trim() || !contract.entryPoints?.length ||
      !contract.decisions?.length || !Array.isArray(contract.openQuestions)) throw new Error('Incomplete local contract');
  const ids = new Set();
  for (const d of contract.decisions) {
    if (!d.id || ids.has(d.id) || !['required','characterized'].includes(d.status) ||
        !d.authority?.trim() || !d.rule?.trim() || !d.checks?.length ||
        d.checks.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Invalid decision: ' + d.id);
    ids.add(d.id);
  }
  for (const point of contract.entryPoints) {
    if (!point.role?.trim() || !lstatSync(local(repo,point.path)).isFile()) throw new Error('Invalid entry point: ' + point.path);
  }
  const targets = assets(local(kit,'files'));
  if (targets.some(([name]) => ['AGENTS.md','maintenance/contract.json'].some(p => p.toLowerCase() === name.toLowerCase()))) {
    throw new Error('Reserved kit asset path');
  }
  if (!targets.some(([name]) => name === 'maintenance/STATE.md')) throw new Error('Missing continuation');
  if (contract.model) {
    if (contract.model.graph !== 'maintenance/dependencies.json' || contract.model.intent !== 'maintenance/intent.md') {
      throw new Error('Invalid dependency and intent model paths');
    }
    for (const name of [contract.model.graph, contract.model.intent]) {
      if (!targets.some(([target]) => target === name)) throw new Error('Missing model asset: ' + name);
    }
    if (contract.model.domain !== undefined) {
      if (contract.model.domain !== 'maintenance/domain-v22.json') throw new Error('Invalid domain restatement path');
      if (!targets.some(([name]) => name === contract.model.domain)) throw new Error('Missing model asset: ' + contract.model.domain);
      if (targets.some(([name]) => name.toLowerCase() === 'maintenance/lenses/intent.md')) throw new Error('Reserved kit asset path');
      targets.push(['maintenance/lenses/intent.md', readFileSync(new URL('../memory/intent.md', import.meta.url))]);
    }
    if (targets.some(([name]) => ['maintenance/model.mjs', 'maintenance/inventory.mjs', 'maintenance/semantic-activation.md'].includes(name))) throw new Error('Reserved kit asset path');
    targets.push(['maintenance/model.mjs', readFileSync(new URL('./model.mjs', import.meta.url))]);
    targets.push(['maintenance/inventory.mjs', readFileSync(new URL('./inventory.mjs', import.meta.url))]);
    targets.push(['maintenance/semantic-activation.md', readFileSync(new URL('./semantic-activation.md', import.meta.url))]);
  }
  targets.push(['maintenance/contract.json', contractBytes]);
  const additions = [];
  for (const [name, bytes] of targets) {
    const path = local(repo, name);
    if (!existsSync(path)) additions.push({path, name, bytes});
    else if (!readFileSync(path).equals(bytes)) throw new Error('Existing file differs; reconcile locally: ' + name);
  }
  const agentPath = local(repo,'AGENTS.md');
  const prior = existsSync(agentPath) ? readFileSync(agentPath,'utf8') : '';
  const block = agentInstructions(contract);
  const installed = prior.includes(block);
  if (!installed && prior.includes('<!-- ness:local-maintenance -->')) throw new Error('Existing maintenance instructions differ');
  if (!additions.length && installed) return [];

  const pins = JSON.parse(readFileSync(local(kit,'baseline.json'),'utf8')).inputs;
  if (!Object.keys(pins).length) throw new Error('The kit needs a characterized baseline');
  for (const [name, sha] of Object.entries(pins)) {
    if (createHash('sha256').update(readFileSync(local(repo,name))).digest('hex') !== sha) {
      throw new Error('Grounding source has changed: ' + name);
    }
  }
  const created = [];
  try {
    for (const {path, bytes} of additions) {
      mkdirSync(dirname(path),{recursive:true});
      writeFileSync(path, bytes, {flag:'wx'});
      created.push(path);
    }
    if (!installed) {
      if (existsSync(agentPath)) {
        if (readFileSync(agentPath,'utf8') !== prior) throw new Error('AGENTS.md changed during installation');
        appendFileSync(agentPath, (prior.endsWith('\n') ? '\n' : '\n\n') + block);
      } else writeFileSync(agentPath, block, {flag:'wx'});
    }
  } catch (error) {
    // Only remove files this call created exclusively.
    for (const path of created.reverse()) unlinkSync(path);
    throw error;
  }
  return [...additions.map(item => item.name), ...(!installed ? ['AGENTS.md'] : [])];
}
