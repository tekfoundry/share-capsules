# plan-defer

## Skill Summary

Moves active planned work back to the backlog while preserving context for
later reactivation.

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
- The referenced active plan under `_docs/plans/`
- Relevant `_docs/design/` documents
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-defer on `_docs/plans/search-filters.md`."
- "Defer this active plan back to the backlog."
- "Pause the workflow update plan and record what remains."

## When it is used

Use this skill only when the developer explicitly asks to defer, pause, backlog,
or demote an active plan.

## What it does

The skill resolves the active plan, reads the required repository and design
context, records incomplete tasks, verification gaps, unresolved decisions,
risks, and reactivation prerequisites, then moves the plan into
`_docs/plans/backlog/`. It runs targeted verification to confirm the move and
reports preserved context and any remaining risk.
