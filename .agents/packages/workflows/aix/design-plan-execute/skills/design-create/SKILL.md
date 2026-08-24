---
name: design-create
description: Create a new stable design document in the right _docs/design area, using the workflow design-doc template and linking it from the relevant index.
---

# Design Create

Use this skill when a new stable design document is needed. Prefer updating an
existing design document when the topic already has a clear home.

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
