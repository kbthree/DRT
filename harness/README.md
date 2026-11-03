# Harness components

The [small core](core.md) grounds the request at a public entry point. [The contract](contract.json) describes the decisions and responsibilities of the outer loop. The [planner and gate](gate.mjs) assign obligations to tasks and return failed evidence to the decision that owns it. Supply the product's contract and receipts when using these functions on a target.

The [allocation policy](loop.mjs) starts with one context and separates independent questions when their boundaries are clear. Run `npm run harness:subjects` on the bundled self-description, or pass `-- /path/to/subject.json` for an external engagement. The [self-description](subject.json) shows the schema. A subject's paths are relative to the directory holding its manifest.

[Search](search.mjs) chooses a discriminating next probe. [Packets](packets.mjs) bind a worker's named context and execution requirements. [Lessons](lessons.mjs) connects selected claims to their local evidence. For comparative work, [experiment checks](experiments.mjs) validate frozen receipts and revisions, and [attention checks](attention.mjs) test whether presentations contain the same facts.

Use the [v22 instructions](memory/intent.md) to update [continuation](continuation.md) with corrected assumptions, remaining tensions and the next action. [Patterns](patterns.md) are questions to test on a new target. The [claims ledger](claims.json) preserves their authority, scope and historical sources. Consult history on demand.

The [mode guide](handoff/README.md) describes the outer-only workflow and the product-owned inner loop. The [Git workflow](git-workflow.md) describes the gate for delivering this package.
