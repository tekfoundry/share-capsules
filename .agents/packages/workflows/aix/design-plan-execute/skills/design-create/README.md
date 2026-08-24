# design-create

## Skill Summary

Creates a new stable design document in the right `_docs/design` location, or
updates an existing design document when that is clearer.

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
- `_docs/design/README.md`
- `.agents/templates/design-doc.md`, when published
- `.agents/packages/workflows/<source>/<workflow>/templates/design-doc.md`, as
  the workflow template fallback

## How to use it

Here are example prompts that invoke this skill:

- "Use design-create to document the workflow update model."
- "Create a stable design doc for package source resolution."
- "Add a design document for CLI verification behavior."

## When it is used

Use this skill when accepted current design needs a new durable home under
`_docs/design/`. It is not for implementation plans, speculative ideas, or
execution history.

## What it does

The skill reads the project documentation routers, chooses the smallest
appropriate design area, checks nearby docs before creating anything new,
resolves the `design-doc.md` template when available, writes current-state
design intent, and links the document from the relevant index.
