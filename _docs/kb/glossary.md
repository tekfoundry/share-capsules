# Glossary

Status: Current project vocabulary
Last updated: 2026-08-26

## Terms

- **Share Capsules:** the hosted product, first CTX Provider, initial Key
  Broker, official Viewer distribution path, and reference implementation
  operated for the experimental Capsule and CTX technologies.
- **Capsule:** a portable package containing signed metadata, encrypted
  protected payload bytes, content-profile requirements, a creator-signed
  access policy, and integrity/authenticity material.
- **Capsule Trust Exchange (CTX):** the protocol for presenting consented
  evidence, evaluating creator policy, issuing authorization, and coordinating
  content-key release.
- **CTX Provider:** a service that evaluates CTX policy and issues
  authorization tickets. Share Capsules is the V1 provider.
- **Key Broker:** a service that validates CTX authorization and releases a
  Capsule content key wrapped to a registered Viewer device.
- **Creator:** the person or organization that packages content, signs a
  Capsule, selects policy, and publishes the Capsule.
- **Viewer:** trusted software that verifies Capsules, obtains authorization,
  decrypts, and renders; also the person using that software when context is
  clear.
- **Host:** the static site, platform, or storage location that serves
  encrypted Capsules and public fallback content.
- **Capsule Viewer element:** the declarative `<capsule-viewer>` Host element
  that identifies a Capsule URL and contains public fallback content.
- **Trust Provider:** an issuer of credentials or assertions used as CTX policy
  evidence. A CTX Provider may also act as a Trust Provider.
- **Credential:** a signed statement from a Trust Provider about an account,
  pseudonym, membership, status, qualification, or attribute.
- **Assertion:** a provider's time-bound interpretation, such as current
  automation risk not high.
- **Observable fact:** a measured or verifiable event or aggregate before
  policy interpretation.
- **Trust profile:** provider-private account, consent, device, usage, risk,
  challenge, replay, and audit state used to evaluate policy. It is not a
  creator-visible universal score.
- **Human confidence:** a bounded assessment that evidence is consistent with a
  persistent human-controlled account or session. It is not legal identity or
  proof of benign intent.
- **Personhood verification:** optional stronger evidence intended to establish
  that an account corresponds to a distinct natural person.
- **Session telemetry:** consented measurements during a protected Viewer
  session. V1 automation risk does not use passive interaction tracking.
- **Step-up verification:** an additional check, such as a challenge or
  credential presentation, requested when current evidence is insufficient.
- **Policy:** creator-authored requirements governing access to one Capsule
  revision.
- **Authorization ticket:** a short-lived, single-use, signed CTX artifact that
  allows one broker-audience-bound key-release request.
- **Creator signing key:** creator-controlled Ed25519 private key used to sign
  Capsule manifests.
- **Capsule content key:** unique random symmetric key used to encrypt one
  protected payload.
- **Viewer proof key:** registered Ed25519 device key used for DPoP and broker
  proof-of-possession.
- **Viewer agreement key:** registered X25519 device key used to receive
  HPKE-wrapped content keys.
- **Reputation continuity:** persistence of account standing and abuse
  consequences across ordinary login, device replacement, key rotation, and
  recovery.
- **Pseudonym:** scoped identifier used instead of global or legal identity.
- **Official network:** the Share Capsules-recognized set of providers,
  brokers, tools, versions, and policy profiles trusted by official tools.
- **Compatible implementation:** software that implements the experimental
  contracts, whether or not it is recognized by the official network.

## Terms To Use Carefully

- Prefer **session telemetry**, **device evidence**, or **explicit credential**
  over "fingerprinting" when participation is consented.
- Prefer **human confidence** over "human score".
- Avoid "trusted user" unless the sentence names trusted by whom, for what,
  and based on which evidence.
- Avoid "DRM" unless explaining why Capsule does not promise post-access copy
  control.
