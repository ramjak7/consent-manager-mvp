# Artefact 06: Entity Relationship Diagram (Logical ERD – Authoritative)

## Purpose
This artefact defines the **logical data model** for the Consent Management Platform (CMP).

It answers:
> *What entities exist, what data they store, and how they relate — in a way that enforces DPDP-compliant behaviour by design?*

This ERD is **normative**. Database schemas, migrations, and repositories MUST conform to it.

---

## Design Principles

1. **Consent is a first-class artefact** — immutable history, explicit state
2. **Separation of concerns** — lifecycle, decisions, and evidence are distinct
3. **Auditability by construction** — logs never depend on joins to reconstruct truth
4. **Minimal coupling** — processing does not mutate consent

---

## Core Entities

### 1. DataPrincipal

Represents the individual to whom personal data relates.

| Field | Type | Notes |
|-----|-----|------|
| `data_principal_id` (PK) | UUID | Stable identifier |
| `external_ref` | String | App/user identifier |
| `created_at` | Timestamp | |

---

### 2. ConsentArtefact

Represents a **single grant of consent**.

| Field | Type | Notes |
|-----|-----|------|
| `consent_id` (PK) | UUID | |
| `data_principal_id` (FK) | UUID | → DataPrincipal |
| `state` | Enum | DRAFT / ACTIVE / REVOKED / EXPIRED |
| `granted_at` | Timestamp | Set on ACTIVE |
| `expires_at` | Timestamp | Nullable |
| `revoked_at` | Timestamp | Nullable |
| `notice_version` | String | Legal notice reference |
| `created_at` | Timestamp | |

---

### 3. ConsentPurpose

Join table defining purposes consented under a consent artefact.

| Field | Type | Notes |
|-----|-----|------|
| `consent_id` (FK) | UUID | → ConsentArtefact |
| `purpose_code` | String | From taxonomy |

Composite PK: (`consent_id`, `purpose_code`)

---

### 4. ConsentDataType

Join table defining data categories consented.

| Field | Type | Notes |
|-----|-----|------|
| `consent_id` (FK) | UUID | → ConsentArtefact |
| `data_type_code` | String | From taxonomy |

Composite PK: (`consent_id`, `data_type_code`)

---

### 5. AuditLog

Immutable compliance evidence store.

| Field | Type | Notes |
|-----|-----|------|
| `audit_id` (PK) | UUID | |
| `event_type` | Enum | See Artefact #4 |
| `consent_id` (FK) | UUID | Nullable only if pre-consent |
| `data_principal_id` (FK) | UUID | |
| `timestamp` | Timestamp | |
| `actor_type` | Enum | DATA_PRINCIPAL / SYSTEM / ADMIN |
| `actor_id` | String | Nullable |
| `request_id` | UUID | Correlation ID |
| `ip_address` | String | |
| `user_agent` | String | |
| `metadata` | JSONB | Event-specific |

---

## Relationships (Logical)

- DataPrincipal **1 → N** ConsentArtefact
- ConsentArtefact **1 → N** ConsentPurpose
- ConsentArtefact **1 → N** ConsentDataType
- ConsentArtefact **1 → N** AuditLog
- DataPrincipal **1 → N** AuditLog

---

## Explicit Prohibitions

- Storing "current consent" on DataPrincipal
- Mutating or deleting AuditLog rows
- Encoding purposes or data types as free text
- Encoding state transitions implicitly

---

## Mapping to Other Artefacts

| Artefact | Enforcement |
|--------|------------|
| #1 Taxonomy | purpose_code, data_type_code |
| #3 Decision Matrix | subset checks via joins |
| #4 Audit Spec | AuditLog schema |
| #5 State Machine | `state` constraints |

---

## Implementation Notes (Non-Normative)

- Enums should be DB-level where possible
- Foreign keys SHOULD be enforced
- Index on (`data_principal_id`, `state`)

---

**Status:** Authoritative
**Compliance Criticality:** Very High
**Precedence:** Higher than code, lower than statute

