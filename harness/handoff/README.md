# Learning a repository and handing over its operation

## What the outer harness owns

For every engagement, recover enough of the product's purpose and decisions to do real work. Start from the version people use. Trace a requested change through its entry points to the decisions it touches. For each consequential decision, record who or what gives it authority, which neighboring behaviors depend on it, and how to observe whether it holds. Preserve uncertainty with an owner and a next probe. Use that account to make and verify a change. Return lessons that might apply to other repositories to outer memory with their scope and evidence.

## What an installed inner loop owns

“Operate this repo this way” is the entry point for someone arriving with only the checkout. It brings two kinds of knowledge together.

- **This product.** Where to start, which decisions govern the requested work, what must remain true, how to run the relevant checks, and which questions still need an owner's judgment.
- **How to maintain that knowledge.** Find the affected decisions before editing. Probe competing explanations, obtain a decision when intent is unresolved, verify the change at its real boundary, and update the local decision and evidence together. State when each inherited rule applies here. A lesson from another repo enters as a question until local evidence supports it.

Put the entry point in ordinary versioned files discoverable from the project's README or contributing guide. The product's own commands enforce the checkable obligations. Any IDE or agent with checkout access can follow the same path, including one that needs to be pointed to the guide explicitly. Which prompt files an editor loads automatically is a separate concern.

## What counts as a successful handoff

The target is near parity with the outer harness **for work on this repo**, including work the installer did not anticipate. A future agent should be able to discover an unstated constraint, challenge a stale rule with evidence, seek a product decision when needed, and improve the operating instructions for its successor. The checkout supplies enough knowledge to begin. The agent can still ask the person who owns a genuinely new decision.

Judge both runs against the product. Two agents can agree and still miss the same feature. Before reconstruction, inventory the public workflows and supported configurations, recover requests from the available issue trackers, chats and design records, and identify the deployed version, integrations and stored data that callers rely on. Keep the following four results separately reviewable.

| Result | Evidence required |
| --- | --- |
| Working features | Map each supported workflow and variant to a baseline observation and a post-change check at its public boundary. Include older data and important UI or integration paths. Record every intentional behavior change and its authority. |
| Repairs | For each problematic feature, record the reproduction, the intended outcome and any uncertainty. Exercise the repair through the affected entry point and verify the neighboring behavior that must survive. An unresolved defect remains visible in the backlog. |
| Full issue and feature list | Reconcile every identified request, deeper issue and unfinished path to a source, affected behavior, current status and next decision or acceptance check. Distinguish open, repaired, superseded, deferred and still unverified items. Account for duplicates and preserve their sources. Record which product surfaces and sources were examined and any gaps that still prevent a completeness claim. |
| Maintainable organization | Trace ownership through code, configuration, modules, dependencies and operations. Consolidate repeated decisions into reusable code when their semantics and authority match. Verify configuration defaults and overrides, existing callers and migrations after moving responsibilities. For unused assets, settings, branches of code and partial features, decide whether to retain with an owner, finish, archive with provenance and a recovery path, or remove once consumers and compatibility have been checked. Demonstrate that a later change can use the reorganized path. |

Code size and textual similarity can direct an investigation. To justify a reorganization, name the specific change that currently requires synchronized edits, then show how the revised organization lets one owner make it safely. For cleanup, check runtime registration, persisted references, scheduled jobs and external callers as well as imports. An inaccessible consumer or missing device check stays open.

To qualify a handoff, give the outer harness and a fresh repo-only agent the same unfamiliar request on separate copies of the same product revision. Give both the same product permissions, runtime and route for owner decisions. Hold the agent and tools constant for the first comparison. Only the outer run gets the outer memory. Set acceptance criteria before either run and keep the expected solution out of the handoff. Compare the user-visible result, behavior that had to survive, treatment of ambiguity, executed evidence and the state each leaves for the next maintainer. Allow different valid implementations. Record any essential help the repo-only agent needed from the outer loop.

Repeat across capabilities and agent environments before generalizing.

