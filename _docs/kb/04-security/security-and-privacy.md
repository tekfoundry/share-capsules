# Security And Privacy Model

Status: Current implemented behavior
Last updated: 2026-08-26

## Security Objective

Share Capsules controls access and raises the cost of scalable harvesting. It
does not claim to prevent screenshots, external recording, modified clients,
compromised devices, redistribution by authorized people, or operator access
when one operator controls both authorization and broker boundaries.

## Trust Boundaries

| Boundary | Trusted for | Not trusted for |
| --- | --- | --- |
| Host page | Serving encrypted bytes and public fallback | Credentials, trust evidence, keys, plaintext, policy decisions |
| Content script | Discovering explicit elements on approved origins | Holding tokens, keys, tickets, plaintext, or detailed results |
| Extension frame/runtime | Consent, authorization flow, local decryption/rendering | Perfect memory erasure or preventing screen capture |
| Laravel control plane | Accounts, OAuth/DPoP, policy evaluation, counters, metrics | Receiving plaintext or raw Capsule content keys in ordinary creation flow |
| Broker runtime | Content-key custody, ticket/proof validation, HPKE wrapping | Account authentication or independent policy loosening |
| CTX Provider | Private account/device/risk/consent evaluation | Disclosing global identity or raw trust evidence to creators/Hosts |
| Creator | Choosing policy and publishing fallback | Post-access control over authorized viewer behavior |
| Viewer account/device | Presenting consented evidence and receiving wrapped keys | Guaranteed unique human identity |

## Secrets And Key Posture

- Passwords remain in account authentication paths and never enter the
  extension.
- OAuth authorization uses PKCE, fixed redirect URIs, scoped access tokens, and
  DPoP binding.
- Viewer devices use distinct Ed25519 proof and X25519 agreement key pairs.
- Creator signing keys remain in creator-controlled extension storage and
  recovery bundles; recovery codes are separate high-entropy material.
- Capsule content keys are generated locally, registered directly with the
  broker, protected through the broker custody boundary, and never embedded in
  Capsules.
- Ticket-signing keys are purpose-bound Ed25519 keys with explicit lifecycle
  states and public JWKS exposure only for active/valid verification needs.
- Logs and audit events must not contain passwords, private keys, recovery
  codes, OAuth tokens, DPoP proofs, content keys, plaintext, raw trust
  evidence, or complete behavior traces.

## Permissions And Local File Safety

The extension requires only the V1 accepted permissions: `identity`, `storage`,
`scripting`, required access to Share Capsules service origins, and optional
runtime HTTPS Host access. Development builds may include localhost Host access
for static examples.

The extension writes creator output to a chosen local workspace. Routine
creation keeps `workspace.json`, the encrypted signing-key recovery bundle, and
the account workspace `capsules/` directory together. The recovery code is
shown separately and must not be written into the workspace. Workspace repair
can restore the encrypted bundle from disk but cannot restore or expose the
separate recovery code.

## Privacy Model

CTX prefers predicates and aggregates over raw data. Creators receive only
policy satisfaction or privacy-safe aggregate metrics explicitly supported by
the product. Hosts receive no trust-profile state.

Separate consent concepts remain separate even if UI presents them coherently:
site permission, automatic opening, measurement, retention, and policy
disclosure.

V1 does not collect pointer movement, scrolling, keystroke patterns,
surrounding-page activity, unrelated browsing, other-application activity, raw
biometrics, identity documents, IP-derived analytics dimensions, user agents, or
device fingerprints for automation-risk enforcement.

## Retention

| Data class | Current retention rule |
| --- | --- |
| Account pending deletion | 30-day recovery period |
| Expired ticket/replay artifacts | No more than 24 hours |
| Expired challenge attempts and module result evidence | No more than 24 hours after attempt expiry |
| Identifiable CTX access-event detail | No more than 30 days |
| Automation-risk rolling data | No more than 30 days |
| Authentication, recovery, administrative, and broker audits | No more than 90 days unless documented preservation applies |
| Active-sanction deletion tombstone | Until reversal, sanction expiry, or 90 days from deletion |
| Deleted data in disaster-recovery backups | No more than 30 additional days |
| Capsule enforcement counters | Only while needed for active policy enforcement |
| Creator metrics aggregates | While the Capsule remains active or the creator retains the record |

Restored backups must replay deletion-ledger obligations before serving
traffic.

## Threat Controls

The V1 threat model covers Capsule forgery, package tampering, parser abuse,
cryptographic downgrade, malicious Hosts, unsafe URL fetching, OAuth/DPoP
confusion, device-key substitution, policy substitution, ticket
forgery/replay/confusion, concurrent quota bypass, unauthorized key release,
trust assertion forgery, automation-risk false positives, account takeover,
creator-key loss, plaintext persistence, vulnerable content renderers,
supply-chain compromise, denial of service, and misleading failure oracles.

## Destructive Operations

Destructive or high-impact user actions require explicit confirmation and
server-side authorization. Current destructive operations include account
closure, permanent account deletion, device revocation, session revocation,
Capsule revocation, Capsule deletion, challenge-evidence deletion, content-key
destruction, and emergency release suspension.

Capsule deletion removes the creator-visible inventory record and destroys the
broker-held key material for that revision. It cannot remove already downloaded
or uploaded encrypted `.capsule` files, but those copies fail closed through
the destroyed key path.

## Supply Chain

V1 extension releases require locked dependencies, no remotely hosted extension
code, fixed production extension identity, separate development credentials,
permission review, supply-chain scan evidence, and emergency minimum-version or
release-suspension capability.

## Accepted Residual Risks

- Authorized users can copy visible content.
- A compromised browser, operating system, extension process, or device can use
  legitimate keys or inspect rendered content.
- Centralized V1 service operation correlates protected-content activity for
  enforcement.
- Provider/broker outages prevent protected viewing because every open requires
  online authorization.
- Sophisticated distributed or human-assisted harvesting may evade V1 risk
  gates.
- Native image decoder vulnerabilities remain a browser/platform risk.

## Migration Coverage

Detailed legacy-to-KB provenance is tracked in the
[migration inventory](../migration-inventory.md). Security- and
privacy-specific durable facts now live in this area and the linked detailed
pages in its README.
