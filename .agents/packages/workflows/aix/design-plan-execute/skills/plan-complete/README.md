# plan-complete

## Skill Summary

Closes an implementation plan after tasks, verification, design promotion,
risks, and documentation impact have been resolved or recorded.

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

- The active implementation plan under `_docs/plans/`
- Required targeted and repository verification commands
- `design-promote`
- `documentation-review`
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-complete on `_docs/plans/search-filters.md`."
- "Complete and archive the active plan."
- "Close out the workflow update plan."

## When it is used

Use this skill when active plan work appears finished and needs formal closeout.
It is not used to archive backlog plans or hide incomplete work.

## What it does

The skill resolves the plan, confirms all tasks and success goals, reviews or
runs required verification, promotes durable behavior with `design-promote`,
reviews documentation with `documentation-review`, records remaining risks and
follow-on work, updates the completion checklist when present, and archives the
completed plan under `_docs/plans/completed/` with the required dated filename.
