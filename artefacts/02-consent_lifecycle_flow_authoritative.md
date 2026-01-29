# Artefact 02: Consent Lifecycle Flow (Authoritative)

## Purpose
This document defines the **authoritative business-level lifecycle of consent** under the DPDP Act. It describes *what can happen*, *in what order*, and *under what conditions*. 

This artefact is **normative**:
- Code, schemas, APIs, UI flows, audits, and tests MUST conform to it.
- No implementation is allowed to introduce new states or transitions.

---

## Design Principles

1. **Consent is event-driven**
   Consent exists only because a lawful event occurred and was recorded.

2. **Absence is not a state**
   No consent ≠ revoked consent.

3. **Time matters**
   Expiry and withdrawal are distinct, first-class events.

4. **Processing is conditional, not guaranteed**
   Even valid consent may not permit processing if purpose or data scope mismatches.

---

## Canonical Consent States

| State | Description | Terminal |
|-----|------------|----------|
| `REQUESTED` | Consent notice issued, awaiting user action | No |
| `ACTIVE` | Explicit, valid consent exists | No |
| `REVOKED` | User explicitly withdrew consent | Yes |
| `EXPIRED` | Consent validity period elapsed | Yes |
| `DENIED` | User explicitly refused consent | Yes |

> Terminal states cannot transition to any other state.

---

## Lifecycle Transitions

### 1. Consent Request Issued
- Trigger: Data Fiduciary needs consent
- Action: Present notice (language + purpose scoped)
- Resulting State: `REQUESTED`

---

### 2. Consent Granted
- From: `REQUESTED`
- Trigger: Clear affirmative user action
- Conditions:
  - Purpose defined
  - Data categories defined
  - Language recorded
- Resulting State: `ACTIVE`
- Audit Event: `CONSENT_GRANTED`

---

### 3. Consent Denied
- From: `REQUESTED`
- Trigger: Explicit refusal
- Resulting State: `DENIED`
- Audit Event: `CONSENT_DENIED`

---

### 4. Consent Revoked
- From: `ACTIVE`
- Trigger: User withdrawal
- Effect: Immediate cessation of processing
- Resulting State: `REVOKED`
- Audit Event: `CONSENT_REVOKED`

---

### 5. Consent Expired
- From: `ACTIVE`
- Trigger: Validity period elapsed
- Effect: Processing must stop
- Resulting State: `EXPIRED`
- Audit Event: `CONSENT_EXPIRED`

---

## Processing Decision Gate

Before *any* processing operation:

1. Consent state MUST be `ACTIVE`
2. Requested purpose MUST match consented purpose
3. Requested data types MUST be subset of consented data types
4. Consent MUST not be expired at time of processing

Failure of **any** condition → processing denied.

---

## Explicit Non-Transitions (Forbidden)

The following transitions are **illegal**:
- `REVOKED → ACTIVE`
- `EXPIRED → ACTIVE`
- `DENIED → ACTIVE`
- `REQUESTED → EXPIRED`

A new consent request MUST be issued instead.

---

## Downstream Artefact Dependencies

This artefact governs:
- Consent database schema
- Policy engine logic
- API response semantics
- Audit event taxonomy
- UI/UX flows
- Automated compliance tests

No downstream artefact may contradict this flow.

---

## Change Control

Any change to this document:
- Requires legal review
- Requires regeneration of all dependent artefacts
- Must be versioned explicitly

---

**Status:** Authoritative
**Precedence:** Higher than code, lower only than statute