# plan-create

## Skill Summary

Turns an initial idea into a decision-complete backlog implementation plan.

Installation:

```bash
aix init
```

This skill is workflow-owned. `aix init` installs the default
`design-plan-execute` workflow and activates this skill with it. To install the
workflow explicitly, run:

```bash
aix workflow install https://github.com/tekfoundry/ai-extensions/tree/master/aix/workflows/design-plan-execute aix
```

Dependencies:

- `AGENTS.md`
- `.agents/workflow.md`
- `_docs/README.md`
- Relevant `_docs/design/` documents
- Related active or backlog plans, when relevant
- `.agents/templates/plan.md`, when published
- `.agents/packages/workflows/<source>/<workflow>/templates/plan.md`, as the
  workflow template fallback

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-create to plan saved search filters."
- "Create a plan for workflow update diff previews."
- "Turn this idea into a backlog plan: add aliases for installed skills."

## When it is used

Use this skill when the developer wants to shape an idea before implementation.
It is for backlog planning only. It does not authorize code changes or activate
the plan.

## What it does

The skill reads repository instructions, workflow guidance, design docs, and
related plans. It creates a backlog plan early, then works through explicit
planning gates: high-level goal, design intent, implementation phases, phase
tasks, risks, verification, and final backlog acceptance. New plans are placed
under `_docs/plans/backlog/` and pause there until the developer later uses
`plan-activate`.
