# documentation-review

## Skill Summary

Reviews project documentation for structure, formatting, links, maintainability,
and current-state accuracy.

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
- Relevant `_docs/` subdirectory indexes
- Relevant accepted design docs or code when accuracy needs validation

## How to use it

Here are example prompts that invoke this skill:

- "Use documentation-review after these design doc changes."
- "Review `_docs` for stale links and formatting issues."
- "Check whether the docs still match the completed plan."

## When it is used

Use this skill after plan work, design promotion, or substantial documentation
changes. It is also useful when documentation feels stale or hard to navigate.

## What it does

The skill reads the documentation indexes, checks whether documents have clear
homes, reviews Markdown conventions, finds broken or ambiguous links, compares
docs against accepted design and code when needed, and makes focused fixes when
the right correction is clear. Broader reorganizations are recorded as follow-up
work or routed back to the developer for approval.
