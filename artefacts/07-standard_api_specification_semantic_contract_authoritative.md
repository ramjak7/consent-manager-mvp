# Artefact 07: Standard API Specification (Semantic Contract – Authoritative)

## Purpose
This artefact defines the **semantic API contract** for the Consent Management Platform (CMP).

It answers:
> *What APIs exist, what they do (and do not do), and what guarantees they provide — independent of implementation?*

This document is **normative**. OpenAPI files, controllers, tests, and AI agents MUST conform to it.

---

## Design Principles

1. **Semantic purity** — APIs express intent, not internal mechanics
2. **Side-effect discipline** — Only lifecycle APIs mutate consent state
3. **Deterministic responses** — Same input + same state → same output
4. **Audit-first design** — Every API maps to explicit audit semantics

---

## API Categories

1. Consent Lifecycle APIs
2. Processing Decision APIs
3. Data Principal Rights APIs
4. Administrative / Evidence APIs

---

## 1. Consent Lifecycle APIs

### POST /consents
Creates a new consent artefact and transitions it to ACTIVE.

**Effects**:
- Creates ConsentArtefact
- State: DRAFT → ACTIVE
- Emits: `CONSENT_CREATED`

**Response**:
- `201 Created`
- Body: ConsentArtefact snapshot

---

### POST /consents/{consentId}/revoke
Withdraws consent.

**Preconditions**:
- Consent state MUST be ACTIVE

**Effects**:
- State: ACTIVE → REVOKED
- Emits: `CONSENT_REVOKED`

**Response**:
- `200 OK`

---

## 2. Processing Decision API

### POST /process
Evaluates whether a processing request is allowed.

**Semantics**:
- Executes Artefact #3 (Decision Matrix)
- MUST be side-effect free on consent state

**Effects**:
- Emits `PROCESSING_ALLOWED` or `PROCESSING_DENIED`

**Response**:
```json
{ "allowed": true | false, "reasonCode": "…" }
```

---

## 3. Data Principal Rights APIs

### POST /rights/access

- Emits: `DATA_ACCESS_REQUESTED`

---

### POST /rights/erasure

- Emits: `DATA_ERASURE_REQUESTED`
- Completion emits: `DATA_ERASURE_COMPLETED`

---

## 4. Administrative APIs

### GET /audit-logs

Returns audit evidence.

**Constraints**:
- Read-only
- Filterable by consentId, principalId, eventType

---

## Error Semantics

| Condition | HTTP | Notes |
|---------|------|------|
| No consent | 404 | No auto-creation |
| Invalid state | 409 | State machine violation |
| Policy denial | 200 | With allowed=false |

---

## Explicit Prohibitions

- Processing APIs changing consent state
- Lifecycle APIs emitting processing events
- Silent consent creation
- Overloaded endpoints

---

## Relationship to Other Artefacts

| Artefact | Enforced Aspect |
|--------|----------------|
| #3 Decision Matrix | /process behaviour |
| #4 Audit Spec | Event emission |
| #5 State Machine | Lifecycle APIs |
| #6 ERD | Request/response models |

---

## Change Control

Any API change:
- Requires artefact update first
- Requires OpenAPI regeneration
- Requires Newman/Postman updates

---

**Status:** Authoritative
**Compliance Criticality:** High
**Precedence:** Higher than code, lower than statute