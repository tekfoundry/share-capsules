# Third-Party Notices

Share Capsules depends on open-source PHP, JavaScript, and infrastructure packages through Composer, npm, and GitHub Actions.

Authoritative dependency versions are recorded in:

- `code/composer.lock`
- `code/package-lock.json`
- `.github/workflows/*.yml`

Release checks should include:

```bash
./_infra/kit composer audit
./_infra/kit npm audit --audit-level=moderate
./_infra/kit npm run release:supply-chain-check
```

The project source is licensed under Apache License 2.0. Dependency packages retain their own licenses. Before a public release, review lockfile dependency license output and update this file or release notes if any dependency imposes a notice, attribution, source-distribution, or other redistribution obligation beyond normal package-manager use.
