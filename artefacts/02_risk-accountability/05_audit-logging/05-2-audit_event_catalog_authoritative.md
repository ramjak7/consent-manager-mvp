# Audit Event Catalog
---
Artefact-ID: CMP-RA-AUDIT-EVENT-CATALOG
Title: Audit Event Catalog
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src/repositories/auditRepo.ts (observed event emissions and payload shapes); regulatory_competitive_context_inputs/dpdp_summary.md (minimum evidence and correlation expectations)
Traceability: [DPDP-S3-Rule-1] [DPDP-S6-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/01_legal-conceptual/04-processing_decision_matrix_authoritative.md; artefacts/01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md; artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md; artefacts/04_execution-layer/13_sops/13-2-sop_withdraw_consent_authoritative.md
Review-Cadence: Quarterly
Owner: TBD
---

## Cross-Links
- Audit chain and immutability: → Ref: 05-1-audit_logging_spec_authoritative.md
- Denial reason code mapping: → Ref: 01_legal-conceptual/04-processing_decision_matrix_authoritative.md
- Evidence mapping: → Ref: 01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md

## Purpose
Enumerate audit event types used by the current MVP, with expected `details` payload shape and emission points.

## Common Fields (All Events)
Top-level fields stored in `audit_logs`:
- `audit_id` (uuid)
- `event_type` (text)
- `consent_id` (text)
- `user_id` (text)
- `timestamp` (ISO string inserted to timestamp column)
- `details` (jsonb)

## Event Types (Implemented)
### CONSENT_REQUESTED
Emitted when a consent request is created.
- Emission: `POST /consents`
- `details` (observed):
  - `purpose`: string
  - `dataTypes`: string[]
  - `validUntil`: string
  - `approvalRequired`: true

### CONSENT_APPROVED
Emitted when approval token activates a consent.
- Emission: `POST /consents/approve/:token`
- `details` (observed):
  - `purpose`: string
  - `version`: number

### CONSENT_REJECTED
Emitted when token rejection occurs.
- Emission: `POST /consents/reject/:token`
- `details` (observed):
  - `purpose`: string
  - `version`: number

### CONSENT_REVOKED
Emitted when an ACTIVE consent is revoked.
- Emission:
  - `POST /consents/:id/revoke` (version-specific)
  - `POST /consents/revoke` (semantic)
- `details` (observed):
  - Version-specific: `{ "status": "REVOKED" }`
  - Semantic: `{ purpose, version, revokedVia: "SEMANTIC" }`

### CONSENT_EXPIRED
Emitted when a consent transitions to EXPIRED via:
- `GET /consents/:id` expiry enforcement
- `expireDueConsents()` scheduled job

`details` (observed):
- From `GET /consents/:id`: `{ version, validUntil, status }`
- From job: `{ version, validUntil, expiredVia: "SCHEDULED_JOB" }`

### PROCESSING_ALLOWED
Emitted when processing is authorized.
- Emission: `POST /process`
- `details` (observed):
  - `purpose`: string
  - `requestedDataTypes`: string[]
  - `consentedDataTypes`: string[]
  - `version`: number

### PROCESSING_DENIED
Emitted when processing is denied.
- Emission: `POST /process`
- `details` (observed):
  - Always: `reason`, `purpose`
  - Sometimes: `requestedDataTypes`, `consentedDataTypes`, `version`, `validUntil`

Special case:
- If no consent exists: `consent_id` is set to `"UNKNOWN"`.

## Event Types Defined but Not Emitted
- `CONSENT_CREATED` is present in the type union but not emitted by current routes.

## Required-by-Policy Events (Not Implemented)
From DPDP/NeGD requirements, these event families should exist in a full system but do not exist in the MVP:
- Notice displayed / notice accepted (notice version binding)
- Consent export events
- Data sharing/transfer events
- Access/erasure request events
- Grievance events
- Admin/RBAC change events

## Source Anchors
- `backend/src/repositories/auditRepo.ts`
- `backend/src/index.ts`, `backend/src/routes/consentRoutes.ts`
- `backend/src/jobs/expireConsentsJob.ts`
- DB: `backend/db/snapshots/schema_full_v1.sql`
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`
