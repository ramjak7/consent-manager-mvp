# Data Protection Impact Assessment (DPIA) Template
---
Artefact-ID: CMP-RA-DPIA-TEMPLATE
Title: Data Protection Impact Assessment (DPIA) Template
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src (implementation risks and controls); regulatory_competitive_context_inputs/dpdp_summary.md (DPIA structure and evidence expectations)
Traceability: [DPDP-S3-Rule-1] [DPDP-S7-Rule-1] [DPDP-S8-Rule-1] [DPDP-S10-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/06_dpia/06-3-risk_register_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md; artefacts/04_execution-layer/14_multilingual-notices/16-1_en/16-1-1-notice_general_authoritative.md
Review-Cadence: Annual
Owner: TBD
---

## Cross-Links
- Risk register: → Ref: 06-3-risk_register_authoritative.md
- Audit evidence: → Ref: 05_audit-logging/05-1-audit_logging_spec_authoritative.md
- Notices: → Ref: 04_execution-layer/14_multilingual-notices/14-1_en/14-1-1-notice_general_authoritative.md

## 1. DPIA Metadata
- DPIA ID:
- Date initiated:
- Owner:
- Approver:
- System / Product: Consent Manager MVP
- Version: Draft‑1

## 2. System Description (As Implemented)
### Purpose of processing (within the CM)
This MVP processes and stores consent metadata to support:
- Consent request creation and approval
- Withdrawal (revocation)
- Validity/expiry enforcement
- Real-time processing validation
- Audit evidence generation

### Data categories processed by the CM
- `userId` (identifier string)
- `purpose` (string)
- `dataTypes` (array of category strings)
- `validUntil` (date/time string; stored as date)
- Audit details and timestamps

### Data not processed by the CM
The MVP does not route personal datasets for DF/processor sharing; it stores only consent and audit metadata.

## 3. Stakeholders & Roles
- Data Principal: represented as `userId`
- Data Fiduciary: API caller
- Admin: API key holder
- Auditor: API key holder (same mechanism in MVP)

## 4. Data Flow Overview
- Ingress: REST API calls to backend
- Storage: PostgreSQL tables `consents` and `audit_logs`
- Egress: API responses, audit export via `GET /audit`

## 5. Lawful Basis and Consent Mechanics
- Consent is explicit and purpose-bound at API level.
- Approval token flow exists to represent user approval (out-of-band).

Gaps:
- No notice capture/version binding.
- No UI/affirmative action proof stored.

## 6. Necessity & Proportionality
Assess whether each stored field is necessary:
- `userId`: necessary to bind consent to principal.
- `purpose`: necessary for purpose limitation.
- `dataTypes`: necessary for scope control.
- `validUntil`: necessary for expiry enforcement.
- Audit hashes: necessary for tamper evidence.

## 7. Risk Assessment
### Key risks (initial)
- Weak admin authentication model (single API key)
- Lack of retention/deletion policy controls
- Audit truncation permissions risk in some deployments
- Limited evidence of “informed” consent due to no notice binding

## 8. Controls (As Implemented)
- Input validation (Zod) rejecting extra fields
- Request size limit and timeouts
- Parameterized SQL
- Audit immutability trigger
- Audit hash chaining

## 9. Residual Risks & Recommendations
- Add RBAC + MFA for admin/auditor roles
- Add notice registry + notice version binding
- Add retention policy enforcement and evidence export capability
- Align audit immutability with least-privilege grants

## 10. Approval
- DPIA reviewed by:
- Approved by:
- Date:

## Source Anchors
- Backend routes: `backend/src/index.ts`, `backend/src/routes/consentRoutes.ts`
- Repositories: `backend/src/repositories/*`
- DB schema: `backend/db/snapshots/schema_full_v1.sql`
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`
