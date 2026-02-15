# Conflict of Interest Policy — Consent Manager MVP

**Document ID:** GOV-COI-001  
**Version:** 1.0  
**Effective Date:** 2026-02-01  
**Review Cycle:** Annual  
**Owner:** Data Protection Officer (DPO)

---

## 1. Purpose

This policy addresses the requirement under the **Digital Personal Data Protection Act, 2023 (DPDP Act), Section 8(9)**, which states:

> *"The Data Fiduciary shall not undertake such processing of personal data as may be prescribed which may be detrimental to the interests of the Data Principal."*

The Consent Manager operates as a **dual-role platform** — serving both Data Principals (DPs) and Data Fiduciaries (DFs). This creates an inherent potential for conflict of interest that must be mitigated through technical, organizational, and governance controls.

---

## 2. Scope

This policy applies to:

- All personnel involved in development, deployment, and operation of the Consent Manager
- Product decisions affecting consent flows, UI/UX, and default settings
- Data Fiduciary organizations using the platform
- Third-party Data Processors registered in the Processor Registry

---

## 3. Identified Conflicts of Interest

### 3.1 Platform Neutrality Conflict

| Conflict | Description | Risk Level |
|----------|-------------|------------|
| **Consent Dark Patterns** | UI/UX designed to favor granting over refusing consent | HIGH |
| **Default Settings** | Pre-selected consent options or opt-out defaults | HIGH |
| **Information Asymmetry** | DP not shown full purpose description or processor list | MEDIUM |
| **Revocation Friction** | Making consent withdrawal harder than granting | HIGH |
| **Dual Revenue Model** | Platform fees from DFs creating incentive to maximize consents | MEDIUM |

### 3.2 Operational Conflicts

| Conflict | Description | Risk Level |
|----------|-------------|------------|
| **Admin Override** | DF operators manually expiring/modifying consent records | MEDIUM |
| **Audit Log Access** | DF having ability to suppress DP activity records | CRITICAL |
| **Processor Selection** | Platform recommending affiliated data processors | LOW |
| **Purpose Evolution** | DF changing purpose definitions without re-consent | HIGH |

---

## 4. Mitigation Controls

### 4.1 Technical Controls (Implemented)

| Control | Implementation | DPDP Section |
|---------|---------------|--------------|
| **Immutable Audit Logs** | PostgreSQL trigger prevents UPDATE/DELETE on `audit_logs` table; hash chain ensures tamper detection | §8(8) |
| **Consent Symmetry** | Revocation requires exactly the same number of steps as granting (one-click) | §6(6) |
| **Role-Based Access** | DP and DF portals are separated with independent route trees and `RoleGuard` enforcing access boundaries | §8(9) |
| **Purpose Versioning** | `purposes` table tracks all versions; consent records link to the specific version the DP agreed to | §6 |
| **Processor Transparency** | `processors` table registers all third-party processors; visible in consent receipts | §8(2) |
| **Retention Enforcement** | Automated archival job enforces 7-year retention limit; no manual override available | §8(7) |
| **No Pre-selected Options** | Consent grant form requires explicit selection of all fields; no defaults | §6(3) |
| **Token-Based Approval** | Consent requires explicit DP approval via unique token; cannot be auto-granted | §6 |

### 4.2 Organizational Controls

| Control | Description | Owner |
|---------|-------------|-------|
| **DPO Independence** | The Data Protection Officer operates independently from revenue-generating functions | Board |
| **Consent Review Board** | Quarterly review of consent grant/revocation ratios for anomalies | DPO |
| **DP Feedback Channel** | Dedicated channel for Data Principals to report unfair consent practices | DPO |
| **Purpose Change Protocol** | Any purpose definition change requires DPO approval and DP re-consent | DPO + Engineering |
| **Processor Due Diligence** | All new processors undergo DPA review before registration; annual re-assessment | Legal |

### 4.3 Governance Controls

| Control | Description | Frequency |
|---------|-------------|-----------|
| **Conflict of Interest Register** | Maintained by DPO; lists all identified conflicts and mitigations | Continuous |
| **Independent Audit** | Third-party audit of consent flows and platform neutrality | Annual |
| **Dark Pattern Assessment** | UI/UX review against India's dark pattern guidelines | Semi-annual |
| **Board Disclosure** | Report on COI mitigations and any incidents to board | Quarterly |

---

## 5. Consent Flow Fairness Principles

The following principles shall govern all consent-related design decisions:

1. **Equal Prominence**: "Grant" and "Refuse" options must be of equal visual weight
2. **No Bundling**: Each purpose must be individually selectable; no all-or-nothing bundles
3. **Clear Language**: Purpose descriptions must be in plain language at 8th-grade reading level
4. **Multilingual Parity**: All notice languages must have identical content coverage
5. **Exit Symmetry**: Withdrawing consent must be as easy as granting it (DPDP §6(6))
6. **No Penalty for Refusal**: Refusing or withdrawing consent must not result in service degradation beyond what is technically necessary
7. **Proactive Disclosure**: All data processors and cross-border transfers must be disclosed before consent

---

## 6. Monitoring & Compliance

### 6.1 Key Metrics Monitored

| Metric | Threshold | Action if Breached |
|--------|-----------|-------------------|
| Consent grant-to-refuse ratio | < 95:5 anomalous | Investigate for dark patterns |
| Average time to grant vs. revoke | Revoke ≤ Grant time | UX redesign if asymmetric |
| Purpose description readability | Flesch-Kincaid ≤ 8 | Rewrite required |
| DP complaints per quarter | < 0.1% of active DPs | Root cause analysis |
| Processor DPA coverage | 100% | Suspend non-compliant processors |

### 6.2 Incident Response

If a conflict of interest is identified or reported:

1. **Immediate**: Suspend the affected functionality if DP harm is possible
2. **Within 24 hours**: DPO assessment and containment
3. **Within 72 hours**: Report to Data Protection Board if applicable (DPDP §8(6))
4. **Within 30 days**: Root cause analysis, remediation, and policy update

---

## 7. Attestation

All team members with access to production systems must acknowledge this policy annually.

| Role | Attestation Frequency |
|------|----------------------|
| Engineering (backend, frontend) | Annual |
| Product / UX | Annual |
| DPO | Quarterly |
| Data Processors (third-party) | Per DPA renewal |
| Board of Directors | Annual |

---

## 8. References

| Document | Section |
|----------|---------|
| DPDP Act 2023 | §6 (Consent), §8 (Obligations), §12 (Rights) |
| DPDP Rules (Draft) | Dark Patterns, Consent Manager Registration |
| ADR-001 | Architectural Decision: Separate DP/DF Portals |
| DPIA | Data Protection Impact Assessment — Section 4 (Risk Register) |
| SOP-003 | Breach Notification Procedure |

---

*This document is a living policy. Updates must be approved by the DPO and reflected in the document version history.*
