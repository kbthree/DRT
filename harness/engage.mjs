import {readFileSync, realpathSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {fileURLToPath} from 'node:url';
import {install} from './handoff/install.mjs';

// Mode is a choice about what the factory leaves in the target.
// Existing project files are never a signal to switch modes or uninstall.
export function engage(repo, {mode = 'outer-only', kit} = {}) {
  if (!['outer-only', 'install-inner'].includes(mode)) throw new Error('Choose outer-only or install-inner');
  const target = realpathSync(repo);
  if (!statSync(target).isDirectory()) throw new Error('Target must be a repository directory');
  if (mode === 'outer-only') {
    const guidance = readFileSync(new URL('./core.md', import.meta.url), 'utf8');
    return {mode, target, installed:[], responsibility:'Outer harness owns this engagement.', guidance};
  }
  if (!kit) throw new Error('install-inner requires a grounded --kit');
  const installed = install(kit,target);
  const contract = JSON.parse(readFileSync(resolve(kit, 'contract.json'), 'utf8'));
  return {mode, target, installed, model:contract.model ? 'dependency and intent assets installed' : 'legacy kit without dependency and intent model', responsibility:'Routine maintenance uses the instructions and checks inside the product.'};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {values, positionals} = parseArgs({
      options:{mode:{type:'string'}, kit:{type:'string'}, help:{type:'boolean'}}, allowPositionals:true,
    });
    const usage = 'Usage: node harness/engage.mjs REPO [--mode outer-only|install-inner] [--kit KIT]';
    if (values.help) {
      console.log(usage + '\nouter-only (default): leave setup files alone.\ninstall-inner: install a reviewed, baseline-bound kit.');
    } else {
      if (positionals.length !== 1) throw new Error(usage);
      console.log(JSON.stringify(engage(positionals[0], values), null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
