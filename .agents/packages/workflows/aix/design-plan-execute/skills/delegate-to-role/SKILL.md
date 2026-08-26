---
name: delegate-to-role
description: Select an installed project role and prepare a bounded delegation prompt while preserving parent-context ownership. Use when the developer asks to use or delegate to a named role.
---

# Delegate To Role

Use this skill when the developer explicitly asks to use or delegate to an
installed role, such as `use quality-engineer` or
`delegate to documentation-specialist`.

This skill creates a bounded delegation. It does not make the delegated role
authoritative over the task, plan, worktree, verification, or final decision.

## Workflow

1. Read `AGENTS.md`, `.agents/workflow.md`, `_docs/README.md`, the active
   plan when the task is plan-related, and the relevant installed role file
   under `.agents/roles/<role-name>.md`.
2. Resolve the role only from explicit developer intent:
   - Accept prompts such as `use <role-name>` and
     `delegate to <role-name>`.
   - If more than one role is named, stop and ask the developer to choose one.
   - If the named role does not exist under `.agents/roles/`, stop with a
     missing-role message.
   - If role intent is only implied, do not guess. Continue without delegation
     or ask one concise question when delegation is necessary.
3. Prefer native subagent handoff only when the current host has a clear,
   available mechanism for bounded subagents and the role file can be provided
   to that mechanism. Do not write host-native agent files as part of routine
   delegation.
4. Use prompt-overlay fallback when native handoff is unavailable. In fallback
   mode, load the role file and construct a bounded prompt containing:
   - selected role name and description
   - the role operating prompt
   - the bounded task
   - parent-owned boundaries
   - required return evidence
5. Preserve parent-context ownership. The parent context owns plan state,
   worktree safety, verification review, final decisions, and user-facing
   reporting.
6. After the delegated work returns, review the evidence before acting on it.
   Apply only the parts that fit the active plan, design intent, and worktree
   safety constraints.

## Do Not Delegate When

- Product or design intent is unclear and the role would have to invent it.
- The work is not authorized by an active plan or approved micro-fix boundary.
- The delegated task would require unsafe file operations, overwrites, deletes,
  renames, credentials, trust changes, persistence changes, publishing, or
  runtime-contract changes without parent review.
- The worktree has relevant unrelated changes that the delegated task could
  overwrite.
- The role request is ambiguous or the named role is missing.
- Delegation would require writing `.claude/agents`, `.codex/agents`,
  `.agents/agents`, or another host-native agent directory without an explicit
  integration command or configuration that owns that compatibility output.

## Prompt-Overlay Shape

Use this shape when native subagent handoff is unavailable:

```md
# Role Delegation

Mode: prompt-overlay fallback

You are operating as the delegated role below. Apply the role guidance only to
this bounded task.

## Selected Role

Name: <role-name>
Description: <role-description>

## Parent-Owned Boundaries

- The parent context owns plan state, worktree safety, verification review, and
  final decisions.
- Do not broaden scope, change lifecycle status, or claim completion for the
  parent.
- Stop and return a blocking question when authorization, safety, or product
  intent is unclear.

## Delegated Task

<bounded task>

## Role Operating Prompt

<role file body>

## Required Return Evidence

Return findings, recommended next actions, exact files or commands inspected,
verification evidence, gaps, residual risk, and whether scope expanded.
```

## Reporting

Report the selected role, delegation mode, whether native handoff or
prompt-overlay fallback was used, evidence returned by the role, parent review
decisions, skipped actions, and remaining risks.
