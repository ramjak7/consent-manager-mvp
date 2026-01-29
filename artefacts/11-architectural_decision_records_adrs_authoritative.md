# Artefact 11: Architectural Decision Records (ADRs – Authoritative)

## Purpose
This artefact captures **significant architectural and design decisions** made in the Consent Management Platform (CMP), along with their rationale.

It answers:
> *Why was the system designed this way, and what alternatives were consciously rejected?*

ADRs are **binding context** for developers and AI agents. Ignoring them is considered a design regression.

---

## ADR-001: Consent as an Immutable Artefact

**Decision**  
Each grant of consent is modeled as a standalone ConsentArtefact. Consent is never overwritten or "updated in place".

**Rationale**  
- DPDP Act Section 6(10) requires proof of valid consent
- Immutable artefacts preserve historical truth
- Simplifies audit and dispute resolution

**Alternatives Considered**  
- Mutable "current consent" record (Rejected: destroys evidence)

**Consequences**  
- New consent requires new artefact
- State transitions are explicit and logged

---

## ADR-002: Side-Effect-Free Processing Decisions

**Decision**  
Processing evaluation (/process) MUST be side-effect free with respect to consent state.

**Rationale**  
- Prevents accidental revocation/expiry
- Ensures deterministic policy evaluation
- Aligns with legal separation of consent lifecycle vs processing

**Alternatives Considered**  
- Auto-revoking on policy failure (Rejected: illegal semantic coupling)

**Consequences**  
- Clear audit semantics
- Cleaner testability

---

## ADR-003: Explicit Consent State Machine

**Decision**  
Consent lifecycle is governed by a formal state machine.

**Rationale**  
- Prevents illegal state transitions
- Makes compliance verifiable
- Enables DB-level constraints

**Alternatives Considered**  
- Implicit state via timestamps (Rejected: ambiguous and error-prone)

**Consequences**  
- Slightly more schema complexity
- Stronger correctness guarantees

---

## ADR-004: Audit Logs as Legal Evidence

**Decision**  
Audit logs are treated as immutable compliance evidence, not application logs.

**Rationale**  
- Required for regulator scrutiny
- Enables forensic investigations

**Alternatives Considered**  
- Reusing application logs (Rejected: mutable, lossy)

**Consequences**  
- Separate storage and access controls
- Higher storage costs

---

## ADR-005: Taxonomy-Driven Design

**Decision**  
All purposes and data categories are centrally defined in a taxonomy.

**Rationale**  
- Prevents semantic drift
- Enables static validation
- Makes AI agent behavior predictable

**Alternatives Considered**  
- Free-text purposes (Rejected: non-compliant)

**Consequences**  
- Slower initial onboarding
- Higher long-term correctness

---

## Change Control

- New ADRs must be added for non-trivial decisions
- ADRs are append-only
- Superseded ADRs must be explicitly marked

---

**Status:** Authoritative
**Audience:** Engineers, Architects, AI Agents
**Precedence:** Higher than code, lower than statute

