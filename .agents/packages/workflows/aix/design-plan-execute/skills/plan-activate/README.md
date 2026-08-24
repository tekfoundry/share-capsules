# plan-activate

## Skill Summary

Moves a human-authorized backlog plan into active implementation.

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
- The referenced backlog plan under `_docs/plans/backlog/`
- Relevant `_docs/design/` documents
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-activate on `_docs/plans/backlog/search-filters.md`."
- "Activate the saved search filters plan."
- "Promote this backlog plan into active work."

## When it is used

Use this skill only when the developer explicitly asks to activate, promote, or
start a backlog plan. Activation is the boundary between planning and
authorized implementation.

## What it does

The skill verifies that the referenced plan is in `_docs/plans/backlog/`, reads
the required repository and design context, checks readiness, moves the plan
into `_docs/plans/`, updates only stale backlog wording or activation notes,
runs targeted verification, and reports readiness and documentation impact. It
does not begin implementation unless the developer also invokes execution work.
