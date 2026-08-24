# work-verify

## Skill Summary

Selects and runs verification for changed behavior, then reports results,
gaps, and whether success criteria are satisfied.

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

- Relevant design and quality guidance for the changed subsystem
- The changed implementation and tests
- Plan success criteria, when verification is tied to a plan or phase
- Repository-native targeted and broad verification commands

## How to use it

Here are example prompts that invoke this skill:

- "Use work-verify for the latest changes."
- "Verify Phase 2 of `_docs/plans/search.md`."
- "Run targeted checks for the workflow update changes."

## When it is used

Use this skill when the developer asks to verify work, validate a phase, or
confirm whether plan success criteria are met.

## What it does

The skill identifies the changed subsystem, reads relevant design and quality
guidance, runs targeted deterministic checks first, adds broader repository
checks when the changed surface requires them, and reports exact commands,
outcomes, skipped checks, manual checks, documentation impact, remaining risks,
and success-criteria status.
