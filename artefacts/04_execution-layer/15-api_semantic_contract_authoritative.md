# Standard API Specification — Semantic Contract
---
Artefact-ID: CMP-EL-API-SEMANTIC-CONTRACT
Title: Standard API Specification — Semantic Contract
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src/routes/consentRoutes.ts (implemented endpoints); regulatory_competitive_context_inputs/dpdp_summary.md (contract framing and evidence expectations)
Traceability: [DPDP-S2-Rule-1] [DPDP-S3-Rule-1] [DPDP-S6-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/01_legal-conceptual/04-processing_decision_matrix_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/03_system-model/09-consent_state_machine_spec_authoritative.md; artefacts/04_execution-layer/16-processing_validation_contract_authoritative.md
Review-Cadence: Quarterly
Owner: TBD
---

## Cross-Links
- Processing semantics and reason codes: → Ref: 01_legal-conceptual/04-processing_decision_matrix_authoritative.md
- Audit evidence requirements: → Ref: 02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md
- Audit event names/payloads: → Ref: 02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md

## Purpose
Define the implemented REST API surface (requests, responses, semantics), grounded in `backend/src/index.ts` and `backend/src/routes/consentRoutes.ts`.

## Common Conventions
- Content-Type: `application/json` required for POST bodies when a body is present.
- Request body limit: 1MB.
- Validation: Zod schemas; extra fields rejected on key endpoints.
- Timeouts: 30s.

## Authentication
### Admin/Audit APIs
- Header: `x-api-key: <ADMIN_API_KEY>`
- Applies to:
  - `GET /audit`
  - `POST /admin/consents/:id/expire`

## Endpoints
### Health
#### `GET /health`
Response `200`:
```json
{ "status": "UP" }
```

### Consent Create (Request)
#### `POST /consents`
Request body:
```json
{ "userId": "string", "purpose": "string", "dataTypes": ["string"], "validUntil": "ISO date/time string" }
```
Response `201`:
```json
{ "consentId": "<uuid>", "status": "REQUESTED", "message": "Consent awaiting approval" }
```
Errors:
- `400` validation errors
- `415` content-type mismatch

Semantic notes:
- Creates a new consent version in `REQUESTED`.
- Emits audit: `CONSENT_REQUESTED`.

### Consent Fetch
#### `GET /consents/:id`
- `:id` must be UUID.
Response `200`: Consent object (includes status, group, version).
Errors:
- `404` if not found.

Semantic notes:
- Attempts to expire the consent first if it is ACTIVE and past validity; if expiry occurs, emits `CONSENT_EXPIRED`.

### Consent Revoke (Version-specific)
#### `POST /consents/:id/revoke`
- `:id` must be UUID.
Response `200`:
```json
{ "consentId": "<uuid>", "status": "REVOKED" }
```
Errors:
- `404` not found
- `400` if not ACTIVE / already revoked

Semantic notes:
- Only ACTIVE consents can be revoked.
- Emits audit: `CONSENT_REVOKED`.

### Consent Revoke (Semantic)
#### `POST /consents/revoke`
Request body:
```json
{ "userId": "string", "purpose": "string" }
```
Response `200`:
- If nothing to revoke:
```json
{ "status": "NO_ACTIVE_CONSENT", "purpose": "<purpose>" }
```
- If revoked:
```json
{ "status": "REVOKED", "purpose": "<purpose>" }
```
Errors:
- `400` validation error

Semantic notes:
- Resolves latest ACTIVE consent for `(userId, purpose)` and revokes it.
- Emits audit: `CONSENT_REVOKED`.

### Consent Approval by Token
#### `POST /consents/approve/:token`
- `:token` is string (min length 32).
Response `200`:
```json
{ "status": "ACTIVE", "consentId": "<uuid>" }
```
Errors:
- `400` invalid/expired/used token

Semantic notes:
- Transitions REQUESTED → ACTIVE.
- Rejects other REQUESTED versions in group.
- Revokes any existing ACTIVE in group.
- Consumes token.
- Emits audit: `CONSENT_APPROVED`.

### Consent Rejection by Token
#### `POST /consents/reject/:token`
Response `200`:
```json
{ "status": "REJECTED", "consentId": "<uuid>" }
```
Errors:
- `400` invalid/expired/used token

Semantic notes:
- Transitions REQUESTED → REJECTED.
- Consumes token.
- Emits audit: `CONSENT_REJECTED`.

### Processing Validation
#### `POST /process`
Request body:
```json
{ "userId": "string", "purpose": "string", "dataTypes": ["string"] }
```
Response `200`:
```json
{ "status": "PROCESSING_ALLOWED" }
```
Errors:
- `403` with `{ "error": "..." }` when denied

Semantic notes:
- Always emits audit: `PROCESSING_ALLOWED` or `PROCESSING_DENIED`.

### Audit Export
#### `GET /audit?page=1&limit=100`
Auth: `x-api-key`.
Response `200`:
```json
{ "page": 1, "limit": 100, "total": 123, "logs": [ /* audit entries */ ], "pagination": { "page": 1, "limit": 100, "total": 123, "pages": 2 } }
```

### Admin Force Expire/Reject
#### `POST /admin/consents/:id/expire`
Auth: `x-api-key`.
Response `200`:
```json
{ "consentId": "<uuid>", "previousStatus": "...", "status": "EXPIRED|REJECTED", "mode": "ADMIN_FORCED" }
```
Semantic notes:
- ACTIVE → EXPIRED
- REQUESTED → REJECTED
- Emits audit with `details.forcedBy="ADMIN"`.

## Source Anchors
- `backend/src/index.ts`
- `backend/src/routes/consentRoutes.ts`
- `backend/src/middleware/validate.ts`, `backend/src/middleware/auth.ts`
- `backend/src/repositories/*`
