# Operating this repository

Start with the observable request and the nearest counterexample in [the small core](harness/core.md). Retrieve relevant history from [continuation](harness/continuation.md) when a decision depends on it. Preserve frozen submissions, including failed ones. Keep product-specific policy with its product.

For a new target, use [the mode guide](harness/handoff/README.md). Outer-only is the default. Install a native inner loop when requested.

Start from a known commit on a topic branch. Inspect staged, unstaged, and untracked files before editing. Stage the intended source, tests, configuration, and evidence together, then run `npm run harness:check` and `npm run harness:verify` before committing. A fresh clone needs `npm run git:setup` once to enable the local hooks. See [the delivery boundary](harness/git-workflow.md).

The Git receipt establishes which files passed. For a claim about understanding, show which user-visible outcome changes when the disputed decision is reversed. Preserve unresolved cases as such.

When a change touches a previously studied decision, query the product's [decision map](harness/decision-memory.md) with the affected paths and the behavioral question. Follow the conditional links that apply and record what the probe showed.
