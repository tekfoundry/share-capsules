# Phase 12 Production Deployment Runbook

Status: draft for MVP deployment review
Last updated: 2026-06-26

This runbook covers the production deployment path for the prototype topology:

- `sharecapsules.com` is the control-plane and public application origin.
- `broker.sharecapsules.com` is the Key Broker origin.
- Both DNS names resolve to the same Laravel Forge site for the MVP prototype.
- `SHARECAPSULES_COMPONENT=control-plane` remains set in the shared Forge site.

The same-install topology preserves the broker protocol identity but does not provide hardened runtime isolation. A later hardened deployment can move only `broker.sharecapsules.com` to a broker-only Forge site using `code/.env.broker.production.example`.

Do not record passwords, tokens, private keys, connection strings, customer data, or secret values in this runbook, the production change ledger, GitHub issues, pull requests, screenshots, or deployment logs.

## 1. Release Approval

1. Confirm the current commit is checked in, pushed to GitHub, and selected as the release candidate.
2. Confirm required CI checks are passing for the release candidate.
3. Review the Phase 12 success goals and MVP release criteria in `_docs/plans/initial-mvp.md`.
4. Confirm that the release provides one coherent user-visible loop: creator account, Viewer extension connection, Capsule creation, static hosting, authorization, broker key release, local extension rendering, revocation, and account/deletion controls.
5. Record the approval decision, release commit, reviewer, date, and any accepted residual risk in `_docs/operations/production-change-ledger.md`.

## 2. Reserve Production Extension Identity

The production Forge environment cannot be finalized until the production Chrome extension ID is known. Reserve the Chrome Web Store item before environment reconciliation, but do not publish it until the later extension release gate.

1. Confirm the Chrome Web Store developer account and publisher identity are approved for the production release.
2. Build a candidate extension package for identity reservation. This package may be a draft submission, but it must be recognizable as the production item and must not contain private credentials:

   ```bash
   ./_infra/kit npm run build:extension:reservation
   ```

   Upload the contents of `code/apps/browser-extension/build` as the draft extension package.
3. In the Chrome Developer Dashboard, create a new item and upload the candidate ZIP without publishing it. The Chrome docs describe this as the way to preserve a stable extension ID during development: upload the ZIP, open the Package tab, view the public key, add the public key to the manifest `key` field, and compare the loaded extension ID with the Developer Dashboard item ID.
4. Record the Chrome Web Store item ID as the production extension ID in private operational notes.
5. Record the public key needed to preserve the production extension ID in the source or build configuration that produces the production manifest. Do not reuse the development manifest key.
6. Build and load the production extension locally or in a release-test browser and confirm the loaded extension ID exactly matches the Chrome Web Store item ID:

   ```bash
   ./_infra/kit npm run build:extension:production \
     --sharecapsules-extension-id=<chrome-web-store-item-id> \
     --sharecapsules-extension-public-key=<chrome-web-store-public-key> \
     --sharecapsules-oauth-extension-client-id=<production-oauth-client-uuid>
   ```

   The production build fails when the public key does not derive the configured extension ID.
7. If the current extension build still has development-only identity, name, OAuth callback, localhost-only automatic origins, or hardcoded development extension IDs, stop and complete the production packaging change before continuing.
8. Use the reserved production extension ID to set:
   - `SHARECAPSULES_EXTENSION_ID`
   - `SHARECAPSULES_OAUTH_EXTENSION_REDIRECT_URI=https://<extension-id>.chromiumapp.org/oauth/callback`
   - the fixed public OAuth client configuration
9. Leave final Chrome Web Store submission and publication for Section 9.

References:

- Chrome extension manifest `key` documentation: `https://developer.chrome.com/docs/extensions/reference/manifest/key`
- Chrome Web Store publishing documentation: `https://developer.chrome.com/docs/webstore/publish`

## 3. Environment Reconciliation