## Choosing the mode

Choose the mode for each engagement. The default is **outer-only**.

| Mode | What the factory does | What the repository receives |
| --- | --- | --- |
| `outer-only` | Use the outer harness to discover behavior, resolve intent, implement the requested work and verify it. | The product changes and tests warranted by the task. The mode selector writes no setup files. |
| `install-inner` | Ground a local contract, prepare a product-specific kit, install it explicitly and qualify the handoff. | Repo-owned IDE instructions, decisions with authorities and checks, unresolved questions, continuation state, and a runnable native verification command. |

```sh
node harness/engage.mjs /path/to/repo
node harness/engage.mjs /path/to/repo --mode outer-only
node harness/engage.mjs /path/to/repo --mode install-inner --kit /path/to/reviewed-kit
```

The default command returns the [small core](../core.md) in its JSON `guidance` field. Use it with the request and the checkout even when the target has no decision map. Store a distinction learned there with the product and its regression test.

The selector controls setup. The normal outer investigation and product work still require an actual task. Omission of the mode selects outer-only, even if a kit is supplied. Choosing outer-only after an installation preserves the repository's existing instructions and checks. It is not an uninstall operation.

## Preparing a kit for a messy project

1. Identify a real user journey and its public entry points. Reproduce existing behavior on representative inputs. Map duplicated logic, ownership and failure boundaries along that journey.
2. Separate promises supported by user intent or documentation from observed quirks. When two paths disagree, record the input and the actual results. Name the decision owner and the evidence that would resolve the difference.
3. Put the smallest useful set of decisions, examples and checks under product ownership. Reuse the product's native test runner and conventions. Run the checks before refactoring. Then consolidate one duplicated decision at a time while preserving its observed callers.
4. Copy the product alone. Use its local instructions to find the intended behavior, run its checks, expose a regression, repair it, and extend a rule. Record separately whether a fresh maintainer or IDE agent actually completed the work.

A reviewed kit has a `contract.json` with purpose, entry points, required or characterized decisions, check IDs, open questions and the native verification command. Its `baseline.json` pins the inputs on which the decisions depend. Its `files/` tree contains the repo-owned checks and `maintenance/STATE.md`. The installer checks the baseline, copies the kit, and appends a bounded section to existing root `AGENTS.md` instructions. Differing local files require reconciliation. Local decisions and tests can evolve after the handoff without running the installer again.

For a full model, the kit additionally declares `model: {"graph":"maintenance/dependencies.json","intent":"maintenance/intent.md"}` in its contract and supplies those two files in `files/maintenance/`. Older kits without this declaration remain installable and do not carry the model. The factory builds and grounds the model before installation. The installer copies it and adds `maintenance/model.mjs`; it does not discover a repository or synthesize v22 by itself.

The graph has version `1`, a human-readable `scope`, `sources` mapping product paths to SHA-256 fingerprints, `nodes` with `id`, `kind`, `label`, `paths` and nonempty `evidence`, `edges` with `from`, `to`, `kind` and nonempty `evidence`, and a `gaps` array. Include both code dependencies and semantic connections to journeys, claims and decisions. The intent account uses v22, citing direct authority, evidence, inferred intent, tensions and unknowns, with `Synchrony_Quiddity` and `Synchrony_Rules_of_Motion`. Source fingerprints should cover evidence whose change requires renewed interpretation, including relevant purpose documentation.

For a grounded domain restatement, the kit may additionally declare `model.domain` as `maintenance/domain-v22.json` and supply that file. During grounding, read the [intent lens](../memory/intent.md) alongside available product evidence and history. Use its lenses to recover the product's load-bearing center in the product's own language: why people brought it to life, what they hoped to make possible, what people protect or return to, and how tensions and repairs move over time. Let the evidence determine what matters. Preserve uncertainties and meaningful differences. A creator's thoughts are inferred unless the creator expressed them, while proposed continuations remain open to probing. Do not force a predetermined list of concepts. The product-owned JSON contains `version: 1`, a free-form `narrative`, a `revision` description, an `unknowns` array, `v22PromptSha256` for the supplied intent lens, and `sources` mapping product evidence paths to SHA-256 hashes. The installer supplies the lens at `maintenance/lenses/intent.md`, distinct from the product-specific `maintenance/intent.md`. Evidence changes call for a review and a new restatement or an explicit decision to retain it. Keep earlier revisions in version history.

