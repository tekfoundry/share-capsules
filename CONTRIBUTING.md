# Contributing To Share Capsules

Thanks for taking a look at Share Capsules. Capsule and CTX are experimental, security-sensitive protocols, so useful contributions can be design review, threat-model feedback, docs fixes, test cases, implementation patches, or compatibility notes from independent experiments.

## Before Opening A Change

- Read the project [README](README.md), [security policy](SECURITY.md), and current [MVP plan](_docs/plans/initial-mvp.md).
- For protocol or security changes, read the relevant design/specification documents under `_docs/design`.
- Open a public issue for non-sensitive bugs, questions, or proposals.
- Do not open public issues for suspected vulnerabilities, exposed secrets, bypasses, privacy failures, or abuse paths. Follow [SECURITY.md](SECURITY.md).

## Development Workflow

Use the repository tooling from the project root:

```bash
./_infra/kit doctor
./_infra/kit up
./_infra/kit check
```

Composer, npm, Artisan, builds, and tests should run through `_infra/kit` so they use the pinned containerized environment.

## Pull Requests

- Keep changes focused and include tests for behavior changes.
- Update design, operations, or user documentation when the user-facing behavior or security posture changes.
- Do not commit secrets, private keys, local `.env` files, logs, local databases, browser profiles, or generated unpacked extension directories.
- Explain security and privacy impact in the pull request when relevant.

By contributing, you agree that your contribution is submitted under the Apache License 2.0 unless another written agreement applies.