1. Open the Forge site environment editor for the production site.
2. Start from `code/.env.production.example`.
3. Replace every placeholder value. At minimum, verify these production identities:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_URL=https://sharecapsules.com`
   - `SHARECAPSULES_ENVIRONMENT=production`
   - `SHARECAPSULES_COMPONENT=control-plane`
   - `SHARECAPSULES_DEPLOYMENT_ID=production-primary`
   - `SHARECAPSULES_EXTENSION_CHANNEL=production`
   - `SHARECAPSULES_EXTENSION_ID=<production Chrome extension id>`
   - `SHARECAPSULES_OAUTH_EXTENSION_CLIENT_ID=<production UUID>`
   - `SHARECAPSULES_OAUTH_EXTENSION_REDIRECT_URI=https://<extension-id>.chromiumapp.org/oauth/callback`
   - `SHARECAPSULES_CTX_ISSUER=https://sharecapsules.com`
   - `SHARECAPSULES_BROKER_URL=https://broker.sharecapsules.com`
   - `SHARECAPSULES_BROKER_INTERNAL_URL=https://broker.sharecapsules.com`
4. Add production-health variables required by current validators:
   - `ACCOUNT_SANCTION_HMAC_KEY=<32-byte secret or base64 encoded 32-byte secret>`
   - `ACCOUNT_DELETION_LEDGER_CONNECTION=<isolated deletion ledger connection name>`
   - `DELETION_LEDGER_DB_HOST`
   - `DELETION_LEDGER_DB_PORT`
   - `DELETION_LEDGER_DB_DATABASE`
   - `DELETION_LEDGER_DB_USERNAME`
   - `DELETION_LEDGER_DB_PASSWORD`
   - `BROKER_DB_HOST`
   - `BROKER_DB_PORT`
   - `BROKER_DB_DATABASE`
   - `BROKER_DB_USERNAME`
   - `BROKER_DB_PASSWORD`
   - `BROKER_KMS_DRIVER=managed`
   - `BROKER_KMS_KEY_ID=<managed KMS or HSM key identifier>`
   - `BROKER_ALLOW_LOCAL_KMS_IN_PRODUCTION=false`
   - `SHARECAPSULES_BROKER_AUDIT_CHANNEL=broker_audit`
   - `BROKER_AUDIT_LOG_LEVEL=notice`
5. For this accepted same-install MVP prototype only, local broker key custody may be used instead of managed custody after recording the reduced-isolation risk. In that case set:
   - `BROKER_KMS_DRIVER=local`
   - `BROKER_KMS_KEY_ID=production-prototype-local-key-0001`
   - `BROKER_LOCAL_KMS_KEY=base64:<32-byte random key>`
   - `BROKER_ALLOW_LOCAL_KMS_IN_PRODUCTION=true`
6. Confirm mail delivery values are production Mailgun values:
   - `MAIL_MAILER=mailgun`
   - `MAILGUN_DOMAIN`
   - `MAILGUN_SECRET`
   - `MAIL_FROM_ADDRESS`
7. Confirm Redis values are production Redis values and `QUEUE_CONNECTION=redis`, `CACHE_STORE=redis`, and `SESSION_DRIVER=database`.
8. Record only variable names, infrastructure dependencies, and verification status in the production change ledger. Do not record values.

## 4. Forge Site And DNS

1. In Forge, create or select the Laravel site for `sharecapsules.com`.
2. Add `broker.sharecapsules.com` as an additional domain or alias on the same Forge site.
3. Confirm DNS for both names resolves to the same production server.
4. Set the web directory to the Laravel `public` directory.
5. Confirm the repository, branch, PHP version, Node version, and deploy user match the release plan.
6. Confirm MySQL has separate databases and users for:
   - control-plane application storage
   - broker storage through the Laravel `broker` connection
   - deletion ledger storage through the configured deletion-ledger connection
7. Confirm Redis is provisioned and reachable from the Forge server.
8. Record the sanitized site, DNS, database, Redis, and branch baseline in the production change ledger.

## 5. Forge Deployment Script

Use this shape for the Forge deployment script, adjusting paths only for the actual Forge site directory:

```bash
cd /home/forge/sharecapsules.com/code
git pull origin main
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan migrate --database=broker --path=database/migrations/broker --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart
```

