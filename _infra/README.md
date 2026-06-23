# Share Capsules Infrastructure

This directory contains the reproducible local development infrastructure for Share Capsules.

## Services

- `app`: PHP 8.4, Composer 2, Node 24, Laravel, and Vite
- `mysql`: MySQL 8.4 with persistent local data
- `redis`: Redis 7.4 with append-only persistence
- `mailpit`: local SMTP capture and browser UI
- `workers`: optional Laravel queue workers
- `scheduler`: optional Laravel scheduler
- `broker`: optional isolated Key Broker runtime with broker-only routes, credentials, database, and audit output

The production Share Capsules deployment may use the existing dedicated MySQL server and managed equivalents for other services. These containers define the local development and test environment; they do not require production to run Docker.

## Start

The repository includes safe local defaults in the ignored `_infra/.env`. To recreate it:

```bash
cp _infra/.env.example _infra/.env
```

Then run from the repository root:

```bash
./_infra/kit doctor
./_infra/kit up
./_infra/kit artisan migrate
./_infra/kit broker up
./_infra/kit artisan passport:keys
./_infra/kit artisan ctx:provision-extension-client
./_infra/kit test
./_infra/kit check
```

The default endpoints are:

- Laravel: `http://localhost:3003`
- Vite: `http://localhost:5174`
- Key Broker: `http://localhost:3004`
- MySQL: `127.0.0.1:3308`
- Redis: `127.0.0.1:6380`

Laravel web sessions use MySQL so account holders can inspect and revoke individual sessions reliably. Redis remains the local queue, cache, and rate-limit store.
- Mailpit SMTP: `127.0.0.1:1026`
- Mailpit UI: `http://localhost:8026`

All ports and development credentials are configurable in `_infra/.env`.

## Commands

```bash
./_infra/kit up
./_infra/kit down
./_infra/kit restart
./_infra/kit ps
./_infra/kit logs app
./_infra/kit shell
./_infra/kit artisan migrate
./_infra/kit artisan passport:keys
./_infra/kit artisan ctx:provision-extension-client
./_infra/kit composer install
./_infra/kit npm install
./_infra/kit test
./_infra/kit check
./_infra/kit workers up
./_infra/kit scheduler up
./_infra/kit broker up
./_infra/kit example-host
```

`./_infra/kit test` drops and recreates only `MYSQL_TEST_DATABASE`. It refuses to run when the test and development database names match. The Laravel test bootstrap independently enforces the same boundary before migration traits run: persistent tests must name the expected test database and the distinct development database, while in-memory SQLite remains allowed for isolated tests.

`./_infra/kit check` is the local equivalent of CI. It installs from lockfiles through container bootstrap, validates Composer, checks PHP and TypeScript formatting and static analysis, runs TypeScript and Laravel tests, produces the frontend build, and verifies the service-aware health endpoint.

`./_infra/kit example-host [port]` serves `_examples/static-host` on `127.0.0.1`, defaulting to `http://127.0.0.1:8088/`. It runs in the foreground and stops with `Ctrl+C`.

## Environment boundaries

Development, automated test, and production use distinct deployment names, extension channels, extension identifiers, OAuth client identifiers, and broker credentials. Local values live in ignored environment files. Automated test values are fixed in `code/phpunit.xml`. Production control-plane operators begin with `code/.env.production.example`; broker operators use `code/.env.broker.production.example`. Every placeholder must be replaced.

The extension OAuth client is a public client: it has no client secret. Configure its UUID, fixed Chrome/Chromium extension ID, and exact `https://<extension-id>.chromiumapp.org/oauth/callback` redirect before running `ctx:provision-extension-client`. The command is idempotent and reconciles only that configured client. Passport signing keys are deployment secrets; generate or inject them outside source control and never copy production keys between environments.

The development topology is:

```text
Browser -> localhost:3003 -> app -> mysql:3306
                               -> redis:6379
                               -> mailpit:1025
                    localhost:5174 <- Vite
Viewer  -> localhost:3004 -> broker -> isolated broker database
app     -> localhost:3004 -> broker internal API
```

`GET /up` reports only deployment identity and healthy/unhealthy states for configuration, MySQL, and Redis. It never returns credentials, connection strings, exception messages, or trust data.

`./_infra/kit broker up` idempotently provisions a distinct local broker database and database user before starting the broker profile. Broker mode boots no account, session, Fortify, Passport, passkey, storage-serving, or control-plane routes. Its public health endpoint reports only broker configuration and storage readiness; authentication failures are written to the broker container's dedicated audit channel without logging the presented credential.

Composer, npm, Artisan, builds, and tests should run through `./_infra/kit` inside the `app` container. This keeps PHP extensions and native Node dependencies aligned with the pinned Linux container rather than whichever runtimes happen to be installed on the host. The named `code_vendor` and `code_node_modules` volumes isolate container dependencies from host-generated directories.
