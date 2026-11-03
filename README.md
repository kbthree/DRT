# DRT

DRT helps people and coding agents change software while keeping sight of why it exists, what its users rely on, and what a change might affect. It combines a small set of reasoning instructions with tools for recording decisions, tracing dependencies, and checking evidence, so useful understanding can travel with the work.

## Get started

You need Git and Node.js 20 or newer. There are no npm dependencies.

```sh
git clone https://github.com/kbthree/DRT.git
cd DRT
npm run harness:check
```

Choose a repository and a concrete request. Ask your coding agent to read [the small core](harness/core.md), then give it the target checkout and the request. You can also print the core guidance for a target:

```sh
npm run harness:repo -- /path/to/target
```

This default **outer-only** mode returns guidance and leaves the target's setup files untouched. The agent still investigates and implements the request; the command does not run an agent or modify the target on its own. Start at a user-visible entry point, reproduce the behavior, identify plausible alternatives and the closest case where their outcomes differ, and test the obligations that matter.

### Install a product-owned inner loop

For a repository you want to maintain over time, prepare a reviewed kit grounded in that product's actual behavior and evidence. A kit contains its contract, baseline, continuation state and native checks. A full model can also include a dependency graph and an intent account. See the [handoff guide](harness/handoff/README.md) for the format and qualification procedure.

```sh
npm run harness:repo -- /path/to/target --mode install-inner --kit /path/to/reviewed-kit
```

The installer checks the baseline and copies the kit into the target, where future maintainers can use and update it. It does not automatically discover a repository, build the graph or infer its intent. Test the installed checks in the target and evaluate the handoff on an unfamiliar change.

### Maintain DRT

To work on this repository, enable its local Git hooks once, then stage the intended changes and run the delivery checks:

```sh
npm run git:setup
# Make and stage changes.
npm run harness:check
npm run harness:verify
```

The setup configures repository-local Git hooks and settings. The [Git workflow](harness/git-workflow.md) explains the resulting receipt and delivery boundary. The optional memory reader requires Python 3.

## Why it works this way

A passing test can show that a specific check passed; it cannot by itself explain why the software behaves that way or prove that a nearby case is safe. DRT asks the maintainer to connect purpose and evidence to observable behavior, compare plausible decisions, and keep uncertainty visible. A useful test distinguishes the desired outcome from a plausible wrong one.

The **intent lens** helps describe a product's purpose, relationships, tensions and changes over time. A **dependency graph** connects the code and decisions that may be affected. Together they give an agent places to investigate; neither replaces the product's own evidence or the owner's decisions. Product-specific knowledge stays with the product, while general [patterns](harness/patterns.md) remain questions to test rather than rules to copy.

The harness also records checks and their inputs, preserves earlier experiment results, and separates observations from hypotheses. These mechanisms make work reviewable; they do not guarantee semantic understanding, full compatibility, or correctness. See the [semantic evaluation protocol](harness/semantic-evaluation.md) for testing those claims and the [harness overview](harness/README.md) for the available components.
