# Artefact 04: Audit Logging Specification (Authoritative)

## Purpose
This artefact defines the **mandatory, legally defensible audit logging model** for the Consent Management Platform (CMP).

It answers:
> *What must be logged, when, with which fields, and with what guarantees — to prove DPDP compliance?*

This document is **normative** and **binding** on all implementations.

---

## Legal Basis (DPDP Act)

Primary obligations addressed:
- **Section 6(10)** — Onus on Data Fiduciary to prove valid consent
- **Section 8** — Accountability & security safeguards
- **Section 10** — Breach investigation & forensic readiness

Audit logs are treated as **compliance evidence**, not application telemetry.

---

## Design Principles

1. **Immutability** — Audit records MUST NOT be updated or deleted
2. **Completeness** — Every legally relevant event MUST generate exactly one log entry
3. **Determinism** — Same input + same state → same audit outcome
4. **Separation of Concerns** — Audit logging is orthogonal to business logic
5. **Forensic Sufficiency** — Logs must stand alone in regulatory scrutiny

---

## Audit Event Taxonomy (Canonical)

### Consent Lifecycle Events

| Event Code | Trigger |
|----------|--------|
| `CONSENT_CREATED` | New consent becomes ACTIVE |
| `CONSENT_REVOKED` | Data Principal withdraws consent |
| `CONSENT_EXPIRED` | Consent lapses due to expiry rule |

---

### Processing Decision Events

| Event Code | Trigger |
|----------|--------|
| `PROCESSING_ALLOWED` | Processing request passes Artefact #3 |
| `PROCESSING_DENIED` | Processing request fails Artefact #3 |

---

### Data Principal Rights Events

| Event Code | Trigger |
|----------|--------|
| `DATA_ACCESS_REQUESTED` | Access request submitted |
| `DATA_ERASURE_REQUESTED` | Erasure request submitted |
| `DATA_ERASURE_COMPLETED` | Erasure fulfilled |

---

## Mandatory Audit Record Schema

Every audit log entry MUST contain the following fields:

| Field | Description |
|------|-------------|
| `auditId` | Unique, immutable identifier |
| `eventType` | One of the canonical event codes |
| `consentId` | Related consent artefact ID (nullable only for pre-consent events) |
| `dataPrincipalId` | Identifier of data principal |
| `timestamp` | ISO 8601 UTC timestamp |
| `actorType` | `DATA_PRINCIPAL` / `SYSTEM` / `ADMIN` |
| `actorId` | Identifier of actor (if applicable) |
| `requestId` | Correlation ID for the request |
| `ipAddress` | Source IP address |
| `userAgent` | User agent string |
| `metadata` | Event-specific structured JSON |

---

## Event-Specific Mandatory Metadata

### For `PROCESSING_DENIED`

`metadata` MUST include:
- `denialReasonCode`
- `failedStep` (from Artefact #3)
- `requestedPurpose`
- `requestedDataTypes`

---

### For `CONSENT_CREATED`

`metadata` MUST include:
- `purposes`
- `dataTypes`
- `validFrom`
- `expiresAt` (if applicable)
- `noticeVersion`

---

### For `CONSENT_REVOKED`

`metadata` MUST include:
- `revokedAt`
- `revocationChannel`

---

## Explicit Prohibitions

The following are **forbidden**:

- Logging derived or inferred consent
- Logging silent auto-revocations during evaluation
- Emitting lifecycle events for processing denials
- Overloading `CONSENT_REVOKED` to signal policy failures

---

## Retention & Storage Policy

- Minimum retention: **1 year** (or longer if dispute ongoing)
- Storage MUST be:
  - Append-only
  - Write-once (logical immutability)
  - Access-controlled

Deletion prior to retention expiry is prohibited.

---

## Relationship to Other Artefacts

This artefact:
- Is triggered by Artefact #3 (Decision Matrix)
- Depends on Artefact #2 (Lifecycle Flow)
- Uses Artefact #1 (Taxonomy) terminology

In case of conflict, precedence order applies.

---

## Change Control

Any modification:
- Requires legal sign-off
- Requires schema migration
- Requires regeneration of tests and audit verifiers

---

**Status:** Authoritative
**Compliance Criticality:** High
**Precedence:** Higher than code, lower than statute