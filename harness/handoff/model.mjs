// Installed in the product. Checks recorded provenance, not the truth or completeness
// of claims. A source hash mismatch asks the maintainer to review the model.
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = realpathSync(resolve(fileURLToPath(new URL('..', import.meta.url))))

function productPath (path, { allowMissing = false } = {}) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') ||
      path.split('/').some(p => p === '.' || p === '..')) throw new Error('Invalid product path: ' + path)
  const abs = resolve(root, path)
  if (!abs.startsWith(root + sep)) throw new Error('Invalid product path: ' + path)
  if (!existsSync(abs) && allowMissing) {
    // Check every existing component, including dangling links, before treating
    // an absent evidence file as a gap. Never follow a link outside the product.
    let current = root
    for (const part of path.split('/')) {
      current = resolve(current, part)
      try { lstatSync(current) } catch (error) {
        if (error.code === 'ENOENT') return null
        throw error
      }
      let physical
      try { physical = realpathSync(current) } catch {
        throw new Error('Invalid linked product path: ' + path)
      }
      if (physical !== root && !physical.startsWith(root + sep)) throw new Error('Linked path outside product: ' + path)
    }
  }
  if (!existsSync(abs)) throw new Error('Missing product path: ' + path)
  const physical = realpathSync(abs)
  if (!physical.startsWith(root + sep)) throw new Error('Linked path outside product: ' + path)
  return abs
}

// The narrative is written by a maintainer or reasoning agent. Fingerprints
// establish its inputs and signal drift; they cannot verify its meaning.
function readDomain (contract, allowStale = false, scenarioPath = null) {
  if (contract.model?.domain === undefined) {
    if (scenarioPath) throw new Error('A hypothetical center needs a current domain restatement')
    return null
  }
  if (contract.model.domain !== 'maintenance/domain-v22.json') throw new Error('Invalid domain restatement path')
  if (scenarioPath && (!scenarioPath.startsWith('maintenance/scenarios/') || !scenarioPath.endsWith('.json'))) {
    throw new Error('Hypothetical center must be a JSON file under maintenance/scenarios/')
  }
  const domain = JSON.parse(readFileSync(productPath(scenarioPath || contract.model.domain), 'utf8'))
  if (domain.version !== 1 || typeof domain.narrative !== 'string' || !domain.narrative.trim() ||
      typeof domain.revision !== 'string' || !domain.revision.trim() ||
      !Array.isArray(domain.unknowns) || domain.unknowns.some(x => typeof x !== 'string' || !x.trim()) ||
      !domain.sources || typeof domain.sources !== 'object' || Array.isArray(domain.sources) || !Object.keys(domain.sources).length ||
      typeof domain.v22PromptSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(domain.v22PromptSha256)) {
    throw new Error('Invalid domain restatement provenance')
  }
  const prompt = readFileSync(productPath('maintenance/lenses/intent.md'), 'utf8')
  const gaps = []
  function stale (message) {
    if (!allowStale) throw new Error(message)
    gaps.push(message)
  }
  if (scenarioPath) {
    if (typeof domain.baseDomainSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(domain.baseDomainSha256)) {
      throw new Error('Hypothetical center requires a current domain fingerprint')
    }
    if (createHash('sha256').update(readFileSync(productPath(contract.model.domain))).digest('hex') !== domain.baseDomainSha256) {
      stale('Hypothetical center baseline changed; review the scenario')
    }
  }
  if (createHash('sha256').update(prompt).digest('hex') !== domain.v22PromptSha256) {
    stale('Domain restatement v22 prompt changed; review its interpretation')
  }
  for (const [path, expected] of Object.entries(domain.sources)) {
    if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
      throw new Error('Invalid domain evidence fingerprint: ' + path)
    }
    const evidencePath = productPath(path, { allowMissing: true })
    if (!evidencePath) {
      stale('Domain evidence missing, review its restatement: ' + path)
      continue
    }
    if (!statSync(evidencePath).isFile()) throw new Error('Invalid domain evidence fingerprint: ' + path)
    if (createHash('sha256').update(readFileSync(evidencePath)).digest('hex') !== expected) {
      stale('Domain evidence changed, review its restatement: ' + path)
    }
  }
  return { ...domain, prompt, gaps }
}