For the first production deployment, run the two migration commands deliberately and verify both complete. The same-install prototype still uses a distinct broker database connection.

## 6. Queue And Scheduler

1. Configure a Forge queue worker or daemon for the Laravel queue connection.
2. Use `redis` as the queue connection.
3. Set a conservative worker command, for example:

   ```bash
   php artisan queue:work redis --sleep=3 --tries=3 --timeout=90
   ```

4. Configure the Laravel scheduler to run every minute:

   ```bash
   php artisan schedule:run
   ```

5. Verify the scheduler covers:
   - account deletion completion
   - pending Capsule cleanup every five minutes
   - CTX ticket-signing key retirement every minute
   - pruning for tickets, grants, device proofs, metrics, automation risk, challenge attempts, sanctions, and deletion ledger entries
6. Confirm failed jobs, queue logs, and scheduler failures are visible through the approved monitoring channel.

## 7. TLS, Headers, Secrets, Backups, And Alerts

1. Issue or renew TLS certificates for both `sharecapsules.com` and `broker.sharecapsules.com`.
2. Confirm both certificates include the correct hostname and auto-renew in Forge.
3. Configure security headers at the web server or application layer according to the approved production policy.
4. Store secrets only in Forge environment variables or the approved secret-management system.
5. Confirm broker key custody uses the managed driver and an approved KMS/HSM key.
6. Configure database backups for application, broker, and deletion-ledger storage.
7. Perform or schedule a backup restoration drill before public MVP approval.
8. Configure alerts for:
   - unhealthy `/up`
   - unhealthy broker `/up`
   - queue failures
   - scheduler failures
   - high authorization or broker error rates
   - backup failures
   - security audit events requiring operator review

## 8. Discovery And Signing Keys

1. Run the deployment script and migrations first.
2. Generate Passport signing keys outside source control if the production site does not already have valid keys:

   ```bash
   php artisan passport:keys
   ```

3. Provision the fixed public OAuth client for the production extension:

   ```bash
   php artisan ctx:provision-extension-client
   ```

4. Stage a CTX ticket-signing key:

   ```bash
   php artisan ctx:ticket-signing-key stage
   ```

5. Record the returned key identifier in the private operational record.
6. Verify `https://sharecapsules.com/ctx/jwks.json` publishes the staged public key.
7. Activate the staged key:

   ```bash
   php artisan ctx:ticket-signing-key activate <kid>
   ```

8. Follow `_docs/operations/ctx-ticket-signing-key-rotation.md` for planned rotation and emergency revocation.

## 9. Extension Build And Store Submission

1. Run the release supply-chain checks from the repository root:

   ```bash
   ./_infra/kit npm audit --audit-level=moderate
   ./_infra/kit composer audit
   ./_infra/kit npm run lint
   ./_infra/kit composer lint
   ./_infra/kit npm run typecheck
   ./_infra/kit npm run build:extension:production \
     --sharecapsules-extension-id=<chrome-web-store-item-id> \
     --sharecapsules-extension-public-key=<chrome-web-store-public-key> \
     --sharecapsules-oauth-extension-client-id=<production-oauth-client-uuid>
   ./_infra/kit npm run release:supply-chain-check
   ```

2. Review the generated supply-chain evidence JSON.
3. Confirm the built extension contains no remotely hosted executable code.
4. Publish the source/build hashes with the release evidence.
5. Submit the fixed production identity to the Chrome Web Store.
6. Record Web Store package version, extension ID, submission date, review status, and approval status. Do not record private store credentials.

## 10. User And Project Documentation

1. Review and publish creator documentation.
2. Review and publish viewer documentation.
3. Review and publish privacy documentation.
4. Review and publish security-limit language. Confirm it does not promise copy prevention, human certainty, or one-human-one-account.
5. Review and publish account-deletion documentation.
6. Review and publish compatible-Host documentation.
7. Confirm the public repository includes README, Apache License 2.0 notice, sponsorship/contact statement, contribution guide, governance guidance, code of conduct, security policy, and issue/pull-request templates.
8. Record the exact public documentation URLs and release commit in the production change ledger or release evidence.

