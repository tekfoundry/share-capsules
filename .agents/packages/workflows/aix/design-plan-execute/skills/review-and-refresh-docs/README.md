# review-and-refresh-docs

## Skill Summary

Reviews implementation reality and refreshes `_docs/kb/` so current-state
project knowledge matches the code, accepted plans, existing docs, and
verified evidence.

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

- `_docs/README.md`
- `_docs/kb/README.md`
- Relevant `_docs/kb/` area indexes
- Relevant plans, implementation files, tests, and verification evidence

## How to use it

Here are example prompts that invoke this skill:

- "Use review-and-refresh-docs after these knowledge-base changes."
- "Review `_docs/kb` for stale links, shallow content, and current-state gaps."
- "Refresh the docs against the completed plan and implementation."

## When it is used

Use this skill after plan work, knowledge-base promotion, migration work, or
substantial documentation changes. It is also useful when docs feel stale or
hard to navigate.

## What it does

The skill reads the documentation routers, active or completed plan evidence,
changed implementation, tests, verification notes, and current knowledge-base
docs. It checks whether current-state knowledge lives in the right `_docs/kb`
area, whether links and indexes are clear, whether docs are deep enough to
support future changes, and whether the implementation contradicts accepted
intent.

When specialist roles are installed, the skill uses `documentation-specialist`
to coordinate domain-specific review-and-refresh passes. Each role returns the
implementation facts inspected, docs updated or recommended, gaps, conflicts,
questions, risks, skipped checks, and residual risk for the parent review.
