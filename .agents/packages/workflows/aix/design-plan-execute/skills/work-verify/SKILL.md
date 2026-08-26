---
name: work-verify
description: Select and run targeted verification for a change, then report results, gaps, and whether plan success criteria are satisfied. Use when a user asks to verify work or validate a phase.
---

# Work Verify

Verify changed behavior from the smallest relevant checks outward. Passing
commands alone do not establish that plan success criteria are complete.

## Role Collaboration

`work-verify` owns check selection, command execution, verification evidence,
and the final verification report. Roles can supply bounded specialist
judgment, but they do not own command execution, plan status, or the decision
to accept residual risk.

When `.agents/roles/security-engineer.md` exists and the changed behavior is
security-sensitive, use `delegate-to-role` or a prompt-overlay delegation to
request a bounded security-verification pass. Good triggers include trust
boundaries, secrets, authentication, authorization, permissions, dependency or
supply-chain risk, local file writes, overwrites, deletes, renames, external
systems, network access, package trust, source resolution, lockfile integrity,
destructive operations, no-write guarantees, or redaction.

Fold returned evidence into selected checks, skipped-check rationale, manual
verification notes, residual risk, or follow-up work as appropriate. Do not
require `security-engineer` for direct use. If the role is unavailable or the
host cannot delegate, continue verification yourself by checking the same
security-sensitive behavior and failure paths.

When `.agents/roles/quality-engineer.md` exists and the verification choice or
evidence has meaningful quality risk, use `delegate-to-role` or a
prompt-overlay delegation to request a bounded quality pass. Good triggers
include non-trivial changed behavior, regression risk, failure paths, edge
cases, targeted-test selection, manual validation, skipped-check rationale,
acceptance evidence, validation gaps, or residual risk.

Fold returned evidence into selected checks, manual verification notes,
skipped-check rationale, validation gaps, residual risk, or follow-up work as
appropriate. Do not require `quality-engineer` for direct use. If the role is
unavailable or the host cannot delegate, continue verification yourself by
checking the same targeted coverage, regression, acceptance, and residual-risk
concerns.

When `.agents/roles/implementation-engineer.md` exists and selecting checks
depends on changed implementation boundaries, likely touched files, dependency
order, fixtures, compatibility paths, build or package artifacts, or
documentation impact, use `delegate-to-role` or a prompt-overlay delegation to
request bounded implementation input.

Fold returned evidence into selected checks, changed-file coverage notes,
manual verification steps, skipped-check rationale, residual risk, or
follow-up work as appropriate. Do not require `implementation-engineer` for
direct use. If the role is unavailable or the host cannot delegate, continue
verification yourself by checking the same implementation-boundary and
coverage-handoff concerns.

## Workflow

1. Identify the changed subsystem and read its design and quality guidance.
2. Run targeted tests or deterministic checks first.
3. Run applicable repository checks only after targeted verification passes, or
   after a targeted-check failure or blocker has been recorded with residual
   risk.
4. Add linting, smoke, packaging, release, or other repository-specific checks
   when the changed surface requires them.
5. Report exact commands, outcomes, skipped checks and reasons, manual checks,
   documentation impact, remaining risks, and whether the phase success
   criteria are met.

## Safety Matrix

- Runtime-boundary changes require all relevant callers, implementations,
  contracts, and adapters to be verified together.
- External-system changes require connect, disconnect, trust, authentication,
  and failure-path review when those concepts apply.
- File operation changes require path, overwrite, delete, rename,
  cancellation, conflict, and failure-path review.
- Credential-related changes require redaction and persistence-boundary review.
- Dependency and package-management changes require trust, source-resolution,
  lockfile-integrity, drift, and no-write failure-path review when those
  concepts apply.
