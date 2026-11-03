# Delivering the portable harness

1. In a fresh clone, run `npm run git:setup`. This configures repository-local hooks, fast-forward pulls, pruning of stale remote-tracking refs and byte-preserving checkouts.
2. Work from a known commit on a focused branch. Inspect `git status --short --untracked-files=all`, `git diff` and `git diff --cached`. Stage the intended source, tests, operating guidance and transferable memory. Keep target checkouts and raw engagement evidence in their own workspaces.
3. Run `npm run harness:check`. It runs the portable test suites and validates the package boundary, decision graph, claims ledger and v22 memory. The receipt under `.harness-local/` records HEAD, index entries, working file digests, runtime and actual command results. The checks compare the snapshot after each command.
4. Run `npm run harness:verify`. The pre-commit hook requires fresh evidence and a staged delivery matching the tested bytes. If a helper was added or an edit was partially staged, stage the intended files and run the evaluation again. The pre-push hook checks the committed tree and the ref being delivered. The CI workflow runs the gate from a clean checkout.

Git inventory includes tracked files and new files visible under the versioned ignore policy. The package audit rejects force-staged research files and directories outside the declared package layout. Global ignore rules cannot hide a new file from the guard. Conflicted indexes, submodules and symlinks require their own evaluation boundary. A snapshot comparison observes changes at command boundaries.

Historical experiment replay is a separate activity in the research workspace. For evaluating the meaning of a product change, use the [semantic protocol](semantic-evaluation.md).
