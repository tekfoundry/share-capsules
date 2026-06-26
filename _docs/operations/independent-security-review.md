# Independent Security Review Runbook

Status: Phase 10 external-review instructions
Last updated: 2026-06-26

## Purpose

Provide repeatable instructions for scheduling, scoping, executing, and recording the independent security review required before Phase 10 closure.

## Reviewer Requirements

The reviewer must be independent from the implementation work being reviewed. They may be an external consultant, trusted open-source security reviewer, or internal reviewer who did not implement the reviewed Phase 10 controls.

The reviewer should be comfortable evaluating:

- Cryptographic protocol bindings and test vectors
- Key broker isolation and key-release boundaries
- Browser extension origin, permission, storage, message, and rendering boundaries
- ZIP, JSON, image, JWT, DPoP, HPKE, and error-envelope parser hardening
- Retention, deletion, restore, consent, and privacy-control behavior
- Supply-chain release controls and repository security posture

## Pre-Review Preparation

1. Choose the exact commit or release-candidate branch for review.
2. Ensure the working tree evidence is up to date:
   - `_docs/operations/phase10-security-privacy-evidence.md`
   - `_docs/operations/supply-chain-release-check.md`
   - `_docs/operations/supply-chain-release-check-latest.json`
   - `_docs/operations/static-image-envelope-benchmark.md`
   - `_docs/operations/viewer-compatibility-policy.md`
   - `_docs/operations/public-repository-security-controls.md`
3. Run and record the current automated gate:
   - `./_infra/kit check`
   - `./_infra/kit browser-check`
   - `./_infra/kit npm run release:supply-chain-check`
4. Provide the reviewer with the design entry points:
   - `_docs/design/07_security-and-privacy/threat-model-v1.md`
   - `_docs/design/07_security-and-privacy/cryptographic-suite-v1.md`
   - `_docs/design/03_architecture/access-and-data-flow.md`
   - `_docs/design/03_architecture/key-management.md`
   - `_docs/design/06_viewer/browser-viewer.md`
   - `_docs/design/05_ctx/authorization-and-key-release.md`
   - `_docs/design/07_security-and-privacy/privacy-model.md`
5. Provide no production secrets, private keys, user data, logs with personal data, or recovery material.

## Review Scope

Ask the reviewer to assess at minimum:

1. Manifest canonicalization, signing, entry commitments, payload encryption, nonce use, and downgrade rejection.
2. CTX ticket claims, issuer/audience/action/payload/policy bindings, DPoP proof binding, replay controls, and HPKE key release.
3. Broker API separation, credential boundaries, audit behavior, key lifecycle, and failure behavior.
4. Extension permissions, content script registration, message validation, frame isolation, storage boundaries, object URL disposal, and plaintext/key lifetime.
5. Host and Capsule URL policy: schemes, userinfo, redirects, local/private targets, oversized streams, and credential omission.
6. Parser and renderer hardening for malicious packages, malformed JSON, malformed images, unsupported versions, and error envelopes.
7. Privacy behavior for consent, creator metrics, denial categories, trust/challenge evidence, retention, export, deletion, correction, and appeals.
8. Supply-chain controls: locked dependencies, audit commands, no remote extension code, reproducible build hash, repository security settings, and release suspension.

## Finding Severity

Record each finding with one severity:

- Critical: likely content-key, plaintext, signing-key, account, broker-key, or systemic authorization compromise.
- High: plausible bypass of policy, release limits, broker isolation, deletion guarantees, or extension-origin isolation.
- Medium: meaningful hardening gap, privacy leak, downgrade path, denial ambiguity, or operational weakness.
- Low: defense-in-depth, documentation, test clarity, or low-impact configuration gap.
- Informational: no direct vulnerability but useful design or assurance note.

Phase 10 cannot close with unresolved Critical or High findings. Medium findings need either remediation or a documented owner, deadline, and accepted residual risk.

## Step-By-Step Execution

1. Create a review issue or private tracking document.
2. Record reviewer name or organization, independence statement, review date range, commit SHA, and scope.
3. Share the pre-review materials listed above.
4. Give the reviewer a clean local setup path:
   - `./_infra/kit doctor`
   - `./_infra/kit up`
   - `./_infra/kit check`
   - `./_infra/kit browser-check`
5. Ask the reviewer to inspect the design, implementation, tests, and generated evidence.
6. Ask the reviewer to try to produce minimal proof-of-concept failures only with synthetic data.
7. Record each finding using the template below.
8. Triage findings with Engineering, Security, Privacy, and Operations owners as appropriate.
9. Remediate Critical and High findings before Phase 10 closure.
10. Re-run affected tests and evidence commands after remediation.
11. Ask the reviewer to verify remediation or record why the residual risk is accepted.
12. Link the final review record in `phase10-security-privacy-evidence.md`.
13. Mark `P10-REVIEW-01` complete only after the final report has no unresolved Critical or High findings.

## Finding Template

```md
## Finding ID

Title:
Severity:
Status:
Reviewer:
Owner:
Affected area:
Affected commit:

### Summary

### Evidence

### Impact

### Recommendation

### Remediation

### Verification

### Residual Risk
```

## Final Report Template

```md
# Independent Security Review Evidence

Reviewer:
Reviewer independence statement:
Review dates:
Reviewed commit:
Reviewed scope:

## Materials Reviewed

## Automated Evidence Reviewed

## Findings Summary

| ID | Severity | Status | Owner | Summary |
| --- | --- | --- | --- | --- |

## Critical/High Closure

Confirm no unresolved Critical or High findings remain.

## Residual Risks Accepted

## Reviewer Final Notes
```
