# design-promote

## Skill Summary

Promotes durable behavior from completed implementation work into `_docs/kb`
documentation.

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

- The completed or substantially completed implementation plan
- `_docs/README.md`
- `_docs/kb/README.md`
- Existing relevant `_docs/kb/` documents
- Workflow `kb/*` templates, when promotion needs a new knowledge-base document

## How to use it

Here are example prompts that invoke this skill:

- "Use design-promote for the completed workflow update plan."
- "Promote the accepted behavior from `_docs/plans/completed/2026-08-20-example.md`."
- "Document the durable current-state changes from this completed plan."

## When it is used

Use this skill after implementation has made behavior true in the codebase and
that behavior needs to be reflected in `_docs/kb/`.

## What it does

The skill reads the completed or nearly completed plan, identifies decisions
that are now current behavior, verifies them against implementation evidence,
finds the right knowledge-base document, and updates only current implemented
truth. If a new knowledge-base document is needed, it uses the workflow `kb/*`
templates for shape and index links. When the
workflow-owned `technical-architect` role is installed, the skill can use it
for bounded architecture-promotion input while still promoting only implemented
and accepted current-state behavior. When the workflow-owned `ux-writer` role
is installed, the skill can use it for bounded UX writing promotion input when
completed work changed durable terminology, labels, prompts, command help,
errors, empty states, onboarding copy, README language, release notes, or
message-state requirements. When the workflow-owned `documentation-specialist`
role is installed, the skill can use it for bounded documentation-promotion
input on `_docs` placement, knowledge-base ownership, current-state accuracy,
related-doc links, README or workflow-doc impact, and separating plan history
from durable truth.
