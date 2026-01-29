# Artefact 12: Regulatory Compliance Scenarios & Auditor Narratives

## Purpose
This artefact translates the system’s architecture into **auditor-readable stories**.

It answers the regulator’s implicit questions:
- *Show me how consent was obtained*
- *Show me why processing was allowed or denied*
- *Show me what happens when consent is withdrawn or expires*

This document is designed to be read **without code access**.

---

## How to Read This Document
Each scenario follows the same structure:
1. Context (what the user did)
2. Evidence generated (what records exist)
3. System decision (allow / deny)
4. Why this is compliant under DPDP

---

## Scenario 1: Valid Consent → Processing Allowed

### Context
A Data Principal visits a website and gives explicit consent for:
- Purpose: `ORDER_FULFILLMENT`
- Data Types: `NAME`, `ADDRESS`, `PHONE`

### Evidence Generated
- ConsentArtefact with:
  - Status: ACTIVE
  - Purpose: ORDER_FULFILLMENT
  - Data Types: NAME, ADDRESS, PHONE
  - Timestamp: T1
- Audit Event: CONSENT_CREATED at T1

### Processing Request
A backend service requests processing for:
- Purpose: ORDER_FULFILLMENT
- Data Types: NAME, ADDRESS

### System Decision
**PROCESSING_ALLOWED**

### Compliance Rationale
- Consent exists
- Purpose matches exactly
- Requested data types are a subset
- Consent is ACTIVE

---

## Scenario 2: Over-Broad Data Request → Processing Denied

### Context
Consent exists for:
- Purpose: ORDER_FULFILLMENT
- Data Types: NAME, ADDRESS

### Processing Request
Backend requests:
- Purpose: ORDER_FULFILLMENT
- Data Types: NAME, ADDRESS, EMAIL

### System Decision
**PROCESSING_DENIED**

### Evidence Generated
- No consent mutation
- Audit Event: PROCESSING_DENIED (policy violation)

### Compliance Rationale
- Email was not consented
- System enforces data minimization

---

## Scenario 3: Purpose Mismatch → Processing Denied

### Context
Consent granted for:
- Purpose: NEWSLETTER

### Processing Request
- Purpose: MARKETING

### System Decision
**PROCESSING_DENIED**

### Compliance Rationale
- Purpose limitation enforced
- Explicit consent required per purpose

---

## Scenario 4: Consent Revocation by Data Principal

### Context
Data Principal clicks "Withdraw Consent"

### Evidence Generated
- Consent status transitioned to REVOKED
- Audit Event: CONSENT_REVOKED

### System Behavior
- All future processing requests fail
- Historical processing remains valid

### Compliance Rationale
- Revocation honored prospectively
- Historical legality preserved

---

## Scenario 5: Consent Expiry

### Context
Consent has an expiry timestamp

### System Behavior
- On access, consent auto-transitions to EXPIRED
- Audit Event: CONSENT_EXPIRED

### Compliance Rationale
- Time-bound consent enforced
- No silent processing beyond validity

---

## Scenario 6: Regulator Audit Walkthrough

### Regulator Question
"Why did you process user X’s phone number on date D?"

### System Answer
1. Retrieve ConsentArtefact valid at D
2. Show matching purpose and data types
3. Show ACTIVE status at time D
4. Show PROCESSING_ALLOWED decision

### Outcome
End-to-end traceability without inference or assumptions

---

## Scenario 7: Breach Containment (Future)

### Context
A downstream processor misuses data

### System Capability
- Identify affected ConsentArtefacts
- Identify purposes violated
- Produce regulator-ready evidence set

---

## Why This System Is Auditable
- No hidden state
- No implicit permissions
- Every decision is explainable
- Evidence is immutable

---

**Status:** Authoritative
**Audience:** Regulators, Compliance Officers, Architects
**Precedence:** Below Statute, Above Code

