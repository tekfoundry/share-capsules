---
name: work-verify
description: Select and run targeted verification for a change, then report results, gaps, and whether plan success criteria are satisfied. Use when a user asks to verify work or validate a phase.
---

# Work Verify

Verify changed behavior from the smallest relevant checks outward. Passing
commands alone do not establish that plan success criteria are complete.

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