Discover the software's own whatness and what relates to or orbits it. Follow resonance between evidence and dissonance between competing accounts, code and observable behavior. Use code and public-boundary probes to test predicted consequences. Preserve the temporal story where it matters, including origin, returned themes, repairs, reversals, changed boundaries and unknown history. These are open-ended lenses, not mandatory categories. Separate observations, inferences and proposed continuations, and carry useful projections into the next task.

Existing modeled kits without `model.domain` remain installable. Their activation packet explicitly reports that the grounded domain restatement is missing. `model.mjs check` detects missing or stale declared restatement evidence and prompt changes. `prepare` includes the original prompt and restatement for a reasoning agent, or a visible gap for a legacy kit. These checks validate provenance, not whether the narrative or the agent's continuation is sound.

A separate file under `maintenance/scenarios/` can explore a hypothetical center using the domain restatement schema plus `baseDomainSha256`, the hash of the current domain restatement. Pass it with `prepare --question "USER NEED" --scenario maintenance/scenarios/NAME.json`. The returned packet includes the current and hypothetical accounts and unchanged graph and decisions. A reasoning agent can compare their consequences, unresolved tensions, affected relationships and distinguishing probes. The command marks the scenario hypothetical and flags stale evidence or a changed baseline. It does not re-equalize the model, authorize a policy change, or overwrite history.

The installed maintainer runs `node maintenance/model.mjs impact PATH...` before changing paths, follows relevant links and reviews the intent. Run `node maintenance/model.mjs check` as part of the product verification. It checks graph integrity, resolved paths, synchrony markers and fingerprints. After any source or purpose evidence changes, run `node maintenance/inventory.mjs . maintenance/dependencies.json maintenance/dependencies.draft.json` to generate a candidate without replacing the current graph. The command inventories tracked working-tree files, fingerprints them and extracts candidate literal JavaScript/TypeScript imports. Other languages, untracked files, dynamic calls and plugins require separate investigation. On refresh, semantic edges are retained and marked for review when their referenced evidence changes. Inspect the candidate and intent together, reconcile removed or changed facts, record new evidence and gaps, and verify the accepted model. The tool does not infer intent or determine whether the interpretation is correct or complete.

Use `node maintenance/model.mjs impact --question "USER NEED"` to retrieve records from a behavioral question. It ranks exact overlapping words in node IDs, labels and evidence, returns the matching words and fields, and includes adjacent relationships. This lexical heuristic can miss relevant ideas expressed in different words or find incidental matches. An empty result is a retrieval gap to investigate.

For semantic activation, run `node maintenance/model.mjs prepare --question "USER NEED"` and follow the installed `maintenance/semantic-activation.md`. The packet supplies the whole intent narrative, contract, graph, gaps and lexical leads so the maintainer or model can infer relevant journeys even when wording differs. Before coding, preserve a trace of the claims, user-visible consequences, alternatives, counterexamples, evidence and unknowns. `node maintenance/model.mjs trace FILE` checks its structure and referenced graph nodes. These commands provide and validate the context for reasoning; they do not call a model or establish that an interpretation is true. Validate each inference at the product boundary.

For an inherited import observation the scanner cannot reproduce, the draft preserves its evidence and requests review. After independent review, set its status to `reviewed` to retain it without a repeated alert. A change to a referenced source returns it to `requires-review`. The disposition is a maintainer assertion, not independent validation by the scanner.

The factory must supply the product knowledge and meaningful tests. Copying a kit alone does not establish that an unfamiliar project has become maintainable.

The [installer test](../handoff.test.mjs) exercises both modes against a temporary target and runs the installed check in that target.
