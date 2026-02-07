# Artefacts (Authoritative)

---
Artefact-ID: CMP-00-INDEX
Title: Artefacts Index
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: artefacts set with governance headers + cross-link conventions; regulatory_competitive_context_inputs/ (regulatory inputs)
Traceability: [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/00_HEADER_TEMPLATE.md; artefacts/00_LINKAGE_MAP.md
Review-Cadence: Quarterly
Owner: TBD
---

## Scope & Ground Rules
This artefact set is derived **only** from:
- Backend implementation: Express + TypeScript under `backend/src/`
- Database schema: `backend/db/snapshots/schema_full_v1.sql` (and the corresponding migration scaffold)
- Regulatory & context inputs:
  - `regulatory_competitive_context_inputs/dpdp_summary.md`
  - `regulatory_competitive_context_inputs/negd_brd_summary.md`
  - `regulatory_competitive_context_inputs/competitor_feature_matrix.md`

This set is **authoritative for the current codebase**, meaning:
- Anything stated as **Implemented** is anchored to existing routes/repositories/schema.
- Anything stated as **Required (Not Implemented)** is sourced from the regulatory/context inputs but is not present in the codebase.
- No speculative infrastructure (e.g., event bus, microservices, SaaS multi‑tenant control plane) is assumed.

## What Exists Today (High‑Level)
- Consent lifecycle with statuses: `REQUESTED → ACTIVE|REJECTED`, `ACTIVE → REVOKED|EXPIRED`.
- Approval by token and rejection by token.
- Processing check (`/process`) enforcing purpose match and dataTypes subset (policy engine).
- Append‑only audit log with:
  - DB trigger preventing UPDATE/DELETE on `audit_logs`
  - Hash chain computed in code and stored per event
- Admin API key protected endpoints for `/audit` and `/admin/consents/:id/expire`.

## Folder Index
### 01 Legal & Conceptual
- `01_legal-conceptual/01-consent_taxonomy_authoritative.md`
- `01_legal-conceptual/02-consent_lifecycle_flow_authoritative.md`
- `01_legal-conceptual/03-processing_decision_matrix_authoritative.md`
- `01_legal-conceptual/04-dpdp_traceability_matrix_authoritative.md`

### 02 Risk & Accountability
- `02_risk-accountability/05-1-audit_logging_spec_authoritative.md`
- `02_risk-accountability/05-2-audit_event_catalog_authoritative.md`
- `02_risk-accountability/06-1-dpia_template_authoritative.md`
- `02_risk-accountability/06-2-dpa_template_authoritative.md`
- `02_risk-accountability/06-3-risk_register_authoritative.md`
- `02_risk-accountability/07-adrs_authoritative.md`
- `02_risk-accountability/08-auditor_evidence_narratives_authoritative.md`

### 03 System Model
- `03_system-model/09-consent_state_machine_spec_authoritative.md`
- `03_system-model/10-1-consent_artefact_json_model_authoritative.md`
- `03_system-model/10-2-consent_artefact_schema.json`
- `03_system-model/11-logical_erd_authoritative.md`
- `03_system-model/12-dfd_l0_l1_authoritative.md`

### 04 Execution Layer
- `04_execution-layer/13-1-sop_erasure_request_authoritative.md`
- `04_execution-layer/13-2-sop_withdraw_consent_authoritative.md`
- `04_execution-layer/13-3-sop_breach_notification_authoritative.md`
- `04_execution-layer/14-multilingual_notice_structure_authoritative.md`
- `04_execution-layer/15-api_semantic_contract_authoritative.md`
- `04_execution-layer/16-ai_prompt_governance_guidelines_authoritative.md`
- `04_execution-layer/17-processing_validation_contract_authoritative.md`

## Linkage Map (Required)
- `00_LINKAGE_MAP.md`