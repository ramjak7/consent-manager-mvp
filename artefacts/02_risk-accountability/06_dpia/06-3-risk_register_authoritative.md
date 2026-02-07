# Risk Register
---
Artefact-ID: CMP-RA-RISK-REGISTER
Title: Risk Register
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src (observed implementation risks and gaps); regulatory_competitive_context_inputs/dpdp_summary.md (risk taxonomy and accountability expectations)
Traceability: [DPDP-S3-Rule-1] [DPDP-S6-Rule-1] [DPDP-S7-Rule-1] [DPDP-S8-Rule-1] [DPDP-S10-Rule-1]
Linked-Artefacts: artefacts/02_risk-accountability/06_dpia/06-1-data_protection_impact_assessment_dpia_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md; artefacts/04_execution-layer/13_sops/13-2-sop_withdraw_consent_authoritative.md; artefacts/04_execution-layer/13_sops/13-1-sop_erasure_request_authoritative.md; artefacts/04_execution-layer/14_multilingual-notices/16-1_en/16-1-1-notice_general_authoritative.md
Review-Cadence: Monthly
Owner: TBD
---

## Cross-Links
- DPIA template: → Ref: 06-1-data_protection_impact_assessment_dpia_authoritative.md
- Audit evidence: → Ref: 05_audit-logging/05-1-audit_logging_spec_authoritative.md

## Purpose
Track security, privacy, compliance, and operational risks visible from the current MVP implementation.

## Risk Register
| ID | Risk | Impact | Likelihood | Current Controls | Gaps / Mitigations |
|---|---|---|---|---|---|
| R-01 | Admin access is API-key only | High | Medium | Timing-safe compare; env configured key | Add RBAC, rotate keys, add MFA/SSO, audit admin actions |
| R-02 | No Data Principal dashboard / UX evidence | High | High | N/A | Build UI for consent review/withdrawal; store notice version shown and affirmative action proof |
| R-03 | No notice registry/versioning | High | High | Purpose/dataTypes stored | Add notice templates and bind consent to notice version |
| R-04 | Audit truncation risk via DB privileges | High | Low–Medium | UPDATE/DELETE blocked by trigger; hash chain | Remove/limit TRUNCATE/MAINTAIN grants; separate break-glass role |
| R-05 | Cron lifecycle changes not audited | Medium | Medium | Some expiry auditing via job and GET flow | Emit audit events for cron transitions or consolidate to single audited job |
| R-06 | Retention policy not enforced (7 years) | Medium–High | High | N/A | Implement retention config, archival, and deletion controls with audit trails |
| R-07 | No downstream notification/webhooks on revoke/expire | Medium | High | DF must call `/process` | Add webhooks or polling guidance; formalize DF integration contract |
| R-08 | Validity stored as `date` (no time) | Medium | Medium | Expiry comparisons occur | Clarify business semantics (midnight boundary); if needed migrate to timestamp |
| R-09 | Consent group ID derived from user input | Low | Medium | Parameterized SQL; not used as identifier externally | Ensure canonicalization of `userId` and `purpose`; document delimiter rules |
| R-10 | Audit ordering uses `timestamp` DESC for prev hash | Medium | Low | Inserts provide ISO timestamp | Consider using monotonic sequence or `(timestamp, audit_id)` ordering to avoid ties |

## Source Anchors
- Access control: `backend/src/middleware/auth.ts`
- Audit: `backend/src/repositories/auditRepo.ts`, `backend/db/snapshots/schema_full_v1.sql`
- Lifecycle jobs: `backend/src/index.ts`, `backend/src/jobs/expireConsentsJob.ts`
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`
