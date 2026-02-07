# Consent Artefact JSON Model
---
Artefact-ID: CMP-SM-CONSENT-ARTEFACT-MODEL
Title: Consent Artefact JSON Model
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/db/snapshots/schema_full_v1.sql (DB row structure); backend/src/repositories/consentRepo.ts (API shapes); regulatory_competitive_context_inputs/dpdp_summary.md (evidence and artefact expectations)
Traceability: [DPDP-S3-Rule-1] [DPDP-S8-Rule-1]
Linked-Artefacts: artefacts/03_system-model/10-2-consent_artefact_schema.json; artefacts/01_legal-conceptual/01-consent_taxonomy_authoritative.md; artefacts/01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md; artefacts/02_risk-accountability/05_audit-logging/05-1-audit_logging_spec_authoritative.md
Review-Cadence: Annual
Owner: TBD
---

## Cross-Links
- Canonical schema: → Ref: 03_system-model/10-consent_artefact_schema.json
- Evidence mapping: → Ref: 01_legal-conceptual/03-dpdp_act_traceability_matrix_authoritative.md

## Purpose
Define a canonical JSON “consent artefact” representation for this MVP, grounded in:
- The `consents` DB row fields
- The API response shapes returned by current handlers

This artefact model is intended for export/evidence use (required by DPDP/NeGD), even though export APIs are not implemented.

## Canonical Artefact Object
### Fields
| Field | Type | Source | Notes |
|---|---|---|---|
| `consentId` | string (uuid) | `consents.consent_id` | Specific version id |
| `consentGroupId` | string | `consents.consent_group_id` | `${userId}:${purpose}` |
| `version` | integer | `consents.version` | Monotonic within group |
| `userId` | string | `consents.user_id` | Data Principal identifier |
| `purpose` | string | `consents.purpose` | Exact-match policy |
| `dataTypes` | string[] | `consents.data_types` | Stored as JSONB |
| `validUntil` | string (date or datetime) | `consents.valid_until` | Stored as date in DB |
| `status` | enum | `consents.status` | REQUESTED/ACTIVE/REJECTED/REVOKED/EXPIRED |
| `approval` | object|null | `approval_token` + `approval_expires_at` | Token is present only while REQUESTED |

### JSON Schema (Draft)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.local/schemas/consent-artefact.schema.json",
  "title": "ConsentArtefact",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "consentId",
    "consentGroupId",
    "version",
    "userId",
    "purpose",
    "dataTypes",
    "validUntil",
    "status",
    "approval"
  ],
  "properties": {
    "consentId": { "type": "string", "format": "uuid" },
    "consentGroupId": { "type": "string", "minLength": 1 },
    "version": { "type": "integer", "minimum": 1 },
    "userId": { "type": "string", "minLength": 1 },
    "purpose": { "type": "string", "minLength": 1 },
    "dataTypes": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "minLength": 1 }
    },
    "validUntil": { "type": "string", "minLength": 1 },
    "status": {
      "type": "string",
      "enum": ["REQUESTED", "ACTIVE", "REJECTED", "REVOKED", "EXPIRED"]
    },
    "approval": {
      "oneOf": [
        { "type": "null" },
        {
          "type": "object",
          "additionalProperties": false,
          "required": ["token", "expiresAt"],
          "properties": {
            "token": { "type": "string", "minLength": 32 },
            "expiresAt": { "type": "string", "minLength": 1 }
          }
        }
      ]
    }
  }
}
```

## Example Artefact — REQUESTED
```json
{
  "consentId": "018d6e27-1b1d-7a54-9e1a-6f2c3a2e2f63",
  "consentGroupId": "user_123:analytics",
  "version": 1,
  "userId": "user_123",
  "purpose": "analytics",
  "dataTypes": ["device", "usage"],
  "validUntil": "2026-12-31",
  "status": "REQUESTED",
  "approval": {
    "token": "<opaque-approval-token>",
    "expiresAt": "2026-02-02T12:34:56.000Z"
  }
}
```

## Example Artefact — ACTIVE
```json
{
  "consentId": "018d6e27-1b1d-7a54-9e1a-6f2c3a2e2f63",
  "consentGroupId": "user_123:analytics",
  "version": 1,
  "userId": "user_123",
  "purpose": "analytics",
  "dataTypes": ["device", "usage"],
  "validUntil": "2026-12-31",
  "status": "ACTIVE",
  "approval": null
}
```

## Notes and Gaps
- NeGD BRD calls for a “purpose list” in the artefact. The MVP models a single `purpose` per consent version.
- Notice linkage and UI evidence are not present.

## Source Anchors
- DB: `backend/db/snapshots/schema_full_v1.sql`
- Consent mapping: `backend/src/repositories/consentRepo.ts` (mapRow)
- API shapes: `backend/src/index.ts`
- Context inputs: `regulatory_competitive_context_inputs/negd_brd_summary.md`
