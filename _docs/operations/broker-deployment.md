# Key Broker Deployment Boundary

The Share Capsules Key Broker uses the same locked application artifact as the control plane but boots as a distinct runtime component. It has separate routes, providers, credentials, storage, health, and audit output. It must not be deployed inside the ordinary control-plane process.

## Runtime identity

Set `SHARECAPSULES_COMPONENT=broker`. Broker mode exposes only:

- `GET /.well-known/ctx-configuration`
- `GET /up`
- `POST /registrations`, for authenticated, digest-bound content-key registration
- `POST /releases`, for validated, device-bound, atomically committed key release
- authenticated `GET /internal/status`
- authenticated `POST /internal/release-bindings/validate`
- authenticated `POST /internal/content-keys/lifecycle`

Account, OAuth, Fortify, passkey, application API, local-file serving, and public website routes must remain absent.

## Required production boundaries

Start from `code/.env.broker.production.example` and replace every placeholder. In particular:

- Use a broker-specific `APP_KEY` rather than the control-plane application key.
- Use a dedicated broker database, username, and password. The control-plane runtime must not receive these credentials.
- Share only the dedicated `SHARECAPSULES_BROKER_CONTROL_PLANE_TOKEN` with the control plane. Generate at least 32 random bytes and deliver it through secret management, never source control or a deployment log.
- Share a separate `SHARECAPSULES_BROKER_CALLBACK_TOKEN` between the broker and control plane, and set the broker-only `SHARECAPSULES_CONTROL_PLANE_INTERNAL_URL` to the protected control-plane origin.
- Route the `broker_audit` channel so access is restricted to authorized broker security and operations personnel.
- Configure `BROKER_KMS_DRIVER=managed` with a KMS/HSM key identifier. The local key-custody driver and `BROKER_LOCAL_KMS_KEY` are development-only and are rejected by production health validation.
- Set an HTTPS broker identity with no user information, query, or fragment.

Broker health is unhealthy when the component identity, storage separation, service credential, audit channel, or database access is invalid.

## Local verification

From the repository root:

```bash
./_infra/kit broker up
./_infra/kit ps
./_infra/kit broker logs
```

The `broker up` command idempotently creates a separate local database and database user before starting the broker profile. The normal application remains on port 3003; the broker listens on port 3004.

Before a future production deployment, verify the restricted broker route surface, public discovery identity, healthy isolated storage, registration callback authentication, registration failure for a fabricated grant, internal `401` without the service credential, internal success with it, idempotent pause/resume/revoke/destroy lifecycle transitions, physical removal of protected key material on destruction, and sanitized authentication-rejection audit output.
