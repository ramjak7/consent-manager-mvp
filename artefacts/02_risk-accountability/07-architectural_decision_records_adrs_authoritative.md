# Architectural Decision Records (ADRs)
---
Artefact-ID: CMP-RA-ADRS
Title: Architectural Decision Records (ADRs)
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/db/snapshots/schema_full_v1.sql (implemented architecture); regulatory_competitive_context_inputs/dpdp_summary.md (governance framing for change control)
Traceability: [DPDP-S3-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/01_legal-conceptual/04-processing_decision_matrix_authoritative.md; artefacts/03_system-model/10-2-consent_artefact_schema.json; artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md
Review-Cadence: Quarterly
Owner: TBD
---

## Cross-Links
- Audit immutability and hash chain: → Ref: 05_audit-logging/05-1-audit_logging_spec_authoritative.md
- Processing semantics: → Ref: 01_legal-conceptual/04-processing_decision_matrix_authoritative.md
- Consent artefact schema target: → Ref: 03_system-model/10-consent_artefact_schema.json

## ADR-001 — PostgreSQL as System of Record
- **Status**: Accepted (implemented)
- **Decision**: Use PostgreSQL with schema-defined tables for `consents` and `audit_logs`.
- **Rationale**: Strong consistency; SQL constraints and triggers; operational maturity.
- **Evidence**: `backend/db/snapshots/schema_full_v1.sql`.

## ADR-002 — Versioned Consent Records by (userId, purpose)
- **Status**: Accepted
- **Decision**: Store each consent as a new row/version; group by `consent_group_id = "{userId}:{purpose}"`.
- **Rationale**: Preserves history; supports audit and dispute resolution.
- **Evidence**: `backend/src/repositories/consentRepo.ts`.

## ADR-003 — Approval Token Workflow
- **Status**: Accepted
- **Decision**: Create consent as `REQUESTED` and require approval/rejection by token before activation.
- **Rationale**: Supports explicit consent and asynchronous approval.
- **Evidence**: `POST /consents`, `POST /consents/approve/:token`, DB fields `approval_token`, `approval_expires_at`.

## ADR-004 — Enforce Single ACTIVE Consent per (userId, purpose)
- **Status**: Accepted
- **Decision**: Enforce invariant via partial unique index and transactional revoke on approval.
- **Rationale**: Prevents ambiguous authority.
- **Evidence**: Index `uniq_active_consent_per_purpose` and approval flow revoking prior ACTIVE.

## ADR-005 — Immutable Audit Trail with DB Trigger + Hash Chain
- **Status**: Accepted
- **Decision**: Use append-only audit table protected from UPDATE/DELETE plus application-level hash chaining.
- **Rationale**: Tamper resistance and verifiable evidence.
- **Evidence**: Trigger `audit_no_update`, `recordAudit()`.

## ADR-006 — Policy Check as a Dedicated Endpoint
- **Status**: Accepted
- **Decision**: Provide `POST /process` that returns allow/deny based on latest ACTIVE consent.
- **Rationale**: Supports real-time validation model.
- **Evidence**: `backend/src/index.ts` (`POST /process`), `backend/src/policy/policyEngine.ts`.

## Source Anchors
- `backend/src/index.ts`
- `backend/src/routes/consentRoutes.ts`
- `backend/src/repositories/consentRepo.ts`
- `backend/src/repositories/auditRepo.ts`
- `backend/db/snapshots/schema_full_v1.sql`
