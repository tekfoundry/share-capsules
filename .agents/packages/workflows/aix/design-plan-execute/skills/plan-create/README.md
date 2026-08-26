# plan-create

## Skill Summary

Turns an initial idea into a decision-complete backlog implementation plan.

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
- `.agents/workflow.md`
- `_docs/README.md`
- Relevant `_docs/kb/` documents
- Related active or backlog plans, when relevant
- `.agents/templates/plan.md`, when published
- `.agents/packages/workflows/<source>/<workflow>/templates/plan.md`, as the
  workflow template fallback

## How to use it

Here are example prompts that invoke this skill:

- "Use plan-create to plan saved search filters."
- "Create a plan for workflow update diff previews."
- "Turn this idea into a backlog plan: add aliases for installed skills."

## When it is used

Use this skill when the developer wants to shape an idea before implementation.
It is for backlog planning only. It does not authorize code changes or activate
the plan.

## What it does

The skill reads repository instructions, workflow guidance, design docs, and
related plans. It creates a backlog plan early, then works through explicit
planning gates: vision, high-level goal, design intent, implementation phases,
phase tasks, risks, verification, and final backlog acceptance. It does not
draft implementation phases or task lists until Design Intent is accepted.
When the workflow-owned `product-strategist` role is installed, the skill can
use it for bounded product-vision judgment while still remaining directly
runnable without role context. When the workflow-owned `product-designer` role
is installed, the skill can use it for bounded user-flow, interaction,
accessibility, layout, prompt, terminal UX, and design-system review while
still asking those questions itself when the role is unavailable. When the
workflow-owned `requirements-engineer` role is installed after the high-level
goal is accepted, the skill can use it for bounded requirements, non-goals,
boundaries, acceptance signals, open decisions, and plan-readiness judgment
while still eliciting those requirements itself when the role is unavailable.
When the
workflow-owned `technical-architect` role is installed, the skill can use it
for bounded boundary, contract, integration, maintainability, and
implementation-phase sequencing review while still asking those questions
itself when the role is unavailable. When the workflow-owned
`security-engineer` role is installed, the skill can use it for bounded trust
boundary, credential, authorization, destructive-operation, dependency, and
safety-verification review while still asking those questions itself when the
role is unavailable. When the workflow-owned `ux-writer` role is installed,
the skill can use it for bounded labels, prompts, errors, empty states,
onboarding copy, README language, command help, and developer-facing docs
language review while still asking those questions itself when the role is
unavailable. When the workflow-owned `documentation-specialist` role is
installed, the skill can use it for bounded documentation-impact, `_docs`
placement, design-promotion, current-state docs, README or workflow-doc,
index-link, and closeout-expectation review while still asking those questions
itself when the role is unavailable. New plans are placed under
`_docs/plans/backlog/` and pause there until the developer later uses
`plan-activate`.
