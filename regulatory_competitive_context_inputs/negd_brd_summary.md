# NeGD Consent Management System — Business Requirements Summary (CMP Functional Blueprint)

## 1. Objective of CMS

NeGD BRD defines CMS as a platform to:

- Manage full consent lifecycle
- Enable DPDP compliance
- Empower Data Principals
- Provide DF + Processor integration
- Maintain audit readiness

Core lifecycle defined as:

1. Consent collection
2. Consent validation
3. Consent update
4. Consent renewal
5. Consent withdrawal



---

## 2. Stakeholder Model

Actors:

- Data Principal
- Data Fiduciary
- Data Processor
- Consent Management System
- DPO
- Auditor
- Admin

Role-based control explicitly required.  
:contentReference[oaicite:12]{index=12}

---

## 3. Consent Collection Requirements

Consent must be:

- Free
- Specific
- Informed
- Explicit
- Affirmative action
- Purpose-specific
- Granular
- Not bundled
- Revocable

Interface requirements:

- WCAG accessible
- Multi-language (Eighth Schedule languages)
- No pre-checked boxes
- Per-purpose controls

Metadata captured:

- User ID
- Purpose IDs
- Timestamp
- Consent method
- Language
- Session data



---

## 4. Consent Artefact Requirements

System must generate Consent Artifact containing:

- Purpose list
- Metadata
- Status
- Timestamp
- Method
- Version

Must be:

- Securely stored
- Queryable
- Syncable
- Audit logged

:contentReference[oaicite:14]{index=14}

---

## 5. Real-Time Validation Model

Before processing:

Data Fiduciary must:

- Query CMS API
- Validate consent status
- Check purpose match
- Confirm not withdrawn/expired

Real-time sync required across:

- Internal systems
- Third-party processors

:contentReference[oaicite:15]{index=15}

---

## 6. Consent Update & Renewal

System must support:

- Granular updates
- Purpose-level modification
- Expiry tracking
- Renewal reminders
- Renewal workflow

All updates must:

- Generate audit entries
- Notify fiduciaries
- Sync downstream systems



---

## 7. Consent Withdrawal Requirements

Withdrawal must:

- Be dashboard accessible
- Be simple
- Be purpose-specific
- Take immediate effect
- Stop processing
- Notify fiduciaries & processors
- Log immutable audit event

Exceptions allowed only where law requires continued processing.



---

## 8. Cookie Consent Module

CMS must include:

- Cookie banner
- Category-wise consent
- Essential default only
- Preference center
- Auto expiry
- Change notifications
- Cookie audit logs



---

## 9. User Dashboard Requirements

Dashboard must support:

- View consent history
- Filter/search
- Export (PDF/CSV)
- Modify consent
- Withdraw consent
- Raise grievances
- Data requests

:contentReference[oaicite:19]{index=19}

---

## 10. Grievance Redressal Module

Must support:

- Complaint logging
- Ticket tracking
- Resolution workflow
- Closure summary
- User feedback

:contentReference[oaicite:20]{index=20}

---

## 11. Administration Module

### Role Based Access Control

Roles:

- Admin
- Auditor
- DPO
- Operator

Features:

- RBAC
- MFA
- SSO
- Role audit logs

### Data Retention Configuration

- Retention schedules
- Automated deletion
- Legal exemptions
- Deletion audit logs

:contentReference[oaicite:21]{index=21}

---

## 12. Audit & Logging Requirements

System must log:

- All consent events
- Updates
- Withdrawals
- Renewals
- Role changes
- Policy changes
- Data retention actions

Logs must support:

- Compliance reporting
- Audit export
- Immutable storage

:contentReference[oaicite:22]{index=22}

---

## 13. CMP Design Impact

NeGD BRD directly drives:

- Consent state machine
- Consent artefact schema
- Audit event catalog
- API contract
- SOP workflows
- RBAC design
- Dashboard UI
- Notification engine
- Retention engine
- Cookie consent module