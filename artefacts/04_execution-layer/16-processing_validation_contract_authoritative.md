# Processing Validation Contract
---
Artefact-ID: CMP-EL-PROCESSING-VALIDATION-CONTRACT
Title: Processing Validation Contract
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: artefacts `/process` endpoint behavior; regulatory_competitive_context_inputs/dpdp_summary.md (DPDP Section 8) normative evaluation order and reason code discipline
Traceability: [DPDP-S6-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/01_legal-conceptual/04-processing_decision_matrix_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md
Review-Cadence: Quarterly
Owner: TBD
---

## Cross-Links
- Canonical evaluation order + reason code mapping: → Ref: 01_legal-conceptual/04-processing_decision_matrix_authoritative.md
- Audit events per call: → Ref: 02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md
- Consent artefact schema (fields referenced by `/process` semantics):
	- → Ref: consent_artefact_schema.json field:purposes
	- → Ref: consent_artefact_schema.json field:data_categories
	- → Ref: consent_artefact_schema.json field:status
	- → Ref: consent_artefact_schema.json field:expires_at


## Purpose
Define the normative contract for “real-time consent validation” as implemented by `POST /process`.

## Endpoint
- `POST /process`

## Request
```json
{ "userId": "string", "purpose": "string", "dataTypes": ["string"] }
```
Constraints:
- No extra fields (strict object).
- `dataTypes` must contain at least one item.

## Response
### Allowed (200)
```json
{ "status": "PROCESSING_ALLOWED" }
```

### Denied (403)
```json
{ "error": "<reason>" }
```

## Authoritative Semantics
A request is allowed iff all are true:
1. There exists an `ACTIVE` consent for `(userId, purpose)`.
2. Consent is not expired at evaluation time.
3. Requested `dataTypes` ⊆ consented `dataTypes`.

## Reasons (Observed)
The API may return these denial reasons:
- `No active consent`
- `Consent not active`
- `Consent expired`
- Policy-engine reason (e.g., data types not permitted)

## Audit Requirements (Implemented)
Every call MUST emit exactly one audit entry:
- `PROCESSING_ALLOWED` or `PROCESSING_DENIED`

## Integration Guidance (Derived)
- Data Fiduciaries should call `/process` immediately before processing.
- If denied, processing must not proceed.
- This contract does not include DF authentication/authorization.

## Source Anchors
- `backend/src/index.ts` (`POST /process`)
- `backend/src/policy/policyEngine.ts`
- `backend/src/schemas/process.schema.ts`
- `backend/src/repositories/consentRepo.ts`
- Context input: `regulatory_competitive_context_inputs/negd_brd_summary.md`
