# How to test whether a decision was understood

The Git gate answers **which candidate passed which checks**. To evaluate understanding, pick one decision where two plausible readings predict different user-visible behavior. Test the predictions. A correct patch alone cannot tell us whether the worker understood the decision or reused a helper that happened to implement it.

## Next bounded trial

1. **Ground the decision.** Choose one user-visible obligation. Record its authority (user decision, documented contract, or observed compatibility), its scope, and what remains unknown. If the available evidence supports two product policies, record the unresolved choice before treating either as a defect.
2. **Prepare the contrast independently.** Freeze a correct reference, a plausible wrong version, and a neighboring case where both should agree. Verify that the wrong version reaches the disputed behavior through a normal public entry point. Keep the grader and one unseen variation outside the worker's context. Record the Git revision and exact local delta for each candidate.
3. **Ask for a prediction before implementation.** Give the ordinary request and the same neutral prompt to each worker: “Which distinction could change what the user observes? What do you predict in the two cases, and why?” For competing obligations, freeze the worker's trace from product purpose to the affected callers and its reason for treating each outcome as required, preferred, or unresolved. Keep the hidden caller and reference solution out of the prompt. Save the prediction, source of authority, and a case that could disprove it before revealing any grading outcome. Record memory lookup separately.
4. **Test the worker's evidence both ways.** Freeze the patch. Run its new tests on the correct and faulty versions, independently verify the fault was exercised, and inspect the failing assertion. Credit a test only if it passes the correct behavior and rejects the wrong one for the predicted public outcome. A crash, different private representation, or setup failure earns no credit. Report inherited protection separately.
5. **Test the boundary of the explanation.** Before feedback, present one unseen variation with a different surface form and one near miss where the rule should not fire. Ask for the outcomes and reasons, then execute the oracle. Do not give the worker a second copy of the memorized case.

Report four separate results: product behavior, prediction with evidence, sensitivity of the worker's new tests, and transfer including the negative control. Use **demonstrated, contradicted, or unmeasured** for each decision and cite the observation. Do not average them into an “understanding percentage.” One useful failure is “found the right passage, shipped working code, but its test would accept the wrong rule.”

Start with one decision and one held-out contrast. If a miss recurs, return to the step that failed: retrieval, interpretation, fixture construction, or observation. Expand the standing harness only if the evidence shows which step needs help.

## When a repair affects other callers

Before coding, freeze a short chain of observations. Start with the reported operation. If another caller relies on the mechanism, identify what it must observe. If its result changes subsequent behavior, identify the next observable consequence, such as which bytes a relative read returns after an error. Stop when the evidence for another dependency runs out.

Require a regression check at each consequential step. Reuse an inherited test when it catches the fault. For a downstream claim, try a plausible partial repair that passes the preceding check and breaks that claim. Record the failing assertion and include the distinguishing test with the repair. A hidden grader can identify a missing test, but the delivered suite still needs to catch the regression on the next change.

## Spending a bounded budget on speed

Establish the least costly known-correct repair first. Treat speed as a preference on the affected workload unless a product contract makes it a requirement. For a plausible local improvement, freeze one hypothesis, a candidate limit, a measurement budget, a meaningful gain and an acceptable neighboring cost. Keep the first correct repair available throughout.

Use matching optimized builds and workloads. Interleave paired measurements, report uncertainty, and confirm a qualifying gain on fresh samples. Run the same regression chain and relevant inherited suite on both correct builds. Keep the optimization only when it meets the declared gain and guardrails. Otherwise ship the correct baseline and qualified tests, and record the attempted change, measured cost and scope. For a blind comparison, give both workers the same budget and withhold the grading cases.
