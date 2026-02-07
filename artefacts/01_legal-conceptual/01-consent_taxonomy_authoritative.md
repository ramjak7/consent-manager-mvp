# Consent Taxonomy
---
Artefact-ID: CMP-LC-CONSENT-TAXONOMY
Title: Consent Taxonomy
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: backend/src (code-aligned actor/consent/data taxonomy); backend/db/snapshots/schema_full_v1.sql (schema definitions); regulatory_competitive_context_inputs/dpdp_summary.md (regulatory taxonomy depth); regulatory_competitive_context_inputs/negd_brd_summary.md (NeGD terminology)
Traceability: [DPDP-S5-Rule-1] [DPDP-S6-Rule-1] [DPDP-S6-Rule-4] [DPDP-S8-Rule-1]
Linked-Artefacts: 
- artefacts/01_legal-conceptual/02-consent_lifecycle_flow_authoritative.md
- artefacts/01_legal-conceptual/03-processing_decision_matrix_authoritative.md
- artefacts/03_system-model/09-consent_state_machine_spec_authoritative.md
- artefacts/03_system-model/10-consent_artefact_schema.json
- artefacts/04_execution-layer/13-api_semantic_contract_authoritative.md
Review-Cadence: Semiannual
Owner: TBD
---

## Cross-Links
- Consent artefact schema:
  - → Ref: consent_artefact_schema.json field:purposes
  - → Ref: consent_artefact_schema.json field:data_categories
  - → Ref: consent_artefact_schema.json field:source.language
  - → Ref: consent_artefact_schema.json field:source.notice_version
- API semantic contract:
  - → Ref: 15-api_semantic_contract_authoritative.md endpoint: POST /consents
  - → Ref: 16-processing_validation_contract_authoritative.md endpoint: POST /process

## Purpose
This document defines the canonical vocabulary and classification system for the Consent Management Platform (CMP).
It is the semantic foundation for legal, business, technical, audit, API, schema, and test artefacts.
All code, schemas, APIs, logs, tests, notices, and AI agents should prefer these terms and codes.
If implementation differs, implementation truth prevails, but taxonomy codes remain the forward standard.

## Regulatory Foundation
This taxonomy is grounded in the **Digital Personal Data Protection (DPDP) Act, 2023** and the Draft Rules (First Schedule):

**Key Obligations:**
- **DPDP Section 5**: Data Principals have the right to give, manage, and withdraw consent
- **DPDP Section 6(1)**: Consent must be **free, specific, informed, and explicit**
- **DPDP Section 6(2)**: Pre-ticked or bundled consent is prohibited
- **DPDP Section 6(10)**: Onus on Data Fiduciary to prove valid consent
- **DPDP Section 8**: Accountability and mandatory safeguards
- **NeGD Specification**: Consent Manager must support consent routing across Data Fiduciaries

The taxonomy ensures these obligations are operationalized through consistent terminology.

## Implementation Alignment Note
Current MVP implementation uses:
-	free-text `purpose`
-	free-text / JSON `dataTypes`
This taxonomy defines forward standardized codes for:
-	purpose
-	data categories
-	notice types
-	language
-	consent attributes
Migration to coded values is planned but not yet enforced.

## Actors (Role Taxonomy)
### Data Principal (DP)
NAtural person to whom the personal data relates.
Implementation mapping:
-	represented by `userId` in API + DB
Forward attributes:
-	`data_principal_id`
-	`age_category` ∈ { ADULT, CHILD }
-	`preferred_language`

### Data Fiduciary (DF)
Entity that determines purpose and means of processing.
Implementation status:
-	not explicitly modeled in DB
-	inferred from API caller
Forward attributes:
-	`fiduciary_id`
-	`fiduciary_type` ∈ { STANDARD, SIGNIFICANT }

### Data Processor (DPrc)
Entity processing personal data on DF’s behalf.
Implementation status:
-	not modeled in MVP
Forward attributes:
-	`processor_id`
-	`processing_scope`
- `dpa_reference`

