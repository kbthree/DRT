# DRT

A vibe-coded app can grow one good idea at a time until a small fix breaks something you thought was settled. DRT gives your coding agent an opinionated set of rules for working in that repository. The agent takes inventory of what the app does, records why people rely on it, and uses that record when fixing bugs or adding features.

## Start from your coding agent

Open your app’s repository in your coding agent. Tell it, “Get a separate checkout of https://github.com/kbthree/DRT.git and read its AGENTS.md and harness/handoff/README.md.” Then pick the request below that fits what you want today.

| What you want | How DRT helps | What to ask your agent |
| --- | --- | --- |
| **Help choosing what to work on** (outer loop) | The agent uses DRT from outside your app. It can compare issues, trace related symptoms, and propose a change small enough to test. You can use it for one repair without installing rules. | “Use DRT to look at the open issues and the code they touch. Which fix would help users most? Show me the evidence and a way to test it before we choose.” |
| **Consistent rules for future changes** (inner loop) | The agent installs operating instructions, decisions, and checks in your app’s repository so later sessions know what behavior to preserve and how to verify a change. | “Install the DRT inner loop. Trace our main user journeys, record the promises people rely on, and run the checks in this repo.” |
| **A map of an app that’s become hard to follow** (full inner loop) | The agent installs the same rules and also builds a dependency graph and a written model of the app’s intent. Future sessions can trace a proposed change through related features and revisit why they behave as they do. | “Install the full DRT inner loop. Inventory the app, map how its parts depend on each other, and show me where you found evidence for its intent and where you need my judgment.” |

You can start with the outer loop while deciding what deserves attention and install either inner loop when you want future agents to carry that understanding forward.

## What gets installed

The agent prepares a kit for your particular app. It identifies the behavior people depend on, records decisions and open questions, and selects checks that exercise those behaviors. The installer adds instructions to the app’s AGENTS.md and keeps its maintenance records under maintenance/. For a full inventory, ask the agent to include a dependency graph showing how the pieces connect and a written account of the app’s intent. The agent builds these from its investigation. You can correct its interpretation before it becomes a rule.

## Make the next change

Say a notes app saves drafts when you close the editor. You ask for a Discard button. Both actions close the editor, but only one should erase the draft. An inventory can point the agent to the shared code. The intent record explains why someone closing the window expects their work to be there tomorrow.

Once the rules are installed, a request can be as simple as:

> Add a Discard button to the editor. Follow this repo’s operating rules. Check what happens when I discard a draft and when I just close the window, then reopen the note. Update the inventory with anything you learn.

That gives the next agent a concrete behavior to preserve, a way to check it, and a place to find the reason behind it. For the installation details, see the [agent handoff guide](harness/handoff/README.md).
