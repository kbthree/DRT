# DRT

DRT helps a coding agent learn enough about an existing application to fix a bug or add a feature while preserving the choices people already rely on. You can use it on an unfamiliar library, a mature service, or an app you built one prompt at a time.

Start with the change you want. The agent traces the affected behavior through the code, looks for similar features, and checks tests, documentation, and past decisions to understand why the app works the way it does. It follows established patterns where they still fit and flags choices the evidence leaves open. You can use these rules for one change or install them in the repository so future agents can build on what you learn.

## Start from your coding agent

Open your app’s repository in your coding agent. Tell it, “Get a separate checkout of https://github.com/kbthree/DRT.git and read its AGENTS.md and harness/handoff/README.md.” Then pick the request below that fits what you want today.

| What you want | How DRT helps | What to ask your agent |
| --- | --- | --- |
| **Help choosing what to work on** (outer loop) | The agent uses DRT from outside your app. It can compare issues, trace related symptoms, and propose a change small enough to test. You can use it for one repair without installing rules. | “Use DRT to look at the open issues and the code they touch. Which fix would help users most? Show me the evidence and a way to test it before we choose.” |
| **Consistent rules for future changes** (inner loop) | The agent installs operating instructions, decisions, and checks in your app’s repository so later sessions know what behavior to preserve and how to verify a change. | “Install the DRT inner loop. Trace our main user journeys, record the promises people rely on, and run the checks in this repo.” |
| **A lasting map of how the app works and why** (full inner loop) | The agent installs the same rules and also builds a dependency graph and a written model of the app’s intent. Future sessions can trace a proposed change through related features and revisit why they behave as they do. | “Install the full DRT inner loop. Inventory the app, map how its parts depend on each other, and show me where you found evidence for its intent and where you need my judgment.” |

You can start with the outer loop while deciding what deserves attention and install either inner loop when you want future agents to carry that understanding forward.

## When new features keep breaking old ones

If your vibe-coded app grew faster than its tests, start with a feature that has broken twice. In a notes app, for example, closing the editor might save a draft. Adding a Discard button could accidentally make both actions erase it because they share the same code.

Ask your agent to install the full inner loop. As part of the installation, it can build a **semantic graph** linking each action to what the user expects and the code responsible, then add regression tests to the app’s regular checks. In this example, one test closes the editor and reopens the draft. Another discards the draft and checks that it stays gone. The graph tells a future agent why both paths matter. Running both tests before accepting a change catches a broken promise while there is still time to fix it.

> Install the full inner loop in this app. Start with our recurring regressions. Map the affected features and the behavior each should preserve, add tests that reproduce the old failures, and include them in the checks we run for each new feature.

## What gets installed

The agent prepares a kit for your particular app. It identifies the behavior people depend on, records decisions and open questions, and selects checks that exercise those behaviors. The installer adds instructions to the app’s AGENTS.md and keeps its maintenance records under maintenance/. For a full inventory, ask the agent to include a dependency graph showing how the pieces connect and a written account of the app’s intent. The agent builds these from its investigation. You can correct its interpretation before it becomes a rule.

## Make the next change

Consider adding column renaming to a reporting tool. Changing the heading looks right on screen, but a saved sort may still point to the old name. The agent needs to learn how the tool identifies columns, which settings follow a column, and how similar operations handle saved preferences. That tells it what to implement and what to test.

> Add column renaming. Follow the existing conventions for changing a report. Show me what happens when I rename a column that already has sorting and formatting set, then save and reopen the report. Record any compatibility decision a future maintainer will need.

The same approach applies to a bug fix. If an export drops tabs from a value, check how the exporter handles a custom formatter before changing how it writes the file. A regression test can check both that the tab survives and that the user's formatting choice still applies.

For the installation details, see the [agent handoff guide](harness/handoff/README.md).
