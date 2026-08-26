# plan-update

## Skill Summary

Updates an active or backlog implementation plan without executing it.

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

- The referenced active or backlog plan
- `AGENTS.md`
- `.agents/workflow.md`
- `_docs/README.md`
- Relevant `_docs/design/` documents
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-update to add verification notes to `_docs/plans/search.md`."
- "Update the backlog plan with the new scope decision."
- "Mark the selected task as blocked and record the risk."

## When it is used

Use this skill for plan maintenance: clarifying scope, refining tasks, updating
status, recording risks, adding verification, capturing lessons, or adjusting
promotion notes.

## What it does

The skill resolves the plan, reads required repository and design context,
classifies the plan location, and applies the smallest plan-only edit. It
preserves lifecycle boundaries, repairs task status marker syntax when the
intended state is clear, runs targeted document verification, and reports
files changed, documentation impact, skipped checks, and escalation status.
When the matching workflow-owned role is installed, the skill can use bounded
role input for product strategy, product design, requirements, architecture,
security, or UX writing changes while still remaining directly runnable
without role context.
