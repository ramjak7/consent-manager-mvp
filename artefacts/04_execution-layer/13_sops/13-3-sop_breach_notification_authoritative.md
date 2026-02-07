# SOP — Breach Notification
---
Artefact-ID: CMP-EL-SOP-BREACH
Title: SOP — Breach Notification
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: artefacts incident-response outline for current repo; regulatory_competitive_context_inputs/dpdp_summary.md (DPDP Section 10 breach notification expectations)
Traceability: [DPDP-S8-Rule-1] [DPDP-S10-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/02_risk-accountability/06_dpia/06-3-risk_register_authoritative.md; artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md
Review-Cadence: Annual
Owner: TBD
---

## Cross-Links
- Audit evidence preservation: → Ref: 02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md
- Risk tracking: → Ref: 02_risk-accountability/06_dpia/06-3-risk_register_authoritative.md

## Purpose
Provide a breach response workflow aligned to DPDP operational expectations, while acknowledging the repo does not implement incident tooling.

## Scope
- Applies to security incidents affecting the Consent Manager backend, database, or audit evidence.

## Procedure
1. Detect and classify the incident.
2. Contain:
   - Revoke compromised credentials (e.g., rotate `ADMIN_API_KEY`).
   - Restrict network access to DB/service.
3. Preserve evidence:
   - Snapshot logs and database state.
   - Export audit log via `GET /audit` for chain verification.
4. Assess impact:
   - Determine affected `userId` populations.
   - Determine whether audit integrity is compromised.
5. Notify stakeholders:
   - DPO/legal/compliance.
   - Data Fiduciaries integrated with the system.
6. Remediate:
   - Patch vulnerabilities.
   - Rotate keys and review access.
7. Post-incident review:
   - Root cause analysis.
   - Update controls and test plans.

## Evidence
- Audit log export and hash-chain verification can provide tamper-evidence.

## Source Anchors
- Auth middleware: `backend/src/middleware/auth.ts`
- Audit export: `backend/src/index.ts` (`GET /audit`)
- Context input: `regulatory_competitive_context_inputs/dpdp_summary.md`
