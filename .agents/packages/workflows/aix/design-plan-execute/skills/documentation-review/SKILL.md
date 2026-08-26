---
name: documentation-review
description: Review project documentation for structure, formatting conventions, links, maintainability, and current-state accuracy; fix issues or record follow-up work.
---

# Documentation Review

Use this skill to keep `_docs/` maintainable after plans, design promotion, or
substantial documentation changes.

## Role Collaboration

`documentation-review` owns the documentation review result, structure and
link recommendations, current-state accuracy checks, focused fixes, and
user-facing handoff. Roles can supply bounded specialist judgment, but they do
not own documentation edits or final current-state truth.

When `.agents/roles/documentation-specialist.md` exists and the reviewed docs
need documentation-system judgment, use `delegate-to-role` or a prompt-overlay
delegation to request bounded documentation-specialist input. Good triggers
include `_docs` placement, design-promotion fit, current-state accuracy,
durable behavior left only in plans, stable docs that contain execution
history, implementation behavior that appears contrary to `_docs/design` or
current in-progress plans, implemented design intent missing from both stable
docs and plans, index coverage, related-doc ownership, README or workflow-doc
drift, large documentation follow-up decisions, or closeout documentation
impact.

Fold returned evidence into documentation-review findings, current-state
accuracy notes, structure recommendations, design-promotion recommendations,
link or index fixes, focused documentation edits, human-review notes, or
follow-up work as appropriate. Do not require `documentation-specialist` for
direct use. If the role is unavailable or the host cannot delegate, continue
the documentation review yourself by checking the same placement,
promotion-fit, current-state accuracy, implementation-to-intent, structure,
link, and follow-up concerns. Routine formatting, link, index, and
stale-placeholder checks can still run without role delegation unless the
documentation-system judgment is material to the outcome.

When `.agents/roles/product-designer.md` exists and the reviewed docs describe
product-facing behavior, user flows, interaction states, accessibility,
layout hierarchy, prototypes, terminal UX, prompts, or design-system fit, use
`delegate-to-role` or a prompt-overlay delegation to request bounded
product-design input.

Fold returned evidence into documentation-review findings, current-state
accuracy notes, structure recommendations, design-doc fixes, human-review
notes, or follow-up work as appropriate. Do not require `product-designer` for
direct use. If the role is unavailable or the host cannot delegate, continue
the documentation review yourself by checking the same product-design concerns.
Routine formatting, link, index, and stale-placeholder checks do not require
role delegation unless the documentation content itself is product-facing.

When `.agents/roles/product-strategist.md` exists and the reviewed docs
describe product positioning, user value, audience, scope, sequencing,
competitive framing, README language, marketing pages, or idea-to-plan
handoffs, use `delegate-to-role` or a prompt-overlay delegation to request
bounded product-strategy input.

Fold returned evidence into documentation-review findings, current-state
accuracy notes, positioning or scope corrections, README or product-doc
follow-up, human-review notes, or unresolved gaps as appropriate. Do not
require `product-strategist` for direct use. If the role is unavailable or the
host cannot delegate, continue the documentation review yourself by checking
the same product-strategy concerns.

When `.agents/roles/ux-writer.md` exists and the reviewed docs include
user-facing or developer-facing copy, use `delegate-to-role` or a
prompt-overlay delegation to request bounded UX writing input. Good triggers
include README language, onboarding text, labels, prompts, command help,
terminal output, errors, empty states, warning or success messages, workflow
instructions, release notes, and docs copy that tells users what to do.

Fold returned evidence into documentation-review findings, current-state
accuracy notes, copy fixes, terminology corrections, README or workflow-doc
follow-up, human-review notes, or unresolved gaps as appropriate. Do not
require `ux-writer` for direct use. If the role is unavailable or the host
cannot delegate, continue the documentation review yourself by checking the
same reader, task, copy-state, terminology, and recovery-guidance concerns.
Routine formatting, link, index, and stale-placeholder checks do not require
UX writing delegation unless the documentation content itself changes
user-facing or developer-facing language.

## Workflow

1. Read `_docs/README.md`, `_docs/design/README.md`, and any relevant
   subdirectory indexes.
2. Review structure. Decide whether large mixed-topic documents should split
   into a subdirectory with a `README.md`, whether tiny documents should merge,
   and whether new or moved docs need index links.
3. Review formatting conventions. Check heading levels, spacing, list style,
   fenced-code language labels, file names, relative links, and stale template
   placeholders or agent notes.
4. Detect broken links in touched or routed documentation. Fix local links when
   the target is clear, and record unresolved external or ambiguous links.
5. Check current-state accuracy against accepted design and relevant code when
   needed. Move historical execution detail back to plans rather than stable
   design docs.
6. Make focused fixes when the right correction is clear. For broader
   reorganizations, record a follow-up plan or ask for approval.
7. Report documents reviewed, structural changes, formatting fixes, link
   repairs, accuracy concerns, and remaining follow-up work.

## Guardrails

- Do not reorganize large documentation trees without clear benefit or user
  authorization.
- Do not invent design truth to make docs look complete.
- Prefer relative links inside `_docs/`.
- Keep docs readable as plain Markdown.
- Preserve unrelated project documentation edits.
