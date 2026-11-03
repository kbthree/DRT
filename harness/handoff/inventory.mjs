// Build a reviewable draft from tracked files. This scanner finds literal module
// references; parsing, calls, runtime registration and user intent need review.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const origin = 'ness-static-inventory-v1'
const codeFile = /\.(?:[cm]?[jt]s|[jt]sx)$/i
const moduleRef = /\b(?:import[ \t]*(?:[^;'"`\r\n]*?[ \t]from[ \t]*)?|export[ \t]+[^;'"`\r\n]*?[ \t]from[ \t]*|require[ \t]*\([ \t]*|import[ \t]*\([ \t]*)(['"])([^'"\r\n]+)\1/g

function externalName (specifier) {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

function resolveImport (from, specifier, tracked) {
  const base = posix.normalize(posix.join(posix.dirname(from), specifier))
  const variants = [base, ...['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json'].map(e => base + e),
    ...['index.js', 'index.mjs', 'index.ts', 'index.tsx'].map(p => base + '/' + p)]
  if (/\.m?js$/.test(base)) variants.push(base.replace(/\.m?js$/, '.ts'), base.replace(/\.m?js$/, '.tsx'))
  return variants.find(p => tracked.has(p))
}

export function inventory (repoPath, previous = null, graphPath = null) {
  const repo = realpathSync(repoPath)
  const files = execFileSync('git', ['-C', repo, 'ls-files', '-z', '--cached'], { encoding: 'utf8' })
    .split('\0').filter(Boolean).sort()
  const excludedGraph = graphPath ? relative(repo, resolve(graphPath)).split('\\').join('/') : null
  const tracked = new Set()
  const bytes = new Map()
  const gaps = []
  for (const path of files) {
    if (path === excludedGraph) continue
    try {
      const full = resolve(repo, path)
      if (!lstatSync(full).isFile()) { gaps.push(`Skipped non-file tracked entry ${path}.`); continue }
      bytes.set(path, readFileSync(full))
      tracked.add(path)
    } catch { gaps.push(`Tracked entry unavailable in working tree: ${path}.`) }
  }
  const sources = Object.fromEntries([...bytes].map(([path, data]) => [path, createHash('sha256').update(data).digest('hex')]))
  const nodes = [...tracked].map(path => ({
    id: 'file:' + path,
    kind: 'repository-file',
    label: path,
    paths: [path],
    evidence: [`${path} tracked in working tree`],
    origin
  }))
  const ids = new Set(nodes.map(n => n.id))
  const edges = []
  let unresolved = 0
  for (const [path, data] of bytes) {
    if (!codeFile.test(path)) continue
    const text = data.toString('utf8')
    for (const match of text.matchAll(moduleRef)) {
      const specifier = match[2]
      let target
      if (specifier.startsWith('.')) {
        const resolved = resolveImport(path, specifier, tracked)
        if (!resolved) { unresolved++; continue }
        target = 'file:' + resolved
      } else if (specifier.startsWith('#') || specifier.startsWith('/')) {
        unresolved++; continue
      } else {
        target = 'external:' + externalName(specifier)
        if (!ids.has(target)) {
          ids.add(target)
          nodes.push({
            id: target,
            kind: 'external-module',
            label: externalName(specifier),
            paths: [],
            evidence: [`Referenced from ${path}`],
            origin
          })
        }
      }
      const line = text.slice(0, match.index).split('\n').length
      edges.push({
        from: 'file:' + path,
        to: target,
        kind: 'imports',
        evidence: [`${path}:${line} candidate literal module reference`],
        origin
      })
    }
  }
  const changed = new Set(Object.keys(previous?.sources ?? {}).filter(p => sources[p] !== previous.sources[p]))
  const oldNodes = new Map((previous?.nodes ?? []).map(n => [n.id, n]))
  const retainedEndpoints = new Set((previous?.edges ?? []).filter(e => e.origin !== origin).flatMap(e => [e.from, e.to]))
  for (const node of previous?.nodes ?? []) {
    if (ids.has(node.id)) {
      if (node.origin !== origin) {
        const index = nodes.findIndex(n => n.id === node.id)
        const fresh = nodes[index]
        nodes[index] = { ...fresh, ...node, paths: fresh.paths, evidence: [...new Set([...node.evidence, ...fresh.evidence])] }
      }
      continue
    }
    if (node.origin === origin && !retainedEndpoints.has(node.id)) continue
    // Keep legacy file nodes if an existing semantic edge points to a removed file.
    const missingPaths = node.paths?.some(p => !tracked.has(p) && !p.endsWith('/'))
    const kept = missingPaths ? { ...node, paths: [], status: 'requires-review' } : node
    nodes.push(kept)
    ids.add(node.id)
    if (missingPaths) gaps.push(`Previously recorded node ${node.id} has a missing path and needs review.`)
  }
  for (const edge of previous?.edges ?? []) {
    if (edge.origin === origin || !ids.has(edge.from) || !ids.has(edge.to)) continue
    const affected = [edge.from, edge.to].some(id => oldNodes.get(id)?.paths?.some(p => changed.has(p)))
    // Reconcile only the same observed import location. Distinct source lines
    // remain distinct observations, even when they target the same module.
    const locations = edge.evidence.flatMap(e => { const m = e.match(/^(.+?):(\d+)(?:\s|$)/); return m ? [`${m[1]}:${m[2]}`] : [] })
    const index = edge.kind === 'imports' && locations.length
      ? edges.findIndex(e =>
        e.origin === origin && e.from === edge.from && e.to === edge.to && e.kind === edge.kind &&
      e.evidence.some(item => locations.some(location => item.startsWith(location + ' '))))
      : -1
    const preserved = affected ? { ...edge, status: 'requires-review' } : edge
    if (index >= 0) {
      edges[index] = { ...preserved, evidence: [...new Set([...edge.evidence, ...edges[index].evidence])] }
    } else {
      edges.push(preserved)
      if (edge.kind === 'imports' && locations.length && !affected && edge.status !== 'reviewed') {
        edges[edges.length - 1] = { ...preserved, status: 'requires-review' }
        gaps.push(`Review inherited import ${edge.from} -> ${edge.to}; its location was not reproduced.`)
      }
    }
    if (affected) gaps.push(`Review inherited relationship ${edge.from} -> ${edge.to}; its source changed.`)
  }
  if (unresolved) gaps.push(`${unresolved} literal imports could not be resolved against tracked files.`)
  gaps.push('Static module references are candidates, may include comments or strings, and omit multiline declarations, runtime calls, nonliteral imports, dataflow, and plugin registration.')
  if (previous) gaps.push('Review semantic claims and their provenance; this draft cannot infer or refresh intent.')
  return {
    version: 1,
    scope: previous?.scope ?? 'Tracked working-tree files and candidate JavaScript/TypeScript module references.',
    sources,
    nodes,
    edges,
    gaps: [...new Set([...(previous?.gaps ?? []), ...gaps])]
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [repo, previousPath, outputPath, ...extra] = process.argv.slice(2)
    if (!repo || extra.length) throw new Error('Usage: node inventory.mjs REPO [EXISTING_GRAPH [NEW_DRAFT]]')
    const previous = previousPath ? JSON.parse(readFileSync(resolve(previousPath), 'utf8')) : null
    const draft = JSON.stringify(inventory(repo, previous, previousPath), null, 2) + '\n'
    if (outputPath) writeFileSync(resolve(outputPath), draft, { flag: 'wx' })
    else process.stdout.write(draft)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
