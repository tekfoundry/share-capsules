# phase-execute

## Skill Summary

Executes one phase of an active implementation plan by sequencing focused
`task-execute` work.

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
- The active implementation plan under `_docs/plans/`
- Relevant `_docs/kb/` documents
- `task-execute`
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use phase-execute on Phase 2 in `_docs/plans/search.md`."
- "Continue the current phase in `_docs/plans/search.md`."
- "Review Phase 3 and complete it if it is ready."

## When it is used

Use this skill when a single active-plan phase should move forward. It should
not activate backlog work, broaden the plan, or skip task-level execution.

## What it does

The skill resolves the plan and phase, reads the repository instructions,
relevant design docs, plan context, current code, tests, and worktree state. It
checks readiness, runs each dependency-ready task through `task-execute`,
reviews verification and documentation impact after each task, tracks risks,
and stops when decisions, verification, safety, scope, or worktree state need
human attention.
