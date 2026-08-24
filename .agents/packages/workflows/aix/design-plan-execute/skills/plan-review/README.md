# plan-review

## Skill Summary

Reviews an implementation plan as an execution contract without implementing
the work.

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
- `_docs/README.md`
- Relevant `_docs/design/` documents
- Related active or backlog plans, when relevant
- The active workflow `plan.md` template, when available

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-review on `_docs/plans/backlog/search-filters.md`."
- "Review this plan for readiness before activation."
- "Assess whether Phase 2 has enough detail to execute safely."

## When it is used

Use this skill when the developer wants a plan checked for scope,
authorization, design completeness, risks, and verification readiness.

## What it does

The skill reads the referenced plan, repository instructions, documentation
router, relevant design docs, related plans, and worktree state. It reports
missing decisions, conflicting sources of truth, unsafe assumptions, weak
success criteria, and verification gaps in priority order. It states whether
the plan is ready for execution and names the exact blockers when it is not.
