# Open Source and Sponsorship

Status: Accepted
Last updated: 2026-06-20

## Sponsorship

Capsule, CTX, and the Share Capsules reference implementation are sponsored and initially maintained by [TekFoundry](https://tekfoundry.com).

Public project materials should provide visible, proportionate attribution to TekFoundry without implying that compatible Capsule or CTX implementations must use Share Capsules or receive TekFoundry approval. General questions, proposals, and comments may be sent to `info@tekfoundry.com`.

Recommended public wording:

> Capsule and CTX are open technologies sponsored and maintained by TekFoundry. Share Capsules is the first reference implementation. Public review, compatible implementations, and constructive contributions are welcome. Questions may be sent to info@tekfoundry.com.

## Public development

The project is intended to be developed in a public GitHub repository so protocol, security, privacy, accessibility, and interoperability decisions can receive public review and improvement.

Public source does not make the hosted Share Capsules service trustless, eliminate operational custody, or prove that an implementation is secure. Project materials must continue to state the residual trust in the CTX Provider, Key Broker, browser, extension distribution channel, and authorized viewer device.

## License

The intended project license is Apache License 2.0. Its explicit patent grant and permissive reuse terms fit an open protocol and reference implementation. Before the first public release, TekFoundry should confirm the copyright notice, contributor expectations, third-party compatibility, and any desired trademark policy.

The software license does not grant rights to TekFoundry or Share Capsules names, logos, domains, or other marks beyond nominative use required to describe compatibility. A short trademark policy may be added before third-party distribution creates practical ambiguity.

## Public repository requirements

Before the repository is made public, it should contain:

- A project-level README explaining Capsule, CTX, Share Capsules, experimental status, sponsorship, contact information, and current scope
- The Apache License 2.0 text and appropriate copyright notice
- Contribution guidelines and a lightweight governance model
- A code of conduct
- A security policy directing vulnerabilities to GitHub private vulnerability reporting or `info@tekfoundry.com`, rather than public issues
- Issue and pull-request templates
- Required CI and protected primary branches
- Dependency updates, secret scanning, dependency review, and appropriate code scanning
- Clear labels distinguishing specifications, reference behavior, proposals, and future work

GitHub Discussions and public issues may be used for design proposals, questions, interoperability reports, and ordinary defects. Suspected vulnerabilities and exposed secrets must use the private security path.

## Publication gate

Before the first public push, the complete working tree and any history being published must be checked for:

- Environment files and credentials
- OAuth clients, extension secrets, tokens, cookies, and signing material
- Creator, content, broker, recovery, or device private keys
- Local MySQL and Redis data
- Logs, backups, generated builds, dependency directories, editor metadata, and operating-system metadata
- Private hostnames, account information, or copied artifacts from unrelated projects
- Third-party code or assets whose licenses are incompatible or missing attribution

The public repository and documentation must label Capsule and CTX as experimental until their specifications, security review, test vectors, and independent interoperability criteria are satisfied. Early users must not be encouraged to rely on the MVP for highly sensitive content.

## Related documents

- [Vision and problem](vision-and-problem.md)
- [Design principles](principles.md)
- [Scope and non-goals](scope-and-non-goals.md)
- [Share Capsules reference implementation](../03_architecture/share-capsules-reference-implementation.md)
- [V1 threat model](../07_security-and-privacy/threat-model-v1.md)
