# design-promote

## Skill Summary

Promotes durable behavior from completed implementation work into stable design
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
- `_docs/design/README.md`
- Existing relevant `_docs/design/` documents
- `design-create`, when promotion needs a new stable design document

## How to use it

Here are example prompts that invoke this skill:

- "Use design-promote for the completed workflow update plan."
- "Promote the accepted behavior from `_docs/plans/completed/2026-08-20-example.md`."
- "Document the durable design changes from this completed plan."

## When it is used

Use this skill after implementation has made behavior true in the codebase and
that behavior needs to be reflected in `_docs/design/`.

## What it does

The skill reads the completed or nearly completed plan, identifies decisions
that are now current behavior, finds the right design document, and updates only
the stable design truth. If a new design document is needed, it follows
`design-create` guidance for placement, template use, and index links.