export function readModel ({ allowStale = false } = {}) {
  const contract = JSON.parse(readFileSync(resolve(root, 'maintenance/contract.json')))
  const { graph, intent } = contract.model ?? {}
  const model = JSON.parse(readFileSync(productPath(graph), 'utf8'))
  const domain = readDomain(contract, allowStale)
  const intentText = readFileSync(productPath(intent), 'utf8')
  if (!intentText.includes('Synchrony_Quiddity') || !intentText.includes('Synchrony_Rules_of_Motion')) {
    throw new Error('Intent needs v22 synchrony and rules of motion')
  }
  if (model.version !== 1 || !Array.isArray(model.nodes) || !model.nodes.length ||
      !Array.isArray(model.edges) || !Array.isArray(model.gaps) ||
      !model.scope?.trim() || !model.sources || !Object.keys(model.sources).length) {
    throw new Error('Incomplete dependency model')
  }
  const ids = new Set()
  for (const node of model.nodes) {
    if (!node.id?.trim() || ids.has(node.id) || !node.kind?.trim() || !node.label?.trim() ||
        !Array.isArray(node.paths) || !Array.isArray(node.evidence) ||
        !node.evidence.length || node.evidence.some(e => typeof e !== 'string' || !e.trim())) {
      throw new Error('Invalid dependency node: ' + node.id)
    }
    ids.add(node.id)
    if (!allowStale && node.status === 'requires-review') throw new Error('Dependency node requires review: ' + node.id)
    for (const path of node.paths) productPath(path)
  }
  for (const edge of model.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || !edge.kind?.trim() ||
        !Array.isArray(edge.evidence) || !edge.evidence.length ||
        edge.evidence.some(e => typeof e !== 'string' || !e.trim())) {
      throw new Error('Invalid dependency edge: ' + edge.from + ' -> ' + edge.to)
    }
    if (!allowStale && edge.status === 'requires-review') throw new Error('Dependency relationship requires review: ' + edge.from + ' -> ' + edge.to)
  }
  for (const [path, expected] of Object.entries(model.sources)) {
    if (!/^[a-f0-9]{64}$/.test(expected) || !statSync(productPath(path)).isFile()) {
      throw new Error('Invalid source fingerprint: ' + path)
    }
    const actual = createHash('sha256').update(readFileSync(productPath(path))).digest('hex')
    if (actual !== expected) {
      if (!allowStale) throw new Error('Model source changed, review dependencies and intent: ' + path)
      model.gaps.push('Model source changed, review dependencies and intent: ' + path)
    }
  }
  if (domain) model.gaps.push(...domain.gaps)
  return model
}

function connected (model, selected) {
  // A single expansion exposes directly connected duties without flooding context.
  const nearby = new Set(selected)
  for (const e of model.edges) {
    if (selected.has(e.from) || selected.has(e.to)) { nearby.add(e.from); nearby.add(e.to) }
  }
  return {
    matched: [...selected],
    nodes: model.nodes.filter(n => nearby.has(n.id)),
    edges: model.edges.filter(e => selected.has(e.from) || selected.has(e.to)),
    gaps: model.gaps
  }
}

export function impact (model, paths) {
  const selected = new Set(model.nodes.filter(n => n.paths.some(p => paths.some(input =>
    p === input || (p.endsWith('/') && input.startsWith(p))))).map(n => n.id))
  return connected(model, selected)
}

// Lexical matching is a discovery aid. It is not a semantic similarity score.
export function impactQuestion (model, question) {
  const stop = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'what', 'when', 'where', 'which', 'does', 'should', 'could', 'would', 'their'])
  const terms = [...new Set((question.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(w => w.length >= 3 && !stop.has(w)))]
  const matches = []
  for (const node of model.nodes) {
    const fields = { id: node.id, label: node.label, evidence: node.evidence.join(' ') }
    const locations = {}
    for (const [name, value] of Object.entries(fields)) {
      const words = new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? [])
      const overlap = terms.filter(term => words.has(term))
      if (overlap.length) locations[name] = overlap
    }
    const overlap = [...new Set(Object.values(locations).flat())]
    if (overlap.length) matches.push({ id: node.id, score: overlap.length, terms: overlap, fields: locations })
  }
  matches.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  return { method: 'lexical token overlap (heuristic)', matches, ...connected(model, new Set(matches.map(m => m.id))) }
}

