---
name: design-create
description: Create a new stable design document in the right _docs/design area, using the workflow design-doc template and linking it from the relevant index.
---

# Design Create

Use this skill when a new stable design document is needed. Prefer updating an
existing design document when the topic already has a clear home.

## Role Collaboration

`design-create` owns the stable design document, placement decision, template
use, index links, and user-facing handoff. Roles can supply bounded specialist
judgment, but they do not own final design truth or promote speculative
architecture.

When `.agents/roles/technical-architect.md` exists and the design document
concerns system shape, component boundaries, module ownership, runtime
contracts, integration choices, data flow, persistence, package-management
behavior, workflow lifecycle behavior, or maintainability tradeoffs, use
`delegate-to-role` or a prompt-overlay delegation to request bounded
architecture input.

Fold returned evidence into the design document's current-state behavior,
ownership boundaries, invariants, constraints, tradeoffs, related-doc links,
or unresolved gaps as appropriate. Do not require `technical-architect` for
direct use. If the role is unavailable or the host cannot delegate, continue
the design-document creation yourself by checking the same architecture
concerns.

When `.agents/roles/product-designer.md` exists and the design document
concerns product-facing behavior, user flows, interaction states,
accessibility, layout hierarchy, prototypes, terminal UX, prompts, or
design-system fit, use `delegate-to-role` or a prompt-overlay delegation to
request bounded product-design input.

Fold returned evidence into the design document's current-state behavior,
user-flow expectations, interaction states, accessibility and usability
constraints, layout or hierarchy notes, related-doc links, human-review notes,
or unresolved gaps as appropriate. Do not require `product-designer` for direct
use. If the role is unavailable or the host cannot delegate, continue the
design-document creation yourself by checking the same product-design
concerns.

When `.agents/roles/ux-writer.md` exists and the design document records
durable product or developer-facing language, use `delegate-to-role` or a
prompt-overlay delegation to request bounded UX writing input. Good triggers
include terminology, labels, prompts, command help, terminal output, errors,
empty states, onboarding copy, README language, workflow instructions, or
message-state requirements.

Fold returned evidence into the design document's current-state behavior,
terminology, message-state expectations, copy constraints, related-doc links,
human-review notes, or unresolved gaps as appropriate. Do not require
`ux-writer` for direct use. If the role is unavailable or the host cannot
delegate, continue the design-document creation yourself by checking the same
copy, terminology, reader, task, and recovery-path concerns.

When `.agents/roles/documentation-specialist.md` exists and the design
document placement, ownership, index coverage, related-doc links,
current-state accuracy, or separation between stable truth and plan history is
material, use `delegate-to-role` or a prompt-overlay delegation to request
bounded documentation input.

Fold returned evidence into the design document's placement decision,
current-state behavior, related-doc links, index updates, ownership boundary,
promotion notes, human-review notes, or unresolved gaps as appropriate. Do not
require `documentation-specialist` for direct use. If the role is unavailable
or the host cannot delegate, continue the design-document creation yourself by
checking the same documentation structure, placement, link, and current-state
accuracy concerns. Do not use the role to create a new doc when a focused
update to an existing doc is clearer.

## Workflow

1. Read `_docs/README.md` and `_docs/design/README.md` to understand the
   current documentation map and ownership rules.
2. Decide the smallest appropriate home under `_docs/design/`, such as
   `overview`, `features`, `product`, `quality`, or `operations`.
3. Check nearby docs before creating a new file. Update an existing document
   when that keeps ownership clearer.
4. When creating a new file, resolve `design-doc.md` published-first:
   `.agents/templates/design-doc.md`, then the active workflow origin.
5. Write current-state design intent. Cover behavior, ownership boundaries,
   constraints, and links to related docs. Keep plan history in plans.
6. Link the new or moved document from the relevant index, usually
   `_docs/design/README.md` or a subdirectory `README.md`.
7. Report created or updated docs, index changes, unresolved gaps, and whether
   the template was missing.

## Guardrails

- Do not create a new design document when a focused update to an existing doc
  is clearer.
- Do not promote speculative, rejected, or unimplemented behavior as current
  design.
- Do not copy an implementation plan into `_docs/design/`.
- Keep one document responsible for one coherent topic.
- Preserve project-owned documentation and unrelated edits.
