# SOP — Withdraw Consent
---
Artefact-ID: CMP-EL-SOP-WITHDRAW
Title: SOP — Withdraw Consent
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src/routes/consentRoutes.ts (revoke endpoints); backend/src/repositories/auditRepo.ts (audit events); regulatory_competitive_context_inputs/dpdp_summary.md (DPDP Section 6 withdrawal rights)
Traceability: [DPDP-S6-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md; artefacts/03_system-model/09-consent_state_machine_spec_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md
Review-Cadence: Semiannual
Owner: TBD
---

## Cross-Links
- Transition ACTIVE → REVOKED: → Ref: 03_system-model/09-consent_state_machine_spec_authoritative.md
- Evidence event: → Ref: 02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md

## Purpose
Define the operational steps to withdraw consent in a DPDP-aligned manner using the implemented revoke APIs.

## Preconditions
- The Data Principal (or authorized agent) can identify:
  - Either the specific `consentId`, or
  - The pair `(userId, purpose)`.

## Procedure (Preferred: Semantic Withdrawal)
1. Receive withdrawal request for `(userId, purpose)`.
2. Call `POST /consents/revoke` with body:
   ```json
   { "userId": "...", "purpose": "..." }
   ```
3. If response is `NO_ACTIVE_CONSENT`, treat as idempotent success.
4. Confirm audit evidence:
   - `CONSENT_REVOKED` exists for the resolved `consentId`.
5. Advise Data Fiduciary integration owners to enforce stop-processing by calling `/process` before processing.

## Procedure (Version-Specific Withdrawal)
Use only if the UI/workflow holds a `consentId`:
1. Call `POST /consents/:id/revoke`.
2. If consent is not ACTIVE, return an appropriate user-facing message.
3. Confirm audit evidence: `CONSENT_REVOKED`.

## Evidence Produced
- Audit events:
  - `CONSENT_REVOKED`
  - Subsequent processing requests should create `PROCESSING_DENIED`.

## Known Gaps vs BRD/DPDP
- No built-in notifications to downstream processors/fiduciaries.
- No user dashboard implementation in repo.

## Source Anchors
- `backend/src/index.ts` (revoke endpoints)
- `backend/src/repositories/consentRepo.ts`
- `backend/src/repositories/auditRepo.ts`
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`
