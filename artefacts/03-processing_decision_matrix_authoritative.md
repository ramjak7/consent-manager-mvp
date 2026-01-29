# Artefact 03: Processing Decision Matrix (Authoritative)

## Purpose
This artefact defines the **authoritative decision logic** for allowing or denying any data processing request under the DPDP Act.

It answers one question only:
> *Given a processing request and a consent record, is processing allowed — and why?*

This document is **normative** and **binding** on all implementations.

---

## Inputs

### A. Processing Request

| Field | Description |
|------|-------------|
| `purpose` | Declared purpose for processing |
| `dataTypes` | Set of personal data categories requested |
| `timestamp` | Time at which processing is attempted |

---

### B. Consent Record

| Field | Description |
|------|-------------|
| `state` | Consent lifecycle state |
| `purposes` | Purposes explicitly consented to |
| `dataTypes` | Data categories consented to |
| `grantedAt` | Timestamp when consent became ACTIVE |
| `expiresAt` | Optional expiry timestamp |
| `revokedAt` | Optional revocation timestamp |

---

## Mandatory Evaluation Order

The following checks **MUST be executed in order**. Evaluation stops at the first failure.

1. **Consent Existence Check**
2. **Consent State Check**
3. **Temporal Validity Check**
4. **Purpose Match Check**
5. **Data Scope Check**

Reordering these checks is **forbidden**.

---

## Decision Matrix

| Step | Condition | Result if Fails | Denial Reason Code |
|-----|----------|----------------|--------------------|
| 1 | Consent record exists | DENY | `NO_CONSENT` |
| 2 | Consent state == `ACTIVE` | DENY | `CONSENT_NOT_ACTIVE` |
| 3 | `timestamp < expiresAt` (if present) | DENY | `CONSENT_EXPIRED` |
| 4 | Requested purpose ∈ consented purposes | DENY | `PURPOSE_MISMATCH` |
| 5 | Requested dataTypes ⊆ consented dataTypes | DENY | `DATA_SCOPE_VIOLATION` |

If **all** checks pass → **ALLOW**.

---

## Allow Decision

When processing is allowed:

- Processing MAY proceed
- No consent state change occurs
- Audit Event: `PROCESSING_ALLOWED`

---

## Deny Decision

When processing is denied:

- Processing MUST NOT proceed
- Consent state MUST NOT change
- Audit Event: `PROCESSING_DENIED`

Audit logs MUST include:
- denial reason code
- failed step number

---

## Explicit Non-Side-Effects

The following are **strictly prohibited** during evaluation:

- Changing consent state
- Auto-revoking or expiring consent
- Creating consent records
- Emitting lifecycle events (`CONSENT_REVOKED`, etc.)

Decision logic is **pure and side-effect free**.

---

## Relationship to Other Artefacts

This artefact:
- Implements Artefact #2 (Lifecycle Flow)
- Uses terminology from Artefact #1 (Taxonomy)

Conflicts MUST be resolved in favour of:
1. Statute
2. Artefact #1
3. Artefact #2
4. This artefact

---

## Change Control

Any modification:
- Requires legal + engineering review
- Requires regeneration of policy engine, tests, and API docs
- Must be versioned explicitly

---

**Status:** Authoritative
**Precedence:** Higher than code, lower only than lifecycle and taxonomy

