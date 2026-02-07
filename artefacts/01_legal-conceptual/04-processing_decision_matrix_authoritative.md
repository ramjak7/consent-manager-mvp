# Processing Decision Matrix
---
Artefact-ID: CMP-LC-PROCESSING-DECISIONS
Title: Processing Decision Matrix
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src/policy/policyEngine.ts (implemented `/process` evaluation logic); regulatory_competitive_context_inputs/dpdp_summary.md (DPDP Section 8 normative evaluation order and reason codes)
Traceability: [DPDP-S6-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/01_legal-conceptual/01-consent_taxonomy_authoritative.md; artefacts/03_system-model/09-consent_state_machine_spec_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-2-audit_event_catalog_authoritative.md; artefacts/04_execution-layer/16-processing_validation_contract_authoritative.md
Review-Cadence: Semiannual
Owner: TBD
---

## Cross-Links
- API semantic contract:
  - → Ref: 15-api_semantic_contract_authoritative.md endpoint: POST /process
  - → Ref: 16-processing_validation_contract_authoritative.md (normative request/response constraints for current implementation)
- Audit linkage:
  - → Ref: 05-2-audit_event_catalog_authoritative.md event: PROCESSING_DENIED
- Consent artefact schema (field usage):
  - → Ref: consent_artefact_schema.json field:purposes
  - → Ref: consent_artefact_schema.json field:data_categories
  - → Ref: consent_artefact_schema.json field:status
  - → Ref: consent_artefact_schema.json field:expires_at

## Purpose
Define how the system decides whether a processing request is allowed, grounded in the `/process` endpoint and policy engine.

## Regulatory Foundation (DPDP Section 8)
The DPDP Act imposes on Data Fiduciaries the obligation to:
> *...verify that processing is permissible before undertaking it.*

This artefact codifies that "permissibility gate." It answers one question only:
> *Given a processing request and the Data Principal's consent record, is processing allowed — and why?*

Critically:
- **Processing decisions must not mutate consent state** — evaluation is side-effect-free
- **Denials must be audited** — every rejection generates an audit event with reason codes
- **Real-time gating is mandatory** — the decision must be re-evaluated immediately before processing, not once at consent time

## Inputs
A processing validation request is:
- `userId` (string)
- `purpose` (string)
- `dataTypes` (string[])

## Mandatory Evaluation Order (Normative)
The following checks MUST be executed in order. Evaluation stops at the first failure.
1. Consent existence check
2. Consent state check
3. Temporal validity check
4. Purpose match check
5. Data scope check

## Explicit Non-Side-Effects (Normative)
During evaluation, the system MUST NOT:
- change consent state
- create new consents
- revoke/expire consents as a side-effect of denial

This is aligned with the current implementation of `POST /process`.

## Authoritative Resolution Logic (Implemented)
### Step 1 — Resolve authoritative consent
- Fetch latest `ACTIVE` consent where:
  - `user_id = userId`
  - `purpose = purpose`
  - `status = 'ACTIVE'`
  - `valid_until > NOW()`
  - ordered by `version DESC`, limit 1

### Step 2 — Hard stop if no ACTIVE consent
Outcomes:
- If a consent exists for `(userId,purpose)` but is not ACTIVE → deny with reason “Consent not active”.
- If no consent exists at all → deny with reason “No active consent”.

### Step 3 — Expiry check immediately before processing
If `consent.validUntil <= now` → deny with reason “Consent expired”.

### Step 4 — Policy evaluation
Allow only if:
- consent status is ACTIVE
- request purpose matches exactly
- requested `dataTypes` is a subset of consented `dataTypes`
- request version equals consent version (currently the request version is derived from the consent; effectively always true)

## Decision Matrix
| Condition | Allow? | HTTP | Audit Event | Notes |
|---|---:|---:|---|---|
| No consent exists for `(userId,purpose)` | No | 403 | `PROCESSING_DENIED` | `consentId="UNKNOWN"` |
| Consent exists but not ACTIVE (REVOKED/REJECTED/EXPIRED/REQUESTED) | No | 403 | `PROCESSING_DENIED` | Uses an existing consent_id for traceability |
| ACTIVE but expired at evaluation time | No | 403 | `PROCESSING_DENIED` | Explicit expiry reason |
| ACTIVE, purpose matches, requested dataTypes ⊆ consented | Yes | 200 | `PROCESSING_ALLOWED` | Returns `{ status: "PROCESSING_ALLOWED" }` |
| ACTIVE, purpose matches, requested dataTypes not subset | No | 403 | `PROCESSING_DENIED` | Policy engine reason |
| ACTIVE, purpose does not match | No | 403 | `PROCESSING_DENIED` | Not normally reachable because resolution is by purpose |

## Denial Reason Code Mapping (Normative → Observed)
This table defines the canonical reason codes (Draft-2 style) and how they map to current implementation behavior.

| Failed Step | Canonical Reason Code | Observed API error/reason |
|---:|---|---|
| 1 | `NO_CONSENT` | "No active consent" |
| 2 | `CONSENT_NOT_ACTIVE` | "Consent not active" |
| 3 | `CONSENT_EXPIRED` | "Consent expired" |
| 4 | `PURPOSE_MISMATCH` | (not normally reachable in current resolution model) |
| 5 | `DATA_SCOPE_VIOLATION` | Policy engine reason (dataTypes subset failure) |

## Notes on Granularity
- Purpose is a single string; the BRD’s “purpose list” concept is not implemented as multiple purposes per consent artefact.
- Granular updates are modeled as new versions for the same `(userId,purpose)` group.
## Forward Model — Not Implemented in MVP

The following normative enhancements are planned but not yet coded:

### Granular Purpose Matching (Multi-Purpose Consent)
- **Scope**: Support consent for multiple purposes within a single artefact, with granular withdrawal of individual purposes
- **Current Model**: Single purpose per consent record (`consent_group_id = {userId}:{purpose}`)
- **Future Rule**: Request `purpose` must be in consented `purposes[]` list; not just exact match to a single value
- **Data Scope**: Would remain subset-based (requested `dataTypes ⊆ consented dataTypes`)
- **Withdrawal Impact**: Withdraw of one purpose does not affect other purposes in the artefact

### Legitimate Interest & Statutory Basis Gating
- **Scope**: Process non-consent lawful bases (statutory obligation, vital interests, etc.)
- **Current Model**: All processing requires ACTIVE consent
- **Future Rule**: Processing without consent if `lawfulBasis ∈ {STATUTORY, VITAL_INTEREST, ...}`
- **Audit Impact**: Would emit audit events with lawful basis codes, not consent references

### Withdrawal-on-Access (Right to be Forgotten Integration)
- **Scope**: Process erasure requests that auto-revoke consent
- **Current Model**: Erasure and revocation are independent SOPs
- **Future Rule**: Erasure request may automatically revoke active consent for derived processing
## Source Anchors
- `backend/src/index.ts` (`POST /process`)
- `backend/src/policy/policyEngine.ts`
- `backend/src/repositories/consentRepo.ts` (`getLatestActiveConsent`)
- `backend/src/repositories/auditRepo.ts` (`recordAudit`)