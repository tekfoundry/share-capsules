# Public Repository Security Controls

Status: Phase 10 repo-side baseline
Last updated: 2026-06-26

## Repo-Side Controls

The repository includes the following security-control files:

- `SECURITY.md` directs vulnerability reports away from public issues and toward GitHub private vulnerability reporting or `info@tekfoundry.com`.
- `.github/dependabot.yml` enables weekly dependency update pull requests for npm, Composer, and GitHub Actions.
- `.github/workflows/dependency-review.yml` blocks pull requests that introduce moderate-or-higher vulnerable dependency changes.
- `.github/workflows/codeql.yml` runs CodeQL for JavaScript/TypeScript and PHP on pull requests, pushes to `main`, and weekly scheduled analysis.
- `.github/workflows/ci.yml` runs the containerized non-browser and browser checks that should be required by branch protection.

## Platform Settings To Record

These controls are configured in GitHub repository settings and require maintainer access outside the working tree:

- Enable GitHub private vulnerability reporting.
- Enable secret scanning and push protection.
- Enable Dependabot security updates and Dependabot alerts.
- Confirm dependency graph is enabled.
- Confirm CodeQL/code scanning alerts are enabled.
- Protect the primary branch and require the CI, Dependency Review, and CodeQL checks before merge.
- Restrict force pushes and deletion on the protected primary branch.
- Record who has repository admin, security manager, maintainer, and Actions-secret access.

Do not commit screenshots containing private repository member names, tokens, secret values, or billing information. A sanitized settings export or redacted checklist is sufficient release evidence.

## Step-By-Step Setup

Use a GitHub account with repository admin, organization owner, or security manager permission.

1. Open the public GitHub repository.
2. Open **Settings**.
3. Open **Code security and analysis** or **Advanced Security** in the Security section.
4. Enable **Private vulnerability reporting**.
5. Enable **Secret Protection** or confirm secret scanning alerts are active.
6. Enable **Push protection** for secret scanning.
7. Confirm **Dependency graph** is enabled.
8. Enable **Dependabot alerts**.
9. Enable **Dependabot security updates**.
10. Confirm the checked-in `.github/dependabot.yml` is visible to GitHub and has no Dependabot configuration error.
11. Confirm **Code scanning** is active after `.github/workflows/codeql.yml` runs successfully.
12. Confirm the **Dependency Review** workflow runs on pull requests.
13. Open **Settings** > **Branches** or **Rulesets**.
14. Protect the primary branch, normally `main`.
15. Require pull requests before merging.
16. Require status checks before merging.
17. Require these checks after they have run at least once:
    - `non-browser-checks`
    - `browser-checks`
    - `dependency-review`
    - `Analyze javascript-typescript`
    - `Analyze php`
18. Require branches to be up to date before merging unless the project intentionally adopts a merge queue.
19. Require conversation resolution before merging.
20. Disable force pushes and branch deletion for the protected primary branch.
21. Review repository access:
    - Admins
    - Maintainers/write access
    - Security managers
    - GitHub Actions secrets and environment secret access
22. Remove stale access or record why each retained access is required.
23. Record sanitized evidence using the template below.

## Release Evidence

Before public release, record:

- The exact primary branch name.
- The list of required status checks.
- Whether private vulnerability reporting, secret scanning, push protection, Dependabot alerts, dependency graph, and code scanning are enabled.
- The date reviewed and reviewer.
- Any intentionally deferred platform control and accepted residual risk.

## Recorded Phase 10 Review

Date reviewed: 2026-06-26

Reviewer: repository maintainer

Result: confirmed in the Codex Phase 10 implementation thread that the GitHub setup was reviewed and is as expected.

Confirmed controls:

- Private vulnerability reporting
- Secret scanning alerts
- Push protection
- Dependabot alerts
- Dependabot security updates
- Dependency graph
- Code scanning alerts
- Dependency Review workflow
- CI workflow
- Protected primary branch
- Required CI/security checks
- Repository access review

Residual risk: none recorded for Phase 10. Re-review these settings before public release and after any repository ownership, maintainer, branch-protection, or GitHub security-plan change.

## Evidence Template

```md
# Public Repository Security Settings Evidence

Date reviewed:
Reviewer:
Repository:
Primary branch:

## Enabled Settings

- Private vulnerability reporting:
- Secret scanning alerts:
- Push protection:
- Dependency graph:
- Dependabot alerts:
- Dependabot security updates:
- Code scanning alerts:
- Dependency Review workflow:

## Required Checks

- non-browser-checks:
- browser-checks:
- dependency-review:
- Analyze javascript-typescript:
- Analyze php:

## Branch Protection

- Pull request required:
- Required status checks:
- Branch must be up to date:
- Conversation resolution required:
- Force pushes disabled:
- Branch deletion disabled:

## Access Review

Record roles only, not private user lists.

- Admin access reviewed:
- Maintainer/write access reviewed:
- Security manager access reviewed:
- Actions/environment secret access reviewed:
- Changes made:

## Residual Risk

List any deferred platform control, reason, owner, and deadline.
```
