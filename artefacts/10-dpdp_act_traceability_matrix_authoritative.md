# Artefact 10: DPDP Act Traceability Matrix (Authoritative)

## Purpose
This artefact provides **end-to-end traceability** from DPDP Act legal requirements to system artefacts, APIs, and tests.

It answers:
> *For every legal obligation, where is it implemented, how is it enforced, and how is it verified?*

This document is **normative** and audit-critical.

---

## How to Read This Matrix

- **Legal Requirement** → What the DPDP Act mandates
- **System Obligation** → What the CMP must do
- **Artefacts** → Which authoritative artefacts define the rule
- **Implementation Touchpoints** → APIs / modules expected to enforce it
- **Verification** → Tests or evidence proving compliance

---

## Core Traceability Matrix

| DPDP Principle / Right | Relevant Sections | System Obligation | Governing Artefacts | Implementation Touchpoints | Verification / Evidence |
|----------------------|------------------|------------------|--------------------|---------------------------|-------------------------|
| Notice before processing | Sec 5 | Provide clear notice prior to consent | #1 Taxonomy, #2 Lifecycle, #7 API Spec | POST /consents | Consent record includes notice_version; audit log |
| Valid consent | Sec 6(1)–6(6) | Obtain free, specific, informed consent | #1, #2, #5 | Consent creation flow | Newman: consent creation tests |
| Easy withdrawal | Sec 6(4) | Allow withdrawal as easily as grant | #2, #5, #7 | POST /consents/{id}/revoke | Revocation audit entry |
| Proof of consent | Sec 6(10) | Demonstrate valid consent | #4 Audit Spec, #6 ERD | AuditLog store | Audit retrieval tests |
| Purpose limitation | Sec 8 | Process only for consented purposes | #1 Taxonomy, #3 Decision Matrix | POST /process | Newman: purpose mismatch denial |
| Data minimization | Sec 8 | Limit data types processed | #1, #3, #6 | POST /process | Newman: data scope violation |
| Storage limitation | Sec 8 | Expire consent when purpose ends | #5 State Machine | Expiry evaluation | Expiry transition test |
| Accountability | Sec 8 | Maintain records & controls | #4, #9 DPIA | Audit APIs | Evidence completeness |
| Data access right | Sec 11 | Allow access to personal data | #7 API Spec, #10 SOPs | POST /rights/access | Rights request logs |
| Correction right | Sec 12 | Enable correction | #10 SOPs | Rights workflow | Manual audit |
| Erasure right | Sec 13 | Enable erasure | #7 API Spec, #10 SOPs | POST /rights/erasure | Erasure completion audit |
| Breach readiness | Sec 10 | Enable investigation | #4 Audit Spec, #8 DFD, #9 DPIA | Audit store | Forensic review |
| Children’s data | Sec 9 | Age verification & parental consent | #1 Taxonomy, #5 SMD | Consent capture | Dedicated test cases |

---

## Mandatory Consistency Rules

- Every DPDP section listed MUST map to:
  - ≥1 authoritative artefact
  - ≥1 implementation touchpoint
  - ≥1 verification method

Missing mappings indicate **non-compliance**.

---

## Usage Guidance

- **Engineering**: Use this matrix to ensure no feature is built without legal grounding
- **QA**: Newman/Postman tests must reference a row in this table
- **Audit/Legal**: Use as primary compliance evidence

---

## Change Control

Any change to:
- DPDP interpretation
- System behaviour

MUST result in an update to this matrix **before code changes**.

---

**Status:** Authoritative
**Regulatory Criticality:** Very High
**Precedence:** Higher than code, lower than statute