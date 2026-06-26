# Key Broker Deployment Boundary

The Share Capsules Key Broker is identified by a distinct HTTPS origin, normally `https://broker.sharecapsules.com`. That broker origin may point to the same Laravel installation as the control plane for a prototype, or to a separate broker-only installation for the recommended hardened posture.

Both deployments use the same locked application artifact. The hardened deployment boots the artifact as a distinct runtime component with separate routes, providers, credentials, storage, health, and audit output. Prototype same-install hosting keeps the broker origin and protocol identity separate, but shares runtime secrets and incident-response blast radius with the control plane.

## Runtime identity

For the hardened broker-only runtime, set `SHARECAPSULES_COMPONENT=broker`. Broker mode exposes only:

- `GET /.well-known/ctx-configuration`
- `GET /up`
- `POST /registrations`, for authenticated, digest-bound content-key registration
- `POST /releases`, for validated, device-bound, atomically committed key release
- authenticated `GET /internal/status`
- authenticated `POST /internal/release-bindings/validate`
- authenticated `POST /internal/content-keys/lifecycle`

Account, OAuth, Fortify, passkey, application API, local-file serving, and public website routes must remain absent from the broker-only runtime.

For prototype same-install hosting, configure DNS so the broker origin and app origin both resolve to the same Laravel installation. Broker requests must still be served only for the configured broker host, and app/control-plane requests must remain bound to the app host. Internal broker routes continue to require the dedicated service credential even when both origins resolve to the same process.

## Required production boundaries

For hardened broker-only deployment, start from `code/.env.broker.production.example` and replace every placeholder. In particular:

- Use a broker-specific `APP_KEY` rather than the control-plane application key.
- Use a dedicated broker database, username, and password. The control-plane runtime must not receive these credentials.
- Share only the dedicated `SHARECAPSULES_BROKER_CONTROL_PLANE_TOKEN` with the control plane. Generate at least 32 random bytes and deliver it through secret management, never source control or a deployment log.
- Share a separate `SHARECAPSULES_BROKER_CALLBACK_TOKEN` between the broker and control plane, and set the broker-only `SHARECAPSULES_CONTROL_PLANE_INTERNAL_URL` to the protected control-plane origin.
- Route the `broker_audit` channel so access is restricted to authorized broker security and operations personnel.
- Configure `BROKER_KMS_DRIVER=managed` with a KMS/HSM key identifier. The local key-custody driver and `BROKER_LOCAL_KMS_KEY` are development-only and are rejected by production health validation.
- Set an HTTPS broker identity with no user information, query, or fragment.

Broker health is unhealthy when the component identity, storage separation, service credential, audit channel, or database access is invalid in broker-only mode. Same-install prototype hosting must report the reduced-isolation posture and still verify the broker host identity, service credential, audit channel, and broker storage/key-custody configuration.

## Forge prototype deployment

A minimal Forge prototype may use one server and one Laravel site while configuring two DNS names:

- `sharecapsules.com` for the control plane and public application
- `broker.sharecapsules.com` for the Key Broker origin

Both names may initially resolve to the same server and same code deployment. This avoids path-based broker URLs, keeps the broker identity stable for Capsules and tickets, and permits a later migration where `broker.sharecapsules.com` points to a separate broker-only Forge site or server without changing Capsule protocol contracts.

This same-install shape is a conscious tradeoff. It is appropriate for validating the product loop, but it does not provide the strongest broker isolation because the app and broker share runtime secrets, deploy access, process compromise blast radius, and usually host-level incident response.

Use `code/.env.production.example` for the same-install prototype:

- Keep `SHARECAPSULES_COMPONENT=control-plane`.
- Set `APP_URL` and `SHARECAPSULES_CTX_ISSUER` to the app origin, for example `https://sharecapsules.com`.
- Set `SHARECAPSULES_BROKER_URL` and `SHARECAPSULES_BROKER_INTERNAL_URL` to the broker origin, for example `https://broker.sharecapsules.com`.
- Configure both hostnames on the same Forge site and ensure both have valid TLS certificates.
- Keep `SHARECAPSULES_BROKER_CONTROL_PLANE_TOKEN`, `SHARECAPSULES_BROKER_CALLBACK_TOKEN`, broker audit logging, and broker key-custody configuration populated even though both origins share one Laravel runtime.

Use `code/.env.broker.production.example` only after `broker.sharecapsules.com` points to a separate broker-only Forge site or server. In that deployment, keep the control-plane site on `code/.env.production.example`, move only the broker origin DNS, set `SHARECAPSULES_COMPONENT=broker` in the broker site, and provision separate broker database credentials and managed key custody.

After changing Forge domains or environment variables, clear cached config and routes before testing:

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
```

Minimum same-install smoke checks:

```bash
curl -fsS https://sharecapsules.com/up
curl -fsS https://broker.sharecapsules.com/up
curl -fsS https://sharecapsules.com/.well-known/ctx-configuration
curl -fsS https://broker.sharecapsules.com/.well-known/ctx-configuration
curl -fsS -o /dev/null -w '%{http_code}\n' https://broker.sharecapsules.com/login
curl -fsS -o /dev/null -w '%{http_code}\n' https://sharecapsules.com/releases
```

The `/login` request on the broker host and `/releases` request on the app host should return `404`.

## Local verification

From the repository root:

```bash
./_infra/kit broker up
./_infra/kit ps
./_infra/kit broker logs
```

The `broker up` command idempotently creates a separate local database and database user before starting the broker profile. The normal application remains on port 3003; the broker listens on port 3004.

Before a future production deployment, verify the restricted broker route surface, public discovery identity, healthy isolated storage, registration callback authentication, registration failure for a fabricated grant, internal `401` without the service credential, internal success with it, idempotent pause/resume/revoke/destroy lifecycle transitions, physical removal of protected key material on destruction, and sanitized authentication-rejection audit output.
