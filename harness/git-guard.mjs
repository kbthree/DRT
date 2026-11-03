import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
const split = value => value.split('\0').filter(Boolean);
const json = value => JSON.stringify(value);
function git(root, args) {
  return execFileSync('git', ['-C', root, ...args], {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']});
}
function runtime() {
  return {node: process.version, executable: process.execPath, platform: process.platform, arch: process.arch,
    nodeOptions: hash(process.env.NODE_OPTIONS ?? ''), nodePath: hash(process.env.NODE_PATH ?? '')};
}

export function snapshot(root) {
  assert.equal(realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim()), realpathSync(root), 'Use the Git repository root');
  let head = null;
  try { head = git(root, ['rev-parse', '--verify', 'HEAD']).trim(); } catch { /* Unborn repository. */ }
  const objectFormat = git(root, ['rev-parse', '--show-object-format']).trim();
  const trustMode = git(root, ['config', '--type=bool', '--default=true', '--get', 'core.filemode']).trim() === 'true';
  const index = Object.create(null);
  for (const record of split(git(root, ['ls-files', '--stage', '-z']))) {
    const tab = record.indexOf('\t');
    const [mode, oid, stage] = record.slice(0, tab).split(' ');
    const path = record.slice(tab + 1);
    assert.equal(stage, '0', 'Resolve merge conflicts before evaluation: ' + path);
    assert.ok(['100644', '100755'].includes(mode), 'Declare a separate evaluation boundary for symlinks/submodules: ' + path);
    index[path] = {mode, oid};
  }
  // Only versioned .gitignore policy applies. Global and .git/info/exclude rules
  // must not silently hide a new source file from this repository's evaluation.
  const untracked = split(git(root, ['ls-files', '--others', '--exclude-per-directory=.gitignore', '-z'])).sort();
  const files = Object.create(null);
  for (const path of [...new Set([...Object.keys(index), ...untracked])].sort()) {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) { files[path] = null; continue; }
    const stat = lstatSync(absolute);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Unsupported file boundary: ' + path);
    const bytes = readFileSync(absolute);
    const oid = createHash(objectFormat).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    // Git on Windows records the executable bit in the index; POSIX also checks
    // the actual permission bit. Byte normalization is deliberately disabled.
    const mode = !trustMode ? (index[path]?.mode ?? '100644') : (stat.mode & 0o111 ? '100755' : '100644');
    files[path] = {sha256: hash(bytes), oid, mode, size: bytes.length};
  }
  const state = {version: 1, head, objectFormat, index, files};
  return {...state, fingerprint: hash(json(state)), changes: {
    staged: split(git(root, ['diff', '--cached', '--name-only', '-z'])),
    unstaged: Object.keys(index).filter(p => files[p]?.oid !== index[p].oid || files[p]?.mode !== index[p].mode),
    untracked,
  }};
}

export function assertDeliverable(state) {
  assert.equal(state.changes.untracked.length, 0, 'Stage intended new files or explicitly ignore disposable files: ' + state.changes.untracked.slice(0, 8).join(', '));
  assert.equal(state.changes.unstaged.length, 0, 'The staged delivery differs from the evaluated working files: ' + state.changes.unstaged.slice(0, 8).join(', '));
}

