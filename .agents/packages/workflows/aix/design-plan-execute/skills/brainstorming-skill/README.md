# brainstorming-skill

## Skill summary

Runs a project-grounded brainstorming session before implementation planning.
It helps an agent review the repository, inspect existing ideas, research
similar products or projects when useful, find gaps, and maintain a durable
idea list in `_docs/ideas.md` throughout the session.

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
- `_docs/README.md`, when present
- `_docs/kb/`
- `_docs/plans/` and `_docs/plans/backlog/`
- `_docs/ideas.md`, when present
- repository README files and other marketing-related docs
- web or GitHub access when external research is useful

## How to use it

Example prompts:

- "Use brainstorming-skill. Let's brainstorm."
- "Use brainstorming-skill to brainstorm new skills."
- "Let's brainstorm improvements to the README and docs."
- "Review the current ideas and help prioritize what should come next."

The skill starts by reading project context. If the prompt has a focus, it uses
that focus. If the prompt is broad, it runs a general project brainstorming
session.

When `.agents/roles/product-strategist.md` is installed and the session needs
vision, audience, value, scope, tradeoff, or sequencing judgment, the skill can
delegate that bounded product-strategy pass through `delegate-to-role` or
prompt-overlay fallback. The brainstorming skill still owns the session flow,
approval rules, and `_docs/ideas.md` updates. If the role is not installed, the
skill remains runnable and elicits the basic product-vision inputs directly.

The skill may research comparable products, projects, tools, or workflows. It
keeps useful links with the ideas they informed so a developer can revisit the
source later.

As soon as the first useful in-flight list exists, the skill writes or updates
`_docs/ideas.md`. It keeps checkpointing meaningful changes so the developer
can walk away and resume in another session. Explicit approval is still
required before moving ideas into `Approved prioritized ideas` or deleting
existing ideas.

## Ideas document

The durable output is `_docs/ideas.md`.

The file has two sections:

- `Approved prioritized ideas`: ideas the developer has accepted into the
  durable priority list.
- `In-flight ideas`: candidates that should be kept so the session can resume
  later.

Each idea entry includes:

- name
- summary
- difficulty
- dependencies
- source links

Default shape:

```md
# Ideas

## Approved prioritized ideas

1. **Idea name**
   - Summary: ...
   - Difficulty: low | medium | high
   - Dependencies: None | Idea name, Idea name
   - Source links:
     - [Label](https://example.com)

## In-flight ideas

1. **Idea name**
   - Summary: ...
   - Difficulty: low | medium | high
   - Dependencies: None | Idea name, Idea name
   - Source links:
     - [Label](https://example.com)
```

This format is embedded in the skill because it is small and directly tied to
the brainstorming process. It is not a strict parser contract. If a project
adds fields such as owner, status, dates, or notes, the skill should preserve
them unless the developer asks to change the format.

The file is a live checkpoint, not just a final export. In-flight ideas should
be saved before review starts and updated after meaningful accepted changes.

## Prioritization

Approved ideas are ordered by practical value-to-effort. When available,
`product-strategist` evidence should inform that ordering. Otherwise the skill
uses these lightweight standalone factors:

- likely business or developer value
- difficulty
- strategic fit
- dependency readiness
- risk
- urgency

Difficulty uses `low`, `medium`, and `high`. Dependencies should reference
other ideas by exact name, not by list number, because the list is meant to be
reprioritized.

## Marketing artifacts

Marketing and onboarding improvements are valid ideas. The skill should look
for README files, examples, screenshots, install instructions, product pages,
and other docs that may be stale or unclear.

For this project, that means README updates can show up beside product and
workflow ideas when they would improve adoption or reduce confusion.

## Planning handoff

Brainstorming does not authorize implementation. When the developer chooses an
idea to build, use `plan-create` to turn that idea into a backlog plan.

Carry over relevant dependencies and source links from `_docs/ideas.md` so the
plan keeps the research trail.
