# Consent State Machine Specification
---
Artefact-ID: CMP-SM-STATE-MACHINE
Title: Consent State Machine Specification
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src/repositories/consentRepo.ts (implemented state transitions); regulatory_competitive_context_inputs/dpdp_summary.md (normative lifecycle constraints)
Traceability: [DPDP-S3-Rule-1] [DPDP-S6-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/01_legal-conceptual/02-consent_lifecycle_flow_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/04_execution-layer/13_sops/13-2-sop_withdraw_consent_authoritative.md; artefacts/04_execution-layer/13_sops/13-1-sop_erasure_request_authoritative.md
Review-Cadence: Semiannual
Owner: TBD
---

## Cross-Links
- Lifecycle narrative and forbidden transitions: → Ref: 01_legal-conceptual/02-consent_lifecycle_flow_authoritative.md
- Audit events emitted per transition: → Ref: 02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md

## Purpose
Define the consent state machine implemented by the MVP, including transition rules, guards, and invariants.

## States
- `REQUESTED`
- `ACTIVE`
- `REJECTED`
- `REVOKED`
- `EXPIRED`

## Identifiers and Grouping
- `consentId` (`consent_id` UUID): identifies a single version.
- `consentGroupId` (`consent_group_id` text): stable group key for versions, computed as `${userId}:${purpose}`.
- `version` (int): monotonically increasing per group.

## Invariants
### I-01: Single ACTIVE per (userId, purpose)
- Enforced by DB partial unique index:
  - `UNIQUE (user_id, purpose) WHERE status = 'ACTIVE'`
- Reinforced in approval transaction by revoking existing ACTIVE in the same group.

### I-02: Historical versions are immutable at application level
- No endpoint updates an old version to a new version; updates create new versions.
- State transitions do update a row’s `status` (e.g., revoke/expire). Historical content fields are not edited by API.

## Transition Table (Implemented)
| From | To | Trigger | Guard / Condition | Side Effects |
|---|---|---|---|---|
| (none) | REQUESTED | `POST /consents` | `validUntil` in future | Insert new row with approval token/expiry; emit `CONSENT_REQUESTED` |
| REQUESTED | ACTIVE | `POST /consents/approve/:token` | token matches; token not expired; still REQUESTED; `valid_until > now` | Reject other REQUESTED in group; revoke any ACTIVE in group; clear token fields; emit `CONSENT_APPROVED` |
| REQUESTED | REJECTED | `POST /consents/reject/:token` | token matches; token not expired; still REQUESTED | Clear token fields; emit `CONSENT_REJECTED` |
| REQUESTED | REJECTED | cron/admin | `valid_until < now` OR admin forced | Clear token fields in cron path; emit audit only on admin path |
| ACTIVE | REVOKED | `POST /consents/:id/revoke` | consent exists AND status=ACTIVE | Update status; emit `CONSENT_REVOKED` |
| ACTIVE | REVOKED | `POST /consents/revoke` | latest ACTIVE exists for (userId,purpose) | Update status; emit `CONSENT_REVOKED` |
| ACTIVE | EXPIRED | job/cron/get-consent | `valid_until < now` | Update status; audit emitted by job and get-consent path; cron path currently no audit |
| ACTIVE | EXPIRED | `POST /admin/consents/:id/expire` | admin forced | Update status; emit `CONSENT_EXPIRED` with `forcedBy=ADMIN` |

## Token Semantics
- Token is stored only while consent is `REQUESTED`.
- On approval/rejection/expiry, token is cleared (`NULL`) to prevent reuse.
- Token TTL: `APPROVAL_TOKEN_TTL_HOURS`.

## Processing Decision Coupling
- `POST /process` depends on latest ACTIVE consent.
- Denials emit `PROCESSING_DENIED` with reasons.

## Source Anchors
- Consent repository: `backend/src/repositories/consentRepo.ts`
- Routes: `backend/src/index.ts`, `backend/src/routes/consentRoutes.ts`
- DB schema: `backend/db/snapshots/schema_full_v1.sql`
