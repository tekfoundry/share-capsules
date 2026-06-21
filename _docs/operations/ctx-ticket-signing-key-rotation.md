# CTX Ticket-Signing Key Rotation

CTX authorization tickets use a dedicated Ed25519 signing key. Public keys are available from `/ctx/jwks.json`; private keys are encrypted at rest and must never be copied into logs, tickets, documentation, or environment variables.

All commands run from the repository root through `_infra/kit`.

## Planned rotation

1. Publish a replacement key without using it to sign tickets:

   ```bash
   ./_infra/kit artisan ctx:ticket-signing-key stage
   ```

2. Record the returned key identifier. Verify that `/ctx/jwks.json` contains both the current key and the published replacement with the exact `OKP`, `Ed25519`, `sig`, and `EdDSA` fields.
3. Allow discovery and JWKS caches to refresh before activation. The JWKS response advertises a 30-second maximum age.
4. Activate the published replacement:

   ```bash
   ./_infra/kit artisan ctx:ticket-signing-key activate <kid>
   ```

   Activation makes the previous active key retiring. It remains in JWKS for 65 seconds: the exact 60-second signed ticket lifetime plus the maximum five seconds of accepted clock skew.
5. Verify that new tickets use the replacement key identifier and that tickets signed immediately before activation still validate.
6. The every-minute scheduler marks expired retiring keys as retired. It may also be run directly:

   ```bash
   ./_infra/kit artisan ctx:ticket-signing-key retire-expired
   ```

## Emergency revocation

Emergency revocation removes a compromised key from JWKS immediately and may invalidate outstanding tickets:

```bash
./_infra/kit artisan ctx:ticket-signing-key revoke <kid>
```

After revoking an active key, publish and activate a replacement before restoring ticket issuance. Record the incident identifier and sanitized operational actions in the production change ledger; never record the private key or other secret material.

## Deployment and recovery notes

- Apply the `ctx_ticket_signing_keys` migration before staging a key.
- Run the Laravel scheduler every minute so retiring-key state is finalized promptly. JWKS excludes an expired retiring key even if the scheduler is delayed.
- The encrypted private key depends on the deployment encryption key. Application-key rotation must preserve decryption access long enough to re-encrypt stored CTX signing keys.
- A database restore must not silently reactivate retired or revoked keys. Reconcile the active key and published JWKS as part of restore verification.
