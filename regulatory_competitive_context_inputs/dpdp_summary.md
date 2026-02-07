# DPDP Act & Draft Rules — Consent Manager Summary (Authoritative Extract for CMP Design)

## 1. Legal Basis

The Digital Personal Data Protection (DPDP) Act, 2023 and Draft DPDP Rules define a **Consent Manager (CM)** as a regulated, registered entity that enables Data Principals to:

- Give consent
- Manage consent
- Review consent
- Withdraw consent
- Route consent and data sharing across Data Fiduciaries

A Consent Manager operates in a **fiduciary capacity toward the Data Principal**.

Illustrative statutory model explicitly recognizes a CM platform that intermediates consent and routes data between Data Fiduciaries via user authorization.  
:contentReference[oaicite:0]{index=0}

---

## 2. Registration Requirements (Consent Manager Eligibility)

As per Draft Rules – First Schedule Part A:

A Consent Manager applicant must:

- Be a company incorporated in India
- Have sufficient:
  - Technical capacity
  - Operational capacity
  - Financial capacity
- Minimum net worth ≥ ₹2 crore
- Sound management character & integrity
- Adequate capital structure & earning prospects
- Independent certification that:
  - Platform is interoperable
  - Meets DPDP data protection standards framework
  - Technical & organisational safeguards are implemented

Board registers and publishes approved Consent Managers.  
Registration may be suspended/cancelled for non-adherence.  
:contentReference[oaicite:1]{index=1}

---

## 3. Core Obligations of a Consent Manager

A Consent Manager MUST:

### 3.1 Consent Platform Duties

Enable Data Principal to:

- Give consent
- Deny consent
- Review consent
- Withdraw consent
- Route consent to onboarded Data Fiduciaries

Platform must support consent both:
- Directly to Data Fiduciary
- Via another Data Fiduciary holding data

:contentReference[oaicite:2]{index=2}

---

### 3.2 Data Visibility Restriction

Consent Manager must ensure:

> Personal data shared through platform is **not readable** by the Consent Manager.

Implication for system design:

- Encrypted payload routing
- Blind relay model
- No plaintext storage of shared datasets
- Key separation architecture

:contentReference[oaicite:3]{index=3}

---

### 3.3 Mandatory Record Keeping

Consent Manager must maintain records of:

- Consents given
- Consents denied
- Consents withdrawn
- Consent notices shown
- Requests for consent
- Data sharing events with transferee fiduciaries

Must provide:

- User access to records
- Machine-readable export on request
- Minimum retention = **7 years** (or longer if agreed / required)



---

### 3.4 User Access Channel Requirement

Consent Manager must operate:

- Website or App (or both)
- As primary user interface for Data Principals

This implies:

- End-user dashboard mandatory
- Not API-only service
- Self-service consent console required

:contentReference[oaicite:5]{index=5}

---

### 3.5 Conflict of Interest Restrictions

Consent Manager must:

- Avoid conflict with Data Fiduciaries
- Ensure directors/KMPs do not hold:
  - Directorship
  - Financial interest
  - Employment
  - Beneficial ownership
  - Material pecuniary relationship

Implication:

- Governance controls
- Independence policy
- Conflict registry
- Board declarations

:contentReference[oaicite:6]{index=6}

---

### 3.6 Non-Delegation Rule

Consent Manager:

- Cannot subcontract its statutory obligations

Implication:

- Core CMP functions cannot be fully outsourced
- Cloud allowed but control must remain with CM

:contentReference[oaicite:7]{index=7}

---

### 3.7 Security Safeguards

Must implement:

- Reasonable security safeguards
- Breach prevention measures
- Technical + organisational controls

Implication:

- Encryption at rest & transit
- Strong IAM
- Audit logs
- Incident response SOP
- DPIA capability

:contentReference[oaicite:8]{index=8}

---

## 4. Notice & Consent Requirements (Impact on CMP UI)

DPDP Rules require consent notices to:

- Be standalone and understandable
- Be clear and plain language
- Include:
  - Itemised personal data
  - Specific purposes
  - Goods/services enabled
  - Withdrawal mechanism
  - Rights exercise mechanism
  - Complaint mechanism

Withdrawal must be:
> As easy as giving consent.

CMP must enforce notice templates + purpose binding.  


---

## 5. Data Principal Rights Support (CMP Impact)

CMP must support workflows enabling:

- Consent withdrawal
- Access requests
- Erasure requests
- Grievance filing
- Nomination handling (where applicable)
- Dashboard disclosure of mechanisms

:contentReference[oaicite:10]{index=10}

---

## 6. Architectural Implications for CMP

From DPDP obligations:

- Interoperable consent platform
- Consent artefact store (immutable)
- Audit ledger
- Blind relay data routing
- Notice registry
- Machine-readable export engine
- Conflict-of-interest governance layer
- 7-year retention engine
- Data Principal dashboard
- API validation gateway for fiduciaries

These must be reflected across:
ERD, State Machine, SOPs, ADRs, API specs, Audit specs.