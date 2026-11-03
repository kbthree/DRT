import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, unlinkSync, appendFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { snapshot, evaluate, assertFresh, assertPushTargets, checkCommands } from './git-guard.mjs';

// Hooks may export a parent index. Every integration case owns a disposable repo.
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete process.env[key];
const pass = [['node', '-e', 'process.exit(0)']];
function repo(t) {
  const temp = resolve(tmpdir());
  const root = mkdtempSync(join(temp, 'ness-git-test-'));
  t.after(() => { assert.equal(dirname(root), temp); rmSync(root, {recursive: true, force: true}); });
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8', stdio: 'pipe'});
  const write = (p, bytes) => writeFileSync(join(root, p), bytes);
  git('init', '-q', '-b', 'main', '--template=');
  git('config', 'core.hooksPath', '.git/hooks');
  git('config', 'core.autocrlf', 'false');
  git('config', 'user.name', 'Disposable fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'commit.gpgSign', 'false');
  write('.gitignore', '/scratch/\n');
  write('source', 'initial\n');
  git('add', '.'); git('commit', '-qm', 'fixture');
  return {root, git, write};
}

test('an unnamed new binary file invalidates evidence and cannot be omitted from delivery', t => {
  const {root, git, write} = repo(t);
  const original = evaluate(root, pass);
  assertFresh(root, original, pass, {delivery: true});
  const path = 'new helper ü.bin';
  mkdirSync(join(root, '.git/info'), {recursive: true});
  appendFileSync(join(root, '.git/info/exclude'), path + '\n');
  write(path, Buffer.from([0, 0xff, 13, 10]));
  assert.throws(() => assertFresh(root, original, pass), /changed after evaluation/);
  const local = evaluate(root, pass);
  assert.deepEqual(local.snapshot.changes.untracked, [path]);
  assert.throws(() => assertFresh(root, local, pass, {delivery: true}), /Stage intended new files/);
  git('add', '-f', '--', path);
  assert.throws(() => assertFresh(root, local, pass), /changed after evaluation/);
  const staged = evaluate(root, pass);
  assertFresh(root, staged, pass, {delivery: true});
  git('commit', '-qm', 'add binary');
  assert.throws(() => assertFresh(root, staged, pass), /changed after evaluation/);
});

test('partial staging and deletion identify the working bytes and the distinct index', t => {
  const {root, git, write} = repo(t);
  write('source', 'candidate\n'); git('add', 'source'); write('source', 'different\n');
  const partial = evaluate(root, pass);
  assert.deepEqual(partial.snapshot.changes.staged, ['source']);
  assert.deepEqual(partial.snapshot.changes.unstaged, ['source']);
  assert.throws(() => assertFresh(root, partial, pass, {delivery: true}), /staged delivery differs/);
  unlinkSync(join(root, 'source'));
  assert.equal(snapshot(root).files.source, null);
  assert.throws(() => assertFresh(root, partial, pass), /changed after evaluation/);
  git('add', '-u');
  const removed = evaluate(root, pass);
  assertFresh(root, removed, pass, {delivery: true});
  assert.deepEqual(removed.snapshot.changes.staged, ['source']);
});

test('a passing command that adds source blocks the evaluation; ignored output is allowed', t => {
  const {root} = repo(t);
  mkdirSync(join(root, 'scratch'));
  const ignored = [['node', '-e', "require('fs').writeFileSync('scratch/log','output')"]];
  const clean = evaluate(root, ignored);
  assertFresh(root, clean, ignored, {delivery: true});
  const changes = [['node', '-e', "require('fs').writeFileSync('late-test','changed')"], ...pass];
  const bad = evaluate(root, changes);
  assert.equal(bad.checks[0].exitCode, 0);
  assert.equal(bad.stable, false);
  assert.equal(bad.checks.length, 1);
  assert.throws(() => assertFresh(root, bad, changes), /did not pass/);
});

test('failed, omitted or edited check evidence cannot qualify a delivery', t => {
  const {root} = repo(t);
  const failure = [['node', '-e', 'process.exit(7)'], ...pass];
  const bad = evaluate(root, failure);
  assert.equal(bad.checks[0].exitCode, 7);
  assert.throws(() => assertFresh(root, bad, failure), /did not pass/);
  const good = evaluate(root, pass);
  assert.throws(() => assertFresh(root, good, [...pass, ...pass]), /omitted or changed/);
  good.checks[0].stdout = 'invented';
  assert.throws(() => assertFresh(root, good, pass), /Receipt contents changed/);
});

test('push verification binds the delivered ref to the evaluated committed tree', t => {
  const {root, git, write} = repo(t);
  const state = snapshot(root);
  const update = `refs/heads/main ${state.head} refs/heads/main ${'0'.repeat(40)}`;
  assertPushTargets(state, update);
  assert.throws(() => assertPushTargets(state, update.replace(state.head, 'a'.repeat(40))), /evaluated HEAD/);
  write('source', 'uncommitted'); git('add', 'source');
  assert.throws(() => assertPushTargets(snapshot(root), update), /committed tree/);
});

test('a repository root alias is accepted but a subdirectory is rejected', t => {
  const {root} = repo(t);
  const alias = root + '-alias';
  symlinkSync(root, alias, 'junction');
  t.after(() => rmSync(alias, {force: true}));
  assert.equal(snapshot(alias).fingerprint, snapshot(root).fingerprint);
  mkdirSync(join(root, 'subdirectory'));
  assert.throws(() => snapshot(join(root, 'subdirectory')), /Use the Git repository root/);
});

test('discover additional suites without silently dropping previously required checks', t => {
  const {root, write} = repo(t);
  mkdirSync(join(root, 'harness'));
  for (const name of ['loop', 'experiments', 'search', 'packets', 'lessons', 'attention', 'handoff', 'git-guard', 'package', 'extra']) {
    write(`harness/${name}.test.mjs`, '');
  }
  assert.ok(checkCommands(root)[0].includes('harness/extra.test.mjs'));
  unlinkSync(join(root, 'harness/lessons.test.mjs'));
  assert.throws(() => checkCommands(root), /Missing required harness suite: lessons/);
});
