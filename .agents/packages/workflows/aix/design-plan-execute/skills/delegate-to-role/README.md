# delegate-to-role

## Skill Summary

Selects an installed project role and prepares a bounded delegation prompt
while preserving parent-context ownership.

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

- Installed role files under `.agents/roles/`
- Repository instructions and active plan context when the task is plan-related
- Host support for native subagents when available

## How to use it

Here are example prompts that invoke this skill:

- "Use quality-engineer for this verification plan."
- "Delegate to documentation-specialist for the docs impact review."
- "Use technical-architect to review this design direction."

## When it is used

Use this skill when the developer explicitly asks to use or delegate to a named
role.

## What it does

The skill resolves the named role, stops on missing or ambiguous role requests,
uses native subagent handoff when the host supports it, otherwise builds a
prompt-overlay fallback, and requires the delegated work to return evidence for
parent review.
