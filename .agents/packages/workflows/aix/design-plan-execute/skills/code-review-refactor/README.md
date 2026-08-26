# code-review-refactor

## Skill Summary

Reviews project code for maintainability risks and helps turn selected findings
into safe refactor work. It uses the repository's engineering guidance as the
review standard.

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
- `.agents/engineering-best-practices.md`
- `_docs/README.md`
- Relevant `_docs/design/` documents for the reviewed code area
- `plan-create`, when selected refactors need a backlog implementation plan

## How to use it

Here are example prompts that invoke this skill:

- "Use code-review-refactor to review the CLI command handlers."
- "Review this repository for maintainability issues and recommend refactors."
- "Use code-review-refactor on `src/install` and help me choose what to fix."

## When it is used

Use this skill when the developer asks for a maintainability review, refactor
recommendations, or help routing review findings into either inline fixes or a
new implementation plan.

## What it does

The skill reads the repository instructions, engineering best practices, design
docs, and worktree state. It reviews code for unclear ownership, mixed
responsibilities, duplication, weak tests, brittle error handling, safety risks,
and documentation drift. It reports prioritized findings first, then asks the
developer which findings to refactor. Small behavior-preserving fixes can run
inline after confirmation. Larger refactors are routed through `plan-create`.
When the workflow-owned `technical-architect` role is installed, the skill can
use it for bounded architecture-risk review on coupling, ownership, runtime
contracts, integration boundaries, and cross-module refactors while preserving
the normal developer confirmation gate.