export function evaluate(root, commands, before = snapshot(root)) {
  assert.ok(commands.length > 0, 'At least one check is required');
  const checks = [];
  let stable = true;
  for (const command of commands) {
    assert.ok(Array.isArray(command) && command[0] === 'node' && command.length > 1, 'Use explicit Node argument arrays');
    const result = spawnSync(process.execPath, command.slice(1), {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
    checks.push({command, exitCode: result.status, signal: result.signal, error: result.error?.message ?? null,
      stdout: result.stdout ?? '', stderr: result.stderr ?? ''});
    if (snapshot(root).fingerprint !== before.fingerprint) { stable = false; break; }
    if (result.status !== 0 || result.error || result.signal) break;
  }
  const accepted = stable && checks.length === commands.length && checks.every(c => c.exitCode === 0 && !c.signal && !c.error);
  const body = {version: 1, at: new Date().toISOString(), accepted, stable, runtime: runtime(), snapshot: before, checks};
  return {...body, integrity: hash(json(body))};
}

export function assertFresh(root, receipt, commands, {delivery = false} = {}) {
  const {integrity, ...body} = receipt;
  assert.equal(integrity, hash(json(body)), 'Receipt contents changed');
  assert.equal(receipt.version, 1, 'Unknown receipt format');
  assert.ok(receipt.accepted && receipt.stable, 'Evaluation did not pass on a stable candidate');
  assert.deepEqual(receipt.runtime, runtime(), 'Runtime changed; evaluate again');
  assert.deepEqual(receipt.checks.map(c => c.command), commands, 'Required checks were omitted or changed');
  assert.ok(receipt.checks.every(c => c.exitCode === 0 && !c.signal && !c.error), 'A check failed');
  const current = snapshot(root);
  assert.equal(current.fingerprint, receipt.snapshot.fingerprint, 'Git inputs changed after evaluation; stage and evaluate again');
  if (delivery) assertDeliverable(current);
  return current;
}

export function checkCommands(root) {
  const paths = split(git(root, ['ls-files', '--cached', '--others', '--exclude-per-directory=.gitignore', '-z', '--', 'harness/']));
  const tests = [...new Set(paths.filter(p => /^harness\/[^/]+\.test\.mjs$/.test(p)))].sort();
  for (const name of ['loop', 'experiments', 'search', 'packets', 'lessons', 'attention', 'handoff', 'git-guard', 'package']) {
    assert.ok(tests.includes(`harness/${name}.test.mjs`), 'Missing required harness suite: ' + name);
  }
  return [['node', '--test', ...tests], ['node', 'harness/package-audit.mjs']];
}

export function assertPushTargets(state, updates) {
  assertDeliverable(state);
  assert.equal(state.changes.staged.length, 0, 'Push checks must run on the committed tree');
  for (const line of updates.trim().split('\n').filter(Boolean)) {
    const [, localOid] = line.trim().split(/\s+/);
    if (/^0+$/.test(localOid)) continue; // A deletion delivers no candidate.
    assert.equal(localOid, state.head, 'Only the evaluated HEAD is qualified to push');
  }
}

async function main() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const action = process.argv[2];
  if (action === 'setup') {
    let previous = '';
    try { previous = git(root, ['config', '--get', 'core.hooksPath']).trim(); } catch { /* Unset. */ }
    assert.ok(!previous || previous === '.githooks', 'An existing hooksPath needs deliberate integration: ' + previous);
    for (const [key, value] of [['core.hooksPath', '.githooks'], ['core.autocrlf', 'false'], ['pull.ff', 'only'], ['fetch.prune', 'true']]) {
      git(root, ['config', '--local', key, value]);
    }
    console.log('Local hooks and Git settings installed. Commit author identity is unchanged.');
    return;
  }
  assert.ok(['check', 'verify', 'test'].includes(action), 'Usage: node harness/git-guard.mjs setup|check|verify [--delivery]|test');
  const commands = checkCommands(root);
  if (action === 'test') {
    const r = spawnSync(process.execPath, commands[0].slice(1), {cwd: root, stdio: 'inherit'});
    process.exitCode = r.status ?? 1;
    return;
  }
  const receiptPath = resolve(root, '.harness-local/git-evaluation.json');
  if (action === 'check') {
    const state = snapshot(root);
    const receipt = evaluate(root, commands, state);
    mkdirSync(dirname(receiptPath), {recursive: true});
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
    for (const check of receipt.checks) {
      process.stdout.write(check.stdout);
      process.stderr.write(check.stderr);
    }
    console.log(`GIT EVALUATION ${receipt.accepted ? 'ACCEPTED' : 'BLOCKED'}: ${Object.keys(receipt.snapshot.files).length} files; ${receipt.checks.length}/${commands.length} commands; ${receipt.snapshot.fingerprint}`);
    process.exitCode = receipt.accepted ? 0 : 1;
    return;
  }
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  const delivery = process.argv.includes('--delivery') || process.argv.includes('--push');
  const state = assertFresh(root, receipt, commands, {delivery});
  if (process.argv.includes('--push')) assertPushTargets(state, readFileSync(0, 'utf8'));
  console.log(`Evaluation is current${delivery ? ' and staged delivery matches' : ''}: ${state.fingerprint}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('GIT GUARD BLOCKED: ' + error.message); process.exitCode = 1; });
}
