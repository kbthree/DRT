# DRT

A vibe-coded app can grow one good idea at a time until a small fix breaks something you thought was settled. DRT gives your coding agent an opinionated set of rules for working in that repository. The agent takes inventory of what the app does, records why people rely on it, and uses that record when fixing bugs or adding features.

## Start from your coding agent

Open your app’s repository in your coding agent. Give it access to this repository too. If your agent can use Git, you can paste this request directly into the chat:

> Get a separate checkout of https://github.com/kbthree/DRT.git and read its AGENTS.md and harness/handoff/README.md. Use DRT to install repository operating rules in my app. Start by showing me what people can do with the app today. Trace those activities to the code and tests that support them. Record what you know about why each behavior matters, what you inferred, and what you still need to ask me. Prepare the installation from that evidence, run the checks in my app, and show me where the rules and inventory live.

You can start smaller if you have a bug to fix today. Ask your agent to **use DRT for this change only** and describe what went wrong. The guide calls that “outer-only.” Installing the rules for future sessions is called “install-inner.” Your agent can handle the commands for either choice.

## What gets installed

The agent prepares a kit for your particular app. It identifies the behavior people depend on, records decisions and open questions, and selects checks that exercise those behaviors. The installer adds instructions to the app’s AGENTS.md and keeps its maintenance records under maintenance/. For a full inventory, ask the agent to include a dependency graph showing how the pieces connect and a written account of the app’s intent. The agent builds these from its investigation. You can correct its interpretation before it becomes a rule.

## Make the next change

Say a notes app saves drafts when you close the editor. You ask for a Discard button. Both actions close the editor, but only one should erase the draft. An inventory can point the agent to the shared code. The intent record explains why someone closing the window expects their work to be there tomorrow.

Once the rules are installed, a request can be as simple as:

> Add a Discard button to the editor. Follow this repo’s operating rules. Check what happens when I discard a draft and when I just close the window, then reopen the note. Update the inventory with anything you learn.

That gives the next agent a concrete behavior to preserve, a way to check it, and a place to find the reason behind it. For the installation details, see the [agent handoff guide](harness/handoff/README.md).