### Consent Manager (CM)
Platform enabling consent lifecycle management.
Implementation status: This backend implements a subset: 
- request
- approve/reject
- revoke
- expiry
- processing validation
- audit logging

### Admin / Operator
Privileged operator gated by `ADMIN_API_KEY`.
Used for:
-  `/audit` access
-  `/admin/consents/:id/expire` forced expiry point

## Consent Concepts (Object Taxonomy)
### Consent (Versioned Record)
One DB row in `public.consents` = one consent **version**
Implementation truth (Key identifiers):
  - `consent_id` (UUID): unique identifier of a specific consent version.
  - `consent_group_id` (text): stable grouping key for versions, computed as `${userId}:${purpose}`.
  - `version` (int): monotonically increasing within a group.

### Purpose (implementation)
A text label that scopes the processing context.
Rule:
-	purpose matching = exact string equality (current engine)
Forward taxonomy codes defined below.

### Data Types (Implementation)
A JSON array (stored as JSONB) describing what categories are permitted.
Policy rule:
- Requested `dataTypes` ⊆ consented `dataTypes`

### Validity / Expiry
Implementation:
- `valid_until` is stored as a `date` (DB) and used as expiry boundary.
- Expiry enforcement occurs via:
  - Scheduled cron updates in the API process
  - `expireDueConsents()` job
  - On-demand expiry attempt in `GET /consents/:id`

## Personal Data Classification (Forward Taxonomy)
### Personal Data Category Codes
**Code	        Description	                    Sensitivity**
  PD_GENERAL	  Identifiable personal data	    General
  PD_SENSITIVE	Financial / health / biometric	Sensitive
  PD_CHILD	    Child personal data	            Sensitive
**Rules:**
•	PD_CHILD implies heightened safeguards
•	PD_SENSITIVE may trigger DPIA requirement
Implementation status: forward taxonomy only.

### Data Field Taxonomy (Illustrative)
**Field Code	  Description	          Category**
  EMAIL	        Email address	        PD_GENERAL
  PHONE	        Mobile number	        PD_GENERAL
  LOCATION	    Address / GPS	        PD_SENSITIVE
  BIOMETRIC_ID	Biometric identifier	PD_SENSITIVE
  AGE	          Age / DOB	            PD_CHILD (conditional)
Illustrative — not DB-enforced.

### Processing Purpose Taxonomy (Forward Codes)
**Purpose Code	    Description	              Consent Required**
  ACCOUNT_SERVICE	  Core service delivery	    YES
  MARKETING_COMM	  Promotional communication	YES
  ANALYTICS	        Usage analytics	          YES
  LEGAL_COMPLIANCE	Statutory compliance	    NO
  SECURITY	        Fraud / abuse detection	  NO
**Rules:**
-	YES → requires consent artefact
-	NO  → statutory or legitimate use basis
Implementation currently allows free-text purposes.

**Purpose Constraints**
•	Multi-purpose consent allowed only if purposes listed explicitly
•	Withdrawal must be purpose-granular (forward requirement)
•	Purpose expansion requires fresh consent

## Forward Model Note — Multi-Purpose Consent

The archive BRD contemplates consent that covers multiple purposes simultaneously, with granular (per-purpose) withdrawal capability. The current MVP implementation uses a **single-purpose model**:
- Each consent record represents consent to a **single purpose**
- Consent group identifier is `{userId}:{purpose}`, ensuring one active consent per user/purpose pair
- Multi-purpose is achieved by issuing multiple consent records

**Future Transition**: Multi-purpose would require:
- `purposes[]` field in consent artefact (array instead of single string)
- Consent group computed as `{userId}` (not scoped by purpose)
- Withdraw-by-purpose capability (e.g., `POST /consents/:id/withdraw-purpose/:purpose`)
- Granular audit trail tracking per-purpose operations

