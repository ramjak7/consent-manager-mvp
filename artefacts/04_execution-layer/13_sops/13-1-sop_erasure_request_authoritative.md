# SOP — Erasure Request
---
Artefact-ID: CMP-EL-SOP-ERASURE
Title: SOP — Erasure Request
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/db/snapshots/schema_full_v1.sql (current DB schema); regulatory_competitive_context_inputs/dpdp_summary.md (DPDP Section 7 rights-of-data-subject expectations)
Traceability: [DPDP-S7-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/06_dpia/06-3-risk_register_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md
Review-Cadence: Semiannual
Owner: TBD
---

## Cross-Links
- Audit immutability constraints: → Ref: 02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md
- Risk register tracking: → Ref: 02_risk-accountability/06_dpia/06-3-risk_register_authoritative.md

## Purpose
Define how to handle a Data Principal erasure request in the context of this MVP.

## Current System Reality (Important)
This MVP stores consent metadata and audit logs in PostgreSQL:
- `consents` contains `user_id` and consent scope fields.
- `audit_logs` contains `user_id` and event details.

There is **no implemented API** for erasure, retention controls, or deletion workflows.

## Policy Principle
Erasure handling must balance:
- Data Principal rights requests (DPDP)
- Legal retention obligations (DPDP summary references 7-year record retention)

## Procedure (Operational)
1. Intake the erasure request (ticketing system outside this repo).
2. Verify requestor identity and authority.
3. Determine scope:
   - Which `userId` is implicated
   - Whether any legal basis requires retention of consent/audit evidence
4. If retention is required:
   - Reject/limit erasure and record rationale in the case system.
   - Consider implementing pseudonymization rather than deletion (not implemented).
5. If erasure is permitted:
   - Perform controlled database operations under change management.
   - Ensure evidence of action is preserved (e.g., separate immutable log or case record).

## Evidence & Audit
- The MVP’s `audit_logs` table is immutable (UPDATE/DELETE blocked) and therefore cannot be edited to remove identifiers without schema/process changes.
- This is a known compliance/engineering gap to be addressed in future iterations.

## Future Work (Required, Not Implemented)
- Add explicit rights request APIs and events.
- Add retention policy configuration.
- Define an “erasure ledger” approach that preserves evidentiary integrity while meeting rights obligations.

## Source Anchors
- DB: `backend/db/snapshots/schema_full_v1.sql`
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`
