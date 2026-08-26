---
name: project-init
description: Initialize or repair a project's `_docs` documentation structure without overwriting existing project-owned content. Use when a user asks to initialize project docs, bootstrap documentation, or create the standard knowledge-base and planning folders.
---

# Project Init

Use this skill to initialize or repair the project-owned `_docs` structure for
a repository that uses the agent workflow.

This skill manages documentation scaffolding only. It does not install package
dependencies, create product implementation files, initialize Git remotes, or
begin feature implementation unless the user explicitly asks for those actions
separately.

## Workflow

1. Read `AGENTS.md` and `.agents/workflow.md` when present.
2. Inspect the existing `_docs` tree before editing.
3. Create missing standard directories:
   - `_docs/kb/`
   - `_docs/kb/01-product/`
   - `_docs/kb/02-requirements/`
   - `_docs/kb/03-architecture/`
   - `_docs/kb/04-security/`
   - `_docs/kb/05-quality/`
   - `_docs/kb/06-operations/`
   - `_docs/kb/07-decisions/`
   - `_docs/plans/`
   - `_docs/plans/backlog/`
   - `_docs/plans/completed/`
4. Create `_docs/README.md` only when missing. Keep it as a project
   documentation router, not a product design document. Use the
   `docs-readme.md` workflow template when available.
5. Create `_docs/kb/README.md`, `_docs/kb/glossary.md`, and owner README files
   for each standard knowledge-base area only when missing. Keep them focused
   on current implemented project knowledge and links to deeper documents.
6. Never overwrite or replace existing project-owned documentation. If a file
   exists but appears stale or incomplete, report the issue and ask before
   rewriting substantial content.
7. Create only the standard knowledge-base and planning directories.
8. Report created paths, existing paths left untouched, and any follow-up
   documentation questions.

## Guardrails

- `_docs/` belongs to the project, not the package manager.
- Prefer adding missing scaffolding over reorganizing existing documents.
- Do not invent product goals, architecture, risks, or plans without user input.
- Keep project initialization separate from backlog plan creation. Use
  `plan-create` when the user wants to turn an idea into an implementation plan.
- Resolve templates from `.agents/templates/` before the active workflow origin
  under `.agents/packages/workflows/<source>/<workflow>/templates/`. If neither
  copy exists, follow the structure in this skill and report the missing
  template.
