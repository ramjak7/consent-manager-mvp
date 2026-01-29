# Artefact 05: Consent State Machine Specification (Authoritative)

## Purpose
This artefact defines the **formal state machine** governing the lifecycle of a Consent Artefact.

It answers:
> *What states can a consent be in, what transitions are allowed, what triggers them, and what is explicitly forbidden?*

This document is **normative** and **binding** on all implementations, tests, and AI agents.

---

## Legal Basis (DPDP Act)

- **Section 6** — Consent must be free, specific, informed, unconditional, and revocable
- **Section 8** — Accountability and demonstrability of compliance

The state machine ensures consent transitions are **deterministic, auditable, and legally defensible**.

---

## Canonical Consent States

| State | Description |
|------|-------------|
| `DRAFT` | Consent intent captured but not yet valid (pre-confirmation / pre-verification) |
| `ACTIVE` | Valid consent currently in force |
| `REVOKED` | Consent explicitly withdrawn by Data Principal |
| `EXPIRED` | Consent automatically lapsed due to expiry rules |

> Only these states are permitted. No additional states may be introduced without legal review.

---

## Initial State

- A consent record MUST begin in `DRAFT`
- Transition to `ACTIVE` occurs only after all validity conditions are satisfied

---

## Allowed State Transitions

| From | To | Trigger | Actor | Notes |
|-----|----|--------|-------|------|
| `DRAFT` | `ACTIVE` | Consent confirmation | Data Principal | Requires valid notice + affirmative action |
| `ACTIVE` | `REVOKED` | Withdrawal request | Data Principal | Must be as easy as grant |
| `ACTIVE` | `EXPIRED` | Expiry rule satisfied | System | No user action required |

---

## Forbidden Transitions (Hard Prohibitions)

The following transitions MUST NEVER occur:

- `REVOKED` → `ACTIVE` (requires new consent record)
- `EXPIRED` → `ACTIVE` (requires new consent record)
- Any → `DRAFT`
- Any state change triggered by processing evaluation

Violations are considered **compliance defects**.

---

## Side-Effect Rules

- State transitions MUST emit exactly one lifecycle audit event (see Artefact #4)
- Processing decisions MUST NOT change consent state (see Artefact #3)
- Expiry checks MUST be deterministic and idempotent

---

## Expiry Semantics

- Expiry is evaluated based on:
  - `expiresAt` timestamp
  - policy-defined maximum validity window

- Expiry evaluation:
  - MAY occur lazily (on read)
  - MUST emit `CONSENT_EXPIRED` once
  - MUST transition state to `EXPIRED`

---

## Relationship to Other Artefacts

This artefact:
- Governs lifecycle events in Artefact #4
- Is referenced by decision logic in Artefact #3
- Uses definitions from Artefact #1

In conflicts, precedence applies.

---

## Implementation Notes (Non-Normative)

- State transitions should be enforced at the repository or domain layer
- Tests must assert forbidden transitions fail
- Database constraints are recommended where feasible

---

## Change Control

Any modification:
- Requires legal approval
- Requires migration and backfill plan
- Requires regeneration of tests and diagrams

---

**Status:** Authoritative
**Compliance Criticality:** Very High
**Precedence:** Higher than code, lower than statute

