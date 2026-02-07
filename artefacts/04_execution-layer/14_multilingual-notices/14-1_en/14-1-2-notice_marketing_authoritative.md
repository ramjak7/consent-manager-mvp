---
Artefact-ID: CMP-NOTICE-MARKETING
Title: Marketing Communication Privacy Notice (Purpose-Specific)
Version: 1.0
Status: ACTIVE
Effective-Date: 2026-02-02
Supersedes: (none)
Authoritative: true
Change-Control: ADR-0000
Source-Basis: Imported from Draft-2
Traceability: [DPDP-S6-Rule-1] [DPDP-S6-Rule-4] [DPDP-S8-Rule-1]
Linked-Artefacts: 04_execution-layer/14_multilingual-notices/14-1_en/14-1-1-notice_general_authoritative.md; 03_system-model/10-2-consent_artefact_schema.json
Review-Cadence: Semiannual
Owner: TBD
---

Below is the purpose-specific, DPDP-aligned, authoritative semantic source for marketing consent.
This is a child notice that inherits all baseline guarantees from the general notice and adds marketing-specific disclosures.

________________________________________
Marketing Communication Privacy Notice
(Purpose-Specific Notice — Authoritative Semantic Source)
Last Updated: <DATE>
Version: v1.1
Applies To: Users who opt in to marketing or promotional communications
________________________________________

1. Relationship to General Privacy Notice
This notice supplements the General Privacy Notice.
If there is any conflict, the General Privacy Notice prevails except where this notice provides stricter constraints.

Consent Artefact Linkage
- `purposes[]` MUST include MARKETING
- This notice is referenced via `source.notice_version` / notice linkage

2. Purpose of Marketing Processing
Marketing processing is never mandatory for service access.

3. Lawful Basis
Marketing communications are sent only on the basis of explicit consent. [DPDP-S6-Rule-1]

4. Categories of Personal Data Used
Only contact and communication preference data categories should be used.

5. Communication Channels
Channels may include email, SMS, messaging platforms, in-app notifications.

6. Consent Withdrawal & Opt-Out
Withdrawal takes effect without delay and is recorded. [DPDP-S6-Rule-4]
Audit Event: `CONSENT_WITHDRAWN`

7. Frequency & Fair Use
Subject to reasonable frequency caps.

8. Data Sharing for Marketing
No sale of personal data; processors must be contractually bound.
Audit Event: `DATA_SHARED_WITH_PROCESSOR`

9. Retention of Marketing Data
Retained while consent remains active; erased/access-restricted on withdrawal unless retention is mandated.

10. Your Rights
Withdraw marketing consent without penalty.

11. Changes to This Notice
Material changes may require renewed consent.

12. Contact Information
Privacy / Grievance Contact: <DETAILS>

Canonical Binding Declaration
This notice is a canonical semantic authority for:
- Purpose code: MARKETING
- Consent artefact construction
- User-facing disclosures
READ-ONLY / IMMUTABLE
