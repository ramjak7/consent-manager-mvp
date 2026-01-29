# Artefacts Index (Authoritative)

## Purpose of this Folder

The `artefacts/` directory contains the **authoritative specifications** for the Consent Management Platform (CMP).

These artefacts represent:
- the **legal interpretation** of the DPDP Act,
- the **business intent** of the system,
- the **normative system model** that all code, tests, and integrations **must conform to**.

> **Important rule:**
> - Artefacts define truth.
> - Code is an implementation attempt.
> - If code and artefacts conflict, **code is wrong** unless the artefact is explicitly revised.

This folder is treated as **read-only** for most developers and AI agents.

---

## How to Read These Artefacts (Mandatory Order)

Artefacts are generated and consumed in a **strict dependency order**. Skipping ahead will result in semantic, legal, or architectural errors.

### Layer 1 — Legal & Conceptual Ground Truth
**What is legally and conceptually true**

1. `01_legal-conceptual/01_consent-taxonomy/`
   - Shared vocabulary: data categories, purposes, consent attributes
   - Prevents semantic drift across teams and code

2. `01_legal-conceptual/02_consent-lifecycle/`
   - Business-level view of the consent journey
   - Bridges DPDP legal intent and system behavior

3. `01_legal-conceptual/03_dpdp-traceability/`
   - Maps DPDP Act sections to system obligations
   - Acts as the compliance oracle

---

### Layer 2 — Risk, Accountability & Proof
**Why the system is designed this way**

4. `02_risk-accountability/04_audit-logging/`
   - Defines legally sufficient audit evidence
   - Logging is treated as legal proof, not a technical afterthought

5. `02_risk-accountability/05_dpia/`
   - Assesses privacy risks and mitigations
   - Mandatory for high-risk or significant data fiduciary contexts

6. `02_risk-accountability/06_adrs/`
   - Records architectural decisions and rationale
   - Prevents accidental erosion of compliance intent

---

### Layer 3 — System Model & Technical Blueprints
**How the system is formally modeled**

7. `03_system-model/07_state-machine/`
   - Canonical consent state transitions
   - Illegal transitions are explicitly defined

8. `03_system-model/08_consent-artefact/`
   - Canonical consent record (JSON schema)
   - This is the immutable source of truth for consent

9. `03_system-model/09_erd/`
   - Database model derived from the consent artefact
   - Data structure follows legal truth, not convenience

10. `03_system-model/10_dfd/`
    - Data movement and trust boundaries
    - Used for security reviews and regulator explanations

---

### Layer 4 — Execution, Integration & Operations
**How the system is used and operated**

11. `04_execution-layer/11_api-spec/`
    - OpenAPI / Swagger specifications
    - Interfaces must align with consent states and artefact schema

12. `04_execution-layer/12_sops/`
    - Step-by-step operational routines
    - Designed to be executable by humans and AI agents

13. `04_execution-layer/13_prompt-guidelines/`
    - Rules and constraints for AI copilots
    - Prevents unsafe or non-compliant AI actions

14. `04_execution-layer/14_multilingual-notices/`
    - User-facing consent notices in Indian languages
    - Must reflect finalized legal and business intent

---

## Artefact Authority Levels

| Artefact Type | Authority | Notes |
|--------------|-----------|-------|
| Consent Taxonomy | Absolute | Vocabulary lock-in |
| DPDP Traceability Matrix | Absolute | Compliance oracle |
| State Machine Diagram | Absolute | Consent logic boundary |
| Consent Artefact Schema | Absolute | Immutable legal record |
| Audit Logging Spec | Absolute | Legal evidence definition |
| ERD / API Specs | Derived | Must conform upward |
| SOPs | Operational | Must not contradict artefacts |

---

## Rules for Developers

- Do **not** modify artefacts without explicit approval
- Always validate changes against:
  - State Machine Diagram
  - Consent Artefact Schema
  - Audit Logging Specification
- Treat failing tests as potential **semantic violations**, not just bugs

---

## Rules for AI Agents

AI agents must:
- Treat `artefacts/` as **authoritative input**
- Never infer consent logic from code alone
- Flag inconsistencies instead of auto-fixing them
- Request clarification before altering artefacts

---

## Change Management

- Artefacts are versioned via Git history
- Any artefact change must include:
  - Reason for change
  - Impacted downstream artefacts
  - Legal/compliance impact note

---

## Mental Model to Remember

> This repository is a **machine-readable interpretation of the DPDP Act**.
>
> Code, tests, and AI agents exist to serve that interpretation — not redefine it.

