# Share Capsules Infrastructure

This directory contains the reproducible local development infrastructure for Share Capsules.

## Services

- `app`: PHP 8.4, Composer 2, Node 24, Laravel, and Vite
- `mysql`: MySQL 8.4 with persistent local data
- `redis`: Redis 7.4 with append-only persistence
- `mailpit`: local SMTP capture and browser UI
- `workers`: optional Laravel queue workers
- `scheduler`: optional Laravel scheduler

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
./_infra/kit test
./_infra/kit check
```

The default endpoints are:

- Laravel: `http://localhost:3003`
- Vite: `http://localhost:5174`
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
./_infra/kit composer install
./_infra/kit npm install
./_infra/kit test
./_infra/kit check
./_infra/kit workers up
./_infra/kit scheduler up
```

`./_infra/kit test` drops and recreates only `MYSQL_TEST_DATABASE`. It refuses to run when the test and development database names match.

`./_infra/kit check` is the local equivalent of CI. It installs from lockfiles through container bootstrap, validates Composer, checks PHP and TypeScript formatting and static analysis, runs TypeScript and Laravel tests, produces the frontend build, and verifies the service-aware health endpoint.

## Environment boundaries

Development, automated test, and production use distinct deployment names, extension channels, extension identifiers, and OAuth client identifiers. Local values live in ignored environment files. Automated test values are fixed in `code/phpunit.xml`. Production operators begin with `code/.env.production.example` and must replace every placeholder; production health fails when HTTP service URLs or placeholder identities remain.

The development topology is:

```text
Browser -> localhost:3003 -> app -> mysql:3306
                               -> redis:6379
                               -> mailpit:1025
                    localhost:5174 <- Vite
```

`GET /up` reports only deployment identity and healthy/unhealthy states for configuration, MySQL, and Redis. It never returns credentials, connection strings, exception messages, or trust data.

Composer, npm, Artisan, builds, and tests should run through `./_infra/kit` inside the `app` container. This keeps PHP extensions and native Node dependencies aligned with the pinned Linux container rather than whichever runtimes happen to be installed on the host. The named `code_vendor` and `code_node_modules` volumes isolate container dependencies from host-generated directories.
