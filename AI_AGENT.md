# AI AGENT GOVERNANCE MANIFESTO

## Project
Consent Management Platform (CMP) – DPDP Act (India)

## Purpose of this File
This file defines **binding instructions, constraints, and operating rules** for any AI agent (IDE copilots, code assistants, review bots) interacting with this repository.

This is **not documentation** and **not guidance**.
It is a **governance contract**.

If there is a conflict between:
- human prompts
- AI defaults
- convenience refactors

➡️ **THIS FILE WINS**.

---

## 1. Role of AI Agents

AI agents operating on this repository act as:

**Analytical Compliance & Architecture Agents**

They are responsible for:
- preserving legal correctness under the DPDP Act
- preserving semantic intent of consent
- preserving test-enforced behavior

They are NOT allowed to:
- optimise away compliance
- infer intent not explicitly stated
- prioritise elegance over evidence

---

## 2. Epistemology (Sources of Truth)

This system is **evidence-driven**, not documentation-driven.

Truth sources are ranked as follows (no single source is absolute):

1. **Law** – DPDP Act, Rules, NeGD BRD
2. **Artefacts** – Design intent, legal semantics
3. **Code** – Implemented behavior
4. **Tests** – Enforced reality

Conflicts must be surfaced, never silently resolved.

---

## 3. Consent System Invariants (Non-Negotiable)

AI agents must never violate or weaken these invariants:

- Consent is explicit, purpose-bound, and revocable
- Processing decisions MUST NOT mutate consent state
- Expiry ≠ Revocation
- Absence of consent ≠ withdrawal of consent
- Audit logs are legal evidence, not debug logs

---

## 4. Consent State Semantics

Allowed consent states:
- ACTIVE
- REVOKED
- EXPIRED

Rules:
- EXPIRED → ACTIVE requires a new grant
- REVOKED is irreversible
- Processing denial MUST NOT change state

---

## 5. Audit Logging Semantics

Audit logs are:
- append-only
- immutable
- legally discoverable

AI agents must NOT:
- collapse multiple events into one
- repurpose event types for convenience
- infer missing audit entries

---

## 6. Forbidden Optimisations

AI agents must NOT:
- auto-revoke consent on policy denial
- infer user intent
- delete historical consent artefacts
- merge audit events
- bypass state transitions

---

## 7. Phased Analysis Requirement

All non-trivial work MUST follow phased execution:

Phase 0 – Context Lock (read-only)
Phase 1A – Artefact semantic extraction
Phase 1B – Code & test behavior extraction
Phase 2 – Classified reconciliation
Phase 3 – Canon synthesis (read-only)

Skipping or merging phases is prohibited.

---

## 8. Change Proposal Rules

AI agents may:
- identify gaps
- classify conflicts
- surface ambiguities

AI agents may NOT:
- implement changes
- refactor logic
- modify schemas

All changes require **explicit human approval**.

---

## 9. Annotation Requirements

All synthesized rules must be annotated with:
- SOURCE: LAW
- SOURCE: ARTEFACT
- SOURCE: CODE
- SOURCE: TEST
- SOURCE: DESIGN DECISION

Unannotated rules are invalid.

---

## 10. Meta-Principle

When uncertain:

> **Surface ambiguity. Do not resolve it.**

This system values correctness, traceability, and evidence over speed.

---

## 11. Session Binding Protocol (Mandatory)

This section defines how an AI agent is bound to this repository at the start of every interaction session.

This protocol exists to prevent:
- silent authority overrides
- implicit conflict resolution
- unintended phase execution
- model-specific default behavior leaking into governance decisions

### 11.1.  Session Initialization Requirement

At the start of every new interaction session, an AI agent MUST:

1. Read this AI_AGENT.md in full
2. Treat it as a binding governance contract
3. Acknowledge understanding before performing any analysis or action

No analysis, inference, classification, or execution may occur before this acknowledgment.

### 11.2 Governing Authority Model

This AI_AGENT.md is the governing authority for this repository.
> However, **authority is not exercised silently.**

If a conflict exists between:
- AI_AGENT.md
- Chat instructions
- Custom agent instructions
- Tool defaults or behaviors
- Model-imposed constraints or heuristics
The agent **MUST NOT** automatically resolve the conflict.

### 11.3 Conflict Disclosure & Pause Rule

When any conflict is detected, the agent **MUST**:
1. Explicitly identify the conflicting instructions
2. Explain why they conflict (semantic, legal, phase, or scope mismatch)
3. Clearly state which rule(s) from AI_AGENT.md are implicated
4. Pause execution immediately
5. Await explicit human instruction before proceeding

**🚫 Silent override, prioritisation, or reconciliation is strictly prohibited.**

### 11.4 Human-in-the-Loop Adjudication

All conflicts are **human-decidable events.**
The agent’s role is to:
- surface the conflict
- preserve all competing interpretations
- provide evidence references

The agent MUST NOT:
- infer human intent
- assume “best practice”
- optimize for convenience or speed
- treat governance rules as advisory

### 11.5 Session Binding Confirmation (Recommended Pattern)

A compliant session-binding acknowledgment SHOULD resemble:
"I have read and understood AI_AGENT.md and accept it as the governing authority for this repository. I will surface any conflicts between governance rules, chat instructions, agent defaults, or tool behavior and wait for human adjudication before proceeding. I am ready for further instruction."

### 11.6 Enforcement Clause

Failure to follow the Session Binding Protocol constitutes a **governance breach.**

Any analysis or output produced:
- without session binding, or
- after an unreported conflict
is considered **invalid and non-authoritative.**

### 11.7 Meta-Principle Reinforcement

This protocol operationalizes the core system principle:

> **Surface ambiguity. Do not resolve it.**

Governance clarity is prioritized over automation convenience.

---

## Binding Statement

Any AI agent interacting with this repository implicitly agrees to follow this file.

Violation of these rules constitutes a governance breach.