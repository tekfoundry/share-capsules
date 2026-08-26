---
name: plan-complete
description: Close an implementation plan only after tasks, verification, design promotion, risks, and documentation impact are resolved or explicitly recorded. Use when a user asks to complete or archive a plan.
---

# Plan Complete

Use this skill for plan closeout. Do not archive a plan merely because files
changed or most tasks are marked complete.

## Role Collaboration

`plan-complete` owns closeout, checklist updates, final risk recording, design
promotion, documentation review, and archive placement. Roles can supply
bounded specialist judgment, but they do not own completion approval,
developer acceptance, lifecycle state, or final residual-risk decisions.

When `.agents/roles/security-engineer.md` exists and the plan includes
security-sensitive behavior, use `delegate-to-role` or a prompt-overlay
delegation to request the required post-phase security review before
completion. Good triggers include trust boundaries, secrets, authentication,
authorization, permissions, dependency or supply-chain risk, local file writes,
overwrites, deletes, renames, external systems, network access, package trust,
source resolution, lockfile integrity, destructive operations, no-write
guarantees, or redaction.

Fold returned evidence into the plan's `Security Review` section, completion
checklist, final risks, follow-on work, or blocking task list as appropriate.
Do not require `security-engineer` for direct use. If the role is unavailable
or the host cannot delegate, continue closeout yourself by checking the same
security-sensitive behavior and recording the review evidence.

When `.agents/roles/ux-writer.md` exists and the completed work changed
user-facing or developer-facing copy, use `delegate-to-role` or a
prompt-overlay delegation to request bounded final copy-readiness input before
archive. Good triggers include labels, prompts, command help, terminal output,
errors, empty states, onboarding copy, README language, workflow instructions,
release notes, or docs copy that tells users what to do.

Fold returned evidence into the completion checklist, final risks, follow-on
work, documentation impact, design-promotion notes, or closeout report as
appropriate. Do not require `ux-writer` for direct use. If the role is
unavailable or the host cannot delegate, continue closeout yourself by checking
the same copy, terminology, message-state, recovery, and user-action concerns.
Do not use the role to override developer acceptance or approve final wording
for product claims, security language, legal text, support promises, or release
commitments.

When `.agents/roles/quality-engineer.md` exists and closeout depends on
verification evidence, validation gaps, regression risk, manual validation, or
residual-risk judgment, use `delegate-to-role` or a prompt-overlay delegation
to request bounded final quality input before archive.

Fold returned evidence into the completion checklist, final risks, follow-on
work, verification notes, validation-gap records, manual acceptance notes,
documentation impact, or closeout report as appropriate. Do not require
`quality-engineer` for direct use. If the role is unavailable or the host
cannot delegate, continue closeout yourself by checking the same targeted
coverage, regression, manual-validation, skipped-check, evidence, and
residual-risk concerns. Do not use the role to override developer acceptance,
waive checks, or replace `work-verify`.

When `.agents/roles/documentation-specialist.md` exists and closeout depends
on documentation impact, design promotion, current-state accuracy,
documentation structure, README or workflow-doc updates, link/index coverage,
or documentation follow-up, use `delegate-to-role` or a prompt-overlay
delegation to request bounded final documentation input before archive.

Fold returned evidence into the completion checklist, documentation impact,
design-promotion notes, review-and-refresh-docs handoff, final risks, follow-on
work, current-state accuracy gaps, human-review notes, or closeout report as
appropriate. Do not require `documentation-specialist` for direct use. If the
role is unavailable or the host cannot delegate, continue closeout yourself by
checking the same documentation-impact, design-promotion, link, structure,
README, workflow-doc, and current-state accuracy concerns. Do not use the role
to override developer acceptance, archive the plan, promote speculative
behavior, or replace `design-promote` or `review-and-refresh-docs`.

## Workflow

1. Resolve the plan explicitly, or infer it only when exactly one active plan
   exists. Fail clearly when multiple candidates exist.
2. Confirm every task and success goal, including documented validation gaps.
3. Confirm the human validation gate before completing the checklist: the
   developer has evaluated the completed phased work and accepted it, or the
   developer explicitly waived manual validation and the plan records the
   reason. Do not infer acceptance from passing automated tests.
4. Run or review required targeted and repository verification.
5. Review validation gaps, skipped checks, manual validation evidence,
   regression risks, and residual risk before treating verification as
   complete.
6. Complete the Security Review gate. Record post-phase findings in the
   plan's `Security Review` section. Convert blocking security findings into
   normal plan tasks before closeout instead of archiving with unresolved
   blockers.
7. Promote durable accepted behavior using `$design-promote`.
8. Review documentation structure, formatting, links, and current-state
   accuracy using `$review-and-refresh-docs`.
9. Add an operator-understanding closeout summary for meaningful work. Cover
   what changed, important boundaries, data touched, failure modes, evidence,
   unverified areas, and manual inspection needs. Do not introduce separate
   learning-mode or delivery-mode paths.
10. Harvest reusable lessons and update workflow guidance when appropriate.
11. Record final risks, follow-on work, documentation impact, and verification.
   Keep the completed record consistent with the active workflow `plan.md`
   template where it applies.
12. Archive only completed plans under `_docs/plans/completed/` with the
   required `YYYY-MM-DD-<name>.md` filename.

Every implementation plan must contain `## Completion Checklist`. If the
section is missing, repair it from the active `plan.md` template before
closeout review continues. The checklist is visible planning guidance, not the
sole source of truth. Still enforce this skill's workflow and guardrails if the
section was edited locally.

## Guardrails

- Never archive a backlog plan or activate one implicitly.
- Refuse closeout when incomplete work or undocumented verification gaps remain.
- Refuse closeout when the human validation gate is missing, incomplete, or
  only implied by automated checks.
- Refuse closeout when a required Security Review is missing, blocking
  security findings remain unresolved, or residual security risk is not
  recorded.
- Refuse closeout when verification gaps, skipped checks, manual validation
  gaps, or residual quality risk are material and not recorded.
- Preserve unrelated worktree changes.
- Keep the archived plan as historical execution evidence, not the sole source
  of current design truth.