## 11. Public Repository And History Audit

1. Run the supply-chain release check in Section 9.
2. Review tracked files for secrets, logs, local data, generated artifacts, unrelated private information, and licensing obligations.
3. Review Git history using the approved secret-scanning tool or GitHub secret scanning.
4. Confirm `.env`, private keys, local databases, build caches, and browser profiles are not committed.
5. Confirm third-party license obligations are represented in the release notes or NOTICE material.
6. Follow `_docs/operations/public-repository-security-controls.md` for GitHub settings, branch protection, Discussions, and private vulnerability reporting.

## 12. Static Reference Host

1. Publish `_examples/static-host` to the approved public static hosting location.
2. Confirm the hosted page is accessible over HTTPS without account cookies or credentials.
3. Confirm downloadable example Capsules are available at stable revisioned URLs.
4. Confirm the Host serves accepted Capsule media types and bounded content lengths.
5. Confirm CORS permits noncredentialed access from a separately hosted page.
6. Confirm cache headers support immutable revision URLs without breaking updates to index pages.
7. Record the Host URL, example Capsule URLs, headers reviewed, and verification date.

## 13. Production Smoke Checks

Run these commands from a trusted operator machine after deployment:

```bash
curl -fsS https://sharecapsules.com/up
curl -fsS https://broker.sharecapsules.com/up
curl -fsS https://sharecapsules.com/.well-known/ctx-configuration
curl -fsS https://broker.sharecapsules.com/.well-known/ctx-configuration
curl -fsS -o /dev/null -w '%{http_code}\n' https://broker.sharecapsules.com/login
curl -fsS -o /dev/null -w '%{http_code}\n' https://sharecapsules.com/releases
curl -fsS -o /dev/null -w '%{http_code}\n' https://broker.sharecapsules.com/internal/status
```

Expected results:

- both `/up` responses are healthy
- app discovery has issuer `https://sharecapsules.com`
- broker discovery has broker `https://broker.sharecapsules.com`
- broker-host `/login` returns `404`
- app-host `/releases` returns `404`
- broker internal status without credentials returns `401`

Record sanitized results in the production change ledger.

## 14. Acceptance, Load, And Concurrency Testing

1. Create a clean production or production-like creator account.
2. Create a clean production or production-like viewer account.
3. Connect the production extension identity through OAuth.
4. Register a Viewer device.
5. Create a static-image Capsule.
6. Host the encrypted Capsule on the static reference Host or equivalent public static Host.
7. Open it as the viewer and verify local extension rendering.
8. Verify revocation blocks future release.
9. Verify account/device revocation behavior.
10. Run load and concurrency tests at the intended MVP scale for:
    - `/ctx/authorize`
    - broker `/releases`
    - ticket replay prevention
    - per-account and global counters
    - broker lifecycle operations
11. Record test data shape, account IDs only if safe and approved, dates, results, and any cleanup actions.

## 15. Incident Response And Recovery Exercises

1. Exercise planned CTX signing-key rotation.
2. Exercise emergency signing-key revocation in a non-public or production-like environment.
3. Exercise extension-version suspension using `SHARECAPSULES_VIEWER_SUSPENDED_VERSIONS`.
4. Exercise Capsule revocation.
5. Exercise backup restoration for app, broker, and deletion-ledger storage.
6. Exercise rollback or forward-recovery from a failed deployment.
7. Confirm release-disabling actions are known:
   - stop issuing new registration grants
   - disable `/ctx/authorize`
   - disable broker `/releases`
   - suspend unsafe extension versions
8. Record sanitized evidence and recovery decisions.

## 16. Final Release Evidence

1. Confirm all Phase 12 tasks are complete or explicitly deferred with accepted residual risk.
2. Confirm all MVP release criteria are met.
3. Confirm production smoke, clean-account acceptance, load/concurrency, static-host, backup, incident-response, and security checks have recorded evidence.
4. Move deployed ledger entries from pending to deployed after production action and verification succeed.
5. Record the final MVP approval decision, release commit, date, reviewer, and public release notes location.
