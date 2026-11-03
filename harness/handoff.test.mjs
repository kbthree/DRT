import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {inventory} from './handoff/inventory.mjs';

test('a fresh target can use either mode and run its installed check independently', t => {
  const temp = resolve(tmpdir()), root = mkdtempSync(join(temp,'ness-handoff-'));
  t.after(() => { assert.equal(dirname(root),temp); rmSync(root,{recursive:true,force:true}); });
  const product = join(root,'target'), kit = join(root,'kit');
  mkdirSync(product);
  mkdirSync(join(kit,'files','maintenance'),{recursive:true});
  const source = 'export const limit = 3;\n';
  const writeSource = bytes => writeFileSync(join(product,'entry.mjs'),bytes);
  writeSource(source);
  writeFileSync(join(product,'AGENTS.md'),'Existing project instructions.\n');
  const cli = fileURLToPath(new URL('engage.mjs',import.meta.url));
  const select = (...args) => JSON.parse(execFileSync(process.execPath,[cli,product,...args],{cwd:root,encoding:'utf8'}));
  const engagement = select();
  assert.deepEqual(engagement.installed,[]);
  assert.equal(engagement.guidance,readFileSync(new URL('core.md',import.meta.url),'utf8'));
  assert.deepEqual(readdirSync(product).sort(),['AGENTS.md','entry.mjs']);
  const contract = {purpose:'Expose the configured limit.', entryPoints:[{role:'public API',path:'entry.mjs'}],
    decisions:[{id:'limit',status:'required',authority:'product owner',rule:'Expose 3.',checks:['read-limit']}],
    openQuestions:[], verify:'node maintenance/check.mjs'};
  writeFileSync(join(kit,'contract.json'),JSON.stringify(contract));
  writeFileSync(join(kit,'baseline.json'),JSON.stringify({inputs:{'entry.mjs':createHash('sha256').update(source).digest('hex')}}));
  writeFileSync(join(kit,'files','maintenance','STATE.md'),'Current limit verified through the public entry.');
  writeFileSync(join(kit,'files','maintenance','check.mjs'),"import assert from 'node:assert/strict'; import {limit} from '../entry.mjs'; assert.equal(limit,3);");
  const args = ['--mode','install-inner','--kit',kit];
  writeSource('export const limit = 2;\n');
  const stale = spawnSync(process.execPath,[cli,product,...args],{encoding:'utf8'});
  assert.notEqual(stale.status,0);
  assert.match(stale.stderr,/Grounding source has changed/);
  assert.deepEqual(readdirSync(product).sort(),['AGENTS.md','entry.mjs']);
  writeSource(source);
  assert.ok(select(...args).installed.includes('maintenance/check.mjs'));
  assert.deepEqual(select(...args).installed,[]);
  assert.match(readFileSync(join(product,'AGENTS.md'),'utf8'),/^Existing project instructions\./);
  const run = () => spawnSync(process.execPath,['maintenance/check.mjs'],{cwd:product});
  assert.equal(run().status,0);
  writeSource('export const limit = 4;\n');
  assert.notEqual(run().status,0);
});

