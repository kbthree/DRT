import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {checkPackageScope} from './package-audit.mjs';
import {gate, requiredChecks} from './gate.mjs';

test('the package rejects a force-staged trial and a new project beside the harness', t => {
  const temp = resolve(tmpdir()), root = mkdtempSync(join(temp, 'ness-package-'));
  t.after(() => { assert.equal(dirname(root), temp); rmSync(root, {recursive:true, force:true}); });
  const env = {...process.env};
  for (const key of ['GIT_DIR','GIT_WORK_TREE','GIT_INDEX_FILE','GIT_COMMON_DIR']) delete env[key];
  const git = (...args) => execFileSync('git', ['-C',root,...args], {env, stdio:'pipe'});
  git('init', '-q');
  writeFileSync(join(root,'.gitignore'), '/external-product/\n');
  mkdirSync(join(root,'external-product'));
  writeFileSync(join(root,'external-product','source.py'), 'historical source');
  assert.equal(checkPackageScope(root), 1);
  git('add','-f','--','external-product/source.py');
  assert.throws(() => checkPackageScope(root), /Excluded files are staged: external-product/);
  git('rm','--cached','--','external-product/source.py');
  mkdirSync(join(root,'another-product'));
  writeFileSync(join(root,'another-product','source.py'),'new source');
  assert.throws(() => checkPackageScope(root), /Outside the portable package: another-product/);
});

test('claims cite files included in the standalone package', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const included = new Set(execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-per-directory=.gitignore'], {encoding:'utf8'})
    .split('\0').filter(Boolean).filter(path => existsSync(resolve(root, path))));
  const {claims} = JSON.parse(readFileSync(resolve(root, 'harness/claims.json'), 'utf8'));
  const missing = [];
  for (const claim of claims) {
    for (const evidence of claim.evidence ?? []) {
      // Narrative sources are allowed; path-shaped in-repository references must resolve.
      if (typeof evidence === 'string' && /^[\w.-]+\/(?:[\w.-]+\/)*[\w.-]+\.[\w.-]+$/.test(evidence)
          && !included.has(evidence)) missing.push(`${claim.id}: ${evidence}`);
    }
  }
  assert.deepEqual(missing, [], 'Claims cite files absent from the standalone package');
});

test('failed or missing evidence returns to the product decision that owns it', () => {
  const contract = {obligations:[{id:'preserve', decision:'owner', check:'public-behavior'}]};
  const [id] = requiredChecks(contract);
  const receipt = {id, executed:true, status:'passed', assertions:1, fingerprint:'current'};
  assert.ok(gate(contract,[receipt],'current').accepted);
  for (const records of [[],[receipt,receipt],[{...receipt,status:'failed'}],[{...receipt,fingerprint:'stale'}]]) {
    const result = gate(contract,records,'current');
    assert.equal(result.accepted,false);
    assert.deepEqual(result.backpressure[0].returnTo,['owner']);
  }
});
