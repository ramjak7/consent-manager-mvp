# Gap / Traceability Linkage Map

---
Artefact-ID: CMP-00-LINKAGE-MAP
Title: Gap / Traceability Linkage Map
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: artefacts state machine + audit + SOPs + API contract; traceability patterns from regulatory_competitive_context_inputs/dpdp_summary.md
Traceability: [DPDP-S2-Rule-1] [DPDP-S3-Rule-1] [DPDP-S6-Rule-1] [DPDP-S7-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/01_legal-conceptual/04-dpdp_traceability_matrix_authoritative.md; artefacts/03_system-model/09-consent_state_machine_spec_authoritative.md; artefacts/02_risk-accountability/05-2-audit_event_catalog_authoritative.md; artefacts/04_execution-layer/13-api_semantic_contract_authoritative.md; artefacts/04_execution-layer/15-sop_withdraw_consent_authoritative.md; artefacts/04_execution-layer/16-sop_erasure_request_authoritative.md; artefacts/03_system-model/10-consent_artefact_schema.json
Review-Cadence: Quarterly
Owner: TBD
---

## Purpose
Provide a single linkage “map” that ties together:
- DPDP/NeGD obligations → controls → evidence
- State machine transitions → audit events → SOP steps → API endpoints
- Consent artefact schema fields → where they are populated/used

This is intentionally concise and designed to be updated alongside the artefacts it links.

## Core Link Chains (Implemented)

### Chain 1 — Consent Request → Approval/Rejection
| Topic | State Machine | API Endpoint(s) | Audit Event(s) | SOP | Evidence Notes |
|---|---|---|---|---|---|
| Request consent | (none) → REQUESTED | POST /consents | CONSENT_REQUESTED | (Operational flow; UI out of scope) | Consent row + audit entry prove request |
| Approve consent | REQUESTED → ACTIVE | POST /consents/approve/:token | CONSENT_APPROVED | (Token channel) | Approval token consumption is evidence proxy |
| Reject consent | REQUESTED → REJECTED | POST /consents/reject/:token | CONSENT_REJECTED | (Token channel) | Rejection proves refusal |

Schema touchpoints:
- → Ref: consent_artefact_schema.json field:status
- → Ref: consent_artefact_schema.json field:approval

### Chain 2 — Withdraw Consent (DPDP)
| Topic | State Machine | API Endpoint(s) | Audit Event(s) | SOP | Evidence Notes |
|---|---|---|---|---|---|
| Withdraw consent | ACTIVE → REVOKED | POST /consents/revoke; POST /consents/:id/revoke | CONSENT_REVOKED | 15-sop_withdraw_consent_authoritative.md | Withdrawal is evidenced by audit + subsequent processing denial |

Schema touchpoints:
- → Ref: consent_artefact_schema.json field:status
- → Ref: consent_artefact_schema.json field:revoked_at

### Chain 3 — Expiry Enforcement
| Topic | State Machine | API Endpoint(s) / Job | Audit Event(s) | SOP | Evidence Notes |
|---|---|---|---|---|---|
| Expire consent | ACTIVE → EXPIRED | expireDueConsents job; GET /consents/:id (expiry enforcement); cron | CONSENT_EXPIRED (job + get-consent path) | N/A | Cron path audit completeness is a known gap |

Schema touchpoints:
- → Ref: consent_artefact_schema.json field:status
- → Ref: consent_artefact_schema.json field:expires_at

### Chain 4 — Processing Validation (“Real-time check”)
| Topic | State Machine Dependency | API Endpoint(s) | Audit Event(s) | SOP | Evidence Notes |
|---|---|---|---|---|---|
| Allow processing | Requires latest consent ACTIVE and not expired and dataTypes ⊆ consented | POST /process | PROCESSING_ALLOWED | N/A (DF integration contract) | Decision is evidenced by audit entry |
| Deny processing | Any failure in evaluation order | POST /process | PROCESSING_DENIED | N/A (DF integration contract) | Canonical denial reason codes are mapped in decision matrix |

Schema touchpoints:
- → Ref: consent_artefact_schema.json field:purposes
- → Ref: consent_artefact_schema.json field:data_categories

## Link Chains (Defined but Not Implemented)

### Notice Binding and Notice Evidence
Expectation:
- Consent capture binds to a notice identifier/version at time of consent.
- Audit emits NOTICE_SHOWN / NOTICE_ACCEPTED events.

Status: NOT IMPLEMENTED (artefacts exist only).
Evidence:
- Notice content exists in 14_multilingual-notices (English).

Schema touchpoints:
- → Ref: consent_artefact_schema.json field:source.notice_version
- → Ref: consent_artefact_schema.json field:source.language

### Rights Request APIs (Erasure)
Expectation:
- Dedicated rights request API(s) and events.

Status: NOT IMPLEMENTED (SOP guidance only).
Evidence:
- SOP exists but relies on external ticketing and controlled ops changes.

## Evidence Integrity Chain
| Control | Artefact | Current Status |
|---|---|---|
| Append-only audit log | 05-1-audit_logging_spec_authoritative.md | Implemented (UPDATE/DELETE blocked; TRUNCATE is residual risk) |
| Audit event taxonomy | 05-2-audit_event_catalog_authoritative.md | Implemented for core events; required-by-policy events missing |
| Hash chain verification | verifyAudit / verifyAuditChain utilities | Implemented |

## Gap Summary (Top)
- Notice binding + notice evidence events: Missing
- Rights request API + rights audit event family: Missing
- Correlation IDs / actor context in audit schema: Partial
- Cron expiry auditing completeness: Partial