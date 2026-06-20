# Vision and Problem

Status: Draft
Last updated: 2026-06-18

## Purpose

Define the problem Capsule and CTX seek to address and the long-term change they intend to enable.

## Problem

The web commonly treats content as either public or private.

Public content is easy to discover and distribute, but it is also easy to scrape, aggregate, archive, republish, and use for purposes the creator did not authorize. Private content is generally controlled through platform-specific accounts, hosting, and access systems. Creators must often choose between reach and control.

Creators lack a portable way to express:

- Who may access their content
- What evidence is acceptable when evaluating a viewer
- Which trust providers they recognize
- What disclosure a viewer must consent to
- How access policy remains attached when content changes hosts

Reducing unauthorized harvesting for AI training is an important use case, but Capsule and CTX are designed as a general-purpose creator-controlled distribution architecture rather than a technology limited to one type of misuse.

## Vision

Capsule and CTX seek to establish an open distribution layer where:

- Creators package protected content with portable access intent.
- Capsules can be stored and distributed by interchangeable hosts.
- Viewers disclose only the evidence required by a creator's policy.
- Trust is earned over time, contextual, and selected by creators.
- Multiple trust providers and Viewer implementations can coexist.
- No single company is permanently required for the ecosystem to operate.

The concise product promise is:

> Creators can distribute content publicly without granting universal access to it.

## Honest security promise

Capsule and CTX cannot guarantee that visible content will never be copied, recorded, or submitted to an AI system. A trusted human can misuse access, credentials can be compromised, and any rendered media can potentially be captured.

The system instead aims to:

- Make anonymous bulk harvesting more difficult
- Make disposable identities less useful
- Establish persistent reputation and accountability
- Detect abnormal or automated consumption
- Support creator-selected requirements and rate limits
- Revoke or restrict abusive viewers
- Give viewers informed control over disclosure
- Raise the cost of unauthorized harvesting

The promise is controlled and accountable access, not perfect post-access control.

## Desired ecosystem

In the long term:

- Capsules are creator-owned.
- Trust is creator-selected.
- Viewer disclosure is voluntary and explicit.
- Access is conditional on satisfying creator policy.
- Hosting is interchangeable.
- Trust and identity providers are federated.
- Protocols outlive individual services and implementations.

## Open questions

- Which protections will creators understand as valuable without overstating their strength?
- How much inconvenience will eligible viewers tolerate for protected content?
- What evidence most effectively raises harvesting costs while preserving privacy?

## Related documents

- [Design principles](principles.md)
- [Scope and non-goals](scope-and-non-goals.md)
- [System overview](../03_architecture/system-overview.md)