## Consent Classification
### Consent Type
**Type	                Description**
  EXPLICIT	            Clear affirmative action
  VERIFIABLE_PARENTAL	  Guardian verified consent
Implicit / bundled consent is not permitted (normative rule).

## Consent Status (State Taxonomy)
The system uses these statuses (as text in DB, typed in code):
- `REQUESTED`: created, awaiting approval via approval token.
- `ACTIVE`: approved and valid (not expired).
- `REJECTED`: declined by token or expired before approval.
- `REVOKED`: withdrawn by revoke endpoint, or superseded by approving a newer version.
- `EXPIRED`: validity window ended.
These are authoritative for MVP.
State transitions governed by state machine artefact

## Consent Attributes — Normative Forward Contract (Regulatory Model)
Each consent artefact MUST logically contain the following attributes to satisfy DPDP accountability, auditability, and notice traceability requirements:
- consent_id
- data_principal_id (implementation: userId)
- purposes[]
- data_categories[]
- consent_state
- consent_timestamp
- expiry_timestamp
- notice_version
- language
- collection_channel ∈ { WEB, MOBILE_APP, API }
This defines the target regulatory schema.
Implementation may store a normalized or partial subset.

## Current Implementation Mapping (Node.js + PostgreSQL MVP)
**Normative Attribute	    Current Field   	Status**
  consent_id	            consentId	        ✅ Implemented
  data_principal_id	      userId	          ✅ Implemented
  purposes[]	            purpose (single)	⚠️ Single-purpose only
  data_categories[]	      dataTypes[]	      ✅ Implemented
  consent_state	          status	          ✅ Implemented
  consent_timestamp	      (created_at)	    ⚠️ DB-level
  expiry_timestamp	      validUntil	      ✅ Implemented
  notice_version	        —	                ❌ Not yet
  language	              —	                ❌ Not yet
  collection_channel	    —	                ❌ Not yet
MVP implementation uses single-purpose consent records.

## Notice & Language Taxonomy (Forward)
Notice Type Codes
**Code	                    Description**
  NOTICE_GENERAL	          General privacy notice
  NOTICE_PURPOSE_SPECIFIC	  Purpose notice
  NOTICE_CHILD	            Child notice

## Language Codes
•	ISO-639-1 codes
•	English (en) mandatory fallback

## Evidence & Audit Taxonomy
### Audit Log (Immutable Ledger)
DB table: `audit_logs`
Properties:
-	append-only
-	UPDATE/DELETE blocked by trigger
-	`hash` chain tamper evidence (`prev_hash` + event payload)

### Audit Event Types (Current Implementation)
Implemented event types:
- `CONSENT_REQUESTED`
- `CONSENT_APPROVED`
- `CONSENT_REJECTED`
- `CONSENT_REVOKED`
- `CONSENT_EXPIRED`
- `PROCESSING_ALLOWED`
- `PROCESSING_DENIED`

Note: Code also defines `CONSENT_CREATED` but it is not emitted by current routes.

## Out-of-Scope (Required but Not Yet Implemented)
From DPDP + NeGD BRD summaries, these concepts exist but are not currently modeled:
- Notice registry and notice versioning (notice content shown to user)
- Multi-language notice rendering and WCAG UI requirements
- Grievance redressal/ticketing workflows
- Role-based access control (RBAC) beyond a single API key
- Data sharing routing / “blind relay” (CM not readable) architecture
- Evidence pack export (PDF/CSV)
- retention policy engine (7-year retention)

## Source Anchors
- DB schema: `backend/db/snapshots/schema_full_v1.sql`
- Consent repository: `backend/src/repositories/consentRepo.ts`
- Audit repository: `backend/src/repositories/auditRepo.ts`
- API routes: `backend/src/index.ts`, `backend/src/routes/consentRoutes.ts`
- Policy engine: `backend/src/policy/policyEngine.ts`
- Context inputs: `regulatory_competitive_context_inputs/dpdp_summary.md`, `regulatory_competitive_context_inputs/negd_brd_summary.md`