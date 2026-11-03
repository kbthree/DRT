# Activating a repository's decisions

Keep a versioned decision map with the product it describes. Start with known user journeys, changed file paths **and their consumers**. Supply each path and the change question as separate arguments. To see the lookup mechanism using a fictional example bundled with this harness, run:

    node harness/decision-map.mjs harness/memory/example-decisions.json example/save.mjs "retry after an interrupted save"

The example's files, contracts and evidence are invented; they are not evidence about an installed product. Create a separate map from the target repository's actual contracts, tests, and observed behavior. An empty result is a gap in the map. Trace the caller and ask a new question. Use the memory reader to search the narrative history when precise paths or cues are unknown.

Read the matched decisions. Each explains its authority, a nearby case with a different outcome, a probe and where to find the evidence. Related entries name the condition that makes a second obligation relevant. Follow those links when the condition holds.

Before coding, record which entries apply, which user's observation changes, and which counterexample would reverse the decision. Exercise the probe against the candidate and a version that violates the rule. Record misses and unresolved cases. When evidence changes the rule, update the product map, path bindings, and evidence reference together. Keep the old revision in Git. Add a new entry for a newly learned obligation rather than silently generalizing another product's behavior. A lookup establishes retrieval; the probe establishes whether the decision affected the result.

## Deciding what a repair must preserve

Start at the product level when two plausible repairs protect different behaviors. State what the product enables a person to do and find where its design makes a concrete commitment in service of that purpose. Follow that commitment through a public operation to the decision under repair. Then trace outward from the decision to another affected caller. A shared helper identifies a place to investigate. The other caller's own contract determines whether the same promise applies.

Before coding, freeze one sentence for each plausible reading: “If we choose this behavior, this caller will observe this outcome, and this source says why it matters.” Identify whether the source establishes a requirement, supports a preference to measure, or only records what the old build did. Prior user decisions, public contracts, and demonstrated downstream reliance can establish obligations. Broad goals such as speed identify costs to measure. If two outcomes still satisfy the evidence, leave the implementation choice open. If choosing between them changes a consequential public policy, record the unresolved decision and its owner.

Use stable IDs per product. Paths are exact repository-relative files or directory prefixes ending in a slash. Cues are complete words or phrases. Related entries are one step deep to keep speculative dependencies separate from direct matches. Populate from executed work and label observed implementation choices separately from documented promises.
