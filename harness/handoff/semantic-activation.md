# Reasoning from a product model

Use this guide after running `node maintenance/model.mjs prepare --question "USER NEED"`.
The packet includes the v22 account, product contract, graph, coverage gaps, and lexical
leads. The full graph and narrative remain available even when those leads miss a synonym.

When a grounded domain restatement is present, read it with the original v22 prompt in
the packet. Let its lenses bring the product's load-bearing center into focus: why people
brought it to life, what they hoped to make possible, what people now protect or return
to, and how its tensions and repairs have moved over time. Continue that understanding
in the language of the current product and task. Explore what may come next and what
observable difference that continuation predicts. Let the evidence determine which ideas
matter rather than forcing a category onto the product. Write a short task-specific
narrative in your reasoning before making the structured trace below. Identify the
distinction between direct evidence, interpretation and proposed probes. A creator's
thoughts are an inference unless the creator expressed them in the evidence.
If the packet reports that the restatement is missing or its evidence is stale, keep that
gap visible and ground or review it before treating it as a product model.

Look for the software's own whatness and what relates to or orbits it. Notice resonance
where code, public behavior, documentation, and people's accounts reinforce an idea,
and dissonance where they pull apart. Follow those relationships as leads, including
places where the center is still taking shape or more than one reading fits. Use probes
through code and real entry points to see which reading changes an observable outcome.
Treat an unrun probe as a prediction, and preserve disagreement and missing evidence.

Attend to time: the origin and intended future, recurring protected ideas, changes in
use, repairs, reversals, oscillations, and boundaries that moved. Earlier choices and
later observations can illuminate each other without making undocumented motives facts.
Carry the parts that matter into the task-specific continuation and proposed probes.
These are lenses for discovery, not fields that every product must fill.

To explore a different center, create a separate hypothetical JSON file under
`maintenance/scenarios/` with the same provenance fields as the current domain
restatement and a `baseDomainSha256` hash of the current `maintenance/domain-v22.json`.
Run the following command.

```sh
node maintenance/model.mjs prepare --question "USER NEED" --scenario maintenance/scenarios/NAME.json
```

The packet preserves the current restatement,
decisions, and graph alongside the explicitly hypothetical scenario. Compare how
the alternate center could reorganize relationships, tensions, consumers, and
future choices. Identify which expected observations would change, what evidence
or decision would distinguish the paths, and which code or public-boundary probes
could test the consequences. Explore competing possibilities and unresolved
policies without silently changing established promises. A scenario and its
predictions are proposals, not an automatically recomputed equilibrium or a
revision of the historical model. Record the comparison and its evidence before
promoting any separately authorized change.

Read the user's request and the product purpose together. Consider all the journeys and
other semantic nodes in the packet, including those without overlapping words. Trace the
journey from a person's goal through observable behavior and then through the producers,
consumers, stored data, or external boundaries involved. A source path or static edge is a
reason to investigate, not by itself evidence of runtime behavior or user intent. Follow
links in both directions when a dependent consequence could change the user's experience.

For each material distinction, state what a person would observe, the product authority or
evidence for it, a plausible different reading, and an input or event that would distinguish
the two. Keep documented promises and decisions (`direct`), interpretations of evidence
(`inferred`), and newly proposed projections (`hypothesis`) distinct. Report unknown callers,
conflicts, costs and unexamined areas as open questions; do not fill gaps from plausibility.
The model's purpose can suggest new probes, but a proposed outcome stays a prediction until
it has been checked. Consider an ordinary neighbor where the proposed rule should not apply.

Freeze the reasoning before changing code or receiving evaluation feedback. Write a JSON
file with the following shape and run `node maintenance/model.mjs trace FILE`:

```json
{
  "question": "The user-facing need or change",
  "continuation": "A task-specific domain narrative; required when a grounded restatement is present",
  "claims": [{
    "kind": "direct | inferred | hypothesis",
    "statement": "What matters and why",
    "userOutcome": "What the person would observe",
    "alternative": "Another plausible reading or decision",
    "counterexample": "Input or event whose observable outcome distinguishes them",
    "evidence": [{"node": "graph-node-id", "reason": "How this evidence supports the claim"}]
  }],
  "openQuestions": ["What remains unknown or needs a decision"]
}
```

Use a graph node ID to identify recorded evidence, or `request` to identify the current
user's instruction. A hypothesis can cite the observation that inspired it; the citation
does not make the predicted outcome established. Follow referenced evidence before asserting
a direct promise. The trace checker validates the shape and IDs, not whether a citation
supports a claim, whether a prediction is true, or whether the graph is complete. Preserve
the trace with its revision and actual probe results so later work can correct it.
