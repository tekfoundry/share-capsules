# Phase 12 Operations Follow-Ups

Status: Backlog
Last updated: 2026-07-30

## Context

The MVP production prototype has accepted UptimeRobot health-route alerting, Forge scheduler configuration, and Forge queue-worker visibility as sufficient for Phase 12 approval. The remaining work below improves operational detection and recovery depth after MVP approval.

## Tasks

- ⬜️ Add or configure alerting for queue worker failure, failed jobs, and abnormal queue depth.
- ⬜️ Add or configure alerting for scheduler failure or missing scheduler heartbeat.
- ⬜️ Add or configure alerting for backup failures and stale backups.
- ⬜️ Add or configure alerts or review workflow for security and broker audit events requiring operator action.
- ⬜️ Run and record a Share Capsules-specific restore drill against a non-production target.

## Accepted MVP Posture

- UptimeRobot monitors and alerts for `https://sharecapsules.com/up` and `https://broker.sharecapsules.com/up` are confirmed working.
- Forge scheduler runs every minute.
- Forge queue worker is configured and visible as a background process.
- Database backups cover all production databases on the database server, run daily, and retain seven days of backups.
- Restore is manual and has not been drilled for the specific Share Capsules production stack.