test('a product model exposes linked impacts and catches stale source or purpose evidence', t => {
  const temp = resolve(tmpdir()), root = mkdtempSync(join(temp,'ness-model-'));
  t.after(() => { assert.equal(dirname(root),temp); rmSync(root,{recursive:true,force:true}); });
  const product = join(root,'target'), kit = join(root,'kit');
  mkdirSync(product);
  mkdirSync(join(kit,'files','maintenance'),{recursive:true});
  const source = 'export const value = 3;\n', purpose = 'Users need a stable value.\n';
  writeFileSync(join(product,'entry.mjs'),source);
  writeFileSync(join(product,'purpose.md'),purpose);
  const sha = s => createHash('sha256').update(s).digest('hex');
  const contract = {purpose:'Expose a stable value.',entryPoints:[{role:'public API',path:'entry.mjs'}],
    decisions:[{id:'value',status:'required',authority:'purpose.md',rule:'Expose 3.',checks:['value']}],
    openQuestions:[],verify:'node maintenance/model.mjs check',
    model:{graph:'maintenance/dependencies.json',intent:'maintenance/intent.md'}};
  const graph = {version:1,scope:'The checked public entry and purpose.',sources:{'entry.mjs':sha(source),'purpose.md':sha(purpose)},
    nodes:[{id:'entry',kind:'entry',label:'Public entry',paths:['entry.mjs'],evidence:['entry.mjs']},
      {id:'purpose',kind:'journey',label:'Stable value',paths:['purpose.md'],evidence:['purpose.md']}],
    edges:[{from:'entry',to:'purpose',kind:'serves',evidence:['purpose.md']}],gaps:['Other uses are unexamined.']};
  writeFileSync(join(kit,'contract.json'),JSON.stringify(contract));
  writeFileSync(join(kit,'baseline.json'),JSON.stringify({inputs:{'entry.mjs':sha(source),'purpose.md':sha(purpose)}}));
  writeFileSync(join(kit,'files','maintenance','dependencies.json'),JSON.stringify(graph));
  writeFileSync(join(kit,'files','maintenance','intent.md'),'Synchrony_Quiddity: Stable value.\nSynchrony_Rules_of_Motion: Trace its users.\n');
  writeFileSync(join(kit,'files','maintenance','STATE.md'),'Baseline observed.');
  const cli = fileURLToPath(new URL('engage.mjs',import.meta.url));
  execFileSync(process.execPath,[cli,product,'--mode','install-inner','--kit',kit]);
  const run = (...args) => spawnSync(process.execPath,['maintenance/model.mjs',...args],{cwd:product,encoding:'utf8'});
  assert.equal(run('check').status,0);
  const activated = JSON.parse(run('impact','entry.mjs').stdout);
  assert.deepEqual(activated.matched,['entry']);
  assert.deepEqual(activated.nodes.map(n => n.id),['entry','purpose']);
  const question = JSON.parse(run('impact','--question','How does the user get a stable value?').stdout);
  assert.match(question.method,/lexical.*heuristic/);
  assert.deepEqual(question.matched,['purpose']);
  assert.deepEqual(question.matches[0].fields.label,['stable','value']);
  assert.deepEqual(question.nodes.map(n => n.id),['entry','purpose']);
  const noMatch = JSON.parse(run('impact','--question','moonlight telescope').stdout);
  assert.deepEqual(noMatch.matches,[]);
  assert.deepEqual(noMatch.nodes,[]);
  const packet = JSON.parse(run('prepare','--question','How can a person depend on the result?').stdout);
  assert.deepEqual(packet.lexicalLeads.matched,[]);
  assert.equal(packet.domainRestatement,null);
  assert.match(packet.domainRestatementGap,/no grounded domain-specific/);
  assert.match(run('prepare','--question','What if?','--scenario','maintenance/scenarios/local.json').stderr,/needs a current domain restatement/);
  assert.equal(packet.purpose,'Expose a stable value.');
  assert.match(packet.intent,/Synchrony_Quiddity/);
  assert.ok(packet.graph.nodes.some(n => n.id === 'purpose'));
  assert.ok(packet.graph.edges.some(e => e.from === 'entry' && e.to === 'purpose'));
  const trace = {question:packet.question, claims:[{kind:'inferred',statement:'The value should stay consistent.',
    userOutcome:'A caller reads the same value later.',alternative:'The value changes between requests.',
    counterexample:'Read twice after an unrelated operation.',evidence:[{node:'purpose',reason:'The user journey describes stability.'}]}],openQuestions:['Is cross-process persistence promised?']};
  const tracePath = join(product,'prediction.json');
  writeFileSync(tracePath,JSON.stringify(trace));
  assert.equal(JSON.parse(run('trace',tracePath).stdout).claims,1);
  trace.claims[0].evidence[0].node = 'made-up';
  writeFileSync(tracePath,JSON.stringify(trace));
  assert.match(run('trace',tracePath).stderr,/Invalid activation evidence reference/);
  trace.claims[0].evidence[0].node = 'purpose';
  trace.claims[0].counterexample = '';
  writeFileSync(tracePath,JSON.stringify(trace));
  assert.match(run('trace',tracePath).stderr,/Invalid activation claim/);
  assert.match(readFileSync(join(product,'AGENTS.md'),'utf8'),/model.mjs impact/);
  assert.match(readFileSync(join(product,'AGENTS.md'),'utf8'),/semantic-activation.md/);
  writeFileSync(join(product,'entry.mjs'),'export const value = 4;\n');
  assert.match(run('check').stderr,/Model source changed.*entry.mjs/);
  assert.ok(JSON.parse(run('impact','entry.mjs').stdout).gaps.some(g => g.includes('entry.mjs')));
  writeFileSync(join(product,'entry.mjs'),source);
  writeFileSync(join(product,'purpose.md'),'Users now need a different value.\n');
  assert.match(run('check').stderr,/Model source changed.*purpose.md/);
  writeFileSync(join(product,'purpose.md'),purpose);
  graph.edges[0].status = 'requires-review';
  writeFileSync(join(product,'maintenance','dependencies.json'),JSON.stringify(graph));
  assert.match(run('check').stderr,/Dependency relationship requires review/);
  assert.equal(run('impact','entry.mjs').status,0);
  delete graph.edges[0].status;
  graph.edges[0].to = 'missing';
  writeFileSync(join(product,'maintenance','dependencies.json'),JSON.stringify(graph));
  assert.match(run('check').stderr,/Invalid dependency edge/);
});

