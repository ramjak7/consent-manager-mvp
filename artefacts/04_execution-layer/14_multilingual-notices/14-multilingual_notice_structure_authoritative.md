# Multilingual Notice Structure
---
Artefact-ID: CMP-EL-NOTICE-STRUCTURE
Title: Multilingual Notice Structure
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: artefacts integration guidance + folder conventions; regulatory_competitive_context_inputs/dpdp_summary.md (notice structure expectations)
Traceability: [DPDP-S2-Rule-1] [DPDP-S3-Rule-1]
Linked-Artefacts: artefacts/04_execution-layer/14_multilingual-notices/16-1_en/16-1-1-notice_general_authoritative.md; artefacts/04_execution-layer/14_multilingual-notices/16-1_en/16-1-2-notice_marketing_authoritative.md; artefacts/01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md
Review-Cadence: Annual
Owner: TBD
---

## Cross-Links
- Notice examples: → Ref: 04_execution-layer/14_multilingual-notices/14-1_en/14-1-1-notice_general_authoritative.md
- Evidence gaps tracked in traceability: → Ref: 01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md

## Purpose
Provide a recommended content and folder structure for multilingual consent notices, acknowledging that the current repo does not implement notice rendering or storage.

## Regulatory Context (Derived)
- DPDP/NeGD summaries require clear, standalone consent notices, and multi-language accessibility.

## Recommended Notice Model (Not Implemented)
A notice should be versioned and include:
- Purpose name and description
- Data categories (dataTypes) itemized
- Withdrawal mechanism
- Rights exercise mechanism
- Complaint mechanism
- Language tag

## Recommended Folder Structure
```text
notices/
  notice_registry.json
  en/
    marketing/v1.md
    analytics/v1.md
  hi/
    marketing/v1.md
    analytics/v1.md
  bn/
    ...
```

## Recommended Notice Registry Fields
- `noticeId`
- `purpose`
- `version`
- `language`
- `contentPath`
- `effectiveFrom`

## Integration Point (Future)
- `POST /consents` should bind to a `noticeId` + `noticeVersion` shown at time of consent.
- Audit should record `NOTICE_SHOWN` and `NOTICE_ACCEPTED` events.

## Source Anchors
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`
