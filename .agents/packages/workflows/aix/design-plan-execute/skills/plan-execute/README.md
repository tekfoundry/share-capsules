# plan-execute

## Skill Summary

Orchestrates execution of an active implementation plan across phases.

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
- Relevant `_docs/design/` documents
- `phase-execute`
- `task-execute`
- `plan-complete`
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-execute on `_docs/plans/search-filters.md`."
- "Continue the active implementation plan."
- "Execute the current plan until the next stop condition."

## When it is used

Use this skill when a whole active plan should move forward. It is the
top-level execution coordinator and should not activate backlog work or archive
plans by itself.

## What it does

The skill resolves the active plan, reads repository instructions, design docs,
the plan, and worktree state, then sequences open phases through
`phase-execute`. After each phase it reviews status, verification evidence,
documentation impact, risks, and scope. When all phases are complete, it routes
closeout through `plan-complete`.
