# Design Principles

Status: Draft
Last updated: 2026-06-18

## Purpose

Record the durable principles used to evaluate product and architecture decisions.

## Creator ownership

Creators retain control over their original content, access policies, trust relationships, encryption choices, and distribution. The system should not lock creators into one host, Viewer, trust provider, or commercial operator.

Creator signing keys must remain under creator control. Creators must be able to export content and policy, rotate keys, and select or replace key-release providers. The architecture should minimize the ability of any single service to decrypt protected content independently.

## Hosting independence

Hosts distribute Capsules; they are not access authorities. A Capsule should be distributable through personal sites, community portals, content platforms, cloud storage, and future hosting systems without redefining its access intent.

## Creator-selected trust

CTX does not define a universally trustworthy person. Creators select the providers, credentials, signals, and thresholds they recognize. Communities may define contribution and standing differently.

## Voluntary disclosure; conditional access

Viewers decide which evidence they disclose. Creators decide which evidence is required. Refusing disclosure must not cause hidden tracking, but it may leave the viewer ineligible for protected content.

## Data minimization

The system should prefer proving that a condition is satisfied over disclosing raw data. For example, it should prefer `views_this_month_under_limit: true` over sharing a complete viewing history.

## Multidimensional and contextual trust

Trust must not be collapsed into one universal reputation number. Account continuity, community standing, contribution, creator activity, consumption, personhood evidence, and automation risk represent different questions.

Trust evidence is contextual, time-bound, attributable to its issuer, and subject to expiration or revocation.

## Observable facts are not judgments

CTX distinguishes:

1. Observed facts, such as view counts or account age
2. Provider assertions, such as low automation risk or community standing
3. Creator policy, which decides whether the available evidence is sufficient

Frequent viewing is not inherently malicious, and a behavioral pattern is not proof of intent.

## Privacy by constraint

Users should not have to rely only on an operator's stated good intentions. Wherever practical, architecture should prevent unnecessary collection and correlation.

Raw biometrics, complete interaction recordings, unrelated browsing activity, and other unnecessary personal data should remain outside CTX.

## Account continuity without universal exposure

Reputation should be persistent enough that abandoning an account is costly. At the same time, unrelated creators should not automatically receive a globally correlatable viewer identity.

This tension is unresolved and must remain explicit in future identity design.

## Inclusive confidence assessment

Mouse movement, touch, keyboard behavior, assistive technology, challenges, and device signals may contribute evidence. No single interaction mode is proof of humanity. The system must provide accessible alternatives and avoid treating missing mouse data as malicious.

## Protocol before monopoly

Share Capsules is the practical V1 CTX Provider and reference implementation. Capsule and CTX must nevertheless be specified so other compatible CTX Providers can exist and creators and viewers can move without losing control of content, policy, credentials, or earned reputation where portability is technically possible.

## Honest limits

The project must describe the protection it actually provides. It controls access and raises abuse costs; it does not guarantee that authorized recipients cannot copy visible content.

## Related documents

- [Vision and problem](vision-and-problem.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [Trust model](../05_ctx/trust-model.md)
