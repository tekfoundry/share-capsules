---
name: documentation-review
description: Review project documentation for structure, formatting conventions, links, maintainability, and current-state accuracy; fix issues or record follow-up work.
---

# Documentation Review

Use this skill to keep `_docs/` maintainable after plans, design promotion, or
substantial documentation changes.

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
