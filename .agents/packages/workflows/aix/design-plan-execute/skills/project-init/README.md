# project-init

## Skill Summary

Initializes or repairs the project-owned `_docs` documentation structure for a
repository that uses the workflow.

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

- `AGENTS.md`, when present
- `.agents/workflow.md`, when present
- `.agents/templates/docs-readme.md`, when published
- Active workflow origin templates for `docs-readme.md` and `kb/*`, as
  fallbacks

## How to use it

Here are example prompts that invoke this skill:

- "Use project-init to create the standard `_docs` structure."
- "Initialize project documentation for this repo."
- "Repair the missing workflow documentation folders."

## When it is used

Use this skill when a project needs the standard documentation directories and
router files, or when that structure is incomplete.

## What it does

The skill reads repository workflow instructions, inspects the existing
`_docs` tree, creates missing standard directories, creates `_docs/README.md`,
`_docs/kb/README.md`, `_docs/kb/glossary.md`, and owner README files only when
missing, and reports what it created or left untouched. It leaves any existing
`_docs/kb/` content preserved as project-owned current knowledge.
It does not overwrite project-owned documentation or begin feature
implementation.
