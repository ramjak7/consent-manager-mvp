# Regulatory Compliance Scenarios — Auditor Evidence Narratives
---
Artefact-ID: CMP-RA-AUDITOR-NARRATIVES
Title: Regulatory Compliance Scenarios — Auditor Evidence Narratives
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src/repositories/auditRepo.ts (audit event coverage); backend/src/routes/consentRoutes.ts (endpoints); regulatory_competitive_context_inputs/dpdp_summary.md (auditor-evidence framing)
Traceability: [DPDP-S3-Rule-1] [DPDP-S6-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/01_legal-conceptual/04-processing_decision_matrix_authoritative.md; artefacts/04_execution-layer/13_sops/13-2-sop_withdraw_consent_authoritative.md; artefacts/04_execution-layer/13_sops/13-1-sop_erasure_request_authoritative.md
Review-Cadence: Semiannual
Owner: TBD
---

## Cross-Links
- Audit immutability + hash chain verification: → Ref: 05_audit-logging/05-1-audit_logging_spec_authoritative.md
- Event definitions + payload shapes: → Ref: 05_audit-logging/05-2-audit_event_catalog_authoritative.md
- Processing denial reason mapping: → Ref: 01_legal-conceptual/04-processing_decision_matrix_authoritative.md

## Purpose
Provide audit-ready narratives demonstrating how an auditor can obtain evidence for consent validity, withdrawal, processing decisions, and audit-log integrity.

## Scenario A — Prove Consent Was Requested and Approved
**Goal**: Demonstrate that a consent moved from `REQUESTED` to `ACTIVE` for a given `userId` and `purpose`.

Evidence steps (implemented):
1. DF calls `POST /consents` to create a request.
2. Auditor queries `GET /audit` (API key) and locates `CONSENT_REQUESTED` for that `userId` and `consentId`.
3. Approval occurs via `POST /consents/approve/:token`.
4. Auditor locates `CONSENT_APPROVED` entry and correlates by `consentId`.
5. Auditor retrieves consent record via `GET /consents/:id` and confirms `status=ACTIVE`.

## Scenario B — Prove Withdrawal Took Immediate Effect
**Goal**: Demonstrate revocation and subsequent denial.

Evidence steps:
1. DP/DF triggers withdrawal via `POST /consents/revoke` (semantic) or `POST /consents/:id/revoke`.
2. Auditor verifies `CONSENT_REVOKED` audit entry.
3. DF calls `POST /process` with same `userId/purpose/dataTypes`.
4. Auditor verifies `PROCESSING_DENIED` with reason “Consent not active”.

## Scenario C — Prove Expiry Enforcement
**Goal**: Show that expired consents are not usable.

Evidence options:
- Scheduled job path: `expireDueConsents()` updates ACTIVE consents and emits `CONSENT_EXPIRED` entries.
- On-demand path: `GET /consents/:id` triggers expiry update and emits `CONSENT_EXPIRED`.

Auditor checks:
- Consent record has `status=EXPIRED`.
- Audit contains `CONSENT_EXPIRED` referencing the same `consentId`.

## Scenario D — Prove Tamper Evidence (Hash Chain)
**Goal**: Demonstrate the audit ledger has not been altered.

Evidence steps:
1. Auditor exports the full audit log via `GET /audit`.
2. Auditor independently recomputes hash chain:
   - Recompute each row’s hash from stored fields.
   - Verify `prev_hash` links.
3. Auditor verifies DB immutability control exists:
   - Trigger `audit_no_update` on `audit_logs`.

## Scenario E — Admin Forced Expiry/Reject
**Goal**: Demonstrate break-glass administrative action is recorded.

Status: **Not Implemented in current MVP** (scenario retained as a future-state narrative).

Evidence steps:
1. Admin calls `POST /admin/consents/:id/expire`.
2. Auditor finds an audit entry where event type is `CONSENT_EXPIRED` or `CONSENT_REJECTED` and `details.forcedBy="ADMIN"`.

## Known Evidence Gaps
- No evidence of consent notice content shown (notice version) is recorded.
- Cron-based expiry/rejection is not fully audited.
- No export formats (PDF/CSV) exist beyond JSON.

## Source Anchors
- Audit API: `backend/src/index.ts`
- Admin endpoint: `backend/src/index.ts` (`POST /admin/consents/:id/expire`)
- Audit schema/triggers: `backend/db/snapshots/schema_full_v1.sql`
- Audit recording: `backend/src/repositories/auditRepo.ts`
