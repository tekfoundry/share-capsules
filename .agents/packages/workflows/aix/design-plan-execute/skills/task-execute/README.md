# task-execute

## Skill Summary

Executes one concrete implementation task from an active plan or one approved
micro-fix.

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
- The active implementation plan under `_docs/plans/`, except for approved
  micro-fixes
- Relevant `_docs/kb/` documents
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use task-execute for the next task in `_docs/plans/search.md`."
- "Complete the persistence task in Phase 1."
- "Implement this approved micro-fix and verify it."

## When it is used

Use this skill for the smallest unit of implementation that can be understood,
changed, verified, and reported without losing plan context.

## What it does

The skill resolves the active plan, phase, and task, reads repository and
design context, checks authorization and readiness, marks active-plan tasks in
progress, makes the smallest coherent code or documentation change, runs
targeted verification, records evidence and remaining risks, and marks the task
complete when the outcome and verification support it.
