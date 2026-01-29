# Artefact 08: Data Flow Diagrams (DFD Level 0 & Level 1 – Authoritative)

## Purpose
This artefact defines the **authoritative data movement model** for the Consent Management Platform (CMP).

It answers:
> *Where does personal data originate, how does it flow through the system, where is it stored, and where are trust boundaries?*

These DFDs are **normative** and form a mandatory input to the DPIA.

---

## Legal Basis (DPDP Act)

- **Section 5 & 6** — Notice and consent before processing
- **Section 8** — Purpose limitation, storage limitation, security safeguards
- **Section 10** — Breach notification and forensic traceability

DFDs make compliance **inspectable** rather than assumed.

---

## System Boundary Definition

**In Scope**:
- Consent capture interfaces
- CMP backend services
- Policy evaluation engine
- Audit logging subsystem
- Consent datastore

**Out of Scope (but interacting)**:
- Business application requesting processing
- External processors / vendors
- Notification services (SMS/Email gateways)

---

## External Entities

| Entity | Description |
|------|-------------|
| Data Principal | Individual providing or withdrawing consent |
| Client Application | App/website invoking CMP APIs |
| External Processor | Third-party data processor |
| Regulator / Auditor | Oversight authority |

---

## Data Stores

| Store | Description |
|------|-------------|
| Consent Store | ConsentArtefact + purpose/data joins |
| Audit Log Store | Immutable audit records |
| Taxonomy Store | Purpose & data type definitions |

---

## Level 0 DFD (Context Diagram)

**Single Process**: Consent Management Platform

### High-Level Flows

1. Data Principal → CMP
   - Consent grant / revoke
   - Rights requests

2. Client Application → CMP
   - Processing decision requests

3. CMP → Client Application
   - Allow / deny decisions

4. CMP → External Processor
   - Processing authorization signal (only if allowed)

5. CMP → Regulator / Auditor
   - Audit evidence (read-only)

---

## Level 1 DFD (Decomposition)

### Process 1: Consent Capture & Management

**Inputs**:
- Consent intent
- Notice acknowledgment

**Outputs**:
- ConsentArtefact (ACTIVE)
- `CONSENT_CREATED` audit event

**Stores Used**:
- Consent Store
- Audit Log Store

---

### Process 2: Consent State Management

**Inputs**:
- Revoke request
- Expiry trigger

**Outputs**:
- Updated consent state
- `CONSENT_REVOKED` or `CONSENT_EXPIRED`

**Stores Used**:
- Consent Store
- Audit Log Store

---

### Process 3: Processing Decision Engine

**Inputs**:
- Processing request (purpose, data types)
- Consent snapshot

**Outputs**:
- Allow / deny decision
- `PROCESSING_ALLOWED` or `PROCESSING_DENIED`

**Stores Used**:
- Consent Store (read-only)
- Audit Log Store

**Critical Constraint**:
- No consent state mutation permitted

---

### Process 4: Data Principal Rights Handling

**Inputs**:
- Access / erasure request

**Outputs**:
- Rights fulfilment actions
- Rights-related audit events

---

## Trust Boundaries

- Boundary A: Data Principal ↔ CMP (public interface)
- Boundary B: Client Application ↔ CMP (API auth required)
- Boundary C: CMP ↔ External Processor (DPA governed)
- Boundary D: CMP ↔ Audit/Regulator (read-only)

Each boundary requires:
- Authentication
- Authorization
- Encryption in transit

---

## Explicit Prohibitions

- Personal data flowing to external processors without `PROCESSING_ALLOWED`
- Audit data modification across any boundary
- Consent evaluation inside client applications

---

## Relationship to Other Artefacts

| Artefact | Dependency |
|--------|-----------|
| #3 Decision Matrix | Governs Process 3 |
| #4 Audit Spec | Governs all outputs |
| #6 ERD | Defines stores |
| #9 DPIA | Consumes this artefact |

---

## Change Control

Any modification:
- Requires DPIA reassessment
- Requires security review
- Requires regeneration of diagrams

---

**Status:** Authoritative
**Compliance Criticality:** High
**Precedence:** Higher than code, lower than statute

