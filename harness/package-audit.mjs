import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {plan} from './gate.mjs';

export function checkPackageScope(root) {
  const list = (...args) => execFileSync('git', ['-C', root, 'ls-files', '-z', ...args],
    {encoding: 'utf8'}).split('\0').filter(Boolean);
  const forced = list('--cached', '--ignored', '--exclude-per-directory=.gitignore');
  assert.equal(forced.length, 0, 'Excluded files are staged: ' + forced.slice(0, 5).join(', '));
  const paths = list('--cached', '--others', '--exclude-per-directory=.gitignore');
  const allowedDirs = new Set(['harness', '.github', '.githooks']);
  const outside = paths.filter(p => p.includes('/') && !allowedDirs.has(p.split('/')[0]));
  assert.equal(outside.length, 0, 'Outside the portable package: ' + outside.slice(0, 5).join(', '));
  return paths.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = checkPackageScope(fileURLToPath(new URL('../', import.meta.url)));
  const read = name => readFileSync(new URL(name, import.meta.url));
  const tasks = plan(JSON.parse(read('contract.json')));
  const {claims} = JSON.parse(read('claims.json'));
  assert.ok(claims.length && new Set(claims.map(c => c.id)).size === claims.length);
  for (const claim of claims) {
    assert.ok(['invariant','assertion','heuristic','hypothesis'].includes(claim.kind), claim.id);
    for (const key of ['statement','scope','authority','revision','status']) assert.ok(claim[key]?.trim(), claim.id + ': ' + key);
    assert.ok(claim.evidence?.length, 'Missing provenance for ' + claim.id);
  }
  assert.equal(createHash('sha256').update(read('memory/intent.md')).digest('hex'),
    '94c5f933d00ee0351902709b0f78bf30640b878ed7c2900bcf846659918fcfb4', 'Changed v22 memory instructions');
  for (const marker of ['Synchrony_Quiddity','Synchrony_Rules_of_Motion']) assert.ok(read('continuation.md').includes(marker));
  console.log(`PACKAGE ACCEPTED: ${files} files, ${tasks.length} contract assignments, ${claims.length} scoped claims, v22 memory verified.`);
}
