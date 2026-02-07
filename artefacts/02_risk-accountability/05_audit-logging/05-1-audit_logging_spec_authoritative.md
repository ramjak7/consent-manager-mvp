# Audit Logging Specification
---
Artefact-ID: CMP-RA-AUDIT-LOGGING-SPEC
Title: Audit Logging Specification
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/db/snapshots/schema_full_v1.sql (audit schema + trigger); backend/src/repositories/auditRepo.ts (hash chain verification); regulatory_competitive_context_inputs/dpdp_summary.md (immutability and evidence-chain discipline)
Traceability: [DPDP-S3-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md; artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md; artefacts/04_execution-layer/13_sops/13-2-sop_withdraw_consent_authoritative.md; artefacts/04_execution-layer/13_sops/13-1-sop_erasure_request_authoritative.md
Review-Cadence: Quarterly
Owner: TBD
---

## Cross-Links
- Event names and minimum payload expectations: → Ref: 05-2-audit_event_catalog_authoritative.md
- Processing decision evidence: → Ref: 01_legal-conceptual/04-processing_decision_matrix_authoritative.md
- API retrieval semantics: → Ref: 04_execution-layer/15-api_semantic_contract_authoritative.md

## Purpose
Define the audit logging design as implemented in the MVP, and specify what constitutes a compliant, verifiable evidence trail.

## Implemented Audit Store
### Database Objects
- Table: `public.audit_logs`
- Immutability enforcement: trigger `audit_no_update` executing `public.prevent_audit_mutation()` prevents **UPDATE** and **DELETE**.

### Schema (as implemented)
| Column | Type | Meaning |
|---|---|---|
| `audit_id` | uuid (PK) | Unique identifier for the audit entry |
| `event_type` | text | Event code (see catalog) |
| `consent_id` | text | Consent identifier or `"UNKNOWN"` in some processing denials |
| `user_id` | text | Data principal identifier (`userId`) |
| `timestamp` | timestamp | When the event occurred (app passes ISO string) |
| `details` | jsonb | Event-specific payload |
| `prev_hash` | text nullable | Hash of previous audit entry in chain |
| `hash` | text | Hash of this entry computed over payload + `prev_hash` |

## Hash Chain (Implemented)
### Chain Rule
For each new audit event:
1. Fetch previous row hash: `SELECT hash FROM audit_logs ORDER BY timestamp DESC LIMIT 1`
2. Compute new hash over:
   - `prevHash`
   - `auditId`, `eventType`, `consentId`, `userId`, `timestamp`, `details`
3. Insert row with `prev_hash` and computed `hash`

### Verification Expectation
A verifier must be able to:
- Recompute each row’s hash from stored fields and compare to `hash`.
- Ensure `prev_hash` equals the predecessor row’s `hash`.

## Immutability Model
### DB-Level
- UPDATE/DELETE blocked by trigger.

### Application-Level
- Append-only writes via `recordAudit()`.

### Residual Risk Note (Observed)
The schema snapshot shows GRANT includes `TRUNCATE` on `audit_logs` for the `postgres` role. In many environments, TRUNCATE can remove evidence. This Draft‑1 spec treats TRUNCATE as an administrative break-glass action requiring separate governance.

## Audit Event Coverage (Implemented)
Audit is recorded for:
- Consent request
- Consent approval/rejection
- Consent revoke
- Consent expiry via job and `GET /consents/:id`
- Processing allowed/denied decisions

Known gap:
- The cron lifecycle job updates rows but does not emit audit events for its changes.

## Audit Retrieval (Implemented)
- Endpoint: `GET /audit`
- Access control: `x-api-key` header using `ADMIN_API_KEY`
- Pagination is computed in memory after fetching all rows (implementation detail).

## Data Minimization
Current audit `details` includes purpose and dataTypes, but does not include payload data. This aligns with the DPDP “CM must not read shared data” principle insofar as the MVP does not route personal datasets.

## Retention (Required, Not Implemented)
DPDP summary requires 7-year retention minimum. The MVP has no retention job or policy enforcement.

## Source Anchors
- DB schema: `backend/db/snapshots/schema_full_v1.sql`
- Audit repository: `backend/src/repositories/auditRepo.ts`
- Verify utility: `backend/src/utils/verifyAuditChain.ts` (if used)
- Audit route: `backend/src/index.ts` (`GET /audit`)
- Context input: `regulatory_competitive_context_inputs/dpdp_summary.md`