test('grounded v22 restatement is installed, activated, revised and checked against its evidence', t => {
  const temp = resolve(tmpdir()), root = mkdtempSync(join(temp,'ness-domain-'));
  t.after(() => { assert.equal(dirname(root),temp); rmSync(root,{recursive:true,force:true}); });
  const product = join(root,'target'), kit = join(root,'kit');
  mkdirSync(product);
  mkdirSync(join(kit,'files','maintenance'),{recursive:true});
  const source = 'export const value = 3;\n', purpose = 'Users need a stable value.\n';
  writeFileSync(join(product,'entry.mjs'),source);
  writeFileSync(join(product,'purpose.md'),purpose);
  const sha = s => createHash('sha256').update(s).digest('hex');
  const prompt = readFileSync(new URL('memory/intent.md',import.meta.url),'utf8');
  const contract = {purpose:'Expose a stable value.',entryPoints:[{role:'public API',path:'entry.mjs'}],
    decisions:[{id:'value',status:'required',authority:'purpose.md',rule:'Expose 3.',checks:['value']}],
    openQuestions:[],verify:'node maintenance/model.mjs check',
    model:{graph:'maintenance/dependencies.json',intent:'maintenance/intent.md',domain:'maintenance/domain-v22.json'}};
  const graph = {version:1,scope:'The checked public entry and purpose.',sources:{'entry.mjs':sha(source),'purpose.md':sha(purpose)},
    nodes:[{id:'entry',kind:'entry',label:'Public entry',paths:['entry.mjs'],evidence:['entry.mjs']}],edges:[],gaps:[]};
  const domain = {version:1,revision:'First reviewed interpretation.',
    narrative:'A caller returns to the value expecting its meaning to survive between reads.',
    v22PromptSha256:sha(prompt),sources:{'purpose.md':sha(purpose)},unknowns:['Cross-process behavior is unexamined.']};
  const asset = name => join(kit,'files','maintenance',name);
  writeFileSync(join(kit,'contract.json'),JSON.stringify(contract));
  writeFileSync(join(kit,'baseline.json'),JSON.stringify({inputs:{'entry.mjs':sha(source),'purpose.md':sha(purpose)}}));
  writeFileSync(asset('dependencies.json'),JSON.stringify(graph));
  writeFileSync(asset('intent.md'),'Synchrony_Quiddity: Stable value.\nSynchrony_Rules_of_Motion: Trace its users.\n');
  writeFileSync(asset('STATE.md'),'Baseline observed.');
  const cli = fileURLToPath(new URL('engage.mjs',import.meta.url));
  let attempt = spawnSync(process.execPath,[cli,product,'--mode','install-inner','--kit',kit],{cwd:root,encoding:'utf8'});
  assert.notEqual(attempt.status,0);
  assert.match(attempt.stderr,/Missing model asset.*domain-v22/);
  assert.deepEqual(readdirSync(product).sort(),['entry.mjs','purpose.md']);
  writeFileSync(asset('domain-v22.json'),JSON.stringify(domain));
  mkdirSync(asset('lenses'));
  writeFileSync(asset('lenses/intent.md'),'Kit must not replace the installed lens.');
  attempt = spawnSync(process.execPath,[cli,product,'--mode','install-inner','--kit',kit],{cwd:root,encoding:'utf8'});
  assert.notEqual(attempt.status,0);
  assert.match(attempt.stderr,/Reserved kit asset path/);
  assert.deepEqual(readdirSync(product).sort(),['entry.mjs','purpose.md']);
  rmSync(asset('lenses'),{recursive:true});
  execFileSync(process.execPath,[cli,product,'--mode','install-inner','--kit',kit],{cwd:root});
  assert.equal(readFileSync(join(product,'maintenance','intent.md'),'utf8'),
    'Synchrony_Quiddity: Stable value.\nSynchrony_Rules_of_Motion: Trace its users.\n');
  assert.equal(readFileSync(join(product,'maintenance','lenses','intent.md'),'utf8'),prompt);
  const run = (...args) => spawnSync(process.execPath,['maintenance/model.mjs',...args],{cwd:product,encoding:'utf8'});
  assert.equal(run('check').status,0);
  const prepared = JSON.parse(run('prepare','--question','What does the caller need?').stdout);
  assert.equal(prepared.domainRestatement.narrative,domain.narrative);
  assert.equal(prepared.domainRestatement.prompt,prompt);
  assert.deepEqual(prepared.domainRestatement.unknowns,domain.unknowns);
  assert.equal(prepared.domainRestatementGap,null);
  assert.equal(prepared.scenario,null);
  const domainPath = join(product,'maintenance','domain-v22.json');
  const originalDomain = readFileSync(domainPath,'utf8');
  const scenarioDir = join(product,'maintenance','scenarios');
  mkdirSync(scenarioDir);
  const scenario = {...domain, revision:'Hypothetical changed center.',
    narrative:'Imagine callers value immediate local results over persistence.',
    baseDomainSha256:sha(originalDomain)};
  const scenarioPath = join(scenarioDir,'local.json');
  writeFileSync(scenarioPath,JSON.stringify(scenario));
  const whatIf = JSON.parse(run('prepare','--question','What does the caller need?',
    '--scenario','maintenance/scenarios/local.json').stdout);
  assert.equal(whatIf.scenario.status,'hypothetical');
  assert.equal(whatIf.scenario.restatement.narrative,scenario.narrative);
  assert.equal(whatIf.domainRestatement.narrative,domain.narrative);
  assert.deepEqual(whatIf.decisions,prepared.decisions);
  assert.deepEqual(whatIf.graph,prepared.graph);
  assert.equal(readFileSync(domainPath,'utf8'),originalDomain);
  assert.equal(run('check').status,0);
  assert.match(run('prepare','--question','Question','--scenario','maintenance/scenarios/../../outside.json').stderr,/Invalid product path/);
  delete scenario.baseDomainSha256;
  writeFileSync(scenarioPath,JSON.stringify(scenario));
  assert.match(run('prepare','--question','Question','--scenario','maintenance/scenarios/local.json').stderr,/requires a current domain fingerprint/);
  scenario.baseDomainSha256 = sha(originalDomain);
  writeFileSync(scenarioPath,JSON.stringify(scenario));
  assert.match(readFileSync(join(product,'maintenance','semantic-activation.md'),'utf8'),/task-specific\s+narrative/);
  const trace = {question:'What does the caller need?', continuation:'The return after restart needs scrutiny.',
    claims:[{kind:'hypothesis',statement:'A caller may expect persistence.',userOutcome:'The value survives a restart.',
      alternative:'Values are process-local.',counterexample:'Read after restarting.',
      evidence:[{node:'entry',reason:'The entry provides the value.'}]}],openQuestions:['Is persistence promised?']};
  const tracePath = join(product,'trace.json');
  writeFileSync(tracePath,JSON.stringify(trace));
  assert.equal(run('trace',tracePath).status,0);
  delete trace.continuation;
  writeFileSync(tracePath,JSON.stringify(trace));
  assert.match(run('trace',tracePath).stderr,/task-specific domain continuation/);
  const changed = 'Users need a stable value after restart.\n';
  writeFileSync(join(product,'purpose.md'),changed);
  assert.match(run('check').stderr,/Domain evidence changed.*purpose.md/);
  const stale = JSON.parse(run('prepare','--question','What changes after restart?').stdout);
  assert.ok(stale.domainRestatement.gaps.some(g => g.includes('purpose.md')));
  domain.revision = 'Reviewed after restart requirement.';
  domain.narrative = 'A caller expects the value to retain its meaning after restart.';
  domain.sources['purpose.md'] = sha(changed);
  graph.sources['purpose.md'] = sha(changed);
  writeFileSync(join(product,'maintenance','domain-v22.json'),JSON.stringify(domain));
  writeFileSync(join(product,'maintenance','dependencies.json'),JSON.stringify(graph));
  assert.equal(run('check').status,0);
  assert.equal(JSON.parse(run('prepare','--question','What changes after restart?').stdout).domainRestatement.narrative,domain.narrative);
  const outdated = JSON.parse(run('prepare','--question','What changes after restart?',
    '--scenario','maintenance/scenarios/local.json').stdout);
  assert.ok(outdated.scenario.restatement.gaps.some(g => g.includes('baseline changed')));
  assert.ok(outdated.scenario.restatement.gaps.some(g => g.includes('purpose.md')));
  // A source used only by the semantic account may disappear or be renamed.
  // Keep the live model and hypothetical readable while making drift explicit.
  const evidenceDir = join(product,'evidence');
  mkdirSync(evidenceDir);
  writeFileSync(join(evidenceDir,'history.md'),'Recorded origin.');
  domain.sources['evidence/history.md'] = sha('Recorded origin.');
  writeFileSync(domainPath,JSON.stringify(domain));
  scenario.sources = {...domain.sources};
  scenario.baseDomainSha256 = sha(readFileSync(domainPath));
  writeFileSync(scenarioPath,JSON.stringify(scenario));
  renameSync(join(evidenceDir,'history.md'),join(evidenceDir,'renamed.md'));
  assert.match(run('check').stderr,/Domain evidence missing.*evidence\/history.md/);
  const missing = JSON.parse(run('prepare','--question','What remains?',
    '--scenario','maintenance/scenarios/local.json').stdout);
  assert.ok(missing.domainRestatement.gaps.some(g => g.includes('evidence/history.md')));
  assert.ok(missing.scenario.restatement.gaps.some(g => g.includes('evidence/history.md')));
  assert.ok(JSON.parse(run('impact','entry.mjs').stdout).gaps.some(g => g.includes('evidence/history.md')));
  trace.continuation = 'Investigate the recorded origin.';
  writeFileSync(tracePath,JSON.stringify(trace));
  assert.ok(JSON.parse(run('trace',tracePath).stdout).gaps.some(g => g.includes('evidence/history.md')));
  renameSync(join(evidenceDir,'renamed.md'),join(evidenceDir,'history.md'));
  assert.equal(run('check').status,0);
  unlinkSync(join(evidenceDir,'history.md'));
  assert.ok(JSON.parse(run('prepare','--question','What remains?').stdout).domainRestatement.gaps.some(g => g.includes('evidence/history.md')));
  // Missing paths through external or dangling links must still be rejected.
  symlinkSync(root,join(evidenceDir,'external'));
  domain.sources['evidence/external/missing.md'] = sha('missing');
  writeFileSync(domainPath,JSON.stringify(domain));
  assert.match(run('prepare','--question','Question').stderr,/Linked path outside product/);
  delete domain.sources['evidence/external/missing.md'];
  symlinkSync(join(root,'absent'),join(evidenceDir,'dangling'));
  domain.sources['evidence/dangling'] = sha('missing');
  writeFileSync(domainPath,JSON.stringify(domain));
  assert.match(run('prepare','--question','Question').stderr,/Invalid linked product path/);
  delete domain.sources['evidence/dangling'];
  delete domain.sources['evidence/history.md'];
  writeFileSync(domainPath,JSON.stringify(domain));
  const promptPath = join(product,'maintenance','lenses','intent.md');
  writeFileSync(promptPath,prompt+'changed');
  assert.match(run('check').stderr,/v22 prompt changed/);
  writeFileSync(promptPath,prompt);
  domain.sources['../outside'] = sha('irrelevant');
  writeFileSync(join(product,'maintenance','domain-v22.json'),JSON.stringify(domain));
  assert.match(run('check').stderr,/Invalid product path/);
  delete domain.sources['../outside'];
  writeFileSync(join(product,'maintenance','domain-v22.json'),JSON.stringify(domain));
  unlinkSync(join(product,'maintenance','domain-v22.json'));
  assert.match(run('check').stderr,/Missing product path.*domain-v22/);
});

