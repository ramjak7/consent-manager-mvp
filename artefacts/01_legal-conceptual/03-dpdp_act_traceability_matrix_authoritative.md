# DPDP / NeGD Traceability Matrix
---
Artefact-ID: CMP-LC-DPDP-TRACEABILITY
Title: DPDP / NeGD Traceability Matrix
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src + backend/db (code/DB implementation); regulatory_competitive_context_inputs/dpdp_summary.md (DPDP obligation taxonomy); regulatory_competitive_context_inputs/negd_brd_summary.md (NeGD requirements)
Traceability: [DPDP-S2-Rule-1] [DPDP-S3-Rule-1] [DPDP-S6-Rule-1] [DPDP-S7-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/04_execution-layer/15-api_semantic_contract_authoritative.md; artefacts/04_execution-layer/13_sops/13-1-sop_erasure_request_authoritative.md; artefacts/04_execution-layer/13_sops/13-2-sop_withdraw_consent_authoritative.md; artefacts/04_execution-layer/14_multilingual-notices/16-1_en/16-1-1-notice_general_authoritative.md
Review-Cadence: Annual
Owner: TBD
---

## Cross-Links
- → Ref: 05-1-audit_logging_spec_authoritative.md (evidence requirements)
- → Ref: 05-2-audit_event_catalog_authoritative.md (event names used in evidence)
- → Ref: 15-api_semantic_contract_authoritative.md (endpoint semantics)
- → Ref: 04-processing_decision_matrix_authoritative.md (normative evaluation order and non-side-effect rule)

## Purpose
Map key obligations and BRD requirements to what the current MVP implements, and explicitly flag gaps.

## Legend
- **Implemented**: Present in code and/or DB schema.
- **Partially Implemented**: Some aspects present, but missing surrounding controls/UI/process.
- **Not Implemented**: Required by source inputs, not present in repo.

## Traceability Matrix
| Source Tag | DPDP Tag(s) | Requirement | What it means | Status in MVP | Implementation Anchor | Evidence Anchor | Gap / Notes |
|---|---|---|---|---|---|---|---|
| NeGD | (TBD) | Consent lifecycle: collect/validate/update/renew/withdraw | End-to-end consent state control | **Partially Implemented** | Routes: `POST /consents`, `/approve/:token`, `/reject/:token`, `/consents/*revoke*`, cron expiry; DB `consents.status` | Audit events for create/approve/reject/revoke/expire (see event catalog) | Update/renew reminders and workflows not present; “update” only via new `POST /consents` versioning |
| NeGD | (TBD) | Free/specific/informed/explicit/affirmative, no pre-checked, granular | UX and notice-level rules | **Not Implemented** | N/A | Notice artefacts exist (English) but no UI enforcement | Backend has no UI enforcement of “informed” capture; notice binding to consent capture not implemented |
| NeGD | [DPDP-S3-Rule-1] | Consent artefact generation & storage | Persist consent artefact with metadata, status, timestamp, version | **Implemented (Minimal)** | DB `consents` table, group/version, status; create/approve flows | Audit chain + DB rows; schema target: `03_system-model/10-consent_artefact_schema.json` | Missing explicit “artefact document” object; only DB row versioning |
| NeGD | [DPDP-S8-Rule-1] | Real-time validation API | DF checks before processing | **Implemented** | `POST /process` + policy engine + audits | Audit events: PROCESSING_ALLOWED/PROCESSING_DENIED | No DF authentication/identity; no rate-limits specified |
| DPDP | [DPDP-S6-Rule-1] | Withdrawal “as easy as giving consent” | Simple, immediate withdrawal mechanism | **Implemented** | `POST /consents/:id/revoke`, `POST /consents/revoke` | SOP: withdraw consent; audit event CONSENT_WITHDRAWN | Does not notify downstream processors/DFs (no webhooks) |
| DPDP | [DPDP-S8-Rule-1] | Maintain records: consent given/denied/withdrawn, notices shown, requests, sharing events; export; retain 7 years | Evidence + retention controls | **Partially Implemented** | `audit_logs` + hash chain + immutability trigger | Hash chain verification: `backend/src/scripts/verifyAudit.ts` | No notice-shown events; no export endpoint; no retention policy automation; no data sharing event model |
| NeGD | [DPDP-S8-Rule-1] | Audit readiness: immutable logs | Tamper-resistant audit trail | **Implemented** | `audit_logs` trigger prevents UPDATE/DELETE; hash chain in `recordAudit` | Audit logging spec (fields + chain) | DB GRANT includes TRUNCATE which undermines immutability in some deployments; consider tightening later |
| DPDP | (TBD) | “Consent Manager cannot read shared personal data” | Blind relay / encrypted routing | **Not Implemented** | N/A | N/A | MVP does not route datasets; stores only consent metadata |
| DPDP / NeGD | (TBD) | Website/App dashboard for Data Principal | Self-service consent console | **Not Implemented** | N/A | N/A | Repo has no frontend in current snapshot |
| DPDP / NeGD | [DPDP-S2-Rule-1] | Multi-language notices | Eighth Schedule languages, templates | **Partially Implemented (Artefacts only)** | Execution layer notices folder | Notice artefact(s): `04_execution-layer/14_multilingual-notices/...` | No UI selection by language; no binding of notice version to consent capture |
| NeGD | (TBD) | Grievance redressal module | Complaints/ticket workflow | **Not Implemented** | N/A | N/A | Not present in codebase |
| NeGD | (TBD) | Admin module with RBAC, MFA, SSO | Strong admin access controls | **Not Implemented** (API key only) | `requireApiKey` middleware | N/A | API key is a minimal control; no RBAC model |
| NeGD | [DPDP-S7-Rule-1] | Retention configuration + deletion audit logs | Automated deletion + evidence | **Not Implemented** | N/A | SOP: erasure request (process guidance only) | Not present; DB contains no retention metadata |

## Source Anchors
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`, `regulatory_competitive_context_inputs/competitor_feature_matrix.md`
- Backend: `backend/src/index.ts`, `backend/src/routes/consentRoutes.ts`, `backend/src/repositories/*`, `backend/src/policy/policyEngine.ts`
- DB: `backend/db/snapshots/schema_full_v1.sql`