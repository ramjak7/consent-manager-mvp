# Consent Taxonomy (Authoritative)

## Purpose

This document defines the **canonical vocabulary and classification system** for the Consent Management Platform (CMP).

It is the **semantic foundation** for all legal, business, technical, and operational artefacts. All code, schemas, APIs, logs, tests, notices, and AI agents **must use the terms defined here verbatim**.

> If a term is not defined in this taxonomy, it must **not** appear in code or artefacts.

---

## 1. Core Legal Entities (DPDP-Aligned)

### 1.1 Data Principal
The natural person to whom the personal data relates.

Attributes:
- `data_principal_id` (system-generated)
- `age_category` ∈ { ADULT, CHILD }
- `preferred_language`

Notes:
- A CHILD is defined as per DPDP Act Section 2(2).
- Age verification is mandatory where CHILD = true.

---

### 1.2 Data Fiduciary
The entity that determines the purpose and means of processing personal data.

Attributes:
- `fiduciary_id`
- `fiduciary_type` ∈ { STANDARD, SIGNIFICANT }

Notes:
- Significant Data Fiduciary obligations apply based on volume, sensitivity, and risk.

---

### 1.3 Data Processor
An external or internal entity that processes personal data on behalf of the Data Fiduciary.

Attributes:
- `processor_id`
- `processing_scope`
- `dpa_reference`

---

## 2. Personal Data Classification

### 2.1 Personal Data Category

| Category Code | Description | DPDP Sensitivity |
|--------------|------------|------------------|
| PD_GENERAL | Identifiable personal data | General |
| PD_SENSITIVE | Financial, health, biometric | Sensitive |
| PD_CHILD | Personal data of a child | Sensitive |

Rules:
- PD_CHILD always implies heightened safeguards.
- PD_SENSITIVE may trigger DPIA obligations.

---

### 2.2 Data Field Taxonomy (Illustrative)

| Field Code | Description | Category |
|-----------|-------------|----------|
| EMAIL | Email address | PD_GENERAL |
| PHONE | Mobile number | PD_GENERAL |
| LOCATION | GPS / address | PD_SENSITIVE |
| BIOMETRIC_ID | Biometric identifier | PD_SENSITIVE |
| AGE | Age / DOB | PD_CHILD (if < threshold) |

---

## 3. Processing Purpose Taxonomy

### 3.1 Purpose Codes

| Purpose Code | Description | Consent Required |
|-------------|-------------|------------------|
| ACCOUNT_SERVICE | Core service delivery | YES |
| MARKETING_COMM | Promotional communication | YES |
| ANALYTICS | Usage analytics | YES |
| LEGAL_COMPLIANCE | Statutory compliance | NO |
| SECURITY | Fraud / security monitoring | NO |

Rules:
- Purposes marked NO rely on statutory obligation or legitimate use.
- All YES purposes require explicit consent artefacts.

---

### 3.2 Purpose Constraints

- One consent artefact may cover **multiple purposes** only if:
  - purposes are explicitly listed
  - withdrawal can be granular
- Purpose expansion requires **fresh consent**.

---

## 4. Consent Classification

### 4.1 Consent Type

| Consent Type | Description |
|-------------|-------------|
| EXPLICIT | Clear affirmative action |
| VERIFIABLE_PARENTAL | Consent by lawful guardian |

Implicit or bundled consent is **not permitted**.

---

### 4.2 Consent State (Canonical)

| State | Description |
|------|-------------|
| ACTIVE | Valid and usable consent |
| REVOKED | Withdrawn by Data Principal |
| EXPIRED | Lapsed due to time or purpose completion |

State transitions are governed exclusively by the State Machine Diagram.

---

## 5. Consent Attributes (Mandatory)

Each consent artefact **must** include:

- `consent_id`
- `data_principal_id`
- `purposes[]`
- `data_categories[]`
- `consent_state`
- `consent_timestamp`
- `expiry_timestamp` (if applicable)
- `notice_version`
- `language`
- `collection_channel` ∈ { WEB, MOBILE_APP, API }

---

## 6. Notice & Language Taxonomy

### 6.1 Notice Type

| Notice Code | Description |
|------------|-------------|
| NOTICE_GENERAL | General privacy notice |
| NOTICE_PURPOSE_SPECIFIC | Purpose-linked notice |
| NOTICE_CHILD | Child data notice |

---

### 6.2 Language Codes

- ISO-639-1 codes for Indian languages
- English (`en`) is mandatory fallback

---

## 7. Audit Event Taxonomy (Preview)

| Event Code | Trigger |
|-----------|--------|
| CONSENT_GRANTED | Consent creation |
| CONSENT_REVOKED | Withdrawal |
| CONSENT_EXPIRED | System expiry |
| NOTICE_PRESENTED | Before consent capture |

Full definitions are provided in the Audit Logging Specification.

---

## 8. Naming & Usage Rules (Strict)

- Use **exact codes** as defined (case-sensitive)
- Do not invent synonyms
- Do not overload fields
- Any deviation requires taxonomy update + review

---

## Status

This taxonomy is **LOCKED**.

Any change requires:
- legal review
- impact analysis on downstream artefacts
- explicit approval

---

## Mental Model

> The Consent Taxonomy is the **dictionary of truth**.
>
> If two components disagree on meaning, the taxonomy wins.

