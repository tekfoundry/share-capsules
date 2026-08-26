## AI Agent Workflow

Read `.agents/README.md` for the reusable process router.
Read `.agents/workflow.md` before substantial implementation work.
Read `.agents/engineering-best-practices.md` for agent-facing engineering guidance.

Use root `AGENTS.md` for repo-specific project facts, commands, and safety rules.
Use `_docs/kb/README.md` for current implemented project knowledge when it exists.
Use `_docs/plans/` for active implementation plans and `_docs/plans/backlog/` for backlog plans.

Treat `.agents/` as package-managed workflow content and `_docs/` as project-owned documentation.

Repository-local skills live under `.agents/skills/`. When a task invokes a skill, read that skill's `SKILL.md` and follow it.
