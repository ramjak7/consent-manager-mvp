# Artefact 09: Data Protection Impact Assessment (DPIA – Authoritative)

## 1. Purpose of the DPIA

This Data Protection Impact Assessment (DPIA) evaluates the risks to the rights and freedoms of Data Principals arising from the design and operation of the Consent Management Platform (CMP).

It answers:
> *What could go wrong with personal data processing, how severe would the impact be, and what controls mitigate those risks?*

This DPIA is **normative**, required for **Significant Data Fiduciaries**, and must be kept up to date.

---

## 2. System Overview

### System Name
Consent Management Platform (CMP)

### Role Under DPDP Act
Data Fiduciary (primary)

### Processing Context
- Collection, storage, evaluation, and withdrawal of consent
- Processing decision enablement for downstream applications
- Maintenance of immutable audit evidence

This DPIA covers **only the CMP**, not downstream business systems.

---

## 3. Description of Processing Activities

### Categories of Data Principals
- Customers / end-users of client applications
- Website or mobile application users

### Categories of Personal Data
- Identifiers (user IDs, device metadata)
- Contact data (email, phone – optional)
- Consent metadata (purposes, timestamps, notices)

> Sensitive personal data categories are governed via taxonomy constraints (Artefact #1).

---

## 4. Lawful Basis & Necessity

### Lawful Basis
- **Explicit consent** under Sections 5 & 6 of the DPDP Act

### Necessity Test
Processing is necessary to:
- Demonstrate lawful consent
- Enforce purpose limitation
- Enable data principal rights

### Proportionality
- No processing occurs beyond declared purposes
- No silent consent inference

---

## 5. Data Flow Summary

This DPIA relies on:
- **Artefact #8** (DFD Level 0 & 1)

Key points:
- CMP acts as a central policy and evidence layer
- No personal data flows to external processors without an explicit allow decision

---

## 6. Risk Identification & Assessment

### Risk Matrix Legend
- Likelihood: Low / Medium / High
- Impact: Low / Medium / High

---

### R1: Processing Without Valid Consent

- **Description**: Downstream system processes data without valid consent
- Likelihood: Medium
- Impact: High
- Risk Level: High

**Mitigations**:
- Processing Decision Matrix (Artefact #3)
- Side-effect-free policy engine
- Mandatory audit events

---

### R2: Inability to Prove Consent to Regulator

- Likelihood: Low
- Impact: High
- Risk Level: Medium

**Mitigations**:
- Immutable Audit Logs (Artefact #4)
- Consent Artefact Template
- ERD-enforced immutability

---

### R3: Unauthorized Access to Audit Logs

- Likelihood: Medium
- Impact: High
- Risk Level: High

**Mitigations**:
- Read-only administrative APIs
- Access control & monitoring
- Encryption at rest

---

### R4: Excessive Data Retention

- Likelihood: Medium
- Impact: Medium
- Risk Level: Medium

**Mitigations**:
- State Machine expiry rules (Artefact #5)
- Retention policies

---

## 7. Residual Risk Evaluation

After mitigation, residual risks are:
- Acceptable under DPDP Act
- Subject to ongoing monitoring

No unmitigated high-risk processing remains.

---

## 8. Stakeholder Consultation

- Legal review: Required
- Security review: Required
- Engineering review: Completed via artefact alignment

---

## 9. DPIA Outcome & Approval

- DPIA Status: Approved with controls
- Review Frequency: Annual or on major system change

---

## 10. Relationship to Other Artefacts

| Artefact | Role |
|--------|------|
| #1–#8 | Inputs |
| #10 SOPs | Operational mitigation |
| #11 ADRs | Design justification |

---

**Status:** Authoritative
**Regulatory Criticality:** Very High
**Precedence:** Higher than code, lower than statute

