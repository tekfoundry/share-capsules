# Human Confidence

Status: Draft
Last updated: 2026-06-18

## Purpose

Define what CTX can responsibly claim about human participation and how confidence may be strengthened without equating humanity with identity or benign intent.

## Distinct questions

The design must distinguish:

- **User presence** — someone or something completed an interaction.
- **Account continuity** — the same credential or account returned.
- **Human confidence** — evidence is consistent with ongoing human control.
- **Unique personhood** — a provider believes one natural person enrolled only once.
- **Identity verification** — a provider connected the person to validated legal identity.
- **Benign intent** — the viewer will respect the creator's wishes.

Evidence for one question does not automatically answer the others.

## Confidence over time

Human confidence is expected to emerge from layered evidence rather than one test:

- Persistent account history
- Natural variation in Capsule-session activity
- Community relationships and contribution
- Creator activity recognized by others
- Stable credentials and reasonable device transitions
- Absence of abusive concurrency or volume
- Recent step-up challenge results
- Optional personhood credentials

Long-term reputation makes disposable automated accounts more expensive, but sleeper accounts, rented accounts, human farms, and compromised accounts remain possible.

## Biometrics and passkeys

Passkeys can provide strong account authentication and local user verification. They do not prove that an account is unique to one natural person.

Biometric or identity proofing may be offered by specialist providers as higher-assurance evidence. CTX services should receive a narrow credential rather than raw facial images, fingerprints, identity documents, or biometric templates.

Creators may select an assurance requirement. Legal identity or biometric enrollment is not currently intended as a universal prerequisite for a basic Share Capsules account.

## Behavioral evidence

Mouse movement, scrolling, touch, keyboard use, dwell time, focus, navigation, and request patterns may contribute to session assessment. They are probabilistic and gameable.

The absence of mouse behavior must not be treated as evidence of automation. The system must accommodate touch-only users, keyboard navigation, assistive technology, motor differences, and unusual but legitimate behavior.

V1 does not collect these passive interaction signals. Its automation-risk gate uses CTX authorization and committed-release metadata only and must not be described as proof of human presence. See [V1 automation risk](automation-risk.md).

## Step-up challenges

When available evidence is insufficient, CTX may request additional verification:

- Passive browser or device checks
- Accessible interactive challenges
- Credential presentation
- Community or creator approval
- Higher-assurance personhood verification

A completed CAPTCHA, math problem, or graphical puzzle is short-lived session evidence. It must not grant substantial permanent reputation because automated systems and paid human solvers can complete challenges.

Repeated failure should offer alternate methods when practical rather than permanently labeling the account as non-human.

## Assurance model

A provisional model is:

```text
Level 1 — user-present
Level 2 — persistent account with established human-consistent history
Level 3 — unique-person credential from an accepted provider
Level 4 — verified legal identity from an accepted provider
```

These levels describe different assurance sources and may not form a simple hierarchy in the final protocol.

## Claims CTX should avoid

CTX should not claim:

- A human-confidence score proves a natural person is present
- A verified person will not harvest content
- A successful CAPTCHA proves humanity
- A biometric credential proves only one account exists everywhere
- A low score proves malicious intent

## Open questions

- Does CTX standardize assurance levels or only credential semantics?
- How can unique-person verification remain pseudonymous to creators?
- How are duplicate enrollments, recovery, and account replacement handled?
- Which accessible step-up methods should V1 support?
- How much human-confidence evidence can be computed locally?

## Related documents

- [Trust model](trust-model.md)
- [Reputation and signals](reputation-and-signals.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
- [V1 automation risk](automation-risk.md)