// Give a reasoning agent the complete recorded context. Lexical leads are only
// hints; semantic nodes and v22 narrative remain present when words do not match.
export function prepareActivation (model, contract, intent, question, domain = null, scenario = null) {
  if (typeof question !== 'string' || !question.trim()) throw new Error('Activation question is required')
  const { sources, ...graph } = model
  return {
    question,
    instructions: 'Read maintenance/semantic-activation.md. Continue the product understanding in the language of this task and its users, using recorded evidence and uncertainties. Lexical leads may miss relevant journeys. Freeze and validate a trace before coding.',
    purpose: contract.purpose,
    decisions: contract.decisions,
    openQuestions: contract.openQuestions,
    intent,
    domainRestatement: domain,
    domainRestatementGap: domain ? null : 'This legacy model has no grounded domain-specific v22 restatement.',
    scenario,
    graph,
    sourceFingerprints: sources,
    lexicalLeads: impactQuestion(model, question)
  }
}

// This validates provenance references and the shape of the prediction. It
// cannot establish that cited evidence supports the interpretation.
export function validateTrace (model, trace, { requireContinuation = false } = {}) {
  const nonempty = value => typeof value === 'string' && value.trim().length > 0
  if (!trace || !nonempty(trace.question) || !Array.isArray(trace.claims) || !trace.claims.length ||
      !Array.isArray(trace.openQuestions) || trace.openQuestions.some(q => !nonempty(q))) {
    throw new Error('Trace requires a question, claims and an openQuestions array')
  }
  if (requireContinuation && !nonempty(trace.continuation)) {
    throw new Error('Trace requires a task-specific domain continuation')
  }
  const ids = new Set(model.nodes.map(node => node.id))
  for (const claim of trace.claims) {
    if (!claim || !['direct', 'inferred', 'hypothesis'].includes(claim.kind) ||
        !['statement', 'userOutcome', 'alternative', 'counterexample'].every(key => nonempty(claim[key])) ||
        !Array.isArray(claim.evidence) || !claim.evidence.length) {
      throw new Error('Invalid activation claim: include kind, outcome, alternative, counterexample and evidence')
    }
    for (const citation of claim.evidence) {
      if (!citation || !nonempty(citation.reason) || (citation.node !== 'request' && !ids.has(citation.node))) {
        throw new Error('Invalid activation evidence reference: ' + citation?.node)
      }
    }
  }
  return {
    ok: true,
    claims: trace.claims.length,
    gaps: model.gaps,
    limitation: 'Shape and graph references checked; semantic correctness and completeness remain unverified.'
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, ...paths] = process.argv.slice(2)
    const validCheck = mode === 'check' && !paths.length
    const validImpact = mode === 'impact' && paths.length > 0 &&
      (paths[0] !== '--question' || (paths.length === 2 && paths[1].trim()))
    const validPrepare = mode === 'prepare' && (paths.length === 2 || paths.length === 4) && paths[0] === '--question' && paths[1].trim() &&
      (paths.length === 2 || (paths[2] === '--scenario' && paths[3].trim()))
    const validTrace = mode === 'trace' && paths.length === 1
    const valid = validCheck || validImpact || validPrepare || validTrace
    if (!valid) throw new Error('Usage: node maintenance/model.mjs check | impact PATH... | impact --question TEXT | prepare --question TEXT [--scenario FILE] | trace FILE')
    const model = readModel({ allowStale: mode !== 'check' })
    let result
    if (mode === 'check') {
      result = { ok: true, scope: model.scope, gaps: model.gaps }
    } else if (mode === 'prepare') {
      const contract = JSON.parse(readFileSync(resolve(root, 'maintenance/contract.json')))
      const intent = readFileSync(productPath(contract.model.intent), 'utf8')
      const current = readDomain(contract, true)
      const scenario = paths.length === 4
        ? { status: 'hypothetical', path: paths[3], baseline: contract.model.domain, restatement: readDomain(contract, true, paths[3]) }
        : null
      result = prepareActivation(model, contract, intent, paths[1], current, scenario)
    } else if (mode === 'trace') {
      const contract = JSON.parse(readFileSync(resolve(root, 'maintenance/contract.json')))
      result = validateTrace(model, JSON.parse(readFileSync(resolve(paths[0]), 'utf8')), { requireContinuation: contract.model?.domain !== undefined })
    } else {
      result = paths[0] === '--question' ? impactQuestion(model, paths[1]) : impact(model, paths)
    }
    console.log(JSON.stringify(result, null, 2))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
