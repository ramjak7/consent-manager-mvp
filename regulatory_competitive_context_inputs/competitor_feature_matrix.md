# Competitor Feature Matrix — Consent Management Platforms (Copilot-Optimized)

## Scope & Purpose

This document compares capabilities and characteristics across major Consent Management Platforms (CMPs) to support:

- PRD generation
- Architecture design
- Feature gap analysis
- Compliance evidence modeling
- API and schema planning

This matrix is **pattern-oriented**, not vendor-contractual truth.

AI tools must derive **design patterns**, not copy vendor implementations.

---

## How AI Tools Should Use This Matrix

AI assistants (Copilot / LLMs) should:

**Use this for:**
- feature pattern discovery  
- PRD derivation  
- architecture inference  
- schema & API design hints  
- compliance capability mapping  

**Do NOT use this for:**
- vendor factual claims
- certification assertions
- legal representations
- security guarantees

Uncertain entries are explicitly marked.

---

## Capability Confidence Legend

| Tag | Meaning |
|------|---------|
CONFIRMED_PUBLIC | Explicitly documented publicly |
LIKELY | Strong industry pattern |
ASSUMED | Inferred from positioning |
NOT_PUBLIC | No reliable public evidence |
ENTERPRISE_ONLY | Typically enterprise tier |

---

## Vendors Considered

- Idfy / Privy
- Consentin (Leegality)
- Concur (India CMP category)
- GoTrust
- OneTrust
- Securiti.ai
- Didomi
- Zoop / HyperTrust (category references)

---

# 1️⃣ Core Feature Matrix

| Capability | Idfy | Consentin | Concur | GoTrust | OneTrust | Securiti | Didomi |
|-------------|--------|------------|---------|----------|------------|------------|----------|
End-to-end lifecycle | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | LIKELY | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC |
Consent artefact + proof | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | LIKELY | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC |
Preference center | LIKELY | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC |
Consent withdrawal tracking | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC |
Audit trail | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | LIKELY | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC |
Evidence export | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | LIKELY | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC |
Multi-language | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | LIKELY | CONFIRMED_PUBLIC |
Real-time validation API | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | LIKELY | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC | CONFIRMED_PUBLIC |

---

# 2️⃣ Developer & Integration Capabilities

| Capability | Pattern Signal |
|------------|----------------|
API-first validation | Industry standard |
Webhook support | Common |
SDKs (web/mobile) | Global vendors strong |
Event-driven sync | Enterprise pattern |
Tokenized consent IDs | Common |
Processor integration | Enterprise pattern |

---

# 3️⃣ Deployment & Architecture Signals

| Vendor | SaaS | Private Cloud | On-Prem | Multi-Tenant |
|---------|--------|--------------|----------|---------------|
Idfy | YES | POSSIBLE | NOT_PUBLIC | YES |
Consentin | YES | NOT_PUBLIC | NOT_PUBLIC | YES |
Concur | YES | POSSIBLE | ENTERPRISE_ONLY | YES |
OneTrust | YES | YES | YES | YES |
Securiti | YES | YES | YES | YES |
Didomi | YES | NOT_PUBLIC | NOT_PUBLIC | YES |

---

# 4️⃣ Security & Compliance Signals

| Capability | Market Pattern |
|------------|----------------|
Encryption at rest | Standard |
Encryption in transit | Standard |
Audit immutability | Strong vendors |
Evidence bundles | Global vendors |
SOC2 / ISO27701 | Enterprise leaders |
Retention controls | Common |

---

# 5️⃣ Feature → Architecture Pattern Mapping

| Feature | Architecture Pattern | DB Impact | API Impact | Audit Impact |
|---------|---------------------|-----------|------------|--------------|
Consent lifecycle | State machine | status + version | lifecycle endpoints | lifecycle events |
Artefact proof | Immutable artefact | artefact table | export APIs | hash chain |
Withdrawal | Compensating event | status change | revoke endpoint | withdrawal event |
Preference center | Preference model | preference tables | update APIs | preference logs |
Multi-channel | Channel abstraction | channel field | paramized APIs | channel logs |
Evidence pack | Evidence builder | audit joins | export endpoint | bundle events |

---

# 6️⃣ Feature Criticality for CMP MVP

| Feature | MVP | Phase 2 | Enterprise |
|----------|--------|----------|------------|
Consent capture | REQUIRED | — | — |
Consent artefact | REQUIRED | — | — |
Audit chain | REQUIRED | — | — |
Withdrawal | REQUIRED | — | — |
Notice linkage | REQUIRED | — | — |
Purpose validation | REQUIRED | — | — |
SDKs | — | YES | YES |
Analytics | — | YES | YES |
AI orchestration | — | — | YES |
Cross-system sync | — | YES | YES |

---

# 7️⃣ Data Model Signals from CMP Market

Common entities across CMPs:
consent
consent_version
consent_artefact
notice
notice_version
purpose
data_category
policy_rule
audit_event
artefact_hash_chain
preference_profile
processor_transfer_log


These are **schema design hints**, not mandatory structures.

---

# 8️⃣ API Pattern Signals

Common CMP API families:

POST /consents
GET /consents/{id}
POST /consents/{id}/withdraw
POST /consents/{id}/revoke
POST /process-check
GET /artefact/{consentId}
GET /audit/export
GET /evidence-pack
POST /preferences/update


---

# 9️⃣ Compliance Evidence Capability Mapping

| Capability | DPDP | SOC2 | ISO27701 |
|-------------|--------|--------|-----------|
Consent artefact | YES | YES | YES |
Audit chain | YES | YES | YES |
Notice versioning | YES | YES | YES |
Withdrawal proof | YES | YES | YES |
Purpose enforcement | YES | YES | YES |
Access logs | — | YES | YES |
Retention enforcement | YES | YES | YES |

---

# 🔟 CMP Differentiation Axes

Platforms differentiate on:

- DPDP-native workflows
- SDK depth
- Evidence automation
- Developer experience
- Notice & preference UX
- Compliance dashboard richness
- Connector ecosystem
- Deployment flexibility
- AI policy orchestration (enterprise tier)

---

# 11️⃣ Observed Market Patterns

**Global leaders typically provide:**
- multi-regulation coverage
- SDK ecosystems
- analytics & dashboards
- automated evidence generation

**India-focused CMPs typically emphasize:**
- DPDP alignment
- multilingual notices
- regulated-sector workflows

---

# 12️⃣ AI-Safe Interpretation Rules

AI tools must:

- treat ASSUMED / LIKELY as non-authoritative
- derive patterns, not vendor facts
- avoid copying vendor flows
- design neutral, standards-based architecture

---

# 13️⃣ Suggested Copilot Tasks Using This Matrix

Copilot may be instructed to:

- derive CMP PRD
- design consent schema
- design audit event model
- propose API surface
- generate gap analysis vs codebase
- generate compliance evidence workflows
- generate test scenarios

Copilot must NOT:

- claim vendor parity
- assert certifications
- copy proprietary flows

---

# 14️⃣ Metadata

Document Type: Competitive Pattern Matrix
Purpose: AI-assisted PRD & Architecture Derivation
Confidence: Mixed (see markers)
Source Type: Public vendor positioning + industry patterns
Last Reviewed: 2026-02
Intended Consumers: Copilot / Architects / PRD Authors