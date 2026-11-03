# Patterns to investigate

These are working questions, not product rules. Use the [claims ledger](claims.json) to distinguish policies from hypotheses. Ground each application in the target's own evidence, and record the outcome and remaining uncertainty.

| Pattern | Question | Distinguishing evidence |
| --- | --- | --- |
| Meaning, representation and encoding | Which transformations are policy, presentation or transport? | Check intended values through an independent consumer or decoder. |
| Fallible work and state | Which reads, validations or callbacks can fail after mutation starts? | Exercise each relevant failure and inspect state and identity. |
| Associations | What metadata belongs to an occurrence, object or boundary? | Transform equal values with different metadata and check both associations. |
| Intent and materialization | What happens when an item disappears and returns, or a selection becomes empty? | Exercise absence, return, and future inputs. |
| Absence and invalidity | Is a missing setting different from null, empty or invalid? | Test each state and any fallback or mutation. |
| Semantic role | Is a container owned configuration, an opaque callback or shared user data? | Check identity and independence through the lifecycle. |
| Observer | Is the test reading storage, a copy, a view or a normalized result? | Verify runtime, imports, accessors and the oracle's assumptions. |
| Reachability | Does the change make an old path reachable with new input? | Trace and test the new downstream state and its consequences. |
| Context and allocation | What independent question would another context answer? | Record its input, result, integration and cost; avoid assuming more contexts are better. |

A structural audit can show that a plan and its evidence are present; an accountable reviewer must still determine whether the evidence supports the claim. An inherited behavior can be a compatibility obligation without being desirable in a new design. Treat speed as a measurable product preference or requirement, using the same correctness checks for each candidate.