test('inventory preserves semantic links as reviewable when tracked code changes or disappears', t => {
  const temp = resolve(tmpdir()), root = mkdtempSync(join(temp,'ness-inventory-'));
  t.after(() => { assert.equal(dirname(root),temp); rmSync(root,{recursive:true,force:true}); });
  execFileSync('git',['init','-q',root]);
  mkdirSync(join(root,'src'));
  writeFileSync(join(root,'src','main.js'),"import {parse} from './parser.js';\nimport '@scope/lib/subpath';\n");
  writeFileSync(join(root,'src','parser.js'),'export const parse = () => 1;\n');
  execFileSync('git',['-C',root,'add','src']);
  const first = inventory(root);
  assert.ok(first.edges.some(e => e.from === 'file:src/main.js' && e.to === 'file:src/parser.js'));
  assert.ok(first.edges.some(e => e.to === 'external:@scope/lib'));
  const existingImport = first.edges.find(e => e.from === 'file:src/main.js' && e.to === 'file:src/parser.js');
  delete existingImport.origin;
  existingImport.evidence = ['src/main.js:1 static module reference'];
  const documentedFile = first.nodes.find(n => n.id === 'file:src/main.js');
  delete documentedFile.origin;
  documentedFile.kind = 'public-api';
  documentedFile.evidence.push('Reviewed public entry');
  first.nodes.push({id:'journey',kind:'journey',label:'User reads output',paths:[],evidence:['User scenario']});
  first.edges.push({from:'file:src/parser.js',to:'journey',kind:'serves',evidence:['Scenario']});
  first.edges.push({from:'file:src/main.js',to:'file:src/parser.js',kind:'imports',evidence:['src/main.js:99 external analysis'],status:'reviewed'});
  const unchanged = inventory(root,first);
  assert.equal(unchanged.edges.filter(e => e.from === 'file:src/main.js' && e.to === 'file:src/parser.js').length,2);
  assert.ok(unchanged.edges.find(e => e.to === 'file:src/parser.js').evidence.includes('src/main.js:1 static module reference'));
  assert.equal(unchanged.edges.find(e => e.evidence.includes('src/main.js:99 external analysis')).status,'reviewed');
  assert.equal(unchanged.nodes.find(n => n.id === 'file:src/main.js').kind,'public-api');
  const repeated = inventory(root,unchanged);
  assert.deepEqual(repeated.edges,unchanged.edges);
  writeFileSync(join(root,'src','parser.js'),'export const parse = () => 2;\n');
  const changed = inventory(root,unchanged);
  assert.equal(changed.edges.find(e => e.to === 'journey').status,'requires-review');
  assert.equal(changed.edges.find(e => e.evidence.includes('src/main.js:99 external analysis')).status,'requires-review');
  execFileSync('git',['-C',root,'rm','-q','-f','src/parser.js']);
  const removed = inventory(root,changed);
  assert.ok(removed.nodes.some(n => n.id === 'file:src/parser.js' && n.status === 'requires-review'));
  assert.ok(removed.edges.some(e => e.to === 'journey' && e.status === 'requires-review'));
  assert.ok(removed.gaps.some(g => g.includes('could not be resolved')));
});
